"""
MoodTune AI - Main Flask Application
Production-ready backend with JWT auth, MySQL, Spotify API
"""
import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from dotenv import load_dotenv
from config.database import init_db, db
from models.chat_log import ChatLog
from models.history import History
from models.journal import JournalEntry
from models.focus import FocusSession
from models.circle_member import CircleMember
from models.circle_status import CircleStatus
from models.notification import Notification


# Load environment variables
load_dotenv(override=True)

# Configure logging
handlers = [logging.StreamHandler()]
if not os.getenv('VERCEL'):
    try:
        handlers.append(logging.FileHandler('moodtune.log', mode='a'))
    except Exception:
        pass

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=handlers
)
logger = logging.getLogger(__name__)

# Initialize extensions
jwt = JWTManager()
mail = Mail()

def create_app():
    """Application factory"""
    app = Flask(__name__)

    # Core config
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-change-me')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-change-me')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600))

    # Mail config
    app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True') == 'True'
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME', '')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD', '')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER') or os.getenv('MAIL_USERNAME') or 'noreply@moodtune.ai'

    # Initialize extensions
    init_db(app)
    jwt.init_app(app)
    mail.init_app(app)
    CORS(app, origins=['http://localhost:3000', 'http://127.0.0.1:3000'],
         supports_credentials=True)

    # Register blueprints
    from routes.auth import auth_bp
    from routes.music import music_bp
    from routes.admin import admin_bp
    from routes.social import social_bp
    from routes.wellness import wellness_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(music_bp, url_prefix='/api/music')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(social_bp, url_prefix='/api/social')
    app.register_blueprint(wellness_bp, url_prefix='/api/wellness')

    # Health check
    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({'status': 'ok', 'service': 'MoodTune AI'}), 200

    # Diagnostic DB check
    @app.route('/api/db-test', methods=['GET'])
    def db_test():
        from sqlalchemy import text
        import traceback
        import sys
        
        # Mask sensitive password characters in debug info
        password = os.getenv('DB_PASSWORD', '')
        masked_password = password[:2] + '*' * (len(password) - 4) + password[-2:] if len(password) > 4 else '***'
        
        info = {
            'db_type': os.getenv('DB_TYPE', 'mysql'),
            'db_user': os.getenv('DB_USER', 'root'),
            'db_host': os.getenv('DB_HOST', 'localhost'),
            'db_port': os.getenv('DB_PORT', '3306'),
            'db_name': os.getenv('DB_NAME', 'moodtune_db'),
            'password_len': len(password),
            'masked_password': masked_password,
            'python_version': sys.version
        }
        
        try:
            # Attempt a quick query
            db.session.execute(text('SELECT 1'))
            info['status'] = 'connected'
            return jsonify(info), 200
        except Exception as e:
            info['status'] = 'failed'
            info['error'] = str(e)
            info['traceback'] = traceback.format_exc()
            return jsonify(info), 500


    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Endpoint not found'}), 404

    @app.errorhandler(500)
    def server_error(e):
        logger.error(f"Internal error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

    @jwt.expired_token_loader
    def expired_token(jwt_header, jwt_payload):
        return jsonify({'error': 'Token expired'}), 401

    @jwt.invalid_token_loader
    def invalid_token(error):
        return jsonify({'error': 'Invalid token'}), 401

    # Create DB tables and seed admin and songs (skip on Vercel cold start to prevent timeouts)
    if not os.getenv('VERCEL') or os.getenv('INIT_DB') == 'True':
        with app.app_context():
            try:
                db.create_all()
                # Migration: Add prompt column to journal_entries if it doesn't exist (SQLite safe check)
                try:
                    db.session.execute(db.text("ALTER TABLE journal_entries ADD COLUMN prompt VARCHAR(255)"))
                    db.session.commit()
                    logger.info("Database migration: prompt column successfully added to journal_entries")
                except Exception:
                    db.session.rollback()
                _seed_admin()
                _seed_songs()
                logger.info("MoodTune AI database initialized and seeded")
            except Exception as e:
                logger.error(f"Failed to initialize database: {e}")

    return app

def _seed_admin():
    """Create default admin user if not exists"""
    from models.user import User
    admin_email = os.getenv('ADMIN_EMAIL', 'admin@moodtune.com')
    if not User.query.filter_by(email=admin_email).first():
        admin = User(name='Admin', email=admin_email, is_admin=True, is_verified=True)
        admin.set_password(os.getenv('ADMIN_PASSWORD', 'Admin@123'))
        db.session.add(admin)
        db.session.commit()
        logger.info(f"Admin user created: {admin_email}")

def _seed_songs():
    """Seed or update fallback songs in the database and remove obsolete ones"""
    from models.song import Song
    logger.info("Seeding/updating fallback songs in database...")
    from utils.youtube_service import FALLBACK_SONGS
    active_ids = []
    for mood, song_list in FALLBACK_SONGS.items():
        for s in song_list:
            active_ids.append(s['spotify_id'])
            existing = Song.query.filter_by(spotify_id=s['spotify_id']).first()
            if existing:
                existing.title = s['title']
                existing.artist = s['artist']
                existing.genre = s['genre']
                existing.mood = mood.lower()
                existing.preview_url = s['preview_url']
                existing.cover_url = s['cover_url']
                existing.duration = s['duration']
            else:
                song = Song(
                    title=s['title'],
                    artist=s['artist'],
                    album=s.get('album', ''),
                    genre=s['genre'],
                    mood=mood.lower(),
                    duration=s['duration'],
                    cover_url=s['cover_url'],
                    preview_url=s['preview_url'],
                    spotify_id=s['spotify_id']
                )
                db.session.add(song)
    # Delete songs that are not in the current fallback lists
    deleted_count = Song.query.filter(~Song.spotify_id.in_(active_ids)).delete(synchronize_session=False)
    if deleted_count > 0:
        logger.info(f"Deleted {deleted_count} obsolete fallback songs from database.")
    db.session.commit()
    logger.info("Songs seeding/updating completed.")

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=os.getenv('FLASK_DEBUG', 'True') == 'True', use_reloader=False)
