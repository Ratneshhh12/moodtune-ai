from datetime import datetime
from config.database import db

class CircleStatus(db.Model):
    __tablename__ = 'circle_statuses'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    mood = db.Column(db.String(50), nullable=False)
    content = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to user
    user = db.relationship('User', backref=db.backref('circle_statuses', cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name,
            'user_profile_image': self.user.profile_image,
            'user_avatar_style': self.user.avatar_style,
            'mood': self.mood,
            'content': self.content,
            'created_at': self.created_at.isoformat()
        }
