from datetime import datetime
from config.database import db

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    message = db.Column(db.Text, nullable=False)
    mood = db.Column(db.String(50), nullable=True)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('notifications', cascade='all, delete-orphan'))
    sender = db.relationship('User', foreign_keys=[sender_id])

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'sender_id': self.sender_id,
            'sender_name': self.sender.name if self.sender else None,
            'sender_avatar': self.sender.profile_image if self.sender else None,
            'sender_avatar_style': self.sender.avatar_style if self.sender else None,
            'message': self.message,
            'mood': self.mood,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat()
        }
