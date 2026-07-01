"""History model"""
from config.database import db
from datetime import datetime

class History(db.Model):
    __tablename__ = 'history'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    song_id = db.Column(db.Integer, db.ForeignKey('songs.id', ondelete='CASCADE'), nullable=False)
    emotion_detected = db.Column(db.String(50), default='neutral')
    stress_detected = db.Column(db.Integer, default=0)
    anxiety_detected = db.Column(db.Integer, default=0)
    fatigue_detected = db.Column(db.Integer, default=0)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    song = db.relationship('Song', backref='history_entries', lazy=True)

    def to_dict(self):
        return {
            'id': self.id, 'user_id': self.user_id, 'song_id': self.song_id,
            'emotion_detected': self.emotion_detected,
            'stress_detected': self.stress_detected,
            'anxiety_detected': self.anxiety_detected,
            'fatigue_detected': self.fatigue_detected,
            'timestamp': self.timestamp.isoformat() + 'Z',
            'song': self.song.to_dict() if self.song else None
        }
