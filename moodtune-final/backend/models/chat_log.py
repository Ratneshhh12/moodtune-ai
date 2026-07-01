"""ChatLog model"""
from config.database import db
from datetime import datetime

class ChatLog(db.Model):
    __tablename__ = 'chat_logs'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    sentiment = db.Column(db.String(50), default='neutral')
    stress = db.Column(db.Integer, default=0)
    fatigue = db.Column(db.Integer, default=0)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'message': self.message,
            'sentiment': self.sentiment,
            'stress': self.stress,
            'fatigue': self.fatigue,
            'timestamp': self.timestamp.isoformat()
        }
