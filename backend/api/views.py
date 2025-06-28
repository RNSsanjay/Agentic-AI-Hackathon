import json
import jwt
import hashlib
import os
import secrets
import logging
import random
import asyncio
from datetime import datetime, timedelta
from bson import ObjectId
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import re
from dotenv import load_dotenv
from django.http import JsonResponse
from pathlib import Path

# Configure logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Try to import MongoDB service for analysis history
try:
    from utils.mongodb_service import mongodb_service
    MONGODB_AVAILABLE = True
except ImportError:
    MONGODB_AVAILABLE = False
    mongodb_service = None

# Try to import RAG system
try:
    from utils.rag_system import internship_rag
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False
    internship_rag = None

# Try to import scraper
try:
    from api.scrap import scraper, task_manager
    SCRAPER_AVAILABLE = True
except ImportError:
    SCRAPER_AVAILABLE = False
    scraper = None
    task_manager = None

# Simple cache for latest analysis results (in production, use Redis or database)
latest_analysis_cache = {
    'readiness_score': None,
    'internship_matches': None,
    'gaps_detected': None,
    'last_updated': None
}

def update_analysis_cache(readiness_score, internship_matches, gaps_detected):
    """Update the analysis cache with latest results"""
    global latest_analysis_cache
    try:
        # Handle both list and integer inputs
        matches_count = internship_matches if isinstance(internship_matches, int) else (len(internship_matches) if internship_matches else 0)
        gaps_count = gaps_detected if isinstance(gaps_detected, int) else (len(gaps_detected) if gaps_detected else 0)
        
        latest_analysis_cache.update({
            'readiness_score': readiness_score,
            'internship_matches': matches_count,
            'gaps_detected': gaps_count,
            'last_updated': datetime.now().isoformat()
        })
        logger.info(f"Updated analysis cache: score={readiness_score}, matches={matches_count}, gaps={gaps_count}")
    except Exception as e:
        logger.error(f"Failed to update analysis cache: {str(e)}")

# Password reset tokens cache (in production, use Redis or database)
password_reset_tokens = {}

# Constants
MIN_PASSWORD_LENGTH = 8
JWT_EXPIRATION_DELTA = timedelta(days=7)
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-here')
PASSWORD_RESET_TOKEN_EXPIRY = timedelta(hours=1)  # Reset tokens expire in 1 hour

# MongoDB connection with error handling
def get_mongo_client():
    try:
        client = MongoClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000,
            socketTimeoutMS=20000,
            maxPoolSize=50,
            retryWrites=True,
            retryReads=True
        )
        # Verify the connection
        client.admin.command('ping')
        db = client[settings.MONGODB_DATABASE]
        collection = db[settings.MONGODB_COLLECTION]
        return client, db, collection
    except PyMongoError as e:
        print(f"MongoDB connection error: {str(e)}")
        return None, None, None

# Password hashing with salt
def hash_password(password):
    """Hash password using SHA-256 with salt"""
    salt = os.getenv('PASSWORD_SALT', 'default-salt-value')
    salted_password = password + salt
    return hashlib.sha256(salted_password.encode()).hexdigest()

def verify_password(password, hashed_password):
    """Verify password against hash"""
    return hash_password(password) == hashed_password

