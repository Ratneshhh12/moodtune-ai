"""FocusSession model"""
from config.database import db
from datetime import datetime

class FocusSession(db.Model):
    __tablename__ = 'focus_sessions'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    duration_minutes = db.Column(db.Integer, nullable=False)
    category = db.Column(db.String(100), default='General')
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'duration_minutes': self.duration_minutes,
            'category': self.category,
            'timestamp': self.timestamp.isoformat() + 'Z'
        }
