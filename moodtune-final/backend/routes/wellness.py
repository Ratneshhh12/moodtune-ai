"""Wellness routes - journal streaks, mood tracking, focus timer and achievements"""
import logging
from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from config.database import db
from models.journal import JournalEntry
from models.focus import FocusSession
from models.history import History

logger = logging.getLogger(__name__)
wellness_bp = Blueprint('wellness', __name__)

def calculate_streaks(entries, tz_offset=0):
    if not entries:
        return 0, 0
    
    # Shift each entry's UTC timestamp by the user's timezone offset to get the user's local date
    local_dates = set()
    for e in entries:
        local_dt = e.timestamp - timedelta(minutes=tz_offset)
        local_dates.add(local_dt.date())
        
    dates = sorted(list(local_dates))
    
    # Calculate longest streak
    longest = 0
    current_temp = 0
    prev_date = None
    for d in dates:
        if prev_date is None:
            current_temp = 1
        elif (d - prev_date).days == 1:
            current_temp += 1
        elif (d - prev_date).days > 1:
            current_temp = 1
        prev_date = d
        if current_temp > longest:
            longest = current_temp

    # Calculate current streak using the user's local "today"
    today_local = (datetime.utcnow() - timedelta(minutes=tz_offset)).date()
    if today_local in dates:
        start_date = today_local
    elif (today_local - timedelta(days=1)) in dates:
        start_date = today_local - timedelta(days=1)
    else:
        return 0, longest
        
    current = 0
    check_date = start_date
    while check_date in dates:
        current += 1
        check_date -= timedelta(days=1)
        
    return current, longest

@wellness_bp.route('/journal', methods=['GET', 'POST'])
@jwt_required()
def journal():
    user_id = int(get_jwt_identity())
    
    if request.method == 'GET':
        try:
            tz_offset = int(request.args.get('tz_offset', 0))
            entries = JournalEntry.query.filter_by(user_id=user_id)\
                .order_by(JournalEntry.timestamp.desc()).all()
            
            # Calculate streak stats
            current_streak, longest_streak = calculate_streaks(entries, tz_offset)
            
            return jsonify({
                'entries': [e.to_dict() for e in entries],
                'streak': {
                    'current': current_streak,
                    'longest': longest_streak
                }
            }), 200
        except Exception as e:
            logger.error(f"Error fetching journals: {e}")
            return jsonify({'error': 'Failed to fetch journal entries'}), 500
            
    elif request.method == 'POST':
        try:
            data = request.get_json() or {}
            content = data.get('content', '').strip()
            mood = data.get('mood', 'neutral').strip().lower()
            prompt = data.get('prompt', '').strip() or None
            tz_offset = int(data.get('tz_offset', 0))
            
            if not content:
                return jsonify({'error': 'Journal reflection content is required'}), 400
                
            entry = JournalEntry(
                user_id=user_id,
                content=content,
                mood=mood,
                prompt=prompt,
                timestamp=datetime.utcnow()
            )
            db.session.add(entry)
            db.session.commit()
            
            # Recalculate streak
            all_entries = JournalEntry.query.filter_by(user_id=user_id).all()
            current_streak, longest_streak = calculate_streaks(all_entries, tz_offset)
            
            return jsonify({
                'message': 'Journal reflection saved successfully',
                'entry': entry.to_dict(),
                'streak': {
                    'current': current_streak,
                    'longest': longest_streak
                }
            }), 201
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating journal: {e}")
            return jsonify({'error': 'Failed to save journal entry'}), 500

@wellness_bp.route('/reflection/questions', methods=['GET'])
@jwt_required()
def reflection_questions():
    questions = [
        "What made you happiest this week?",
        "What was a challenge you faced and how did you overcome it?",
        "Who is one person you are grateful for this week and why?",
        "What did you learn about yourself through your emotions this week?",
        "Which song resonated with you the most this week and why?",
        "What is a goal you want to set for next week to improve your mental wellness?"
    ]
    return jsonify({'questions': questions}), 200

