"""Playlist and Favorite models"""
from config.database import db
from datetime import datetime

playlist_songs = db.Table('playlist_songs',
    db.Column('playlist_id', db.Integer, db.ForeignKey('playlists.id', ondelete='CASCADE')),
    db.Column('song_id', db.Integer, db.ForeignKey('songs.id', ondelete='CASCADE'))
)

playlist_collaborators = db.Table('playlist_collaborators',
    db.Column('playlist_id', db.Integer, db.ForeignKey('playlists.id', ondelete='CASCADE'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
)

class Playlist(db.Model):
    __tablename__ = 'playlists'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    playlist_name = db.Column(db.String(200), nullable=False)
    cover_image = db.Column(db.String(500), default='')
    is_public = db.Column(db.Boolean, default=False)
    is_collaborative = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    songs = db.relationship('Song', secondary=playlist_songs, backref='playlists', lazy=True)
    collaborators = db.relationship('User', secondary=playlist_collaborators, backref='collaborative_playlists', lazy=True)

    def to_dict(self):
        return {
            'id': self.id, 
            'user_id': self.user_id, 
            'playlist_name': self.playlist_name,
            'cover_image': self.cover_image, 
            'is_public': self.is_public,
            'is_collaborative': self.is_collaborative,
            'collaborator_count': len(self.collaborators),
            'collaborators': [c.to_dict() for c in self.collaborators],
            'song_count': len(self.songs), 
            'created_at': self.created_at.isoformat()
        }

class Favorite(db.Model):
    __tablename__ = 'favorites'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    song_id = db.Column(db.Integer, db.ForeignKey('songs.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    song = db.relationship('Song', backref='favorited_by', lazy=True)
    __table_args__ = (db.UniqueConstraint('user_id', 'song_id'),)

    def to_dict(self):
        return {
            'id': self.id, 'user_id': self.user_id, 'song_id': self.song_id,
            'created_at': self.created_at.isoformat(),
            'song': self.song.to_dict() if self.song else None
        }
