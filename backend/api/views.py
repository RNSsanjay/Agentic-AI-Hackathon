import json
import jwt
import hashlib
import os
from datetime import datetime, timedelta
from bson import ObjectId
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import re
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Constants
MIN_PASSWORD_LENGTH = 8
JWT_EXPIRATION_DELTA = timedelta(days=7)
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-here')

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
