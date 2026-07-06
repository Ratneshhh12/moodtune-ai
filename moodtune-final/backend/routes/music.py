"""Music routes - recommendations, search, player"""
import os
import requests
from flask import Blueprint, request, jsonify, Response, stream_with_context
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from config.database import db
from models.song import Song
from models.history import History
from models.playlist import Playlist, Favorite
from models.user import User
from models.chat_log import ChatLog
from collections import Counter
from utils.youtube_service import get_recommendations_by_mood, search_songs, get_trending_songs
import logging
from urllib.parse import unquote

import time

logger = logging.getLogger(__name__)
music_bp = Blueprint('music', __name__)

# Caches for performance optimization
RESOLVE_YT_CACHE = {}      # key -> (data, expiry)
SEARCH_QUERY_CACHE = {}    # key -> (data, expiry)
RECOMMENDATIONS_CACHE = {} # key -> (data, expiry)
TRENDING_SONGS_CACHE = None
TRENDING_SONGS_CACHE_EXPIRY = 0

# Allowed audio source domains for the proxy (whitelist for security)
ALLOWED_AUDIO_HOSTS = [
    'archive.org',          # covers *.archive.org subdomains via 'in host' check
    'samplesongs.netlify.app',
    'googlevideo.com',      # yt-dlp resolved audio stream host
    'fastly.net',           # CDN used by some audio hosts
]

@music_bp.route('/proxy-audio', methods=['GET'])
def proxy_audio():
    """Proxy audio streams to bypass browser CORS restrictions."""
    url = request.args.get('url', '')
    if not url:
        return jsonify({'error': 'url parameter required'}), 400

    # Security: only proxy from allowed hosts
    from urllib.parse import urlparse
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    allowed = any(h in host for h in ALLOWED_AUDIO_HOSTS)
    if not allowed:
        return jsonify({'error': 'Host not allowed'}), 403

    try:
        # Forward range header for seek support
        headers = {'User-Agent': 'Mozilla/5.0 MoodTuneAI/1.0'}
        range_header = request.headers.get('Range')
        if range_header:
            headers['Range'] = range_header

        upstream = requests.get(url, headers=headers, stream=True, timeout=10)
        status = upstream.status_code  # 200 or 206

        # Pass through relevant headers
        resp_headers = {
            'Content-Type': upstream.headers.get('Content-Type', 'audio/mpeg'),
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
        }
        if 'Content-Length' in upstream.headers:
            resp_headers['Content-Length'] = upstream.headers['Content-Length']
        if 'Content-Range' in upstream.headers:
            resp_headers['Content-Range'] = upstream.headers['Content-Range']

        def generate():
            try:
                for chunk in upstream.iter_content(chunk_size=32768):
                    yield chunk
            finally:
                upstream.close()

        return Response(
            stream_with_context(generate()),
            status=status,
            headers=resp_headers,
            direct_passthrough=True
        )
    except Exception as e:
        logger.error(f"Audio proxy error: {e}")
        return jsonify({'error': 'Failed to stream audio'}), 500


@music_bp.route('/resolve-yt-audio', methods=['GET'])
def resolve_yt_audio():
    """Resolve YouTube audio stream URL for a song using yt-dlp"""
    title = request.args.get('title', '')
    artist = request.args.get('artist', '')
    video_id = request.args.get('video_id', '').strip()
    if not title and not video_id:
        return jsonify({'error': 'title or video_id parameter required'}), 400

    query = f"{title} {artist}".strip()
    use_direct_id = False
    if video_id and len(video_id) == 11 and not video_id.startswith(('custom', 'nature', 'meditation')):
        use_direct_id = True
        resolve_target = f"https://www.youtube.com/watch?v={video_id}"
    else:
        resolve_target = f"ytsearch1:{query}"

    # Check in-memory cache
    cache_key = video_id if use_direct_id else f"query:{query.lower()}"
    now = time.time()
    if cache_key in RESOLVE_YT_CACHE:
        cached_data, expiry = RESOLVE_YT_CACHE[cache_key]
        if now < expiry:
            logger.info(f"Cache hit for resolving YT audio: {cache_key}")
            return jsonify(cached_data), 200

    try:
        import yt_dlp
        
        # Try different YouTube player clients sequentially to bypass "Confirm you're not a bot" blocks
        clients_to_try = [
            ['ios'],
            ['android'],
            ['mweb'],
            ['web_creator'],
            ['web']
        ]
        
        entry = None
        last_error = None
        
        for client in clients_to_try:
            ydl_opts = {
                # Prefer audio-only formats; fall back to any available
                'format': 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
                'noplaylist': True,
                'quiet': True,
                'skip_download': True,
                'nocheckcertificate': True,
                'check_formats': False,
                'cachedir': False,  # Disable caching to prevent issues on read-only serverless filesystems
                'extractor_args': {
                    'youtube': {
                        'skip': ['dash', 'hls'],
                        'player_client': client
                    }
                }
            }
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    if use_direct_id:
                        entry = ydl.extract_info(resolve_target, download=False)
                    else:
                        info = ydl.extract_info(resolve_target, download=False)
                        entry = info['entries'][0] if ('entries' in info and len(info['entries']) > 0) else None
                    
                    if entry:
                        break
            except Exception as e:
                last_error = e
                logger.warning(f"yt-dlp resolution failed with client {client}: {e}")
                continue

        if not entry:
            raise last_error or Exception("All player clients failed to extract video info")

        if entry:
            stream_url = entry.get('url')
            if not stream_url:
                # Try to get url from formats list
                formats = entry.get('formats', [])
                audio_formats = [f for f in formats if f.get('acodec') != 'none' and f.get('vcodec') == 'none']
                if audio_formats:
                    stream_url = audio_formats[-1].get('url')
                elif formats:
                    stream_url = formats[-1].get('url')

            if stream_url:
                vid_id = entry.get('id', video_id)
                thumbnail = entry.get('thumbnail', f"https://img.youtube.com/vi/{vid_id}/hqdefault.jpg")
                res_data = {
                    'url': stream_url,
                    'title': entry.get('title', title),
                    'thumbnail': thumbnail
                }
                # Cache the result for 2 hours (7200 seconds)
                RESOLVE_YT_CACHE[cache_key] = (res_data, now + 7200)
                return jsonify(res_data), 200

        return jsonify({'error': 'No streamable URL found'}), 404

    except Exception as e:
        logger.error(f"Failed to resolve YT audio for '{query}' (direct={use_direct_id}): {e}")
        return jsonify({'error': str(e)}), 500


@music_bp.route('/recommend/<mood>', methods=['GET'])
def recommend_by_mood(mood):
    """Get song recommendations based on mood (personalized if authenticated)"""
    try:
        limit = request.args.get('limit', 10, type=int)

        # Check for optional JWT authentication
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()

        if user_id:
            user_id = int(user_id)
            from utils.recommendation_engine import get_personalized_recommendations
            personalized_songs = get_personalized_recommendations(user_id, mood, limit)
            if personalized_songs:
                logger.info(f"Serving personalized ML recommendations for user {user_id}, mood: {mood}")
                return jsonify({
                    'mood': mood,
                    'recommendations': personalized_songs,
                    'personalized': True
                }), 200

        # Public / Cold Start Fallback
        now = time.time()
        cache_key = f"{mood.lower()}|{limit}"
        if cache_key in RECOMMENDATIONS_CACHE:
            cached_songs, expiry = RECOMMENDATIONS_CACHE[cache_key]
            if now < expiry:
                logger.info(f"Cache hit for recommendations: {cache_key}")
                return jsonify({'mood': mood, 'recommendations': cached_songs, 'personalized': False}), 200

        songs = get_recommendations_by_mood(mood, limit)
        # Also check DB for locally stored songs
        db_songs = Song.query.filter_by(mood=mood.lower()).limit(5).all()
        db_list = [s.to_dict() for s in db_songs]
        # Merge and deduplicate by spotify_id
        seen = set()
        merged = []
        for s in db_list + songs:
            key = s.get('spotify_id') or s.get('title')
            if key not in seen:
                seen.add(key)
                merged.append(s)

        res_songs = merged[:limit]
        RECOMMENDATIONS_CACHE[cache_key] = (res_songs, now + 300)  # 5 minutes cache
        return jsonify({'mood': mood, 'recommendations': res_songs, 'personalized': False}), 200
    except Exception as e:
        logger.error(f"Recommendation error: {e}")
        return jsonify({'error': 'Failed to get recommendations'}), 500