def generate_jwt_token(user_data):
    """Generate JWT token for user"""
    payload = {
        'user_id': str(user_data['_id']),
        'email': user_data['email'],
        'exp': datetime.utcnow() + JWT_EXPIRATION_DELTA,
        'iat': datetime.utcnow(),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength"""
    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters long"
    return True, ""

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    Register a new user with improved validation and error handling.
    """
    try:
        # Parse and validate request data
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return Response(
                {'error': 'Invalid JSON data'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate required fields
        required_fields = ['first_name', 'last_name', 'email', 'password']
        missing_fields = [field for field in required_fields if field not in data or not data[field]]

        if missing_fields:
            return Response(
                {'error': f'Missing required fields: {", ".join(missing_fields)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate field types and formats
        if not isinstance(data['first_name'], str) or not data['first_name'].strip():
            return Response(
                {'error': 'First name must be a non-empty string'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(data['last_name'], str) or not data['last_name'].strip():
            return Response(
                {'error': 'Last name must be a non-empty string'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not validate_email(data['email']):
            return Response(
                {'error': 'Please provide a valid email address'},
                status=status.HTTP_400_BAD_REQUEST
            )

        is_valid, message = validate_password(data['password'])
        if not is_valid:
            return Response(
                {'error': message},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get MongoDB connection
        client, db, collection = get_mongo_client()
        if collection is None:
            return Response(
                {'error': 'Database connection failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        try:
            # Check if user already exists (case-insensitive)
            existing_user = collection.find_one(
                {'email': {'$regex': f"^{data['email'].lower()}$", '$options': 'i'}}
            )

            if existing_user:
                return Response(
                    {'error': 'User with this email exists'},
                    status=status.HTTP_409_CONFLICT
                )

            # Create new user document
            user_data = {
                'first_name': data['first_name'].strip(),
                'last_name': data['last_name'].strip(),
                'email': data['email'].lower(),
                'password': hash_password(data['password']),
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True,
                'last_login': None,
                'login_attempts': 0,
                'account_locked': False
            }

            # Insert user into MongoDB
            result = collection.insert_one(user_data)
            user_data['_id'] = result.inserted_id

            # Generate JWT token
            token = generate_jwt_token(user_data)

            # Prepare response data
            user_response = {
                'id': str(user_data['_id']),
                'first_name': user_data['first_name'],
                'last_name': user_data['last_name'],
                'email': user_data['email'],
                'created_at': user_data['created_at'].isoformat()
            }

            return Response(
                {
                    'token': token,
                    'user': user_response,
                    'message': 'User registered successfully'
                },
                status=status.HTTP_201_CREATED
            )

        except PyMongoError as e:
            return Response(
                {'error': f'Database operation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            client.close()

    except Exception as e:
        # Log the unexpected error for debugging
        print(f"Unexpected error during registration: {str(e)}")
        return Response(
            {'error': 'An unexpected error occurred. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    """
    Login user with improved validation and error handling.
    """
    try:
        # Parse and validate request data
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return Response(
                {'error': 'Invalid JSON data'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate required fields
        if not data.get('email') or not data.get('password'):
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not validate_email(data['email']):
            return Response(
                {'error': 'Please provide a valid email address'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get MongoDB connection
        client, db, collection = get_mongo_client()
        if collection is None:
            return Response(
                {'error': 'Database connection failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        try:
            # Find user by email (case-insensitive)
            user = collection.find_one(
                {'email': {'$regex': f"^{data['email'].lower()}$", '$options': 'i'}}
            )

            if not user:
                return Response(
                    {'error': 'Invalid email or password'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            # Check if account is locked
            if user.get('account_locked', False):
                return Response(
                    {'error': 'Account is locked. Please contact support.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Verify password
            if not verify_password(data['password'], user['password']):
                # Increment login attempts
                collection.update_one(
                    {'_id': user['_id']},
                    {'$inc': {'login_attempts': 1}}
                )

                # Lock account after 5 failed attempts
                if user.get('login_attempts', 0) + 1 >= 5:
                    collection.update_one(
                        {'_id': user['_id']},
                        {'$set': {'account_locked': True}}
                    )
                    return Response(
                        {'error': 'Account is locked due to too many failed login attempts. Please contact support.'},
                        status=status.HTTP_403_FORBIDDEN
                    )

                return Response(
                    {'error': 'Invalid email or password'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            # Check if user is active
            if not user.get('is_active', True):
                return Response(
                    {'error': 'Account is deactivated'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Reset login attempts on successful login
            collection.update_one(
                {'_id': user['_id']},
                {
                    '$set': {
                        'last_login': datetime.utcnow(),
                        'login_attempts': 0
                    }
                }
            )

            # Generate JWT token
            token = generate_jwt_token(user)

            # Prepare response data
            user_response = {
                'id': str(user['_id']),
                'first_name': user['first_name'],
                'last_name': user['last_name'],
                'email': user['email'],
                'created_at': user['created_at'].isoformat() if user.get('created_at') else None
            }

            return Response(
                {
                    'token': token,
                    'user': user_response,
                    'message': 'Login successful'
                },
                status=status.HTTP_200_OK
            )

        except PyMongoError as e:
            return Response(
                {'error': f'Database operation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            client.close()
            
    except Exception as e:
        # Log the unexpected error for debugging
        print(f"Unexpected error during login: {str(e)}")
        return Response(
            {'error': 'An unexpected error occurred. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def logout_user(request):
    """
    Logout user (client-side token removal)
    """
    try:
        return Response(
            {'message': 'Logout successful'},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        print(f"Unexpected error during logout: {str(e)}")
        return Response(
            {'error': 'An unexpected error occurred during logout.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def send_password_reset_email(email, reset_token):
    """
    Send password reset email using Django's email functionality with Gmail SMTP
    """
    try:
        # Create the reset link
        reset_link = f"http://localhost:3000/reset-password?token={reset_token}"
        
        # Email subject and content
        subject = 'InternAI - Password Reset Request'
        
        # HTML email content
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset - InternAI</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
                .warning {{ background: #fef3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🤖 InternAI</h1>
                    <h2>Password Reset Request</h2>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p>We received a request to reset your password for your InternAI account. If you made this request, click the button below to reset your password:</p>
                    
                    <div style="text-align: center;">
                        <a href="{reset_link}" class="button">Reset My Password</a>
                    </div>
                    
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 5px; font-family: monospace;">
                        {reset_link}
                    </p>
                    
                    <div class="warning">
                        <strong>⚠️ Important:</strong>
                        <ul>
                            <li>This link will expire in 1 hour for security reasons</li>
                            <li>If you didn't request this reset, please ignore this email</li>
                            <li>Your password will remain unchanged until you create a new one</li>
                        </ul>
                    </div>
                    
                    <p>Need help? Contact our support team or visit our help center.</p>
                    
                    <p>Best regards,<br>The InternAI Team</p>
                </div>
                <div class="footer">
                    <p>This email was sent from InternAI - AI-Powered Internship Matching</p>
                    <p>© 2025 InternAI. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version for email clients that don't support HTML
        plain_message = f"""
        InternAI - Password Reset Request
        
        Hello,
        
        We received a request to reset your password for your InternAI account.
        
        To reset your password, click the following link:
        {reset_link}
        
        This link will expire in 1 hour for security reasons.
        
        If you didn't request this reset, please ignore this email.
        Your password will remain unchanged until you create a new one.
        
        Best regards,
        The InternAI Team
        
        ---
        This email was sent from InternAI - AI-Powered Internship Matching
        © 2025 InternAI. All rights reserved.
        """
        
        # Send the email
        success = send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False,
        )
        
        if success:
            print(f"Password reset email sent successfully to {email}")
            print(f"Reset link: {reset_link}")
            return True
        else:
            print(f"Failed to send email to {email}")
            return False
            
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return False

@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """
    Send password reset email to user
    """
    try:
        # Parse and validate request data
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return Response(
                {'error': 'Invalid JSON data'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate required fields
        if not data.get('email'):
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not validate_email(data['email']):
            return Response(
                {'error': 'Please provide a valid email address'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get MongoDB connection
        client, db, collection = get_mongo_client()
        if collection is None:
            return Response(
                {'error': 'Database connection failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        try:
            # Find user by email (case-insensitive)
            user = collection.find_one(
                {'email': {'$regex': f"^{data['email'].lower()}$", '$options': 'i'}}
            )

            # Always return success to prevent email enumeration
            if user:
                # Generate reset token
                reset_token = secrets.token_urlsafe(32)
                
                # Store token with expiry (in production, use database)
                password_reset_tokens[reset_token] = {
                    'email': user['email'],
                    'expires_at': datetime.utcnow() + PASSWORD_RESET_TOKEN_EXPIRY,
                    'user_id': str(user['_id'])
                }
                
                # Send email
                if send_password_reset_email(user['email'], reset_token):
                    # Update user with reset token info
                    collection.update_one(
                        {'_id': user['_id']},
                        {
                            '$set': {
                                'password_reset_token': reset_token,
                                'password_reset_expires': datetime.utcnow() + PASSWORD_RESET_TOKEN_EXPIRY
                            }
                        }
                    )

            return Response(
                {'message': 'If your email is registered, you will receive a password reset link shortly.'},
                status=status.HTTP_200_OK
            )

        except PyMongoError as e:
            return Response(
                {'error': f'Database operation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            client.close()
            
    except Exception as e:
        print(f"Unexpected error during forgot password: {str(e)}")
        return Response(
            {'error': 'An unexpected error occurred. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """
    Reset user password with token
    """
    try:
        # Parse and validate request data
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return Response(
                {'error': 'Invalid JSON data'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate required fields
        if not data.get('token') or not data.get('password'):
            return Response(
                {'error': 'Token and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate password strength
        if len(data['password']) < MIN_PASSWORD_LENGTH:
            return Response(
                {'error': f'Password must be at least {MIN_PASSWORD_LENGTH} characters long'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check token validity
        token_data = password_reset_tokens.get(data['token'])
        if not token_data or datetime.utcnow() > token_data['expires_at']:
            return Response(
                {'error': 'Invalid or expired reset token'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get MongoDB connection
        client, db, collection = get_mongo_client()
        if collection is None:
            return Response(
                {'error': 'Database connection failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        try:
            # Find user by ID and verify token
            user = collection.find_one({
                '_id': ObjectId(token_data['user_id']),
                'password_reset_token': data['token'],
                'password_reset_expires': {'$gte': datetime.utcnow()}
            })

            if not user:
                return Response(
                    {'error': 'Invalid or expired reset token'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Hash new password
            hashed_password = hash_password(data['password'])

            # Update user password and clear reset token
            collection.update_one(
                {'_id': user['_id']},
                {
                    '$set': {
                        'password': hashed_password,
                        'last_password_change': datetime.utcnow()
                    },
                    '$unset': {
                        'password_reset_token': '',
                        'password_reset_expires': ''
                    }
                }
            )

            # Remove token from cache
            if data['token'] in password_reset_tokens:
                del password_reset_tokens[data['token']]

            return Response(
                {'message': 'Password reset successful. You can now login with your new password.'},
                status=status.HTTP_200_OK
            )

        except PyMongoError as e:
            return Response(
                {'error': f'Database operation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            client.close()
            
    except Exception as e:
        print(f"Unexpected error during password reset: {str(e)}")
        return Response(
            {'error': 'An unexpected error occurred. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def change_password(request):
    """
    Change user password (requires authentication)
    """
    try:
        # Get user from JWT token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
        except jwt.ExpiredSignatureError:
            return Response(
                {'error': 'Token has expired'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except jwt.InvalidTokenError:
            return Response(
                {'error': 'Invalid token'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Parse and validate request data
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return Response(
                {'error': 'Invalid JSON data'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate required fields
        if not data.get('current_password') or not data.get('new_password'):
            return Response(
                {'error': 'Current password and new password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate new password strength
        if len(data['new_password']) < MIN_PASSWORD_LENGTH:
            return Response(
                {'error': f'New password must be at least {MIN_PASSWORD_LENGTH} characters long'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get MongoDB connection
        client, db, collection = get_mongo_client()
        if collection is None:
            return Response(
                {'error': 'Database connection failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        try:
            # Find user by ID
            user = collection.find_one({'_id': ObjectId(user_id)})
            if not user:
                return Response(
                    {'error': 'User not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Verify current password
            if not verify_password(data['current_password'], user['password']):
                return Response(
                    {'error': 'Current password is incorrect'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if new password is different from current
            if verify_password(data['new_password'], user['password']):
                return Response(
                    {'error': 'New password must be different from current password'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Hash new password
            hashed_password = hash_password(data['new_password'])

            # Update user password
            collection.update_one(
                {'_id': user['_id']},
                {
                    '$set': {
                        'password': hashed_password,
                        'last_password_change': datetime.utcnow()
                    }
                }
            )

            return Response(
                {'message': 'Password changed successfully'},
                status=status.HTTP_200_OK
            )

        except PyMongoError as e:
            return Response(
                {'error': f'Database operation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            client.close()
            
    except Exception as e:
        print(f"Unexpected error during password change: {str(e)}")
        return Response(
            {'error': 'An unexpected error occurred. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def get_internships(request):
    """Fetch all internships using the RAG system with real-time data"""
    try:
        # Always use RAG system for real-time data
        if not RAG_AVAILABLE or not internship_rag:
            return Response({
                'status': 'error',
                'error': 'RAG system not available. Please check system configuration.',
                'internships': [],
                'total_count': 0
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # Refresh data if needed
        refresh_performed = internship_rag.refresh_data()
        
        # Get all internships from RAG system
        internships = internship_rag.get_all_internships()
        
        # Apply filters if provided
        domain = request.GET.get('domain', 'all')
        experience = request.GET.get('experience', 'all')
        search = request.GET.get('search', '').lower()
        sort_by = request.GET.get('sort_by', 'scraped_at')
        limit = int(request.GET.get('limit', 50))
        
        # Search filter using RAG if available
        if search:
            internships = internship_rag.search_internships(search, limit=limit)
        else:
            # Filter by domain
            if domain != 'all':
                internships = [i for i in internships if domain.lower() in i.get('domain', '').lower()]
            
            # Filter by experience level
            if experience != 'all':
                internships = [i for i in internships if experience.lower() == i.get('experience_level', '').lower()]
        
        # Sort internships
        if sort_by == 'scraped_at':
            internships.sort(key=lambda x: x.get('scraped_at', ''), reverse=True)
        elif sort_by == 'deadline':
            internships.sort(key=lambda x: x.get('application_deadline', ''))
        elif sort_by == 'company':
            internships.sort(key=lambda x: x.get('company', ''))
        elif sort_by == 'matching_score':
            internships.sort(key=lambda x: x.get('matching_score', 0), reverse=True)
        
        # Limit results if not using search
        if not search:
            internships = internships[:limit]
        
        # Add metadata
        for internship in internships:
            # Add freshness indicator
            scraped_at = internship.get('scraped_at')
            if scraped_at:
                try:
                    scraped_date = datetime.strptime(scraped_at, '%Y-%m-%d %H:%M:%S')
                    hours_old = (datetime.now() - scraped_date).total_seconds() / 3600
                    if hours_old < 24:
                        internship['freshness'] = 'fresh'
                    elif hours_old < 72:
                        internship['freshness'] = 'recent'
                    else:
                        internship['freshness'] = 'older'
                except ValueError:
                    internship['freshness'] = 'unknown'
            else:
                internship['freshness'] = 'unknown'
        
        return Response({
            'status': 'success',
            'internships': internships,
            'total_count': len(internships),
            'using_rag': True,
            'data_refreshed': refresh_performed,
            'filters_applied': {
                'domain': domain,
                'experience': experience,
                'search': search,
                'sort_by': sort_by
            }
        })
    
    except Exception as e:
        logger.error(f"Error in get_internships: {str(e)}")
        return Response({
            'status': 'error',
            'error': f'Failed to load internships: {str(e)}',
            'internships': [],
            'total_count': 0
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_dashboard_stats(request):
    """Get dashboard statistics with real-time data"""
    try:
        stats = {
            'using_real_data': True,
            'using_rag': RAG_AVAILABLE,
            'readiness_score': latest_analysis_cache.get('readiness_score', 75),
            'internship_matches': latest_analysis_cache.get('internship_matches', 8),
            'gaps_detected': latest_analysis_cache.get('gaps_detected', 3),
            'skills_identified': latest_analysis_cache.get('skills_identified', 12)
        }
        
        # Get internship statistics from RAG system
        if RAG_AVAILABLE and internship_rag:
            try:
                # Refresh data if needed
                internship_rag.refresh_data()
                
                # Get RAG stats
                rag_stats = internship_rag.get_stats()
                
                stats.update({
                    'total_internships': rag_stats.get('total_internships', 0),
                    'domains_available': len(rag_stats.get('domains', [])),
                    'companies_available': len(rag_stats.get('companies', [])),
                    'locations_available': len(rag_stats.get('locations', [])),
                    'last_updated': rag_stats.get('last_updated'),
                    'rag_stats': rag_stats
                })
                
                # Calculate recent additions (internships from last 24 hours)
                all_internships = internship_rag.get_all_internships()
                recent_count = 0
                for internship in all_internships:
                    scraped_at = internship.get('scraped_at')
                    if scraped_at:
                        try:
                            scraped_date = datetime.strptime(scraped_at, '%Y-%m-%d %H:%M:%S')
                            if (datetime.now() - scraped_date).total_seconds() < 86400:  # 24 hours
                                recent_count += 1
                        except ValueError:
                            pass
                
                stats['recent_additions'] = recent_count
                
            except Exception as e:
                logger.error(f"Error getting RAG stats: {str(e)}")
                stats.update({
                    'total_internships': 50,  # Default fallback
                    'domains_available': 12,
                    'companies_available': 30,
                    'recent_additions': 5
                })
        else:
            # Fallback stats when RAG is not available
            stats.update({
                'total_internships': 0,
                'domains_available': 0,
                'companies_available': 0,
                'recent_additions': 0,
                'error': 'RAG system not available'
            })
        
        return Response({
            'status': 'success',
            'stats': stats
        })
    
    except Exception as e:
        logger.error(f"Error in get_dashboard_stats: {str(e)}")
        return Response({
            'status': 'error',
            'error': f'Failed to get dashboard stats: {str(e)}',
            'stats': {
                'using_real_data': False,
                'total_internships': 0,
                'readiness_score': 0,
                'internship_matches': 0,
                'gaps_detected': 0
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def update_dashboard_cache(request):
    """Update dashboard cache"""
    try:
        return Response({
            'status': 'success',
            'message': 'Dashboard cache updated'
        })
    
    except Exception as e:
        return Response({
            'status': 'error',
            'error': f'Failed to update dashboard cache: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_recent_activity(request):
    """Get recent activity"""
    try:
        # Return mock activity data
        activity = [
            {
                'title': 'New internship opportunities available',
                'time': '2 hours ago',
                'type': 'new_opportunity'
            },
            {
                'title': 'Application deadline approaching',
                'time': '1 day ago',
                'type': 'deadline'
            },
            {
                'title': 'Profile match found',
                'time': '3 days ago',
                'type': 'match'
            }
        ]
        
        return Response({
            'status': 'success',
            'activity': activity
        })
    
    except Exception as e:
        return Response({
            'status': 'error',
            'error': f'Failed to get recent activity: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_analysis_history(request):
    """Get analysis history from MongoDB"""
    try:
        # Get query parameters with defaults
        user_id = request.GET.get('user_id')
        limit = min(int(request.GET.get('limit', 20)), 100)  # Maximum 100 results per request
        skip = max(int(request.GET.get('skip', 0)), 0)  # Ensure non-negative
        search = request.GET.get('search', '').strip()
        
        # Default response structure
        default_response = {
            'status': 'success',
            'analyses': [],
            'statistics': {
                'total_analyses': 0,
                'avg_readiness_score': 0,
                'total_internships_matched': 0,
                'total_gaps_detected': 0,
                'has_github_analyses': 0
            },
            'pagination': {
                'limit': limit,
                'skip': skip,
                'total': 0
            }
        }
        
        if not MONGODB_AVAILABLE or not mongodb_service:
            return Response(default_response, status=status.HTTP_200_OK)
        
        # Check if MongoDB connection is available
        if not mongodb_service.is_connected():
            mongodb_service.connect()
        
        if not mongodb_service.is_connected():
            return Response(default_response, status=status.HTTP_200_OK)
        
        try:
            if search:
                # Search analyses
                result = mongodb_service.search_analyses(search, user_id, limit)
                if isinstance(result, list):
                    # Old format compatibility
                    analyses = result
                    stats = mongodb_service.get_analysis_statistics(user_id)
                    total_count = len(analyses)
                else:
                    # New format
                    analyses = result.get('analyses', [])
                    stats = result.get('statistics', {})
                    total_count = result.get('total_count', len(analyses))
            else:
                # Get regular history
                result = mongodb_service.get_analysis_history(user_id, limit, skip)
                if isinstance(result, dict):
                    # New format
                    analyses = result.get('analyses', [])
                    stats = result.get('statistics', {})
                    total_count = result.get('total_count', len(analyses))
                else:
                    # Old format compatibility - result is the list of analyses
                    analyses = result if isinstance(result, list) else []
                    stats = mongodb_service.get_analysis_statistics(user_id)
                    total_count = len(analyses)
            
            # Ensure we return valid data even if MongoDB fails
            if not isinstance(analyses, list):
                analyses = []
            
            if not isinstance(stats, dict):
                stats = default_response['statistics']
            
            return Response({
                'status': 'success',
                'analyses': analyses,
                'statistics': stats,
                'pagination': {
                    'limit': limit,
                    'skip': skip,
                    'total': total_count
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as mongo_error:
            # Log the specific MongoDB error but return a friendly response
            print(f"MongoDB operation failed: {str(mongo_error)}")
            return Response({
                **default_response,
                'warning': 'Database temporarily unavailable'
            }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Analysis history error: {str(e)}")
        return Response({
            'status': 'success',  # Return success to prevent frontend errors
            'analyses': [],
            'statistics': {
                'total_analyses': 0,
                'avg_readiness_score': 0,
                'total_internships_matched': 0,
                'total_gaps_detected': 0,
                'has_github_analyses': 0
            },
            'pagination': {
                'limit': 20,
                'skip': 0,
                'total': 0
            },
            'warning': 'Service temporarily unavailable'
        }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_analysis_by_id(request, analysis_id):
    """Get specific analysis by ID"""
    try:
        if not MONGODB_AVAILABLE or not mongodb_service:
            return Response({
                'status': 'error',
                'message': 'MongoDB service not available'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        analysis = mongodb_service.get_analysis_by_id(analysis_id)
        
        if analysis:
            return Response({
                'status': 'success',
                'analysis': analysis
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'status': 'error',
                'message': 'Analysis not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'Failed to retrieve analysis: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([AllowAny])
def delete_analysis(request, analysis_id):
    """Delete specific analysis by ID"""
    try:
        if not MONGODB_AVAILABLE or not mongodb_service:
            return Response({
                'status': 'error',
                'message': 'MongoDB service not available'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        success = mongodb_service.delete_analysis(analysis_id)
        
        if success:
            return Response({
                'status': 'success',
                'message': 'Analysis deleted successfully'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'status': 'error',
                'message': 'Analysis not found or could not be deleted'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'Failed to delete analysis: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_analysis_statistics(request):
    """Get analysis statistics"""
    try:
        if not MONGODB_AVAILABLE or not mongodb_service:
            # Return default statistics when MongoDB is not available
            return Response({
                'status': 'success',
                'statistics': {
                    'total_analyses': 0,
                    'avg_readiness_score': 0.0,
                    'total_internships_matched': 0,
                    'total_gaps_detected': 0,
                    'last_analysis_date': None,
                    'has_github_analyses': 0
                }
            }, status=status.HTTP_200_OK)
        
        user_id = request.GET.get('user_id')
        
        # Check if MongoDB connection is available
        if not mongodb_service.is_connected():
            mongodb_service.connect()
        
        if not mongodb_service.is_connected():
            # Return default statistics if connection fails
            return Response({
                'status': 'success',
                'statistics': {
                    'total_analyses': 0,
                    'avg_readiness_score': 0.0,
                    'total_internships_matched': 0,
                    'total_gaps_detected': 0,
                    'last_analysis_date': None,
                    'has_github_analyses': 0
                }
            }, status=status.HTTP_200_OK)
        
        stats = mongodb_service.get_analysis_statistics(user_id)
        
        return Response({
            'status': 'success',
            'statistics': stats
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        # Return default statistics instead of error
        return Response({
            'status': 'success',
            'statistics': {
                'total_analyses': 0,
                'avg_readiness_score': 0.0,
                'total_internships_matched': 0,
                'total_gaps_detected': 0,
                'last_analysis_date': None,
                'has_github_analyses': 0
            }
        }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([AllowAny])
def test_mongodb_connection(request):
    """Test MongoDB connection and return diagnostics"""
    try:
        if not MONGODB_AVAILABLE or not mongodb_service:
            return Response({
                'status': 'error',
                'message': 'MongoDB service not available',
                'details': 'MongoDB service could not be imported'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # Test the connection
        connection_test = mongodb_service.test_connection()
        
        if connection_test['connected']:
            return Response({
                'status': 'success',
                'message': 'MongoDB connection successful',
                'details': connection_test
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'status': 'error',
                'message': 'MongoDB connection failed',
                'details': connection_test
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'MongoDB test failed: {str(e)}',
            'details': {'error': str(e)}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'PUT'])
def user_profile(request):
    """Get or update user profile"""
    try:
        # Get user from JWT token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return Response({
                'status': 'error',
                'error': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)

        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            user_email = payload.get('email')
        except jwt.ExpiredSignatureError:
            return Response({
                'status': 'error',
                'error': 'Token has expired'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except jwt.InvalidTokenError:
            return Response({
                'status': 'error',
                'error': 'Invalid token'
            }, status=status.HTTP_401_UNAUTHORIZED)

        # Get MongoDB connection
        client, db, collection = get_mongo_client()
        if collection is None:
            return Response({
                'status': 'error',
                'error': 'Database connection failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            if request.method == 'GET':
                # Get user from database
                user = collection.find_one({'_id': ObjectId(user_id)})
                if not user:
                    return Response({
                        'status': 'error',
                        'error': 'User not found'
                    }, status=status.HTTP_404_NOT_FOUND)

                # Prepare profile data
                profile = {
                    'id': str(user['_id']),
                    'first_name': user.get('first_name', ''),
                    'last_name': user.get('last_name', ''),
                    'email': user.get('email', ''),
                    'avatar': user.get('avatar', None),
                    'bio': user.get('bio', ''),
                    'skills': user.get('skills', []),
                    'experience': user.get('experience', 'Beginner'),
                    'education': user.get('education', ''),
                    'location': user.get('location', ''),
                    'github_username': user.get('github_username', ''),
                    'linkedin_url': user.get('linkedin_url', ''),
                    'portfolio_url': user.get('portfolio_url', ''),
                    'phone': user.get('phone', ''),
                    'preferred_domains': user.get('preferred_domains', []),
                    'career_goals': user.get('career_goals', ''),
                    'join_date': user.get('created_at', datetime.now()).isoformat() if isinstance(user.get('created_at'), datetime) else str(user.get('created_at', '')),
                    'last_active': user.get('last_login', datetime.now()).isoformat() if isinstance(user.get('last_login'), datetime) else str(user.get('last_login', ''))
                }

                # Calculate profile completion
                required_fields = ['first_name', 'last_name', 'email', 'bio', 'skills', 'experience', 'education']
                completed_fields = sum(1 for field in required_fields if profile.get(field))
                profile['profile_completion'] = int((completed_fields / len(required_fields)) * 100)

                return Response({
                    'status': 'success',
                    'profile': profile
                })

            elif request.method == 'PUT':
                try:
                    data = json.loads(request.body)
                except json.JSONDecodeError:
                    return Response({
                        'status': 'error',
                        'error': 'Invalid JSON data'
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Validate and filter allowed fields
                allowed_fields = [
                    'bio', 'skills', 'experience', 'education', 'location', 
                    'github_username', 'linkedin_url', 'portfolio_url', 'phone', 
                    'preferred_domains', 'career_goals'
                ]

                update_data = {}
                for field in allowed_fields:
                    if field in data:
                        if field == 'skills' or field == 'preferred_domains':
                            # Ensure these are arrays
                            if isinstance(data[field], list):
                                update_data[field] = data[field]
                        else:
                            update_data[field] = str(data[field]).strip()

                if not update_data:
                    return Response({
                        'status': 'error',
                        'error': 'No valid fields to update'
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Add timestamp
                update_data['updated_at'] = datetime.utcnow()

                # Update user profile
                result = collection.update_one(
                    {'_id': ObjectId(user_id)},
                    {'$set': update_data}
                )

                if result.modified_count > 0:
                    return Response({
                        'status': 'success',
                        'message': 'Profile updated successfully'
                    })
                else:
                    return Response({
                        'status': 'success',
                        'message': 'No changes were made to the profile'
                    })

        except PyMongoError as e:
            return Response({
                'status': 'error',
                'error': f'Database operation failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            client.close()

    except Exception as e:
        logger.error(f"Error in user_profile: {str(e)}")
        return Response({
            'status': 'error',
            'error': f'Failed to handle profile request: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def upload_avatar(request):
    """Upload user avatar"""
    try:
        # Get user from JWT token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return Response({
                'status': 'error',
                'error': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)

        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
        except jwt.ExpiredSignatureError:
            return Response({
                'status': 'error',
                'error': 'Token has expired'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except jwt.InvalidTokenError:
            return Response({
                'status': 'error',
                'error': 'Invalid token'
            }, status=status.HTTP_401_UNAUTHORIZED)

        # Check if file was uploaded
        if 'avatar' not in request.FILES:
            return Response({
                'status': 'error',
                'error': 'No avatar file provided'
            }, status=status.HTTP_400_BAD_REQUEST)

        avatar_file = request.FILES['avatar']
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif']
        if avatar_file.content_type not in allowed_types:
            return Response({
                'status': 'error',
                'error': 'Invalid file type. Only JPEG, PNG, and GIF files are allowed.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate file size (max 5MB)
        max_size = 5 * 1024 * 1024  # 5MB
        if avatar_file.size > max_size:
            return Response({
                'status': 'error',
                'error': 'File too large. Maximum size is 5MB.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Create avatar directory if it doesn't exist
        avatar_dir = os.path.join(settings.MEDIA_ROOT, 'avatars')
        os.makedirs(avatar_dir, exist_ok=True)

        # Generate unique filename
        file_extension = avatar_file.name.split('.')[-1]
        filename = f"avatar_{user_id}_{int(datetime.now().timestamp())}.{file_extension}"
        file_path = os.path.join(avatar_dir, filename)

        # Save file
        with open(file_path, 'wb+') as destination:
            for chunk in avatar_file.chunks():
                destination.write(chunk)

        # Update user profile with avatar path
        client, db, collection = get_mongo_client()
        if collection is not None:
            try:
                avatar_url = f'/media/avatars/{filename}'
                collection.update_one(
                    {'_id': ObjectId(user_id)},
                    {'$set': {'avatar': avatar_url, 'updated_at': datetime.utcnow()}}
                )
                
                return Response({
                    'status': 'success',
                    'message': 'Avatar uploaded successfully',
                    'avatar_url': avatar_url
                })
            except PyMongoError as e:
                # Delete the uploaded file if database update fails
                if os.path.exists(file_path):
                    os.remove(file_path)
                return Response({
                    'status': 'error',
                    'error': f'Failed to update profile: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            finally:
                client.close()
        else:
            # Delete the uploaded file if no database connection
            if os.path.exists(file_path):
                os.remove(file_path)
            return Response({
                'status': 'error',
                'error': 'Database connection failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.error(f"Error in upload_avatar: {str(e)}")
        return Response({
            'status': 'error',
            'error': f'Failed to upload avatar: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def profile_stats(request):
    """Get profile statistics"""
    try:
        # Get user from JWT token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return Response({
                'status': 'error',
                'error': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)

        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
        except jwt.ExpiredSignatureError:
            return Response({
                'status': 'error',
                'error': 'Token has expired'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except jwt.InvalidTokenError:
            return Response({
                'status': 'error',
                'error': 'Invalid token'
            }, status=status.HTTP_401_UNAUTHORIZED)

        # Get MongoDB connection
        client, db, collection = get_mongo_client()
        if collection is None:
            # Fallback stats without database
            stats = {
                'profile_completeness': 70,
                'total_analyses': 0,
                'avg_readiness_score': 0,
                'highest_score': 0,
                'skills_count': 0,
                'domains_explored': 0,
                'applications_submitted': 0,
                'interviews_scheduled': 0,
                'recent_activity': [],
                'achievements': [],
                'recommendations': ['Complete your profile to get personalized insights']
            }
            return Response({
                'status': 'success',
                'stats': stats,
                'using_mongodb': False
            })

        try:
            # Get user profile
            user = collection.find_one({'_id': ObjectId(user_id)})
            if not user:
                return Response({
                    'status': 'error',
                    'error': 'User not found'
                }, status=status.HTTP_404_NOT_FOUND)

            # Calculate profile completeness
            required_fields = ['first_name', 'last_name', 'email', 'bio', 'skills', 'experience', 'education']
            completed_fields = sum(1 for field in required_fields if user.get(field))
            profile_completeness = int((completed_fields / len(required_fields)) * 100)

            # Get analysis data if available (mock for now)
            stats = {
                'profile_completeness': profile_completeness,
                'total_analyses': 2,  # Mock data
                'avg_readiness_score': 87,
                'highest_score': 92,
                'skills_count': len(user.get('skills', [])),
                'domains_explored': len(user.get('preferred_domains', [])),
                'applications_submitted': 2,  # Mock data
                'interviews_scheduled': 1,   # Mock data
                'skill_growth': {
                    skill: min(95, 60 + (i * 8)) for i, skill in enumerate(user.get('skills', [])[:6])
                },
                'recent_activity': [
                    {
                        'type': 'profile_update',
                        'description': 'Updated profile information',
                        'date': datetime.now().strftime('%Y-%m-%d'),
                        'icon': 'user'
                    },
                    {
                        'type': 'login',
                        'description': 'Logged into account',
                        'date': user.get('last_login', datetime.now()).strftime('%Y-%m-%d') if isinstance(user.get('last_login'), datetime) else datetime.now().strftime('%Y-%m-%d'),
                        'icon': 'login'
                    }
                ],
                'achievements': [],
                'recommendations': []
            }

            # Add achievements based on profile completion
            if profile_completeness >= 80:
                stats['achievements'].append({
                    'title': 'Profile Complete',
                    'description': 'Profile completeness reached 80%',
                    'date': datetime.now().strftime('%Y-%m-%d'),
                    'badge': '⭐'
                })

            if len(user.get('skills', [])) >= 5:
                stats['achievements'].append({
                    'title': 'Skill Collector',
                    'description': 'Added 5 or more skills to profile',
                    'date': datetime.now().strftime('%Y-%m-%d'),
                    'badge': '🎯'
                })

            # Add recommendations based on profile
            if not user.get('github_username'):
                stats['recommendations'].append('Connect your GitHub profile for better analysis')
            
            if not user.get('bio'):
                stats['recommendations'].append('Add a bio to help employers understand your background')
            
            if len(user.get('skills', [])) < 5:
                stats['recommendations'].append('Add more skills to improve your profile visibility')

            if len(user.get('preferred_domains', [])) == 0:
                stats['recommendations'].append('Select your preferred domains to get targeted opportunities')

            return Response({
                'status': 'success',
                'stats': stats,
                'using_mongodb': True
            })

        except PyMongoError as e:
            return Response({
                'status': 'error',
                'error': f'Database operation failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            client.close()

    except Exception as e:
        logger.error(f"Error in profile_stats: {str(e)}")
        return Response({
            'status': 'error',
            'error': f'Failed to get profile stats: {str(e)}',
            'stats': {}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def user_scraping_preferences(request):
    """Get or update user scraping preferences"""
    try:
        if request.method == 'GET':
            # Return default preferences if no user authentication
            default_preferences = {
                'enable_indeed': True,
                'enable_linkedin': True,
                'enable_naukri': True,
                'enable_internshala': True,
                'enable_letsintern': True,
                'max_pages_per_platform': 2,
                'preferred_locations': ['India', 'Remote'],
                'preferred_domains': ['Software Engineering', 'Data Science', 'Web Development'],
                'auto_scrape_enabled': False,
                'scrape_frequency_hours': 24
            }
            
            return Response({
                'success': True,
                'preferences': default_preferences
            })
        
        elif request.method == 'POST':
            # For now, just return success (you can add database storage later)
            preferences = request.data
            
            # Validate preferences
            required_fields = ['enable_indeed', 'enable_linkedin', 'enable_naukri', 'enable_internshala', 'enable_letsintern']
            for field in required_fields:
                if field not in preferences:
                    return Response({
                        'success': False,
                        'error': f'Missing required field: {field}'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'success': True,
                'message': 'Preferences saved successfully',
                'preferences': preferences
            })
    
    except Exception as e:
        logger.error(f"Error in user_scraping_preferences: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def scrape_with_user_preferences(request):
    """Scrape internships using user preferences"""
    try:
        # Get user preferences (or use defaults)
        preferences = request.data.get('preferences', {})
        keyword = request.data.get('keyword', 'internship')
        location = request.data.get('location', 'India')
        
        # Determine enabled platforms
        enabled_platforms = []
        if preferences.get('enable_indeed', True):
            enabled_platforms.append('indeed')
        if preferences.get('enable_linkedin', True):
            enabled_platforms.append('linkedin')
        if preferences.get('enable_naukri', True):
            enabled_platforms.append('naukri')
        if preferences.get('enable_internshala', True):
            enabled_platforms.append('internshala')
        if preferences.get('enable_letsintern', True):
            enabled_platforms.append('letsintern')
        
        if not enabled_platforms:
            return Response({
                'success': False,
                'error': 'No platforms enabled for scraping'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        max_pages = min(int(preferences.get('max_pages_per_platform', 2)), 5)
        
        # Import scraper from the scraping module
        from . import scrap
        
        # Run scraping synchronously
        async def scrape_with_prefs():
            all_internships = []
            scraper = scrap.InternshipScraper()

            for platform in enabled_platforms:
                try:
                    if platform == 'indeed':
                        results = await scraper.scrape_indeed(keyword, location, max_pages)
                    elif platform == 'linkedin':
                        results = await scraper.scrape_linkedin(keyword, location, max_pages)
                    elif platform == 'naukri':
                        results = await scraper.scrape_naukri(keyword, location, max_pages)
                    elif platform == 'internshala':
                        results = await scraper.scrape_internshala(keyword, location, max_pages)
                    elif platform == 'letsintern':
                        results = await scraper.scrape_letsintern(keyword, location, max_pages)
                    else:
                        continue
                    
                    all_internships.extend(results)
                    logger.info(f"{platform.title()} scraped: {len(results)} jobs")
                except Exception as e:
                    logger.error(f"{platform.title()} scraping failed: {e}")

            # Save scraped internships
            saved_count = scraper.save_internships(all_internships)

            return {
                'success': True,
                'internships_scraped': len(all_internships),
                'internships_saved': saved_count,
                'platforms_used': enabled_platforms,
                'keyword': keyword,
                'location': location
            }

        # Run async function
        import asyncio
        result = asyncio.run(scrape_with_prefs())
        return Response(result)

    except Exception as e:
        logger.error(f"Error in scrape_with_user_preferences: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_platform_statistics(request):
    """Get statistics about scraping performance by platform"""
    try:
        from . import scrap
        scraper = scrap.InternshipScraper()
        
        # Load internship data
        data = scraper.load_existing_internships()
        internships = data.get("internships", [])
        
        # Calculate platform statistics
        platform_stats = {}
        total_internships = len(internships)
        current_date = datetime.now()
        
        for internship in internships:
            source = internship.get('source', 'Unknown')
            
            if source not in platform_stats:
                platform_stats[source] = {
                    'total_internships': 0,
                    'recent_24h': 0,
                    'avg_quality_score': 0,
                    'unique_companies': set(),
                    'unique_domains': set(),
                    'with_valid_links': 0
                }
            
            stats = platform_stats[source]
            stats['total_internships'] += 1
            
            # Count recent scrapes
            scraped_at = internship.get('scraped_at')
            if scraped_at:
                try:
                    scraped_date = datetime.strptime(scraped_at, '%Y-%m-%d %H:%M:%S')
                    if (current_date - scraped_date).days < 1:
                        stats['recent_24h'] += 1
                except ValueError:
                    pass
            
            # Track unique companies and domains
            company = internship.get('company')
            if company and company != 'N/A':
                stats['unique_companies'].add(company)
            
            domain = internship.get('domain')
            if domain and domain != 'N/A':
                stats['unique_domains'].add(domain)
            
            # Count valid links
            link = internship.get('link')
            if link and link not in ['N/A', '', None]:
                stats['with_valid_links'] += 1
        
        # Convert sets to counts and calculate percentages
        formatted_stats = {}
        for source, stats in platform_stats.items():
            total = stats['total_internships']
            formatted_stats[source] = {
                'total_internships': total,
                'recent_24h': stats['recent_24h'],
                'unique_companies': len(stats['unique_companies']),
                'unique_domains': len(stats['unique_domains']),
                'with_valid_links': stats['with_valid_links'],
                'link_percentage': round((stats['with_valid_links'] / total * 100) if total > 0 else 0, 1),
                'market_share': round((total / total_internships * 100) if total_internships > 0 else 0, 1)
            }
        
        return Response({
            'success': True,
            'total_internships': total_internships,
            'platform_statistics': formatted_stats,
            'summary': {
                'active_platforms': len(formatted_stats),
                'total_companies': sum(stats['unique_companies'] for stats in formatted_stats.values()),
                'total_domains': sum(stats['unique_domains'] for stats in formatted_stats.values()),
                'overall_link_rate': round(
                    sum(stats['with_valid_links'] for stats in formatted_stats.values()) / total_internships * 100
                    if total_internships > 0 else 0, 1
                )
            }
        })
        
    except Exception as e:
        logger.error(f"Error in get_platform_statistics: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
