"""
Dynamic Mood Intelligence (DMI) Engine
Predicts real-time user stress, anxiety, and fatigue levels by combining:
1. Computer Vision: Decayed historical facial scans.
2. NLP Sentiment: Recent chat logs and emotion triggers.
3. Behavioral Analytics: Active listening session tracking.
4. Time-series ML: Ridge regression model for custom prediction, with cold start heuristic fallback.
"""

import logging
import math
from datetime import datetime, timedelta
import numpy as np
class SimpleRidge:
    def __init__(self, alpha=1.0):
        self.alpha = alpha
        self.coef_ = None

    def fit(self, X, y):
        num_features = X.shape[1]
        XTX = np.dot(X.T, X)
        reg_matrix = self.alpha * np.eye(num_features)
        inv_matrix = np.linalg.pinv(XTX + reg_matrix)  # Robust pseudo-inverse
        XTy = np.dot(X.T, y)
        self.coef_ = np.dot(inv_matrix, XTy)
        return self

    def predict(self, X):
        return np.dot(X, self.coef_)

from config.database import db
from models.history import History
from models.chat_log import ChatLog
from models.song import Song

logger = logging.getLogger(__name__)

# Decays per hour for CV metrics (exponential decay: value = val * exp(-decay_rate * hours))
DECAY_RATE_PER_HOUR = 0.15  # Halflife of ~4.6 hours

def get_active_session_features(user_id, target_time=None):
    """
    Groups history records into active listening sessions.
    A session is active if the gap between plays is < 1 hour.
    Returns:
        session_songs_count (int)
        session_duration_mins (float)
        is_active (bool): whether the session is still active relative to target_time
    """
    if target_time is None:
        target_time = datetime.utcnow()

    # Get history records up to target_time
    history = History.query.filter(
        History.user_id == user_id,
        History.timestamp <= target_time
    ).order_by(History.timestamp.desc()).limit(100).all()

    if not history:
        return 0, 0.0, False

    # Check if latest play is within 1 hour of target_time
    time_since_last_play = (target_time - history[0].timestamp).total_seconds() / 3600.0
    if time_since_last_play >= 1.0:
        # Session has already ended relative to target_time
        return 0, 0.0, False

    # Trace back to find start of current session
    session_records = [history[0]]
    for i in range(1, len(history)):
        gap = (history[i-1].timestamp - history[i].timestamp).total_seconds() / 3600.0
        if gap < 1.0:
            session_records.append(history[i])
        else:
            break

    # Calculate duration
    earliest_t = session_records[-1].timestamp
    latest_t = session_records[0].timestamp
    duration_mins = (latest_t - earliest_t).total_seconds() / 60.0

    # If it is just 1 song, we assume duration is 3 mins (average song duration)
    if len(session_records) == 1:
        duration_mins = 3.0

    return len(session_records), duration_mins, True

def get_nlp_sentiment_features(user_id, target_time=None, lookback_hours=2):
    """
    Retrieves and averages chat sentiment logs within lookback_hours before target_time.
    Returns:
        chat_stress_avg (float): 0 to 100
        chat_fatigue_avg (float): 0 to 100
        msg_count (int)
    """
    if target_time is None:
        target_time = datetime.utcnow()

    start_time = target_time - timedelta(hours=lookback_hours)
    
    logs = ChatLog.query.filter(
        ChatLog.user_id == user_id,
        ChatLog.timestamp >= start_time,
        ChatLog.timestamp <= target_time
    ).all()

    if not logs:
        return 0.0, 0.0, 0

    avg_stress = sum(log.stress for log in logs) / len(logs)
    avg_fatigue = sum(log.fatigue for log in logs) / len(logs)
    return avg_stress, avg_fatigue, len(logs)

def get_decayed_face_features(user_id, target_time=None):
    """
    Retrieves the latest face scan record prior to target_time and applies exponential decay.
    Returns:
        stress_decayed (float)
        anxiety_decayed (float)
        fatigue_decayed (float)
        hours_elapsed (float)
    """
    if target_time is None:
        target_time = datetime.utcnow()

    # Find the latest history entry with valid face scan metrics prior to target_time
    latest_scan = History.query.filter(
        History.user_id == user_id,
        History.timestamp < target_time,
        (History.stress_detected > 0) | (History.anxiety_detected > 0) | (History.fatigue_detected > 0)
    ).order_by(History.timestamp.desc()).first()

    if not latest_scan:
        return 0.0, 0.0, 0.0, 999.0

    hours_elapsed = (target_time - latest_scan.timestamp).total_seconds() / 3600.0
    decay_factor = math.exp(-DECAY_RATE_PER_HOUR * hours_elapsed)

    stress_decayed = latest_scan.stress_detected * decay_factor
    anxiety_decayed = latest_scan.anxiety_detected * decay_factor
    fatigue_decayed = latest_scan.fatigue_detected * decay_factor

    return stress_decayed, anxiety_decayed, fatigue_decayed, hours_elapsed