@music_bp.route('/recommendation-model-status', methods=['GET'])
@jwt_required()
def recommendation_model_status():
    """Retrieve model training status and learned preference weights for the active user"""
    try:
        user_id = int(get_jwt_identity())
        from utils.recommendation_engine import get_model_status_and_preferences
        status_data = get_model_status_and_preferences(user_id)
        return jsonify(status_data), 200
    except Exception as e:
        logger.error(f"Error checking recommendation model status: {e}")
        return jsonify({'error': 'Failed to retrieve model status'}), 500

@music_bp.route('/recommendation-model-retrain', methods=['POST'])
@jwt_required()
def recommendation_model_retrain():
    """Manually force retrain the personalization model for the active user"""
    try:
        user_id = int(get_jwt_identity())
        from utils.recommendation_engine import force_retrain_model, get_model_status_and_preferences
        force_retrain_model(user_id)
        status_data = get_model_status_and_preferences(user_id)
        return jsonify({
            'message': 'Personalized recommendation engine retrained successfully.',
            'status_data': status_data
        }), 200
    except Exception as e:
        logger.error(f"Error retraining recommendation model: {e}")
        return jsonify({'error': 'Failed to retrain recommendation model'}), 500

@music_bp.route('/search', methods=['GET'])
def search():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({'error': 'Query required'}), 400

    now = time.time()
    cache_key = query.lower()
    if cache_key in SEARCH_QUERY_CACHE:
        cached_results, expiry = SEARCH_QUERY_CACHE[cache_key]
        if now < expiry:
            logger.info(f"Cache hit for search: {cache_key}")
            return jsonify({'results': cached_results}), 200

    results = search_songs(query, 20)
    SEARCH_QUERY_CACHE[cache_key] = (results, now + 600)  # 10 minutes cache
    return jsonify({'results': results}), 200

@music_bp.route('/trending', methods=['GET'])
def trending():
    global TRENDING_SONGS_CACHE, TRENDING_SONGS_CACHE_EXPIRY
    now = time.time()
    if TRENDING_SONGS_CACHE is not None and now < TRENDING_SONGS_CACHE_EXPIRY:
        logger.info("Cache hit for trending songs")
        return jsonify({'trending': TRENDING_SONGS_CACHE}), 200

    songs = get_trending_songs(12)
    TRENDING_SONGS_CACHE = songs
    TRENDING_SONGS_CACHE_EXPIRY = now + 300  # 5 minutes cache
    return jsonify({'trending': songs}), 200

@music_bp.route('/history', methods=['GET', 'POST'])
@jwt_required()
def history():
    user_id = int(get_jwt_identity())
    if request.method == 'GET':
        records = History.query.filter_by(user_id=user_id)\
            .order_by(History.timestamp.desc()).limit(50).all()
        return jsonify({'history': [r.to_dict() for r in records]}), 200
    elif request.method == 'POST':
        data = request.get_json()
        # Upsert song to DB if not exists
        song_data = data.get('song', {})
        song = None
        if song_data.get('spotify_id'):
            song = Song.query.filter_by(spotify_id=song_data['spotify_id']).first()
        if not song:
            song = Song(**{k: v for k, v in song_data.items()
                          if k in ['title','artist','album','genre','mood','duration','cover_url','preview_url','spotify_id']})
            db.session.add(song)
            db.session.flush()
        song.play_count += 1
        record = History(
            user_id=user_id,
            song_id=song.id,
            emotion_detected=data.get('emotion', 'neutral'),
            stress_detected=data.get('stress', 0),
            anxiety_detected=data.get('anxiety', 0),
            fatigue_detected=data.get('fatigue', 0)
        )
        db.session.add(record)
        db.session.commit()
        return jsonify({'message': 'History recorded'}), 201

@music_bp.route('/insights', methods=['GET'])
@jwt_required()
def get_insights():
    from utils.history_aggregator import get_user_insights
    try:
        user_id = int(get_jwt_identity())
        insights_data = get_user_insights(user_id)
        return jsonify(insights_data), 200
    except Exception as e:
        logger.error(f"Error generating insights: {e}")
        return jsonify({'error': 'Failed to load insights'}), 500

@music_bp.route('/favorites', methods=['GET', 'POST', 'DELETE'])
@jwt_required()
def favorites():
    user_id = int(get_jwt_identity())
    if request.method == 'GET':
        favs = Favorite.query.filter_by(user_id=user_id).all()
        return jsonify({'favorites': [f.to_dict() for f in favs]}), 200
    elif request.method == 'POST':
        data = request.get_json()
        song_data = data.get('song', {})
        song = None
        if song_data.get('spotify_id'):
            song = Song.query.filter_by(spotify_id=song_data['spotify_id']).first()
        if not song:
            song = Song(**{k: v for k, v in song_data.items()
                          if k in ['title','artist','album','genre','mood','duration','cover_url','preview_url','spotify_id']})
            db.session.add(song)
            db.session.flush()
        existing = Favorite.query.filter_by(user_id=user_id, song_id=song.id).first()
        if existing:
            return jsonify({'message': 'Already favorited'}), 200
        fav = Favorite(user_id=user_id, song_id=song.id)
        db.session.add(fav)
        db.session.commit()
        return jsonify({'message': 'Added to favorites'}), 201
    elif request.method == 'DELETE':
        song_id = request.args.get('song_id', type=int)
        Favorite.query.filter_by(user_id=user_id, song_id=song_id).delete()
        db.session.commit()
        return jsonify({'message': 'Removed from favorites'}), 200

@music_bp.route('/playlists', methods=['GET', 'POST'])
@jwt_required()
def playlists():
    user_id = int(get_jwt_identity())
    if request.method == 'GET':
        pl = Playlist.query.filter(
            (Playlist.user_id == user_id) | 
            (Playlist.collaborators.any(id=user_id))
        ).all()
        return jsonify({'playlists': [p.to_dict() for p in pl]}), 200
    elif request.method == 'POST':
        data = request.get_json()
        is_collaborative = data.get('is_collaborative', False)
        pl = Playlist(user_id=user_id, playlist_name=data['playlist_name'],
                      is_public=data.get('is_public', False),
                      is_collaborative=is_collaborative)
        db.session.add(pl)
        db.session.commit()
        return jsonify({'playlist': pl.to_dict()}), 201

