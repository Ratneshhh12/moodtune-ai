import os
import random
import logging
import numpy as np
from config.database import db

class SimpleOneHotEncoder:
    def __init__(self, handle_unknown='ignore', sparse_output=False):
        self.categories_ = []
        self.feature_map = {}

    def fit(self, X):
        for col_idx in range(X.shape[1]):
            unique_vals = sorted(list(set(X[:, col_idx])))
            self.categories_.append(unique_vals)
            for val in unique_vals:
                feature_name = f"{['genre', 'artist', 'mood'][col_idx]}_{val}"
                self.feature_map[feature_name] = len(self.feature_map)
        return self

    def transform(self, X):
        num_features = len(self.feature_map)
        encoded = np.zeros((X.shape[0], num_features))
        for row_idx, row in enumerate(X):
            for col_idx, val in enumerate(row):
                feature_name = f"{['genre', 'artist', 'mood'][col_idx]}_{val}"
                if feature_name in self.feature_map:
                    encoded[row_idx, self.feature_map[feature_name]] = 1.0
        return encoded

    def get_feature_names_out(self, names=None):
        sorted_features = sorted(self.feature_map.keys(), key=lambda k: self.feature_map[k])
        return np.array(sorted_features)

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
from models.song import Song
from models.history import History
from models.playlist import Favorite
from utils.youtube_service import get_recommendations_by_mood

logger = logging.getLogger(__name__)

# In-memory cache for user models
# user_id -> { 'model': model, 'encoder': encoder, 'history_len': int, 'fav_len': int }
MODEL_CACHE = {}

def get_interaction_counts(user_id):
    """Get the current count of history and favorite records for cache validation"""
    try:
        history_len = History.query.filter_by(user_id=user_id).count()
        fav_len = Favorite.query.filter_by(user_id=user_id).count()
        return history_len, fav_len
    except Exception as e:
        logger.error(f"Error getting interaction counts: {e}")
        return 0, 0