def predict_mood_intelligence(user_id):
    """
    Core DMI prediction logic.
    Attempts to train an online Ridge regression model on user's past face scan checkpoints.
    If samples < 3, falls back to a robust wellness heuristic.
    
    Returns a dict with:
        stress_prob (int): 0-100%
        fatigue_prob (int): 0-100%
        anxiety_prob (int): 0-100%
        factors (list): contributing explanation strings
        recommended_mood (str): 'sad', 'tired', 'happy', 'angry', 'anxious', 'romantic', 'motivated'
        playlist_recommendation (dict): selected playlist details
    """
    now = datetime.utcnow()
    
    # 1. Fetch current live features at 'now'
    session_songs, session_dur_mins, is_session_active = get_active_session_features(user_id, now)
    chat_stress, chat_fatigue, chat_count = get_nlp_sentiment_features(user_id, now)
    face_stress, face_anxiety, face_fatigue, face_age_hours = get_decayed_face_features(user_id, now)
    
    current_hour = now.hour
    current_weekday = now.weekday()
    
    # Check if we have enough historical data to fit a custom personalization model
    # We query history records that represent a face scan point (i.e. has non-zero face scan values)
    past_scans = History.query.filter(
        History.user_id == user_id,
        (History.stress_detected > 0) | (History.anxiety_detected > 0) | (History.fatigue_detected > 0)
    ).order_by(History.timestamp.asc()).all()
    
    trained_ml = False
    predicted_stress = 0.0
    predicted_fatigue = 0.0
    predicted_anxiety = 0.0
    
    # We require at least 3 historical face scans to perform personalized regression
    if len(past_scans) >= 3:
        try:
            X = []
            y_stress = []
            y_fatigue = []
            y_anxiety = []
            
            for i, scan in enumerate(past_scans):
                scan_time = scan.timestamp
                
                # Compute features *right before* this scan's timestamp
                s_songs, s_dur, _ = get_active_session_features(user_id, scan_time)
                s_chat_stress, s_chat_fatigue, _ = get_nlp_sentiment_features(user_id, scan_time)
                
                # Fetch lag-1 face scan metrics (the scan before this one)
                # Find the latest scan before scan_time
                lag_scan = History.query.filter(
                    History.user_id == user_id,
                    History.timestamp < scan_time,
                    (History.stress_detected > 0) | (History.anxiety_detected > 0) | (History.fatigue_detected > 0)
                ).order_by(History.timestamp.desc()).first()
                
                if lag_scan:
                    lag_hours = (scan_time - lag_scan.timestamp).total_seconds() / 3600.0
                    lag_decay = math.exp(-DECAY_RATE_PER_HOUR * lag_hours)
                    lag_stress = lag_scan.stress_detected * lag_decay
                    lag_anxiety = lag_scan.anxiety_detected * lag_decay
                    lag_fatigue = lag_scan.fatigue_detected * lag_decay
                else:
                    lag_stress, lag_anxiety, lag_fatigue = 0.0, 0.0, 0.0
                
                # Features list
                features = [
                    scan_time.hour,
                    scan_time.weekday(),
                    s_songs,
                    s_dur,
                    s_chat_stress,
                    s_chat_fatigue,
                    lag_stress,
                    lag_anxiety,
                    lag_fatigue
                ]
                
                X.append(features)
                y_stress.append(scan.stress_detected)
                y_fatigue.append(scan.fatigue_detected)
                y_anxiety.append(scan.anxiety_detected)
            
            X_arr = np.array(X)
            
            # Fit SimpleRidge models
            model_stress = SimpleRidge(alpha=10.0)
            model_stress.fit(X_arr, np.array(y_stress))
            
            model_fatigue = SimpleRidge(alpha=10.0)
            model_fatigue.fit(X_arr, np.array(y_fatigue))

            model_anxiety = SimpleRidge(alpha=10.0)
            model_anxiety.fit(X_arr, np.array(y_anxiety))
            
            # Predict
            live_features = np.array([[
                current_hour,
                current_weekday,
                session_songs,
                session_dur_mins,
                chat_stress,
                chat_fatigue,
                face_stress,
                face_anxiety,
                face_fatigue
            ]])
            
            predicted_stress = float(model_stress.predict(live_features)[0])
            predicted_fatigue = float(model_fatigue.predict(live_features)[0])
            predicted_anxiety = float(model_anxiety.predict(live_features)[0])
            
            trained_ml = True
            logger.info(f"DMI: Trained regression models for user {user_id} using {len(past_scans)} scans.")
            
        except Exception as e:
            logger.error(f"DMI: Failed to train personalized regression for user {user_id}: {e}", exc_info=True)
            trained_ml = False

    # 2. Heuristic fallback / combined weights if not trained or if model outputs are crazy
    if not trained_ml:
        # Wellness Heuristic calculations:
        # Base levels
        stress_h = 30.0
        fatigue_h = 25.0
        anxiety_h = 20.0
        
        # A. Time of day
        # Late night work session (21:00 to 04:00)
        if current_hour >= 21 or current_hour < 4:
            stress_h += 15.0
            fatigue_h += 20.0
        # Normal working hours peak (10:00 to 17:00)
        elif 10 <= current_hour <= 17:
            stress_h += 10.0
            
        # B. Behavioral session duration & play counts
        if is_session_active:
            if session_dur_mins > 120:  # > 2 hours
                stress_h += 25.0
                fatigue_h += 30.0
            elif session_dur_mins > 60:  # > 1 hour
                stress_h += 15.0
                fatigue_h += 20.0
            elif session_dur_mins > 30:  # > 30 mins
                stress_h += 8.0
                fatigue_h += 10.0
                
            if session_songs > 15:
                stress_h += 10.0
                fatigue_h += 15.0
        
        # C. Chat logs NLP Sentiment
        if chat_count > 0:
            stress_h += chat_stress * 0.45
            fatigue_h += chat_fatigue * 0.45
            anxiety_h += (chat_stress + chat_fatigue) * 0.2
            
        # D. Decayed Face Scans
        if face_age_hours < 12.0:
            stress_h += face_stress * 0.5
            anxiety_h += face_anxiety * 0.5
            fatigue_h += face_fatigue * 0.5
            
        predicted_stress = stress_h
        predicted_fatigue = fatigue_h
        predicted_anxiety = anxiety_h

    # Cap values to [0, 100]
    predicted_stress = max(0.0, min(100.0, predicted_stress))
    predicted_fatigue = max(0.0, min(100.0, predicted_fatigue))
    predicted_anxiety = max(0.0, min(100.0, predicted_anxiety))

    # 3. Generate Contributing Factors explanation strings
    factors = []
    
    # Analyze contributing components
    if is_session_active and session_dur_mins > 60:
        factors.append(f"Extended listening session ({round(session_dur_mins/60.0, 1)} hours active)")
    elif is_session_active and session_songs > 10:
        factors.append(f"Continuous play cycle of {session_songs} songs")
        
    if chat_count > 0 and (chat_stress > 40 or chat_fatigue > 40):
        factors.append("Fatigue & stress cues analyzed in recent chat queries")
        
    if face_age_hours < 8.0 and (face_stress > 50 or face_fatigue > 50):
        factors.append("Camera micro-expressions from recent scan indicate strain")
        
    if current_hour >= 22 or current_hour < 4:
        factors.append("Late-night transition patterns")
    elif 13 <= current_hour <= 16:
        factors.append("Mid-afternoon energy slump window")

    # Ensure we always return at least 2 factors for completeness
    if len(factors) < 2:
        if current_weekday >= 5:
            factors.append("Weekend recovery phase")
        else:
            factors.append("Standard weekday pacing")
        
        if not factors or len(factors) < 2:
            factors.append("Time-of-day circadian rhythm projection")
            
    # Deduplicate factors
    factors = list(dict.fromkeys(factors))

    # 4. Determine Recommended Recovery Mood & Playlist
    # Standard fallback recommendation mapping based on predicted states
    # If stress or anxiety is dominant, suggest 'anxious' (Calming/Soothe)
    # If fatigue is dominant, suggest 'tired' (Relax/Unwind)
    # If both are low, suggest 'happy' or 'romantic' or 'motivated' depending on time/history
    max_state = max(predicted_stress, predicted_fatigue, predicted_anxiety)
    
    if max_state < 45.0:
        # Happy / Motivated zone
        if 6 <= current_hour <= 12:
            recommended_mood = 'motivated'
        else:
            recommended_mood = 'happy'
    else:
        # Recovery zone
        if predicted_stress >= predicted_fatigue and predicted_stress >= predicted_anxiety:
            recommended_mood = 'anxious'  # Calm Your Mind playlist
        elif predicted_fatigue >= predicted_stress:
            recommended_mood = 'tired'    # Relax & Unwind playlist
        else:
            recommended_mood = 'anxious'

    # Retrieve songs for this playlist
    from routes.music import MOOD_PLAYLISTS, get_db_songs_for_mood
    pl_template = MOOD_PLAYLISTS.get(recommended_mood, MOOD_PLAYLISTS['happy'])
    db_songs = get_db_songs_for_mood(recommended_mood)
    songs = db_songs if db_songs else pl_template['songs']

    playlist_recommendation = {
        'label': pl_template['label'],
        'emoji': pl_template['emoji'],
        'color': pl_template['color'],
        'mood': recommended_mood,
        'songs': songs[:6]
    }

    return {
        'stress_prob': int(round(predicted_stress)),
        'fatigue_prob': int(round(predicted_fatigue)),
        'anxiety_prob': int(round(predicted_anxiety)),
        'factors': factors[:3],
        'recommended_mood': recommended_mood,
        'playlist_recommendation': playlist_recommendation,
        'is_ml_active': trained_ml
    }