@wellness_bp.route('/focus', methods=['GET', 'POST'])
@jwt_required()
def focus():
    user_id = int(get_jwt_identity())
    
    if request.method == 'GET':
        try:
            sessions = FocusSession.query.filter_by(user_id=user_id)\
                .order_by(FocusSession.timestamp.desc()).all()
            return jsonify({'sessions': [s.to_dict() for s in sessions]}), 200
        except Exception as e:
            logger.error(f"Error fetching focus sessions: {e}")
            return jsonify({'error': 'Failed to fetch focus sessions'}), 500
            
    elif request.method == 'POST':
        try:
            data = request.get_json() or {}
            duration = data.get('duration_minutes', 25)
            category = data.get('category', 'General').strip()
            
            session = FocusSession(
                user_id=user_id,
                duration_minutes=int(duration),
                category=category,
                timestamp=datetime.utcnow()
            )
            db.session.add(session)
            db.session.commit()
            
            # Count total sessions
            total_sessions = FocusSession.query.filter_by(user_id=user_id).count()
            
            return jsonify({
                'message': 'Focus session logged successfully',
                'session': session.to_dict(),
                'total_sessions': total_sessions
            }), 201
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating focus session: {e}")
            return jsonify({'error': 'Failed to log focus session'}), 500

@wellness_bp.route('/stats', methods=['GET'])
@jwt_required()
def stats():
    try:
        user_id = int(get_jwt_identity())
        tz_offset = int(request.args.get('tz_offset', 0))
        
        # 1. Fetch Journal Entries & calculate streak
        journals = JournalEntry.query.filter_by(user_id=user_id).all()
        current_streak, longest_streak = calculate_streaks(journals, tz_offset)
        
        # 2. Fetch unique days of mood tracking (from Journal Entries + History scan items)
        # Shift each timestamp to local time using timezone offset
        journal_dates = {(j.timestamp - timedelta(minutes=tz_offset)).date() for j in journals}
        
        history_entries = History.query.filter_by(user_id=user_id).all()
        history_dates = {(h.timestamp - timedelta(minutes=tz_offset)).date() for h in history_entries}
        
        all_mood_dates = sorted(list(journal_dates.union(history_dates)))
        
        # We can also compute date strings for the frontend
        mood_dates_str = [d.isoformat() for d in all_mood_dates]
        
        total_mood_days = len(all_mood_dates)
        
        # 3. Focus sessions info
        focus_sessions = FocusSession.query.filter_by(user_id=user_id).all()
        total_focus_sessions = len(focus_sessions)
        total_focus_minutes = sum(fs.duration_minutes for fs in focus_sessions)
        
        # 4. Badges configuration & state
        badges = [
            {
                'id': 'journal_streak_7',
                'title': '7-Day Reflection Streak',
                'description': 'Write a journal reflection for 7 consecutive days',
                'type': 'journal',
                'target': 7,
                'current': current_streak,
                'unlocked': current_streak >= 7
            },
            {
                'id': 'mood_tracker_30',
                'title': '30-Day Mood Tracker',
                'description': 'Track your mood (via journal or emotion scan) on 30 different days',
                'type': 'mood',
                'target': 30,
                'current': total_mood_days,
                'unlocked': total_mood_days >= 30
            },
            {
                'id': 'focus_bronze',
                'title': 'Focus Novice',
                'description': 'Complete 1 focus session',
                'type': 'focus',
                'target': 1,
                'current': total_focus_sessions,
                'unlocked': total_focus_sessions >= 1
            },
            {
                'id': 'focus_silver',
                'title': 'Focus Scholar',
                'description': 'Complete 5 focus sessions',
                'type': 'focus',
                'target': 5,
                'current': total_focus_sessions,
                'unlocked': total_focus_sessions >= 5
            },
            {
                'id': 'focus_gold',
                'title': 'Focus Champion',
                'description': 'Complete 10 focus sessions',
                'type': 'focus',
                'target': 10,
                'current': total_focus_sessions,
                'unlocked': total_focus_sessions >= 10
            },
            {
                'id': 'focus_platinum',
                'title': 'Zen Grandmaster',
                'description': 'Complete 25 focus sessions',
                'type': 'focus',
                'target': 25,
                'current': total_focus_sessions,
                'unlocked': total_focus_sessions >= 25
            }
        ]
        
        return jsonify({
            'journal': {
                'current_streak': current_streak,
                'longest_streak': longest_streak,
                'total_reflections': len(journals)
            },
            'mood': {
                'total_days_tracked': total_mood_days,
                'tracked_dates': mood_dates_str
            },
            'focus': {
                'total_sessions': total_focus_sessions,
                'total_minutes': total_focus_minutes
            },
            'badges': badges
        }), 200
        
    except Exception as e:
        logger.error(f"Error compiling wellness stats: {e}")
        return jsonify({'error': 'Failed to compile stats'}), 500