def train_user_recommendation_model(user_id):
    """
    Train a Ridge regression recommendation model for a specific user.
    Learns their categorical preferences for genre, artist, and mood.
    """
    try:
        history_len, fav_len = get_interaction_counts(user_id)
        
        # We need at least 3 unique songs played or favorited to run personalization.
        # Limit history/favorites to top 30 to make training extremely fast and relevant.
        from sqlalchemy.orm import joinedload
        history = History.query.filter_by(user_id=user_id)\
            .options(joinedload(History.song))\
            .order_by(History.timestamp.desc())\
            .limit(30).all()
        favorites = Favorite.query.filter_by(user_id=user_id)\
            .options(joinedload(Favorite.song))\
            .limit(30).all()
        
        interacted_song_ids = {h.song_id for h in history if h.song_id} | {f.song_id for f in favorites if f.song_id}
        
        if len(interacted_song_ids) < 3:
            logger.info(f"User {user_id} has only {len(interacted_song_ids)} unique interactions (requires 3). Cold start mode.")
            return None, None

        logger.info(f"Training personalized recommendation model for User {user_id} (History: {len(history)}, Favorites: {len(favorites)})")

        # Build positive training samples
        X_cats = []
        X_context = []
        y = []

        user_favs = {f.song_id for f in favorites}

        # 1. From History
        for h in history:
            if not h.song:
                continue
            X_cats.append([h.song.genre, h.song.artist, h.song.mood])
            # Is mood matching what the user felt when listening?
            is_match = 1 if h.song.mood.lower() == h.emotion_detected.lower() else 0
            X_context.append([is_match])
            # Target weight: base is 1.0, 2.5 if also favorited
            weight = 2.5 if h.song_id in user_favs else 1.0
            y.append(weight)

        # 2. From Favorites (if not in history)
        history_song_ids = {h.song_id for h in history}
        for f in favorites:
            if f.song_id not in history_song_ids:
                if not f.song:
                    continue
                X_cats.append([f.song.genre, f.song.artist, f.song.mood])
                X_context.append([1]) # Assume match since favorited
                y.append(3.0) # High weight for favorited only

        # 3. Negative samples (songs the user has NOT interacted with)
        # Fetch 40 random songs directly from DB to prevent loading all database songs
        neg_samples = []
        try:
            if interacted_song_ids:
                neg_samples = Song.query.filter(~Song.id.in_(interacted_song_ids))\
                    .order_by(db.func.random()).limit(40).all()
            else:
                neg_samples = Song.query.order_by(db.func.random()).limit(40).all()
        except Exception as ne:
            logger.warning(f"Error querying negative samples: {ne}")
            neg_samples = Song.query.order_by(db.func.random()).limit(40).all()

        all_moods = ['happy', 'sad', 'angry', 'neutral', 'surprised', 'fearful', 'disgusted']
        for s in neg_samples:
            X_cats.append([s.genre, s.artist, s.mood])
            # Random context mood for negative samples
            rand_mood = random.choice(all_moods)
            is_match = 1 if s.mood.lower() == rand_mood.lower() else 0
            X_context.append([is_match])
            y.append(0.0) # Target rating is 0

        # Fit SimpleOneHotEncoder on training samples only (handled robustly by ignore handle)
        train_cats = np.array(X_cats)
        encoder = SimpleOneHotEncoder(handle_unknown='ignore', sparse_output=False)
        encoder.fit(train_cats)

        # Encode training categories and combine with context features
        X_encoded = encoder.transform(train_cats)
        X_train = np.hstack((X_encoded, np.array(X_context)))
        y_train = np.array(y)

        # Train SimpleRidge Regression model (L2 regularization makes it robust to small data)
        model = SimpleRidge(alpha=1.0)
        model.fit(X_train, y_train)

        # Save to cache
        MODEL_CACHE[user_id] = {
            'model': model,
            'encoder': encoder,
            'history_len': history_len,
            'fav_len': fav_len
        }

        return model, encoder

    except Exception as e:
        logger.error(f"Error training recommendation model for user {user_id}: {e}", exc_info=True)
        return None, None

def get_user_model(user_id):
    """Retrieve user's recommendation model from cache or train a new one if stale/missing"""
    history_len, fav_len = get_interaction_counts(user_id)
    
    cached = MODEL_CACHE.get(user_id)
    if cached:
        # Check if user history or favorites have changed
        if cached['history_len'] == history_len and cached['fav_len'] == fav_len:
            return cached['model'], cached['encoder']
            
    # Retrain
    return train_user_recommendation_model(user_id)

