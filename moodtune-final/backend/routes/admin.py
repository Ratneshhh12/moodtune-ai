"""Admin panel routes"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from config.database import db
from models.user import User
from models.song import Song
from models.history import History
from models.playlist import Playlist, Favorite
from functools import wraps
import logging

logger = logging.getLogger(__name__)
admin_bp = Blueprint('admin', __name__)

def admin_required(f):
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated

@admin_bp.route('/dashboard', methods=['GET'])
@admin_required
def dashboard():
    stats = {
        'total_users': User.query.count(),
        'total_songs': Song.query.count(),
        'total_plays': History.query.count(),
        'total_playlists': Playlist.query.count(),
        'total_favorites': Favorite.query.count(),
        'top_songs': [s.to_dict() for s in Song.query.order_by(Song.play_count.desc()).limit(5).all()],
        'recent_users': [u.to_dict() for u in User.query.order_by(User.created_at.desc()).limit(5).all()],
    }
    return jsonify(stats), 200

@admin_bp.route('/users', methods=['GET'])
@admin_required
def list_users():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    users = User.query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'users': [u.to_dict() for u in users.items],
        'total': users.total, 'pages': users.pages, 'page': page
    }), 200

@admin_bp.route('/users/<int:user_id>', methods=['PUT', 'DELETE'])
@admin_required
def manage_user(user_id):
    user = User.query.get_or_404(user_id)
    if request.method == 'PUT':
        data = request.get_json()
        if 'is_admin' in data:
            user.is_admin = data['is_admin']
        if 'name' in data:
            user.name = data['name']
        db.session.commit()
        return jsonify(user.to_dict()), 200
    elif request.method == 'DELETE':
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'User deleted'}), 200

@admin_bp.route('/songs', methods=['GET', 'POST'])
@admin_required
def manage_songs():
    if request.method == 'GET':
        songs = Song.query.all()
        return jsonify({'songs': [s.to_dict() for s in songs]}), 200
    elif request.method == 'POST':
        data = request.get_json()
        song = Song(**{k: v for k, v in data.items()
                      if k in ['title','artist','album','genre','mood','duration','cover_url','preview_url','spotify_id']})
        db.session.add(song)
        db.session.commit()
        return jsonify(song.to_dict()), 201

@admin_bp.route('/songs/<int:song_id>', methods=['PUT', 'DELETE'])
@admin_required
def manage_song(song_id):
    song = Song.query.get_or_404(song_id)
    if request.method == 'PUT':
        data = request.get_json()
        for k, v in data.items():
            if hasattr(song, k):
                setattr(song, k, v)
        db.session.commit()
        return jsonify(song.to_dict()), 200
    elif request.method == 'DELETE':
        db.session.delete(song)
        db.session.commit()
        return jsonify({'message': 'Song deleted'}), 200

@admin_bp.route('/analytics', methods=['GET'])
@admin_required
def analytics():
    from sqlalchemy import func
    mood_stats = db.session.query(
        History.emotion_detected, func.count(History.id).label('count')
    ).group_by(History.emotion_detected).all()
    genre_stats = db.session.query(
        Song.genre, func.count(Song.id).label('count')
    ).group_by(Song.genre).all()
    return jsonify({
        'mood_distribution': [{'mood': r[0], 'count': r[1]} for r in mood_stats],
        'genre_distribution': [{'genre': r[0], 'count': r[1]} for r in genre_stats],
    }), 200
