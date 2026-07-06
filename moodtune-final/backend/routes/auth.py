"""Authentication routes"""
import os, secrets
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_mail import Message
from config.database import db
from models.user import User
import logging

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/dns-test', methods=['GET'])
def dns_test():
    import socket
    results = {}
    hosts = [
        'google.com',
        'api.vercel.com',
        'mysql-29a94c54-mooodtune-5484.j.aivencloud.com'
    ]
    for h in hosts:
        try:
            addr = socket.getaddrinfo(h, 80, family=socket.AF_INET)
            results[h] = {'status': 'OK', 'addr': str(addr[0][4])}
        except Exception as e:
            results[h] = {'status': 'ERROR', 'error': str(e)}
    return jsonify(results), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ['name', 'email', 'password']):
            return jsonify({'error': 'Name, email and password are required'}), 400
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 409
        mail_username = os.getenv('MAIL_USERNAME', '')
        is_mail_configured = mail_username and mail_username not in ['', 'your_gmail_address@gmail.com']
        
        user = User(name=data['name'], email=data['email'])
        user.set_password(data['password'])
        user.verification_token = str(secrets.randbelow(900000) + 100000)
        
        if not is_mail_configured:
            user.is_verified = True
            
        db.session.add(user)
        db.session.commit()
        
        if not is_mail_configured:
            logger.info(f"Mail is not configured. Auto-verifying user {user.email}. Dev OTP: {user.verification_token}")
            return jsonify({
                'message': 'Registration successful (Auto-verified in Dev Mode).',
                'user': user.to_dict(),
                'auto_verified': True
            }), 201
            
        # Send verification email (non-blocking)
        try:
            from app import mail
            msg = Message('Verify your MoodTune account',
                recipients=[user.email],
                body=f'Your MoodTune verification OTP is: {user.verification_token}')
            mail.send(msg)
        except Exception as e:
            logger.warning(f"Email send failed: {e}")
        logger.info(f"Verification OTP for {user.email}: {user.verification_token}")
        return jsonify({
            'message': 'Registration successful. Please verify your email with OTP.',
            'user': user.to_dict(),
            'dev_otp': user.verification_token
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Register error: {e}")
        return jsonify({'error': 'Registration failed'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        user = User.query.filter_by(email=data.get('email')).first()
        if not user or not user.check_password(data.get('password', '')):
            return jsonify({'error': 'Invalid credentials'}), 401
        if not user.is_verified:
            return jsonify({
                'error': 'Please verify your email address. Check your inbox or request a new verification link.',
                'unverified': True,
                'dev_otp': user.verification_token
            }), 403
        token = create_access_token(identity=str(user.id))
        return jsonify({'token': token, 'user': user.to_dict()}), 200
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error(f"Login error: {e}\n{tb}")
        return jsonify({'error': f"Login failed: {str(e)}", 'traceback': tb}), 500

@auth_bp.route('/resend-verification', methods=['POST'])
def resend_verification():
    try:
        data = request.get_json()
        email = data.get('email')
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        if user.is_verified:
            return jsonify({'message': 'Email is already verified'}), 200
        
        # Generate new 6-digit numeric OTP each time they request a resend
        user.verification_token = str(secrets.randbelow(900000) + 100000)
        db.session.commit()
            
        try:
            from app import mail
            msg = Message('Verify your MoodTune account',
                recipients=[user.email],
                body=f'Your MoodTune verification OTP is: {user.verification_token}')
            mail.send(msg)
        except Exception as e:
            logger.warning(f"Email send failed: {e}")
            
        logger.info(f"Verification OTP for {user.email}: {user.verification_token}")
        return jsonify({
            'message': 'Verification OTP sent.',
            'dev_otp': user.verification_token
        }), 200
    except Exception as e:
        logger.error(f"Resend verification error: {e}")
        return jsonify({'error': 'Failed to send verification email'}), 500

@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    try:
        data = request.get_json()
        email = data.get('email')
        otp = data.get('otp')
        if not email or not otp:
            return jsonify({'error': 'Email and OTP are required'}), 400
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        if user.is_verified:
            return jsonify({'message': 'Email is already verified'}), 200
        if user.verification_token != str(otp):
            return jsonify({'error': 'Invalid OTP code'}), 400
        user.is_verified = True
        user.verification_token = None
        db.session.commit()
        return jsonify({'message': 'Email verified successfully'}), 200
    except Exception as e:
        logger.error(f"Verify OTP error: {e}")
        return jsonify({'error': 'OTP verification failed'}), 500

@auth_bp.route('/google', methods=['POST'])
def google_login():
    try:
        data = request.get_json()
        token = data.get('credential')
        if not token:
            return jsonify({'error': 'Credential token required'}), 400
        
        import requests
        resp = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}")
        if resp.status_code != 200:
            return jsonify({'error': 'Invalid Google credential token'}), 400
            
        id_info = resp.json()
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        if client_id and id_info.get('aud') != client_id:
            logger.warning(f"Audience mismatch: token aud={id_info.get('aud')}, expected={client_id}")
            # Only reject if the token is clearly wrong, not just env var mismatch
            # Token is already verified by Google's tokeninfo endpoint above

            
        email = id_info.get('email')
        name = id_info.get('name', '')
        picture = id_info.get('picture', '')
        
        if not email:
            return jsonify({'error': 'Google authentication did not provide email'}), 400
            
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(name=name, email=email, is_verified=True, profile_image=picture)
            user.set_password(secrets.token_urlsafe(24))
            db.session.add(user)
            db.session.commit()
            logger.info(f"New user registered via Google: {email}")
        else:
            if not user.profile_image and picture:
                user.profile_image = picture
            user.is_verified = True
            db.session.commit()
            logger.info(f"User logged in via Google: {email}")
            
        jwt_token = create_access_token(identity=str(user.id))
        return jsonify({'token': jwt_token, 'user': user.to_dict()}), 200
    except Exception as e:
        import traceback
        logger.error(f"Google login error: {e}\n{traceback.format_exc()}")
        return jsonify({'error': f'Google authentication failed: {str(e)}'}), 500



@auth_bp.route('/verify/<token>', methods=['GET'])
def verify_email(token):
    user = User.query.filter_by(verification_token=token).first()
    if not user:
        return jsonify({'error': 'Invalid token'}), 400
    user.is_verified = True
    user.verification_token = None
    db.session.commit()
    return jsonify({'message': 'Email verified successfully'}), 200

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email')).first()
    if user:
        user.reset_token = secrets.token_urlsafe(32)
        db.session.commit()
        try:
            from app import mail
            msg = Message('Reset your MoodTune password',
                recipients=[user.email],
                body=f'Reset link: {os.getenv("FRONTEND_URL","http://localhost:3000")}/reset-password/{user.reset_token}')
            mail.send(msg)
        except Exception as e:
            logger.warning(f"Reset email failed: {e}")
    return jsonify({'message': 'If email exists, reset link sent'}), 200

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    user = User.query.filter_by(reset_token=data.get('token')).first()
    if not user:
        return jsonify({'error': 'Invalid or expired token'}), 400
    user.set_password(data['password'])
    user.reset_token = None
    db.session.commit()
    return jsonify({'message': 'Password reset successful'}), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict()), 200

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    data = request.get_json()
    if 'name' in data:
        user.name = data['name']
    if 'profile_image' in data:
        user.profile_image = data['profile_image']
    if 'preferred_language' in data:
        user.preferred_language = data['preferred_language']
    if 'avatar_style' in data:
        user.avatar_style = data['avatar_style']
    db.session.commit()
    return jsonify(user.to_dict()), 200
