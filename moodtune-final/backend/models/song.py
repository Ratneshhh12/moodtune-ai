"""Song model"""
from config.database import db
from datetime import datetime

class Song(db.Model):
    __tablename__ = 'songs'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(200), nullable=False)
    artist = db.Column(db.String(200), nullable=False)
    album = db.Column(db.String(200), default='')
    genre = db.Column(db.String(100), nullable=False)
    mood = db.Column(db.String(100), nullable=False)
    duration = db.Column(db.Integer, default=0)  # seconds
    cover_url = db.Column(db.String(500), default='')
    preview_url = db.Column(db.String(500), default='')
    spotify_id = db.Column(db.String(100), unique=True, nullable=True)
    play_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'title': self.title, 'artist': self.artist,
            'album': self.album, 'genre': self.genre, 'mood': self.mood,
            'duration': self.duration, 'cover_url': self.cover_url,
            'preview_url': self.preview_url, 'spotify_id': self.spotify_id,
            'play_count': self.play_count
        }