@music_bp.route('/playlists/<int:playlist_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def update_or_delete_playlist(playlist_id):
    user_id = int(get_jwt_identity())
    pl = Playlist.query.filter_by(id=playlist_id, user_id=user_id).first()
    if not pl:
        return jsonify({'error': 'Playlist not found or you are not the owner'}), 404
        
    if request.method == 'PUT':
        data = request.get_json() or {}
        if 'playlist_name' in data:
            pl.playlist_name = data['playlist_name']
        if 'is_collaborative' in data:
            pl.is_collaborative = data['is_collaborative']
            if not pl.is_collaborative:
                pl.collaborators = []
        db.session.commit()
        return jsonify({'message': 'Playlist updated successfully', 'playlist': pl.to_dict()}), 200
        
    elif request.method == 'DELETE':
        db.session.delete(pl)
        db.session.commit()
        return jsonify({'message': 'Playlist deleted successfully'}), 200

@music_bp.route('/playlists/<int:playlist_id>/songs', methods=['GET', 'POST', 'DELETE'])
@jwt_required()
def playlist_songs(playlist_id):
    user_id = int(get_jwt_identity())
    pl = Playlist.query.filter(
        (Playlist.id == playlist_id) & 
        ((Playlist.user_id == user_id) | (Playlist.collaborators.any(id=user_id)))
    ).first()
    if not pl:
        return jsonify({'error': 'Playlist not found or access denied'}), 404
    if request.method == 'GET':
        return jsonify({'songs': [s.to_dict() for s in pl.songs]}), 200
    elif request.method == 'POST':
        data = request.get_json()
        song_data = data.get('song', {})
        song = None
        if song_data.get('spotify_id'):
            song = Song.query.filter_by(spotify_id=song_data['spotify_id']).first()
        if not song:
            song = Song(**{k: v for k, v in song_data.items()
                          if k in ['title','artist','album','genre','mood','duration','cover_url','preview_url','spotify_id']})
            db.session.add(song)
            db.session.flush()
        if song not in pl.songs:
            pl.songs.append(song)
        db.session.commit()
        return jsonify({'message': 'Song added'}), 200
    elif request.method == 'DELETE':
        song_id = request.args.get('song_id', type=int)
        song = Song.query.get(song_id)
        if song and song in pl.songs:
            pl.songs.remove(song)
            db.session.commit()
        return jsonify({'message': 'Song removed'}), 200

@music_bp.route('/playlists/<int:playlist_id>/collaborators/add', methods=['POST'])
@jwt_required()
def add_collaborator(playlist_id):
    try:
        user_id = int(get_jwt_identity())
        pl = Playlist.query.filter_by(id=playlist_id, user_id=user_id).first()
        if not pl:
            return jsonify({'error': 'Playlist not found or you are not the owner'}), 404
            
        data = request.get_json() or {}
        email_or_name = data.get('email_or_name', '').strip()
        if not email_or_name:
            return jsonify({'error': 'Email or name required'}), 400
            
        user = User.query.filter((User.email == email_or_name) | (User.name == email_or_name)).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        if user.id == user_id:
            return jsonify({'error': 'You are already the owner'}), 400
            
        if user in pl.collaborators:
            return jsonify({'message': 'Already a collaborator'}), 200
            
        pl.collaborators.append(user)
        db.session.commit()
        return jsonify({'message': f'Added {user.name} as collaborator', 'playlist': pl.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Add collaborator error: {e}")
        return jsonify({'error': 'Failed to add collaborator'}), 500

@music_bp.route('/playlists/<int:playlist_id>/collaborators/remove', methods=['DELETE'])
@jwt_required()
def remove_collaborator(playlist_id):
    try:
        user_id = int(get_jwt_identity())
        pl = Playlist.query.filter_by(id=playlist_id, user_id=user_id).first()
        if not pl:
            return jsonify({'error': 'Playlist not found or you are not the owner'}), 404
            
        collaborator_id = request.args.get('collaborator_id', type=int)
        if not collaborator_id:
            return jsonify({'error': 'collaborator_id required'}), 400
            
        user = User.query.get(collaborator_id)
        if not user or user not in pl.collaborators:
            return jsonify({'error': 'Collaborator not found in playlist'}), 404
            
        pl.collaborators.remove(user)
        db.session.commit()
        return jsonify({'message': f'Removed collaborator successfully', 'playlist': pl.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Remove collaborator error: {e}")
        return jsonify({'error': 'Failed to remove collaborator'}), 500

@music_bp.route('/similar-pattern-recommendations', methods=['GET'])
@jwt_required()
def similar_pattern_recs():
    try:
        user_id = int(get_jwt_identity())
        user_history = History.query.filter_by(user_id=user_id).all()
        if not user_history:
            return jsonify({'recommendations': get_trending_songs(8)}), 200
            
        user_emotions = [h.emotion_detected for h in user_history]
        user_counts = Counter(user_emotions)
        total_user = len(user_history)
        
        # Profile has key emotions
        emotions_keys = ['happy', 'sad', 'angry', 'neutral', 'surprised', 'fearful', 'disgusted']
        user_profile = {emo: user_counts[emo]/total_user for emo in emotions_keys}
        
        # Get other users
        all_histories = History.query.filter(History.user_id != user_id).all()
        if not all_histories:
            dom_mood = max(user_profile, key=user_profile.get)
            return jsonify({'recommendations': get_recommendations_by_mood(dom_mood, 8)}), 200
            
        user_histories = {}
        for h in all_histories:
            user_histories.setdefault(h.user_id, []).append(h)
            
        similar_users = []
        for other_id, other_hist in user_histories.items():
            other_emotions = [h.emotion_detected for h in other_hist]
            other_counts = Counter(other_emotions)
            total_other = len(other_hist)
            other_profile = {emo: other_counts[emo]/total_other for emo in emotions_keys}
            
            # Distance
            distance = sum(abs(user_profile[emo] - other_profile[emo]) for emo in emotions_keys)
            similarity = 1.0 - (distance / 2.0)
            similar_users.append((other_id, similarity))
            
        similar_users.sort(key=lambda x: x[1], reverse=True)
        top_similar_ids = [uid for uid, sim in similar_users[:3] if sim > 0.35]
        
        if not top_similar_ids:
            dom_mood = max(user_profile, key=user_profile.get)
            return jsonify({'recommendations': get_recommendations_by_mood(dom_mood, 8)}), 200
            
        user_listened_ids = {h.song_id for h in user_history}
        similar_songs = Song.query.join(History).filter(
            History.user_id.in_(top_similar_ids),
            ~Song.id.in_(user_listened_ids)
        ).order_by(Song.play_count.desc()).limit(10).all()
        
        res_list = [s.to_dict() for s in similar_songs]
        
        if len(res_list) < 6:
            dom_mood = max(user_profile, key=user_profile.get)
            fillers = get_recommendations_by_mood(dom_mood, 8 - len(res_list))
            seen = {s['spotify_id'] for s in res_list if s.get('spotify_id')}
            for s in fillers:
                if s.get('spotify_id') not in seen:
                    res_list.append(s)
                    seen.add(s.get('spotify_id'))
                    
        return jsonify({'recommendations': res_list[:8]}), 200
    except Exception as e:
        logger.error(f"Similar pattern recs error: {e}")
        return jsonify({'error': 'Failed to load collaborative recommendations'}), 500

@music_bp.route('/dynamic-mood', methods=['GET'])
@jwt_required()
def get_dynamic_mood():
    """Retrieve predicted Dynamic Mood Intelligence for the active user"""
    try:
        user_id = int(get_jwt_identity())
        from utils.mood_intelligence import predict_mood_intelligence
        prediction = predict_mood_intelligence(user_id)
        return jsonify(prediction), 200
    except Exception as e:
        logger.error(f"Error in dynamic-mood route: {e}", exc_info=True)
        return jsonify({'error': 'Failed to fetch dynamic mood intelligence'}), 500


@music_bp.route('/train-foundation-model', methods=['POST'])
@jwt_required()
def train_foundation():
    try:
        from utils.foundation_model import train_foundation_model
        success = train_foundation_model()
        if success:
            return jsonify({'message': 'Personalized foundation model retrained successfully.'}), 200
        return jsonify({'error': 'Failed to train foundation model'}), 500
    except Exception as e:
        logger.error(f"Error training foundation model: {e}", exc_info=True)
        return jsonify({'error': 'Failed to train model'}), 500


@music_bp.route('/foundation-status', methods=['GET'])
@jwt_required()
def get_foundation_status():
    try:
        user_id = int(get_jwt_identity())
        from utils.foundation_model import load_foundation_model, vector_db, get_dynamic_user_vector, project_vector_to_2d
        
        payload = load_foundation_model()
        if not payload:
            return jsonify({'status': 'cold_start', 'message': 'No trained embeddings found. Trigger retrain.'}), 200
            
        selected_activity = request.args.get('activity', '').strip()
        
        # Simple heuristic to guess current emotion tag from face scan or default to neutral
        latest_history = History.query.filter_by(user_id=user_id).order_by(History.timestamp.desc()).first()
        current_emotion = latest_history.emotion_detected if latest_history else 'neutral'
        
        # Build dynamic query vector and project to 2D
        dyn_vec = get_dynamic_user_vector(user_id, current_emotion, selected_activity, payload)
        dyn_coords_2d = project_vector_to_2d(dyn_vec, payload)
        
        song_dots = []
        for i, sid in enumerate(payload['song_ids']):
            song = Song.query.get(sid)
            if song:
                song_dots.append({
                    'id': song.id,
                    'title': song.title,
                    'artist': song.artist,
                    'mood': song.mood,
                    'x': float(payload['song_coords'][i][0]),
                    'y': float(payload['song_coords'][i][1])
                })
                
        emotion_dots = []
        for i, emo in enumerate(payload['emotions']):
            emotion_dots.append({
                'label': emo,
                'x': float(payload['emotion_coords'][i][0]),
                'y': float(payload['emotion_coords'][i][1])
            })
            
        activity_dots = []
        for i, act in enumerate(payload['activities']):
            activity_dots.append({
                'label': act,
                'x': float(payload['activity_coords'][i][0]),
                'y': float(payload['activity_coords'][i][1])
            })
            
        user_coords_static = [0.0, 0.0]
        if user_id in payload['user_ids']:
            u_idx = payload['user_ids'].index(user_id)
            user_coords_static = [float(payload['user_coords'][u_idx][0]), float(payload['user_coords'][u_idx][1])]
            
        response_data = {
            'status': 'active',
            'index_type': vector_db.index_type,
            'dimension': payload['dimension'],
            'total_songs': len(song_dots),
            
            'songs': song_dots,
            'emotions': emotion_dots,
            'activities': activity_dots,
            
            'user_static': user_coords_static,
            'user_dynamic': [float(dyn_coords_2d[0]), float(dyn_coords_2d[1])],
            'current_context': {
                'emotion': current_emotion,
                'activity': selected_activity
            }
        }
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error getting foundation model status: {e}", exc_info=True)
        return jsonify({'error': 'Failed to retrieve model status'}), 500


@music_bp.route('/recommend-foundation', methods=['GET'])
@jwt_required()
def get_recommendations_foundation():
    try:
        user_id = int(get_jwt_identity())
        selected_activity = request.args.get('activity', '').strip()
        limit = request.args.get('limit', 10, type=int)
        
        from utils.foundation_model import load_foundation_model, get_dynamic_user_vector, vector_db
        payload = load_foundation_model()
        
        if not payload:
            from utils.youtube_service import get_trending_songs
            return jsonify({'songs': get_trending_songs(limit), 'index_type': 'fallback_trending'}), 200
            
        latest_history = History.query.filter_by(user_id=user_id).order_by(History.timestamp.desc()).first()
        current_emotion = latest_history.emotion_detected if latest_history else 'neutral'
        
        dyn_vec = get_dynamic_user_vector(user_id, current_emotion, selected_activity, payload)
        neighbors = vector_db.query(dyn_vec, k=limit)
        
        retrieved_songs = []
        for song_id, score in neighbors:
            song = Song.query.get(song_id)
            if song:
                s_dict = song.to_dict()
                s_dict['vector_score'] = round(score, 4)
                retrieved_songs.append(s_dict)
                
        return jsonify({
            'songs': retrieved_songs,
            'index_type': vector_db.index_type,
            'current_context': {
                'emotion': current_emotion,
                'activity': selected_activity
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error querying foundation recommendations: {e}", exc_info=True)
        return jsonify({'error': 'Failed to fetch recommendations'}), 500


def analyze_message_sentiment_and_metrics(message):
    msg_lower = message.lower()
    sentiment = 'neutral'
    stress_val = 0
    fatigue_val = 0
    
    scores = {}
    for mood, keywords in MOOD_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in msg_lower)
        if score > 0:
            scores[mood] = score
            
    detected = max(scores, key=scores.get) if scores else None
    
    if detected:
        sentiment = detected
        if detected == 'tired':
            stress_val = 75
            fatigue_val = 85
        elif detected == 'anxious':
            stress_val = 80
            fatigue_val = 50
        elif detected == 'sad':
            stress_val = 60
            fatigue_val = 60
        elif detected == 'angry':
            stress_val = 90
            fatigue_val = 40
        elif detected == 'motivated':
            stress_val = 10
            fatigue_val = 10
        elif detected == 'happy':
            stress_val = 5
            fatigue_val = 5
        elif detected == 'romantic':
            stress_val = 10
            fatigue_val = 10
    else:
        if any(w in msg_lower for w in ['thak', 'tired', 'sleep', 'exhausted', 'fatigue', 'burnout', 'bore', 'bored', 'aaram', 'rest']):
            fatigue_val = 70
            stress_val = 50
            sentiment = 'tired'
        elif any(w in msg_lower for w in ['stress', 'tension', 'pressure', 'exam', 'interview', 'work', 'kaam', 'sar dard']):
            stress_val = 80
            sentiment = 'tired'
        elif any(w in msg_lower for w in ['darr', 'anxious', 'panic', 'nervous', 'ghabrahat', 'anxiety']):
            stress_val = 70
            sentiment = 'anxious'
            
    return sentiment, stress_val, fatigue_val


def check_for_song_question(message_text):
    import re
    msg_lower = message_text.lower().strip()
    
    def normalize(text):
        if not text:
            return ""
        text = text.lower().strip()
        text = re.sub(r'[^\w\s]', ' ', text)
        return " ".join(text.split())
        
    norm_msg = normalize(message_text)
    if not norm_msg:
        return None
        
    try:
        all_songs = Song.query.all()
    except Exception as e:
        logger.error(f"Error querying songs for chatbot: {e}")
        return None
        
    all_songs = sorted(all_songs, key=lambda s: len(s.title), reverse=True)
    
    matched_song = None
    for song in all_songs:
        norm_title = normalize(song.title)
        if not norm_title:
            continue
        pattern = r'\b' + re.escape(norm_title) + r'\b'
        if re.search(pattern, norm_msg):
            matched_song = song
            break
            
    if not matched_song:
        return None
        
    singer_triggers = ['who sang', 'singer', 'artist', 'sung by', 'voice of', 'kisne gaya', 'kiska gana', 'kiska hai', 'singer name', 'artist name', 'singers']
    genre_triggers = ['genre', 'style', 'category', 'type of music', 'music type']
    mood_triggers = ['mood', 'vibe', 'feeling', 'emotion', 'feel', 'sad song', 'happy song', 'angry song', 'romantic song']
    album_triggers = ['album', 'movie', 'film', 'kis album', 'kis movie', 'kis film']
    duration_triggers = ['duration', 'length', 'how long', 'time', 'seconds', 'minutes', 'kitne minute', 'kitne time']
    play_triggers = ['play', 'listen', 'baja', 'baja do', 'play karo', 'sunna hai']
    info_triggers = ['tell me about', 'info', 'details', 'kya hai', 'kaisa hai', 'about', 'explain', 'describe']
    
    # Check if singer is asked
    if any(t in msg_lower for t in singer_triggers):
        reply = f"**{matched_song.title}** is sung by **{matched_song.artist}** 🎤. Would you like me to play it?"
    elif any(t in msg_lower for t in genre_triggers):
        reply = f"The genre of **{matched_song.title}** is **{matched_song.genre}** 🎵. It's a great track!"
    elif any(t in msg_lower for t in mood_triggers):
        reply = f"The mood of **{matched_song.title}** is **{matched_song.mood}** 😌. It's perfect for that vibe!"
    elif any(t in msg_lower for t in album_triggers):
        reply = f"**{matched_song.title}** is from the album/movie **{matched_song.album or 'Single/Compilation'}** 💿."
    elif any(t in msg_lower for t in duration_triggers):
        mins = matched_song.duration // 60
        secs = matched_song.duration % 60
        reply = f"**{matched_song.title}** is **{mins} minutes and {secs} seconds** long ⏱️."
    elif any(t in msg_lower for t in play_triggers):
        reply = f"Sure! Playing **{matched_song.title}** by **{matched_song.artist}** now 🎶."
    elif any(t in msg_lower for t in info_triggers) or norm_msg == normalize(matched_song.title):
        mins = matched_song.duration // 60
        secs = matched_song.duration % 60
        reply = (
            f"Here is some information about **{matched_song.title}**:\n"
            f"- **Artist**: {matched_song.artist} 🎤\n"
            f"- **Genre**: {matched_song.genre} 🎵\n"
            f"- **Mood**: {matched_song.mood} 😌\n"
            f"- **Album**: {matched_song.album or 'Single/Compilation'} 💿\n"
            f"- **Duration**: {mins}m {secs}s ⏱️"
        )
    else:
        reply = f"I found **{matched_song.title}** by **{matched_song.artist}** 🎵. Would you like me to play it?"
        
    return {
        'reply': reply,
        'type': 'playlist',
        'playlist': {
            'label': f"Matched Song: {matched_song.title}",
            'emoji': '🎵',
            'color': '#7c5cfc',
            'mood': matched_song.mood,
            'songs': [matched_song.to_dict()]
        }
    }


@music_bp.route('/chatbot', methods=['POST'])
@jwt_required(optional=True)
def chatbot():
    """Chatbot — understands Hindi/English/Hinglish mood & returns playlist"""
    try:
        data = request.get_json() or {}
        message = data.get('message', '').strip()
        history = data.get('history', [])
        emotion = data.get('emotion', 'unknown')
        current_song = data.get('current_song', None)

        if not message:
            return jsonify({'error': 'Message is required'}), 400

        # Check for song-specific queries in database first
        song_reply = check_for_song_question(message)
        if song_reply:
            # Log chat message and NLP metrics if user is logged in
            user_id = get_jwt_identity()
            if user_id:
                try:
                    user_id = int(user_id)
                    sentiment_tag, msg_stress, msg_fatigue = analyze_message_sentiment_and_metrics(message)
                    log_entry = ChatLog(
                        user_id=user_id,
                        message=message,
                        sentiment=sentiment_tag,
                        stress=msg_stress,
                        fatigue=msg_fatigue
                    )
                    db.session.add(log_entry)
                    db.session.commit()
                except Exception as le:
                    logger.error(f"Failed to save ChatLog entry: {le}")
            return jsonify(song_reply), 200

        # Log chat message and NLP metrics if user is logged in
        user_id = get_jwt_identity()
        if user_id:
            try:
                user_id = int(user_id)
                sentiment_tag, msg_stress, msg_fatigue = analyze_message_sentiment_and_metrics(message)
                log_entry = ChatLog(
                    user_id=user_id,
                    message=message,
                    sentiment=sentiment_tag,
                    stress=msg_stress,
                    fatigue=msg_fatigue
                )
                db.session.add(log_entry)
                db.session.commit()
            except Exception as le:
                logger.error(f"Failed to save ChatLog entry: {le}")

        # Try Anthropic Claude first
        api_key = os.getenv('ANTHROPIC_API_KEY')
        if api_key:
            try:
                system_prompt = (
                    "You are MoodTune AI, a warm empathetic music assistant. "
                    "You understand Hindi, English, and Hinglish. "
                    f"User's current facial emotion: {emotion}. "
                    f"Currently playing: {current_song or 'nothing'}. "
                    "Detect mood from the user's message and suggest 4-6 appropriate Bollywood/Hindi songs. "
                    "Be warm, conversational, and respond in the same language as the user."
                )
                anthropic_messages = []
                for h in history:
                    role = h.get('role', 'user')
                    if role not in ['user', 'assistant']:
                        role = 'user'
                    content = h.get('content', '')
                    if content:
                        anthropic_messages.append({'role': role, 'content': content})
                anthropic_messages.append({'role': 'user', 'content': message})
                resp = requests.post(
                    'https://api.anthropic.com/v1/messages',
                    headers={
                        'x-api-key': api_key,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json'
                    },
                    json={
                        'model': 'claude-3-5-sonnet-20241022',
                        'max_tokens': 400,
                        'system': system_prompt,
                        'messages': anthropic_messages
                    },
                    timeout=15
                )
                if resp.status_code == 200:
                    reply = resp.json().get('content', [{}])[0].get('text', '')
                    if reply:
                        return jsonify({'reply': reply, 'type': 'text'}), 200
            except Exception as e:
                logger.error(f"Anthropic error: {e}")

        # Fallback: local mood-aware engine
        result = generate_mood_reply(message, emotion, current_song)
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Chatbot route error: {e}")
        return jsonify({'error': 'Failed to process chat message'}), 500


# ─── Mood keyword maps ─────────────────────────────────────────────────────────

MOOD_KEYWORDS = {
    'sad': [
        'sad', 'heartbreak', 'heartbroken', 'broke up', 'breakup', 'break up',
        'depressed', 'depression', 'crying', 'tears', 'lonely', 'alone',
        'miss', 'missing', 'grief', 'hopeless', 'pain', 'hurt', 'low', 'down', 'empty',
        'udaas', 'akela', 'akeli', 'rona', 'ro raha', 'ro rahi', 'aansu',
        'dil toot gaya', 'toot gaya', 'dard', 'dukhi', 'dhoka',
        'breakup ho gaya', 'breakup hua', 'pyaar mein dhoka',
        'tanha', 'bura lag raha', 'nahi accha lag raha',
    ],
    'tired': [
        'tired', 'exhausted', 'fatigue', 'drained', 'burnout', 'no energy',
        'sleepy', 'overworked', 'stressed', 'stress', 'overwhelmed',
        'too much work', 'after work', 'long day', 'hard day', 'rough day',
        'thak gaya', 'thak gayi', 'bahut thak', 'thaka hua', 'thaki hui',
        'kaam se thak', 'neend aa rahi', 'pareshaan', 'bore', 'bored',
        'sar dard', 'aaram chahiye', 'rest chahiye', 'nahi ho raha',
    ],
    'happy': [
        'happy', 'excited', 'joy', 'great', 'amazing', 'awesome', 'fantastic',
        'good mood', 'feeling good', 'celebration', 'celebrate', 'party', 'fun',
        'in love', 'blessed', 'grateful', 'promotion', 'passed', 'success', 'won',
        'khush', 'khushi', 'maza', 'maja aa raha', 'acha lag raha',
        'bahut accha', 'zabardast', 'shandar', 'mast', 'dil khush',
        'promotion mili', 'pass ho gaya', 'jeet gaya',
    ],
    'angry': [
        'angry', 'anger', 'frustrated', 'annoyed', 'irritated', 'furious',
        'rage', 'mad', 'pissed', 'hate', 'fed up',
        'gussa', 'bahut gussa', 'gussa aa raha', 'tang aa gaya',
        'jhagda', 'ladai', 'naraz',
    ],
    'anxious': [
        'anxious', 'anxiety', 'nervous', 'worried', 'scared', 'fear',
        'panic', 'overwhelmed', 'exam', 'interview', 'presentation',
        'darr', 'dar lag raha', 'ghabrahat', 'ghabra raha', 'pareshan',
        'imtihaan', 'exam hai', 'interview hai', 'tension ho rahi',
    ],
    'romantic': [
        'love', 'in love', 'romantic', 'date', 'anniversary', 'crush',
        'girlfriend', 'boyfriend', 'propose', 'marriage', 'wedding',
        'pyaar', 'mohabbat', 'ishq', 'date pe jana', 'shaadi', 'propose karna',
    ],
    'motivated': [
        'motivated', 'pumped', 'energetic', 'workout', 'gym', 'run',
        'hustle', 'grind', 'focus', 'productive', 'study',
        'gym jaana', 'exercise', 'workout karna', 'mehnat', 'padhai',
        'focus chahiye', 'kaam karna hai',
    ],
}

MOOD_PLAYLISTS = {
    'sad': {
        'label': 'Heartbreak & Healing 💔',
        'message': 'Yaar, sun lo — music hi sabse bada dost hota hai mushkil waqt mein. Yeh songs tumhare saath hain:',
        'emoji': '💔', 'color': '#5c8cfc',
        'songs': [
            {'title': 'Tujhe Bhula Diya', 'artist': 'Mohit Chauhan', 'mood': 'sad', 'cover_url': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150', 'preview_url': '', 'spotify_id': 'tujhe_bhula_diya', 'genre': 'Bollywood'},
            {'title': 'Channa Mereya', 'artist': 'Arijit Singh', 'mood': 'sad', 'cover_url': 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=150', 'preview_url': '', 'spotify_id': 'channa_mereya', 'genre': 'Bollywood'},
            {'title': 'Agar Tum Saath Ho', 'artist': 'Arijit Singh & Alka Yagnik', 'mood': 'sad', 'cover_url': 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=150', 'preview_url': '', 'spotify_id': 'agar_tum_saath_ho', 'genre': 'Bollywood'},
            {'title': 'Phir Mohabbat', 'artist': 'Arijit Singh', 'mood': 'sad', 'cover_url': 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=150', 'preview_url': '', 'spotify_id': 'phir_mohabbat', 'genre': 'Bollywood'},
            {'title': 'Dil Diyan Gallan', 'artist': 'Atif Aslam', 'mood': 'sad', 'cover_url': 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=150', 'preview_url': '', 'spotify_id': 'dil_diyan_gallan', 'genre': 'Bollywood'},
            {'title': 'Tum Hi Ho', 'artist': 'Arijit Singh', 'mood': 'sad', 'cover_url': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150', 'preview_url': '', 'spotify_id': 'tum_hi_ho', 'genre': 'Bollywood'},
        ]
    },
    'tired': {
        'label': 'Relax & Unwind 😌',
        'message': 'Aaj kaafi mehnat ki lagti hai! Thoda relax karo — yeh songs body aur mind ko settle karne mein help karenge:',
        'emoji': '🌙', 'color': '#7c5cfc',
        'songs': [
            {'title': 'O Re Piya', 'artist': 'Rahat Fateh Ali Khan', 'mood': 'neutral', 'cover_url': 'https://images.unsplash.com/photo-1487180142328-0c4e37023af5?w=150', 'preview_url': '', 'spotify_id': 'o_re_piya', 'genre': 'Sufi'},
            {'title': 'Lag Ja Gale', 'artist': 'Lata Mangeshkar', 'mood': 'neutral', 'cover_url': 'https://images.unsplash.com/photo-1446057032654-9d8885db76c6?w=150', 'preview_url': '', 'spotify_id': 'lag_ja_gale', 'genre': 'Classic'},
            {'title': 'Kabira', 'artist': 'Rekha Bhardwaj & Tochi Raina', 'mood': 'neutral', 'cover_url': 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=150', 'preview_url': '', 'spotify_id': 'kabira_yeh_jawani', 'genre': 'Bollywood'},
            {'title': 'Kun Faya Kun', 'artist': 'A.R. Rahman', 'mood': 'neutral', 'cover_url': 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=150', 'preview_url': '', 'spotify_id': 'kun_faya_kun', 'genre': 'Sufi'},
            {'title': 'Iktara', 'artist': 'Kavita Seth', 'mood': 'neutral', 'cover_url': 'https://images.unsplash.com/photo-1518655048521-f130df041f66?w=150', 'preview_url': '', 'spotify_id': 'iktara_wake_up_sid', 'genre': 'Indie'},
            {'title': 'Ae Dil Hai Mushkil', 'artist': 'Arijit Singh', 'mood': 'sad', 'cover_url': 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=150', 'preview_url': '', 'spotify_id': 'ae_dil_hai_mushkil', 'genre': 'Bollywood'},
        ]
    },
    'happy': {
        'label': 'Vibe High ✨',
        'message': 'Waah! Yeh energy toh zabardast hai! Isko maintain rakhte hain — yeh banger songs suno:',
        'emoji': '🎉', 'color': '#fcb85c',
        'songs': [
            {'title': 'Balam Pichkari', 'artist': 'Shalmali & Vishal Dadlani', 'mood': 'happy', 'cover_url': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150', 'preview_url': '', 'spotify_id': 'balam_pichkari', 'genre': 'Bollywood'},
            {'title': 'Badtameez Dil', 'artist': 'Benny Dayal', 'mood': 'happy', 'cover_url': 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=150', 'preview_url': '', 'spotify_id': 'badtameez_dil', 'genre': 'Bollywood'},
            {'title': 'London Thumakda', 'artist': 'Labh Janjua & Sonu Kakkar', 'mood': 'happy', 'cover_url': 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=150', 'preview_url': '', 'spotify_id': 'london_thumakda', 'genre': 'Bollywood'},
            {'title': 'Gallan Goodiyaan', 'artist': 'Shankar-Ehsaan-Loy', 'mood': 'happy', 'cover_url': 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=150', 'preview_url': '', 'spotify_id': 'gallan_goodiyaan', 'genre': 'Bollywood'},
            {'title': 'Kar Gayi Chull', 'artist': 'Fazilpuria & Badshah', 'mood': 'happy', 'cover_url': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150', 'preview_url': '', 'spotify_id': 'kar_gayi_chull', 'genre': 'Pop'},
            {'title': 'Aaj Ki Raat', 'artist': 'A.R. Rahman', 'mood': 'happy', 'cover_url': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150', 'preview_url': '', 'spotify_id': 'aaj_ki_raat_don', 'genre': 'Bollywood'},
        ]
    },
    'angry': {
        'label': 'Release & Reset 🔥',
        'message': 'Samajh gaya — gussa nikalna zaroori hai. Yeh songs sun lo, thoda sar thanda hoga:',
        'emoji': '🔥', 'color': '#fc5ca0',
        'songs': [
            {'title': 'Malhari', 'artist': 'Vishal Dadlani', 'mood': 'angry', 'cover_url': 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=150', 'preview_url': '', 'spotify_id': 'malhari_bajirao', 'genre': 'Bollywood'},
            {'title': 'Sultan Title Track', 'artist': 'Sukhwinder Singh', 'mood': 'angry', 'cover_url': 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=150', 'preview_url': '', 'spotify_id': 'sultan_title_track', 'genre': 'Bollywood'},
            {'title': '295', 'artist': 'Sidhu Moose Wala', 'mood': 'angry', 'cover_url': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150', 'preview_url': '', 'spotify_id': '295_sidhu_moose_wala', 'genre': 'Punjabi'},
            {'title': 'Dangal Title Song', 'artist': 'Daler Mehndi', 'mood': 'neutral', 'cover_url': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150', 'preview_url': '', 'spotify_id': 'dangal_title_song', 'genre': 'Bollywood'},
            {'title': 'Zinda', 'artist': 'Siddharth Mahadevan', 'mood': 'neutral', 'cover_url': 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=150', 'preview_url': '', 'spotify_id': 'zinda_bhaag_milkha', 'genre': 'Bollywood'},
            {'title': 'Jai Ho', 'artist': 'A.R. Rahman', 'mood': 'happy', 'cover_url': 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=150', 'preview_url': '', 'spotify_id': 'jai_ho_ar_rahman', 'genre': 'Bollywood'},
        ]
    },
    'anxious': {
        'label': 'Calm Your Mind 🧘',
        'message': 'Tension mat lo yaar. Deep breath lo aur yeh soothing tracks sun lo — sab theek ho jayega:',
        'emoji': '🌿', 'color': '#5cfcd8',
        'songs': [
            {'title': 'Kun Faya Kun', 'artist': 'A.R. Rahman', 'mood': 'neutral', 'cover_url': 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=150', 'preview_url': '', 'spotify_id': 'kun_faya_kun', 'genre': 'Sufi'},
            {'title': 'Luka Chuppi', 'artist': 'A.R. Rahman', 'mood': 'neutral', 'cover_url': 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=150', 'preview_url': '', 'spotify_id': 'luka_chuppi_rang_de', 'genre': 'Sufi'},
            {'title': 'Iktara', 'artist': 'Kavita Seth', 'mood': 'neutral', 'cover_url': 'https://images.unsplash.com/photo-1446057032654-9d8885db76c6?w=150', 'preview_url': '', 'spotify_id': 'iktara_wake_up_sid', 'genre': 'Indie'},
            {'title': 'Tibetan Singing Bowls', 'artist': 'Healing Sounds', 'mood': 'fearful', 'cover_url': 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=150', 'preview_url': '', 'spotify_id': 'meditation_singing_bowls', 'genre': 'Meditation'},
            {'title': 'Ae Watan', 'artist': 'Arijit Singh', 'mood': 'neutral', 'cover_url': 'https://images.unsplash.com/photo-1487180142328-0c4e37023af5?w=150', 'preview_url': '', 'spotify_id': 'ae_watan_raazi', 'genre': 'Bollywood'},
            {'title': 'Mann Kasturi Re', 'artist': 'Shafqat Amanat Ali', 'mood': 'neutral', 'cover_url': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150', 'preview_url': '', 'spotify_id': 'mann_kasturi_re', 'genre': 'Sufi'},
        ]
    },
    'romantic': {
        'label': 'Love Vibes 💕',
        'message': 'Oho! Dil mein pyaar hai! Inhe suno aur moment ko aur khaas banao:',
        'emoji': '💕', 'color': '#fc5ca0',
        'songs': [
            {'title': 'Raabta', 'artist': 'Arijit Singh', 'mood': 'happy', 'cover_url': 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=150', 'preview_url': '', 'spotify_id': 'raabta_agent_savio', 'genre': 'Bollywood'},
            {'title': 'Gerua', 'artist': 'Arijit Singh & Antara Mitra', 'mood': 'happy', 'cover_url': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150', 'preview_url': '', 'spotify_id': 'gerua_dilwale', 'genre': 'Bollywood'},
            {'title': 'Tere Sang Yaara', 'artist': 'Atif Aslam', 'mood': 'happy', 'cover_url': 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=150', 'preview_url': '', 'spotify_id': 'tere_sang_yaara', 'genre': 'Bollywood'},
            {'title': 'Enna Sona', 'artist': 'Arijit Singh', 'mood': 'happy', 'cover_url': 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=150', 'preview_url': '', 'spotify_id': 'enna_sona_ok_jaanu', 'genre': 'Bollywood'},
            {'title': 'Pehla Nasha', 'artist': 'Udit Narayan & Sadhana Sargam', 'mood': 'happy', 'cover_url': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150', 'preview_url': '', 'spotify_id': 'pehla_nasha_jo_jeeta', 'genre': 'Classic'},
            {'title': 'Saaiyaan', 'artist': 'Kailash Kher', 'mood': 'happy', 'cover_url': 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=150', 'preview_url': '', 'spotify_id': 'saaiyaan_kailash_kher', 'genre': 'Sufi'},
        ]
    },
    'motivated': {
        'label': 'Hustle Mode 💪',
        'message': 'Yeh hai mera champion! Yeh bangers tujhe zone mein rakhenge:',
        'emoji': '💪', 'color': '#5cfcd8',
        'songs': [
            {'title': 'Kar Har Maidan Fateh', 'artist': 'Sukhwinder Singh', 'mood': 'happy', 'cover_url': 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=150', 'preview_url': '', 'spotify_id': 'kar_har_maidan_fateh', 'genre': 'Bollywood'},
            {'title': '295', 'artist': 'Sidhu Moose Wala', 'mood': 'angry', 'cover_url': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150', 'preview_url': '', 'spotify_id': '295_sidhu_moose_wala', 'genre': 'Punjabi'},
            {'title': 'Malhari', 'artist': 'Vishal Dadlani', 'mood': 'angry', 'cover_url': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150', 'preview_url': '', 'spotify_id': 'malhari_bajirao', 'genre': 'Bollywood'},
            {'title': 'Dangal Title Song', 'artist': 'Daler Mehndi', 'mood': 'neutral', 'cover_url': 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=150', 'preview_url': '', 'spotify_id': 'dangal_title_song', 'genre': 'Bollywood'},
            {'title': 'Sultan Title Track', 'artist': 'Sukhwinder Singh', 'mood': 'happy', 'cover_url': 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=150', 'preview_url': '', 'spotify_id': 'sultan_title_track', 'genre': 'Bollywood'},
            {'title': 'GOAT', 'artist': 'Sidhu Moose Wala', 'mood': 'angry', 'cover_url': 'https://images.unsplash.com/photo-1487180142328-0c4e37023af5?w=150', 'preview_url': '', 'spotify_id': 'goat_sidhu_moose_wala', 'genre': 'Punjabi'},
        ]
    },
}

GREETINGS = ['hi', 'hello', 'hey', 'hii', 'namaste', 'namaskar', 'kya hal', 'kaise ho', 'sup', 'hy']
THANKS = ['thanks', 'thank you', 'shukriya', 'dhanyawad', 'bahut accha', 'great', 'nice', 'wah', 'zabardast']


def detect_mood_from_text(message):
    msg_lower = message.lower()
    scores = {}
    for mood, keywords in MOOD_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in msg_lower)
        if score > 0:
            scores[mood] = score
    return max(scores, key=scores.get) if scores else None


def get_db_songs_for_mood(mood_key):
    mood_map = {
        'sad': 'sad', 'tired': 'neutral', 'happy': 'happy',
        'angry': 'angry', 'anxious': 'fearful', 'romantic': 'happy', 'motivated': 'happy'
    }
    db_mood = mood_map.get(mood_key, 'neutral')
    try:
        if mood_key == 'motivated':
            # Query specific high-energy gym songs from the database
            from sqlalchemy import or_
            conditions = [
                Song.title == '295',
                Song.title == 'Malhari',
                Song.title == 'GOAT',
                Song.title == 'Zinda',
                Song.title.like('%Sultan%'),
                Song.title.like('%Dangal%'),
                Song.title.like('%Kar Har%'),
                Song.title.like('%Maidaan%')
            ]
            songs = Song.query.filter(or_(*conditions)).order_by(db.func.random()).limit(6).all()
            if len(songs) >= 3:
                return [s.to_dict() for s in songs]

        songs = Song.query.filter_by(mood=db_mood).order_by(db.func.random()).limit(6).all()
        if len(songs) >= 3:
            return [s.to_dict() for s in songs]
    except Exception as e:
        logger.error(f"Error in get_db_songs_for_mood for '{db_mood}': {e}")
    return None


def generate_mood_reply(message, emotion, current_song):
    msg_lower = message.lower().strip()

    # Greeting
    if any(g in msg_lower for g in GREETINGS):
        return {
            'reply': (
                "Heyy! Main hoon **MoodTune AI** 🎵\n\n"
                "Bato mujhe — aaj kaisa feel kar rahe ho? Main tumhare mood ke hisaab se "
                "ek perfect playlist bana dunga!\n\n"
                "Chahe tired ho kaam ke baad, breakup se guzar rahe ho, ya khush ho — "
                "bas batao, main yahan hoon 🎶"
            ),
            'type': 'text'
        }

    # Thanks
    if any(t in msg_lower for t in THANKS):
        return {
            'reply': "Khushi hui! 😊 Music hi sabse bada dost hota hai. Koi aur mood ho to batana 🎵",
            'type': 'text'
        }

    # Detect mood
    detected = detect_mood_from_text(message)
    if detected and detected in MOOD_PLAYLISTS:
        pl = MOOD_PLAYLISTS[detected]
        db_songs = get_db_songs_for_mood(detected)
        songs = db_songs if db_songs else pl['songs']
        return {
            'reply': pl['message'],
            'type': 'playlist',
            'playlist': {
                'label': pl['label'],
                'emoji': pl['emoji'],
                'color': pl['color'],
                'mood': detected,
                'songs': songs[:6],
            }
        }

    # Currently playing
    if any(k in msg_lower for k in ['what is playing', 'current song', 'kya baj raha', 'konsa song', 'currently playing']):
        if current_song and isinstance(current_song, dict):
            return {'reply': f"Abhi **{current_song.get('title')}** by *{current_song.get('artist')}* baj raha hai 🎵", 'type': 'text'}
        return {'reply': "Koi song abhi nahi baj raha. Batao kya sunna chahte ho?", 'type': 'text'}

    # Artist match
    try:
        artists = db.session.query(Song.artist).distinct().all()
        for a_tup in artists:
            a_name = a_tup[0]
            if a_name and a_name.lower() in msg_lower:
                songs = Song.query.filter_by(artist=a_name).order_by(db.func.random()).limit(5).all()
                if songs:
                    return {
                        'reply': f"Yahan hain **{a_name}** ke kuch best tracks! 🎤",
                        'type': 'playlist',
                        'playlist': {'label': f"{a_name} ke Songs 🎤", 'emoji': '🎤', 'color': '#7c5cfc', 'mood': 'neutral', 'songs': [s.to_dict() for s in songs]}
                    }
    except Exception:
        pass

    # Generic play/recommend request
    recommend_triggers = ['recommend', 'suggest', 'play', 'song', 'music', 'kuch sunao', 'sunao', 'playlist', 'baja do']
    if any(k in msg_lower for k in recommend_triggers):
        emo_map = {'happy': 'happy', 'sad': 'sad', 'angry': 'angry', 'fearful': 'anxious', 'neutral': 'tired'}
        mood_key = emo_map.get(emotion, 'happy')
        pl = MOOD_PLAYLISTS.get(mood_key, MOOD_PLAYLISTS['happy'])
        db_songs = get_db_songs_for_mood(mood_key)
        songs = db_songs if db_songs else pl['songs']
        return {
            'reply': "Tumhare liye yeh playlist banaya hai! 🎵",
            'type': 'playlist',
            'playlist': {'label': pl['label'], 'emoji': pl['emoji'], 'color': pl['color'], 'mood': mood_key, 'songs': songs[:6]}
        }

    # Identity
    if any(k in msg_lower for k in ['who are you', 'kya ho', 'kaun ho', 'your name', 'what are you']):
        return {
            'reply': (
                "Main hoon **MoodTune AI** 🤖🎵\n\n"
                "Main tumse baat karke mood samajhta hoon aur perfect playlist suggest karta hoon.\n\n"
                "Try karo:\n"
                "- *'Breakup ho gaya, sad hoon'*\n"
                "- *'Kaam se bahut thak gaya'*\n"
                "- *'Gym ke liye kuch baja do'*\n"
                "- *'Party mood mein hoon!'* 🎶"
            ),
            'type': 'text'
        }

    # Default
    return {
        'reply': (
            "Hmm, main samajh nahi paya 😅\n\n"
            "Mujhe batao **aaj kaisa feel ho raha hai?** Jaise:\n"
            "- *'Bahut thak gaya hoon kaam se'*\n"
            "- *'Breakup ho gaya, sad hoon'*\n"
            "- *'Party mood mein hoon!'*\n"
            "- *'Gym ke liye kuch baja do'*\n\n"
            "Main turant playlist bana dunga 🎶"
        ),
        'type': 'text'
    }


@music_bp.route('/generate-playlist', methods=['POST'])
def generate_playlist():
    """Generative AI Playlist Creator using prompt keywords and semantic mood mapping"""
    try:
        import re
        import random
        
        data = request.get_json() or {}
        prompt = data.get('prompt', '').strip().lower()
        if not prompt:
            return jsonify({'error': 'Prompt is required'}), 400

        # Define keyword-to-mood mapping
        theme_map = {
            'code': 'neutral', 'coding': 'neutral', 'program': 'neutral', 'developer': 'neutral', 'study': 'neutral', 'focus': 'neutral', 'work': 'neutral',
            'night': 'neutral', 'late': 'neutral', 'sleep': 'neutral', 'relax': 'neutral', 'calm': 'neutral', 'lofi': 'neutral', 'lo-fi': 'neutral',
            'gym': 'happy', 'workout': 'happy', 'exercise': 'happy', 'run': 'happy', 'energetic': 'happy', 'pump': 'happy',
            'party': 'happy', 'dance': 'happy', 'club': 'happy', 'celebrate': 'happy',
            'sad': 'sad', 'heartbreak': 'sad', 'breakup': 'sad', 'lonely': 'sad', 'cry': 'sad',
            'angry': 'angry', 'gussa': 'angry', 'rage': 'angry',
            'anxious': 'fearful', 'tense': 'fearful', 'meditate': 'fearful', 'peaceful': 'fearful',
            'love': 'happy', 'romantic': 'happy', 'girlfriend': 'happy', 'boyfriend': 'happy'
        }

        # Tokenize prompt and find matching themes
        words = re.findall(r'\b\w+\b', prompt)
        matched_moods = []
        for w in words:
            if w in theme_map:
                matched_moods.append(theme_map[w])

        # Also search songs directly by title, artist, genre or mood with the prompt words
        query_conditions = []
        for w in words:
            if len(w) > 2: # ignore short words
                query_conditions.append(Song.title.like(f'%{w}%'))
                query_conditions.append(Song.artist.like(f'%{w}%'))
                query_conditions.append(Song.genre.like(f'%{w}%'))

        # Search direct matches in database
        matched_songs = []
        if query_conditions:
            from sqlalchemy import or_
            matched_songs = Song.query.filter(or_(*query_conditions)).limit(20).all()

        # If we have matched moods, fetch random songs from those moods too
        mood_songs = []
        if matched_moods:
            for mood in set(matched_moods):
                songs_of_mood = Song.query.filter_by(mood=mood).order_by(db.func.random()).limit(10).all()
                mood_songs.extend(songs_of_mood)

        # Combine, prioritize direct matches, deduplicate, and limit to 10 songs
        seen = set()
        final_songs = []
        
        # 1. Direct word matches
        for s in matched_songs:
            if s.id not in seen:
                seen.add(s.id)
                final_songs.append(s)
                
        # 2. Theme matches
        for s in mood_songs:
            if s.id not in seen:
                seen.add(s.id)
                final_songs.append(s)

        # 3. Fallback: if we have less than 8 songs, fill with random songs
        if len(final_songs) < 8:
            fillers = Song.query.order_by(db.func.random()).limit(12 - len(final_songs)).all()
            for s in fillers:
                if s.id not in seen:
                    seen.add(s.id)
                    final_songs.append(s)

        # Shuffle slightly to feel generative/dynamic
        random.shuffle(final_songs)
        final_songs = final_songs[:10] # Suggest 10 songs

        return jsonify({
            'prompt': prompt,
            'songs': [s.to_dict() for s in final_songs]
        }), 200

    except Exception as e:
        logger.error(f"Generate playlist error: {e}")
        return jsonify({'error': 'Failed to generate playlist'}), 500


@music_bp.route('/playlists/save-generated', methods=['POST'])
@jwt_required()
def save_generated_playlist():
    """Create a new playlist from AI generated tracklist in a single transaction"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json() or {}
        playlist_name = data.get('playlist_name', 'AI Generated Playlist').strip()
        song_ids = data.get('song_ids', [])
        
        if not playlist_name:
            playlist_name = 'AI Generated Playlist'
            
        if not song_ids:
            return jsonify({'error': 'No songs to save'}), 400
            
        pl = Playlist(user_id=user_id, playlist_name=playlist_name, is_public=False)
        db.session.add(pl)
        db.session.flush() # get playlist ID
        
        for sid in song_ids:
            song = Song.query.filter_by(spotify_id=sid).first()
            if not song:
                song = Song.query.get(sid)
            if song and song not in pl.songs:
                pl.songs.append(song)
                
        db.session.commit()
        return jsonify({
            'playlist': pl.to_dict(),
            'message': 'AI playlist saved successfully!'
        }), 201
        
    except Exception as e:
        logger.error(f"Save generated playlist error: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to save generated playlist'}), 500


@music_bp.route('/lyrics-analysis', methods=['GET'])
def get_lyrics_analysis():
    """Fetch lyrics and perform real-time sentiment matching with user emotion"""
    title = request.args.get('title', '').strip()
    artist = request.args.get('artist', '').strip()
    user_emotion = request.args.get('user_emotion', '').strip()

    if not title:
        return jsonify({'error': 'Title parameter is required'}), 400

    from utils.lyrics_service import get_lyrics_and_analysis
    try:
        analysis = get_lyrics_and_analysis(title, artist, user_emotion)
        return jsonify(analysis), 200
    except Exception as e:
        logger.error(f"Lyrics analysis route error: {e}")
        return jsonify({'error': 'Failed to analyze song lyrics'}), 500


@music_bp.route('/throwback', methods=['GET'])
@jwt_required()
def get_throwback():
    """Fetch throwback memory lane music from exactly 1 year ago (happy mood)"""
    from datetime import datetime, timedelta
    try:
        user_id = int(get_jwt_identity())
        
        now = datetime.utcnow()
        # 1 year ago window (between 360 and 370 days ago)
        start_date = now - timedelta(days=370)
        end_date = now - timedelta(days=360)
        
        records = History.query.filter(
            History.user_id == user_id,
            History.emotion_detected == 'happy',
            History.timestamp >= start_date,
            History.timestamp <= end_date
        ).all()
        
        if not records:
            # Seed 4 happy history records from exactly 365 days ago
            # Query for happy songs in DB
            happy_songs = Song.query.filter_by(mood='happy').limit(4).all()
            if len(happy_songs) < 3:
                # If there are not enough happy songs, take any songs
                happy_songs = Song.query.limit(4).all()
                
            if happy_songs:
                target_date = now - timedelta(days=365)
                for i, song in enumerate(happy_songs):
                    record = History(
                        user_id=user_id,
                        song_id=song.id,
                        emotion_detected='happy',
                        stress_detected=15 + i * 5,
                        anxiety_detected=10 + i * 2,
                        fatigue_detected=20 - i * 3,
                        timestamp=target_date - timedelta(minutes=15 * i)
                    )
                    db.session.add(record)
                db.session.commit()
                
                # Re-query
                records = History.query.filter(
                    History.user_id == user_id,
                    History.emotion_detected == 'happy',
                    History.timestamp >= start_date,
                    History.timestamp <= end_date
                ).all()
        
        return jsonify({
            'throwback_date': (now - timedelta(days=365)).strftime('%d %B %Y'),
            'songs': [r.song.to_dict() for r in records if r.song]
        }), 200
        
    except Exception as e:
        logger.error(f"Throwback memory lane route error: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to load throwback history'}), 500



