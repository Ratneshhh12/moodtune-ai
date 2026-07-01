"""Social routes - friends list, search, and mood matching"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from config.database import db
from models.user import User, Friendship
from models.history import History
from models.circle_member import CircleMember
from models.circle_status import CircleStatus
from models.notification import Notification
from flask_mail import Message
import os
import logging

logger = logging.getLogger(__name__)
social_bp = Blueprint('social', __name__)

def get_user_current_mood_info(user_id):
    """Get user's last detected emotion and calculate wellness index baselines"""
    last_record = History.query.filter_by(user_id=user_id).order_by(History.timestamp.desc()).first()
    mood = last_record.emotion_detected if last_record else 'neutral'
    
    # Standard wellness indexes mapped to detected emotions
    scores = {
        'happy':    {'happiness': 85, 'stress': 20, 'anxiety': 15, 'fatigue': 25},
        'neutral':  {'happiness': 60, 'stress': 30, 'anxiety': 20, 'fatigue': 35},
        'sad':      {'happiness': 35, 'stress': 55, 'anxiety': 45, 'fatigue': 50},
        'angry':    {'happiness': 25, 'stress': 80, 'anxiety': 60, 'fatigue': 40},
        'fearful':  {'happiness': 40, 'stress': 70, 'anxiety': 75, 'fatigue': 45},
        'surprised':{'happiness': 75, 'stress': 35, 'anxiety': 30, 'fatigue': 30},
        'disgusted':{'happiness': 40, 'stress': 50, 'anxiety': 35, 'fatigue': 40}
    }
    
    user_scores = scores.get(mood, scores['neutral'])
    return {
        'mood': mood,
        'happiness': user_scores['happiness'],
        'stress': user_scores['stress'],
        'anxiety': user_scores['anxiety'],
        'fatigue': user_scores['fatigue']
    }

@social_bp.route('/friends', methods=['GET'])
@jwt_required()
def get_friends():
    try:
        user_id = int(get_jwt_identity())
        # Query accepted friendships where user is either sender or receiver
        sent = Friendship.query.filter_by(user_id=user_id, status='accepted').all()
        received = Friendship.query.filter_by(friend_id=user_id, status='accepted').all()
        
        friends_list = []
        for f in sent:
            if f.friend:
                friends_list.append(f.friend)
        for f in received:
            if f.user:
                friends_list.append(f.user)
                
        # Append mood details to each friend dict
        res = []
        for friend in friends_list:
            friend_dict = friend.to_dict()
            friend_dict['mood_info'] = get_user_current_mood_info(friend.id)
            res.append(friend_dict)
            
        return jsonify({'friends': res}), 200
    except Exception as e:
        logger.error(f"Get friends error: {e}")
        return jsonify({'error': 'Failed to load friends list'}), 500

@social_bp.route('/users/search', methods=['GET'])
@jwt_required()
def search_users():
    try:
        user_id = int(get_jwt_identity())
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'users': []}), 200
            
        # Search other verified users by name or email
        users = User.query.filter(
            (User.id != user_id) & 
            ((User.name.like(f"%{query}%")) | (User.email.like(f"%{query}%")))
        ).limit(10).all()
        
        # Check current friendship status for each user
        res = []
        for u in users:
            friendship = Friendship.query.filter(
                ((Friendship.user_id == user_id) & (Friendship.friend_id == u.id)) |
                ((Friendship.user_id == u.id) & (Friendship.friend_id == user_id))
            ).first()
            
            u_dict = u.to_dict()
            u_dict['friendship_status'] = friendship.status if friendship else 'none'
            res.append(u_dict)
            
        return jsonify({'users': res}), 200
    except Exception as e:
        logger.error(f"Search users error: {e}")
        return jsonify({'error': 'Search query failed'}), 500

