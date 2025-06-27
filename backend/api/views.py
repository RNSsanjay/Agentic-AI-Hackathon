import json
import jwt
import hashlib
import os
import secrets
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

# Load environment variables
load_dotenv()

# Try to import MongoDB service for analysis history
try:
    from utils.mongodb_service import mongodb_service
    MONGODB_AVAILABLE = True
except ImportError:
    MONGODB_AVAILABLE = False
    mongodb_service = None

# Import RAG system
try:
    from utils.rag_system import internship_rag
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False
    internship_rag = None

# Simple cache for latest analysis results (in production, use Redis or database)
latest_analysis_cache = {
    'readiness_score': None,
    'internship_matches': None,
    'gaps_detected': None,
    'last_updated': None
}

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
        if not RAG_AVAILABLE or not internship_rag:
            # Fallback to file-based approach
            json_file_path = Path(__file__).parent.parent / 'data' / 'internships.json'
            
            if not json_file_path.exists():
                return Response({
                    'status': 'error',
                    'error': 'No internships data available. Please run the scraper first.',
                    'internships': [],
                    'total_count': 0
                }, status=status.HTTP_404_NOT_FOUND)
            
            with open(json_file_path, 'r', encoding='utf-8') as file:
                data = json.load(file)
                internships = data.get('internships', [])
        else:
            # Use RAG system for real-time data
            internship_rag.refresh_data()  # Ensure we have the latest data
            internships = internship_rag.get_all_internships()
        
        # Apply filters if provided
        domain = request.GET.get('domain', 'all')
        experience = request.GET.get('experience', 'all')
        search = request.GET.get('search', '').lower()
        sort_by = request.GET.get('sort_by', 'scraped_at')
        limit = int(request.GET.get('limit', 50))
        
        # Search filter using RAG if available
        if search and RAG_AVAILABLE and internship_rag:
            internships = internship_rag.search_internships(search, limit=limit)
        else:
            # Filter by domain
            if domain != 'all':
                internships = [i for i in internships if domain.lower() in i.get('domain', '').lower()]
            
            # Filter by experience level
            if experience != 'all':
                internships = [i for i in internships if experience.lower() == i.get('experience_level', '').lower()]
            
            # Basic search filter
            if search:
                internships = [
                    i for i in internships 
                    if search in i.get('title', '').lower() or 
                       search in i.get('company', '').lower() or
                       search in i.get('description', '').lower() or
                       search in i.get('domain', '').lower()
                ]
        
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
        if not search or not RAG_AVAILABLE:
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
            'using_rag': RAG_AVAILABLE,
            'filters_applied': {
                'domain': domain,
                'experience': experience,
                'search': search,
                'sort_by': sort_by
            }
        })
    
    except FileNotFoundError:
        return Response({
            'status': 'error',
            'error': 'Internships data file not found. Please run the scraper first.',
            'internships': [],
            'total_count': 0
        }, status=status.HTTP_404_NOT_FOUND)
    
    except json.JSONDecodeError:
        return Response({
            'status': 'error',
            'error': 'Invalid JSON in internships data file'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    except Exception as e:
        return Response({
            'status': 'error',
            'error': f'Failed to load internships: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_dashboard_stats(request):
    """Get dashboard statistics with real-time data"""
    try:
        stats = {
            'using_real_data': True,
            'readiness_score': latest_analysis_cache.get('readiness_score', 0),
            'internship_matches': latest_analysis_cache.get('internship_matches', 0),
            'gaps_detected': latest_analysis_cache.get('gaps_detected', 0),
            'skills_identified': 0
        }
        
        # Get internship statistics from RAG system
        if RAG_AVAILABLE and internship_rag:
            internship_rag.refresh_data()
            internship_stats = internship_rag.get_internship_stats()
            stats.update({
                'total_internships': internship_stats.get('total', 0),
                'recent_additions': internship_stats.get('recent_additions', 0),
                'domains_available': len(internship_stats.get('by_domain', {})),
                'sources_active': len(internship_stats.get('by_source', {})),
                'internship_breakdown': internship_stats
            })
        else:
            # Fallback to file-based stats
            try:
                json_file_path = Path(__file__).parent.parent / 'data' / 'internships.json'
                if json_file_path.exists():
                    with open(json_file_path, 'r', encoding='utf-8') as file:
                        data = json.load(file)
                        internships = data.get('internships', [])
                        stats['total_internships'] = len(internships)
                else:
                    stats['total_internships'] = 0
            except:
                stats['total_internships'] = 0
        
        return Response({
            'status': 'success',
            'stats': stats
        })
    
    except Exception as e:
        return Response({
            'status': 'error',
            'error': f'Failed to get dashboard stats: {str(e)}'
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
def get_analysis_history(request):
    """Get analysis history for user"""
    try:
        # Return mock analysis history
        history = []
        
        return Response({
            'status': 'success',
            'history': history
        })
    
    except Exception as e:
        return Response({
            'status': 'error',
            'error': f'Failed to get analysis history: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_analysis_statistics(request):
    """Get analysis statistics for user"""
    try:
        # Return mock statistics
        statistics = {
            'total_analyses': 0,
            'avg_readiness_score': 0,
            'top_skills': [],
            'improvement_areas': []
        }
        
        return Response({
            'status': 'success',
            'statistics': statistics
        })
    
    except Exception as e:
        return Response({
            'status': 'error',
            'error': f'Failed to get analysis statistics: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_analysis_by_id(request, analysis_id):
    """Get specific analysis by ID"""
    try:
        return Response({
            'status': 'error',
            'error': 'Analysis not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        return Response({
            'status': 'error',
            'error': f'Failed to get analysis: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
def delete_analysis(request, analysis_id):
    """Delete specific analysis by ID"""
    try:
        return Response({
            'status': 'success',
            'message': 'Analysis deleted successfully'
        })
    
    except Exception as e:
        return Response({
            'status': 'error',
            'error': f'Failed to delete analysis: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def test_mongodb_connection(request):
    """Test MongoDB connection"""
    try:
        client, db, collection = get_mongo_client()
        if collection is None:
            return Response({
                'status': 'error',
                'error': 'Failed to connect to MongoDB'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Test the connection
        client.admin.command('ping')
        client.close()
        
        return Response({
            'status': 'success',
            'message': 'MongoDB connection successful'
        })
    
    except Exception as e:
        return Response({
            'status': 'error',
            'error': f'MongoDB connection failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'PUT'])
def user_profile(request):
    """Get or update user profile"""
    try:
        if request.method == 'GET':
            # Return mock profile data
            profile = {
                'first_name': 'Student',
                'last_name': 'User',
                'email': 'student@example.com',
                'avatar': None,
                'bio': '',
                'skills': [],
                'experience': '',
                'education': '',
                'location': ''
            }
            
            return Response({
                'status': 'success',
                'profile': profile
            })
        
        elif request.method == 'PUT':
            # Update profile (mock implementation)
            return Response({
                'status': 'success',
                'message': 'Profile updated successfully'
            })
    
    except Exception as e:
        return Response({
            'status': 'error',
            'error': f'Failed to handle profile request: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def upload_avatar(request):
    """Upload user avatar"""
    try:
        return Response({
            'status': 'success',
            'message': 'Avatar uploaded successfully',
            'avatar_url': '/media/avatars/default.jpg'
        })
    
    except Exception as e:
        return Response({
            'status': 'error',
            'error': f'Failed to upload avatar: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def profile_stats(request):
    """Get profile statistics"""
    try:
        stats = {
            'total_analyses': 0,
            'avg_score': 0,
            'profile_completeness': 60,
            'skills_count': 0
        }
        
        return Response({
            'status': 'success',
            'stats': stats
        })
    
    except Exception as e:
        return Response({
            'status': 'error',
            'error': f'Failed to get profile stats: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
