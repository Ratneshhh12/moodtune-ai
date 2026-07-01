from datetime import datetime
from config.database import db

class CircleMember(db.Model):
    __tablename__ = 'circle_members'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    contact_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('circle_connections', cascade='all, delete-orphan'))
    contact = db.relationship('User', foreign_keys=[contact_id], backref=db.backref('circle_by_friends', cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'contact_id': self.contact_id,
            'contact_name': self.contact.name,
            'contact_email': self.contact.email,
            'contact_profile_image': self.contact.profile_image,
            'contact_avatar_style': self.contact.avatar_style,
            'created_at': self.created_at.isoformat()
        }