@social_bp.route('/friends/add', methods=['POST'])
@jwt_required()
def add_friend():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json() or {}
        friend_id = data.get('friend_id')
        if not friend_id:
            return jsonify({'error': 'friend_id is required'}), 400
            
        friend_id = int(friend_id)
        if user_id == friend_id:
            return jsonify({'error': 'You cannot add yourself'}), 400
            
        # Check if user exists
        friend = User.query.get(friend_id)
        if not friend:
            return jsonify({'error': 'User not found'}), 404
            
        # Check if friendship already exists
        existing = Friendship.query.filter(
            ((Friendship.user_id == user_id) & (Friendship.friend_id == friend_id)) |
            ((Friendship.user_id == friend_id) & (Friendship.friend_id == user_id))
        ).first()
        
        if existing:
            if existing.status == 'accepted':
                return jsonify({'message': 'Already friends'}), 200
            # Accept if requested by other user, or update status
            existing.status = 'accepted'
            db.session.commit()
            return jsonify({'message': 'Friend connection accepted'}), 200
            
        # Create instant friendship
        new_friendship = Friendship(user_id=user_id, friend_id=friend_id, status='accepted')
        db.session.add(new_friendship)
        db.session.commit()
        return jsonify({'message': 'Friend added successfully!'}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Add friend error: {e}")
        return jsonify({'error': 'Failed to add friend'}), 500

@social_bp.route('/friends/<int:friend_id>', methods=['DELETE'])
@jwt_required()
def remove_friend(friend_id):
    try:
        user_id = int(get_jwt_identity())
        friendship = Friendship.query.filter(
            ((Friendship.user_id == user_id) & (Friendship.friend_id == friend_id)) |
            ((Friendship.user_id == friend_id) & (Friendship.friend_id == user_id))
        ).first()
        
        if not friendship:
            return jsonify({'error': 'Friendship connection not found'}), 404
            
        db.session.delete(friendship)
        db.session.commit()
        return jsonify({'message': 'Friend removed successfully'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Remove friend error: {e}")
        return jsonify({'error': 'Failed to remove friend'}), 500

@social_bp.route('/compare-mood/<int:friend_id>', methods=['GET'])
@jwt_required()
def compare_mood(friend_id):
    try:
        user_id = int(get_jwt_identity())
        friend = User.query.get(friend_id)
        if not friend:
            return jsonify({'error': 'Friend not found'}), 404
            
        user_mood = get_user_current_mood_info(user_id)
        friend_mood = get_user_current_mood_info(friend_id)
        
        # Calculate matching percentage based on Manhattan distance differences
        diff = (
            abs(user_mood['happiness'] - friend_mood['happiness']) +
            abs(user_mood['stress'] - friend_mood['stress']) +
            abs(user_mood['anxiety'] - friend_mood['anxiety']) +
            abs(user_mood['fatigue'] - friend_mood['fatigue'])
        )
        match_percentage = int(max(0, 100 - (diff / 4.0)))
        
        # Formulate custom dynamic analysis descriptions
        if user_mood['mood'] == friend_mood['mood']:
            if user_mood['mood'] == 'happy':
                desc = "Perfect harmony! Both of you are feeling happy and energized today. It is a great time to listen to upbeat tracks together!"
            elif user_mood['mood'] in ('sad', 'fearful'):
                desc = "Emotional resonance. You and your friend are both navigating reflective or anxious moods. Soft, comforting acoustics will help you both unwind."
            else:
                desc = f"Aligned states. Both of you are currently in a {user_mood['mood']} state. Enjoy some balanced ambient tracks."
        else:
            desc = f"Complementary energies! You feel {user_mood['mood'].upper()} while your friend is feeling {friend_mood['mood'].upper()}. Try building a collaborative playlist to blend your vibes!"
            
        return jsonify({
            'user_mood': user_mood,
            'friend_mood': friend_mood,
            'match_percentage': match_percentage,
            'description': desc
        }), 200
    except Exception as e:
        logger.error(f"Compare mood error: {e}")
        return jsonify({'error': 'Failed to calculate mood alignment'}), 500

# GET /circle
@social_bp.route('/circle', methods=['GET'])
@jwt_required()
def get_circle():
    try:
        user_id = int(get_jwt_identity())
        circle_entries = CircleMember.query.filter_by(user_id=user_id).all()
        circle_list = []
        for entry in circle_entries:
            d = entry.to_dict()
            d['mood_info'] = get_user_current_mood_info(entry.contact_id)
            circle_list.append(d)
        return jsonify({'circle': circle_list}), 200
    except Exception as e:
        logger.error(f"Get circle error: {e}")
        return jsonify({'error': 'Failed to load circle'}), 500

# POST /circle/add
@social_bp.route('/circle/add', methods=['POST'])
@jwt_required()
def add_circle_member():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json() or {}
        contact_id = data.get('friend_id') or data.get('contact_id')
        if not contact_id:
            return jsonify({'error': 'friend_id or contact_id is required'}), 400
        contact_id = int(contact_id)
        if user_id == contact_id:
            return jsonify({'error': 'You cannot add yourself to your circle'}), 400
            
        existing = CircleMember.query.filter_by(user_id=user_id, contact_id=contact_id).first()
        if existing:
            return jsonify({'message': 'Already in your circle'}), 200
            
        new_entry = CircleMember(user_id=user_id, contact_id=contact_id)
        db.session.add(new_entry)
        db.session.commit()
        return jsonify({'message': 'Added to your circle successfully!'}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Add circle error: {e}")
        return jsonify({'error': 'Failed to add to circle'}), 500

# DELETE /circle/remove/<int:contact_id>
@social_bp.route('/circle/remove/<int:contact_id>', methods=['DELETE'])
@jwt_required()
def remove_circle_member(contact_id):
    try:
        user_id = int(get_jwt_identity())
        entry = CircleMember.query.filter_by(user_id=user_id, contact_id=contact_id).first()
        if not entry:
            return jsonify({'error': 'Circle contact not found'}), 404
        db.session.delete(entry)
        db.session.commit()
        return jsonify({'message': 'Removed from your circle successfully'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Remove circle member error: {e}")
        return jsonify({'error': 'Failed to remove circle member'}), 500

# POST /circle/share
@social_bp.route('/circle/share', methods=['POST'])
@jwt_required()
def share_mood_with_circle():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json() or {}
        mood = data.get('mood', 'neutral').strip().lower()
        content = data.get('content', '').strip()
        
        if not content:
            return jsonify({'error': 'Sharing message is required'}), 400
            
        new_status = CircleStatus(user_id=user_id, mood=mood, content=content)
        db.session.add(new_status)
        db.session.commit()
        
        # Notify all circle contacts added by the current user
        circle_members = CircleMember.query.filter_by(user_id=user_id).all()
        notifier_user = User.query.get(user_id)
        
        for member in circle_members:
            notif = Notification(
                user_id=member.contact_id,
                sender_id=user_id,
                message=content,
                mood=mood
            )
            db.session.add(notif)
            
            try:
                recipient = User.query.get(member.contact_id)
                mail_username = os.getenv('MAIL_USERNAME', '')
                is_mail_configured = mail_username and mail_username not in ['', 'your_gmail_address@gmail.com']
                
                if is_mail_configured and recipient and recipient.email:
                    from app import mail
                    msg = Message(
                        subject=f"MoodTune AI - Circle Update from {notifier_user.name}",
                        recipients=[recipient.email],
                        body=(
                            f"Hi {recipient.name},\n\n"
                            f"Your close circle contact {notifier_user.name} shared a mood update:\n\n"
                            f"Mood: {mood.upper()}\n"
                            f"Message: \"{content}\"\n\n"
                            f"Log in to MoodTune AI to check in on them!\n\n"
                            f"Best,\n"
                            f"MoodTune AI Team"
                        )
                    )
                    mail.send(msg)
                    logger.info(f"Email notification sent to {recipient.email}")
            except Exception as mail_err:
                logger.warning(f"Failed to send email to circle member {member.contact_id}: {mail_err}")
                
        db.session.commit()
        return jsonify({'message': 'Vibe shared with your circle successfully!', 'status': new_status.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Share mood error: {e}")
        return jsonify({'error': 'Failed to broadcast update'}), 500

# GET /circle/feed
@social_bp.route('/circle/feed', methods=['GET'])
@jwt_required()
def get_circle_feed():
    try:
        user_id = int(get_jwt_identity())
        # The user wants to see updates from people who have added *them* to their circle
        trusted_by_others = CircleMember.query.filter_by(contact_id=user_id).all()
        user_ids = [entry.user_id for entry in trusted_by_others]
        user_ids.append(user_id)
        
        feed_updates = CircleStatus.query.filter(CircleStatus.user_id.in_(user_ids))\
            .order_by(CircleStatus.created_at.desc()).limit(30).all()
            
        return jsonify({'feed': [u.to_dict() for u in feed_updates]}), 200
    except Exception as e:
        logger.error(f"Fetch circle feed error: {e}")
        return jsonify({'error': 'Failed to fetch circle feed'}), 500

# GET /notifications
@social_bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    try:
        user_id = int(get_jwt_identity())
        notifs = Notification.query.filter_by(user_id=user_id)\
            .order_by(Notification.created_at.desc()).limit(20).all()
        return jsonify({'notifications': [n.to_dict() for n in notifs]}), 200
    except Exception as e:
        logger.error(f"Get notifications error: {e}")
        return jsonify({'error': 'Failed to load notifications'}), 500

# POST /notifications/read
@social_bp.route('/notifications/read', methods=['POST'])
@jwt_required()
def mark_notifications_read():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json() or {}
        notification_ids = data.get('notification_ids')
        
        if notification_ids:
            ids = [int(nid) for nid in notification_ids]
            Notification.query.filter(Notification.user_id == user_id, Notification.id.in_(ids))\
                .update({Notification.is_read: True}, synchronize_session=False)
        else:
            Notification.query.filter_by(user_id=user_id)\
                .update({Notification.is_read: True}, synchronize_session=False)
                
        db.session.commit()
        return jsonify({'message': 'Notifications marked as read'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Mark notifications read error: {e}")
        return jsonify({'error': 'Failed to mark notifications read'}), 500

# GET /social/playlists
@social_bp.route('/playlists', methods=['GET'])
@jwt_required()
def get_social_playlists():
    try:
        user_id = int(get_jwt_identity())
        sent = Friendship.query.filter_by(user_id=user_id, status='accepted').all()
        received = Friendship.query.filter_by(friend_id=user_id, status='accepted').all()
        friend_ids = [f.friend_id for f in sent if f.friend] + [f.user_id for f in received if f.user]
        
        if not friend_ids:
            return jsonify({'playlists': []}), 200
            
        from models.playlist import Playlist
        playlists = Playlist.query.filter(
            Playlist.user_id.in_(friend_ids) & 
            ((Playlist.is_public == True) | (Playlist.is_collaborative == True))
        ).all()
        
        res = []
        for p in playlists:
            owner = User.query.get(p.user_id)
            d = p.to_dict()
            d['owner_name'] = owner.name if owner else 'Unknown'
            res.append(d)
            
        return jsonify({'playlists': res}), 200
    except Exception as e:
        logger.error(f"Get social playlists error: {e}")
        return jsonify({'error': 'Failed to load social playlists'}), 500

# GET /social/activity-feed
@social_bp.route('/activity-feed', methods=['GET'])
@jwt_required()
def get_social_activity_feed():
    try:
        user_id = int(get_jwt_identity())
        sent = Friendship.query.filter_by(user_id=user_id, status='accepted').all()
        received = Friendship.query.filter_by(friend_id=user_id, status='accepted').all()
        friend_ids = [f.friend_id for f in sent if f.friend] + [f.user_id for f in received if f.user]
        
        if not friend_ids:
            return jsonify({'feed': []}), 200
            
        recent_logs = History.query.filter(History.user_id.in_(friend_ids))\
            .order_by(History.timestamp.desc()).limit(20).all()
            
        feed_items = []
        for log in recent_logs:
            friend = User.query.get(log.user_id)
            if friend:
                feed_items.append({
                    'id': log.id,
                    'user_name': friend.name,
                    'user_avatar_style': friend.avatar_style,
                    'user_profile_image': friend.profile_image,
                    'song_title': log.song.title if log.song else 'Unknown Song',
                    'song_artist': log.song.artist if log.song else 'Unknown Artist',
                    'song_cover': log.song.cover_url if log.song else '',
                    'emotion': log.emotion_detected,
                    'timestamp': log.timestamp.isoformat()
                })
        return jsonify({'feed': feed_items}), 200
    except Exception as e:
        logger.error(f"Get social activity feed error: {e}")
        return jsonify({'error': 'Failed to load activity feed'}), 500