def get_personalized_recommendations(user_id, mood, limit=10):
    """
    Generate custom recommendations by ranking candidate songs with the trained model.
    Falls back to public recommendations (rules) if model is not active.
    """
    try:
        model, encoder = get_user_model(user_id)
        if not model or not encoder:
            return None

        mood = mood.lower()
        
        # 1. Fetch Spotify / Youtube API recommendations for this mood (candidate set 1)
        spotify_candidates = get_recommendations_by_mood(mood, limit=30)
        
        # 2. Fetch local database songs for this mood (candidate set 2)
        db_candidates = Song.query.filter_by(mood=mood).all()
        db_list = [s.to_dict() for s in db_candidates]

        # 3. Fetch random other songs from DB to allow exploration and discovery (candidate set 3)
        exploration_songs = Song.query.filter(Song.mood != mood).order_by(db.func.random()).limit(20).all()
        exploration_list = [s.to_dict() for s in exploration_songs]

        # Merge and deduplicate candidates by spotify_id
        seen_ids = set()
        candidates = []
        for s in db_list + spotify_candidates + exploration_list:
            sid = s.get('spotify_id') or s.get('title')
            if sid not in seen_ids:
                seen_ids.add(sid)
                candidates.append(s)

        if not candidates:
            return None

        # Build prediction features for candidates
        X_cand_cats = []
        X_cand_context = []
        for s in candidates:
            # We map keys safely depending on whether candidate is dict or DB object
            genre = s.get('genre', 'Pop')
            artist = s.get('artist', 'Unknown')
            song_mood = s.get('mood', 'neutral')
            
            X_cand_cats.append([genre, artist, song_mood])
            is_match = 1 if song_mood.lower() == mood else 0
            X_cand_context.append([is_match])

        # Run predictions
        X_encoded = encoder.transform(np.array(X_cand_cats))
        X_predict = np.hstack((X_encoded, np.array(X_cand_context)))
        
        scores = model.predict(X_predict)

        # Rank candidates by predicted score
        ranked_candidates = []
        for s, score in zip(candidates, scores):
            # Attach score for debugging/insights
            s_copy = dict(s)
            s_copy['pref_score'] = round(float(score), 3)
            ranked_candidates.append((s_copy, score))

        ranked_candidates.sort(key=lambda x: x[1], reverse=True)
        return [item[0] for item in ranked_candidates[:limit]]

    except Exception as e:
        logger.error(f"Error generating personalized recommendations for user {user_id}: {e}", exc_info=True)
        return None

def get_model_status_and_preferences(user_id):
    """
    Expose model activation status, training stats, and learned categorical weights (coefficients).
    Used by the frontend dashboard.
    """
    try:
        history_len, fav_len = get_interaction_counts(user_id)
        
        # Get unique song count
        history = History.query.filter_by(user_id=user_id).all()
        favorites = Favorite.query.filter_by(user_id=user_id).all()
        unique_song_ids = {h.song_id for h in history if h.song_id} | {f.song_id for f in favorites if f.song_id}
        
        stats = {
            'total_plays': history_len,
            'total_favorites': fav_len,
            'unique_songs_interacted': len(unique_song_ids)
        }

        model, encoder = get_user_model(user_id)
        if not model or not encoder:
            return {
                'status': 'cold_start',
                'stats': stats,
                'message': 'Personalized AI engine warming up. Listen to at least 3 unique songs to train your model.'
            }

        # Extract model coefficients (preference weights)
        feature_names = encoder.get_feature_names_out(['genre', 'artist', 'mood'])
        coefs = model.coef_[:-1] # Exclude 'is_matching_mood'
        
        feat_coefs = list(zip(feature_names, coefs))

        # Sort and clean categories
        top_genres = []
        top_artists = []
        top_moods = []

        for feat, val in feat_coefs:
            val = round(float(val), 4)
            if feat.startswith('genre_'):
                top_genres.append([feat.replace('genre_', ''), val])
            elif feat.startswith('artist_'):
                top_artists.append([feat.replace('artist_', ''), val])
            elif feat.startswith('mood_'):
                top_moods.append([feat.replace('mood_', ''), val])

        # Sort descending by weight
        top_genres.sort(key=lambda x: x[1], reverse=True)
        top_artists.sort(key=lambda x: x[1], reverse=True)
        top_moods.sort(key=lambda x: x[1], reverse=True)

        # Context weight (how important is matching mood vs genre/artist)
        context_weight = round(float(model.coef_[-1]), 4)

        return {
            'status': 'active',
            'stats': stats,
            'context_weight': context_weight,
            'learned_preferences': {
                'top_genres': top_genres[:6],
                'top_artists': top_artists[:6],
                'top_moods': top_moods[:6]
            }
        }

    except Exception as e:
        logger.error(f"Error getting model status for user {user_id}: {e}", exc_info=True)
        return {
            'status': 'error',
            'message': str(e)
        }

def force_retrain_model(user_id):
    """Clear cached model and retrain from scratch"""
    if user_id in MODEL_CACHE:
        del MODEL_CACHE[user_id]
    return train_user_recommendation_model(user_id)
