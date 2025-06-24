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

# Simple cache for latest analysis results (in production, use Redis or database)
latest_analysis_cache = {
    'readiness_score': None,
    'internship_matches': None,
    'gaps_detected': None,
    'last_updated': None
}

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

@api_view(['GET'])
@permission_classes([AllowAny])
def get_internships(request):
    """Fetch all internships from the JSON file"""
    try:
        # Load internships from JSON file
        json_file_path = Path(__file__).parent.parent / 'data' / 'internships.json'
        
        with open(json_file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
            internships = data.get('internships', [])
        
        # Apply filters if provided
        domain = request.GET.get('domain', 'all')
        experience = request.GET.get('experience', 'all')
        search = request.GET.get('search', '').lower()
        sort_by = request.GET.get('sort_by', 'matching_score')
        
        filtered_internships = internships
        
        # Filter by domain
        if domain != 'all':
            filtered_internships = [i for i in filtered_internships if i.get('domain') == domain]
        
        # Filter by experience level
        if experience != 'all':
            filtered_internships = [i for i in filtered_internships if i.get('experience_level') == experience]
        
        # Filter by search term
        if search:
            filtered_internships = [
                i for i in filtered_internships 
                if (search in i.get('title', '').lower() or 
                    search in i.get('company', '').lower() or 
                    search in i.get('domain', '').lower())
            ]
        
        # Add matching scores and sort
        for internship in filtered_internships:
            # Simple matching score calculation
            internship['matching_score'] = calculate_matching_score(internship)
            internship['trending'] = internship.get('id', '').endswith('001')
            stipend_num = int(internship.get('stipend', '$0').replace('$', '').replace(',', '').replace('/month', '')) if internship.get('stipend') else 0
            internship['featured'] = stipend_num > 7000
        
        # Sort internships
        if sort_by == 'matching_score':
            filtered_internships.sort(key=lambda x: x.get('matching_score', 0), reverse=True)
        elif sort_by == 'stipend':
            filtered_internships.sort(key=lambda x: int(x.get('stipend', '$0').replace('$', '').replace(',', '').replace('/month', '') or '0'), reverse=True)
        elif sort_by == 'deadline':
            filtered_internships.sort(key=lambda x: x.get('application_deadline', ''))
        elif sort_by == 'company':
            filtered_internships.sort(key=lambda x: x.get('company', ''))
        
        return Response({
            'status': 'success',
            'internships': filtered_internships,
            'count': len(filtered_internships)
        }, status=status.HTTP_200_OK)
        
    except FileNotFoundError:
        return Response({
            'status': 'error',
            'message': 'Internships data file not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'Error fetching internships: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def calculate_matching_score(internship):
    """Calculate a simple matching score for internships"""
    # Simple scoring based on various factors
    base_score = 0.5
    
    # Higher score for entry-level positions
    if internship.get('experience_level') == 'entry-level':
        base_score += 0.2
    elif internship.get('experience_level') == 'intermediate':
        base_score += 0.15
    
    # Higher score for remote-friendly
    if 'remote-friendly' in internship.get('tags', []):
        base_score += 0.1
    
    # Higher score for higher stipend
    stipend_str = internship.get('stipend', '$0').replace('$', '').replace(',', '').replace('/month', '')
    try:
        stipend = int(stipend_str) if stipend_str else 0
        if stipend > 8000:
            base_score += 0.15
        elif stipend > 6000:
            base_score += 0.1
    except:
        pass
    
    return min(0.98, base_score)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_dashboard_stats(request):
    """Get dashboard statistics based on user analysis"""
    try:
        # Load internships from JSON file for available matches
        json_file_path = Path(__file__).parent.parent / 'data' / 'internships.json'
        
        with open(json_file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
            internships = data.get('internships', [])
        
        total_internships = len(internships)
        
        # Use cached analysis results if available, otherwise start with zeros
        if (latest_analysis_cache.get('readiness_score') is not None and 
            latest_analysis_cache.get('internship_matches') is not None and 
            latest_analysis_cache.get('gaps_detected') is not None):
            
            # Use real analysis results from cache
            readiness_score = latest_analysis_cache['readiness_score']
            internship_match_count = latest_analysis_cache['internship_matches']
            gaps_detected = latest_analysis_cache['gaps_detected']
            
        else:
            # Start with zero stats until analysis is performed
            readiness_score = None  # This will be handled as 0 in frontend
            internship_match_count = 0
            gaps_detected = 0
        
        return Response({
            'status': 'success',
            'stats': {
                'readiness_score': readiness_score,
                'internship_match_count': internship_match_count,
                'gaps_detected': gaps_detected,
                'total_available_internships': total_internships,
                'last_analysis': latest_analysis_cache.get('last_updated'),
                'using_real_data': latest_analysis_cache.get('readiness_score') is not None,
                'domains': list(set([i.get('domain') for i in internships if i.get('domain')])),
                'companies': list(set([i.get('company') for i in internships if i.get('company')]))
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'Error fetching dashboard stats: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_recent_activity(request):
    """Get recent activity for dashboard"""
    try:
        # In a real app, this would come from a database
        recent_activity = [
            {
                'title': 'New AI Research Intern position at OpenAI',
                'time': '2 minutes ago',
                'type': 'new_opportunity'
            },
            {
                'title': 'Application deadline reminder: Google Data Science',
                'time': '1 hour ago',
                'type': 'deadline'
            },
            {
                'title': 'Your profile matches 5 new internships',
                'time': '3 hours ago',
                'type': 'match'
            },
            {
                'title': 'Resume analysis completed successfully',
                'time': '1 day ago',
                'type': 'analysis'
            }
        ]
        
        return Response({
            'status': 'success',
            'activity': recent_activity
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'Error fetching recent activity: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def update_analysis_cache(readiness_score, internship_matches, gaps_detected):
    """Update the cache with latest analysis results"""
    global latest_analysis_cache
    latest_analysis_cache.update({
        'readiness_score': readiness_score,
        'internship_matches': internship_matches,
        'gaps_detected': gaps_detected,
        'last_updated': datetime.utcnow().isoformat()
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def update_dashboard_cache(request):
    """Endpoint to update dashboard cache with latest analysis results"""
    try:
        data = request.data
        readiness_score = data.get('readiness_score')
        internship_matches = data.get('internship_matches')
        gaps_detected = data.get('gaps_detected')
        
        if readiness_score is not None and internship_matches is not None and gaps_detected is not None:
            update_analysis_cache(readiness_score, internship_matches, gaps_detected)
            return Response({
                'status': 'success',
                'message': 'Dashboard cache updated successfully'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'status': 'error',
                'message': 'Missing required fields: readiness_score, internship_matches, gaps_detected'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'Failed to update cache: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Analysis History Views
@api_view(['GET'])
@permission_classes([AllowAny])
def get_analysis_history(request):
    """Get analysis history from MongoDB"""
    try:
        if not MONGODB_AVAILABLE or not mongodb_service:
            return Response({
                'status': 'error',
                'message': 'MongoDB service not available',
                'analyses': [],
                'statistics': {
                    'total_analyses': 0,
                    'avg_readiness_score': 0,
                    'total_internships_matched': 0,
                    'total_gaps_detected': 0,
                    'has_github_analyses': 0
                }
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # Get query parameters with defaults
        user_id = request.GET.get('user_id')
        limit = min(int(request.GET.get('limit', 20)), 100)  # Maximum 100 results per request
        skip = max(int(request.GET.get('skip', 0)), 0)  # Ensure non-negative
        search = request.GET.get('search', '').strip()
        
        try:
            if search:
                # Search analyses
                analyses = mongodb_service.search_analyses(search, user_id, limit)
            else:
                # Get regular history
                analyses = mongodb_service.get_analysis_history(user_id, limit, skip)
            
            # Get statistics
            stats = mongodb_service.get_analysis_statistics(user_id)
            
            # Ensure we return valid data even if MongoDB fails
            if not isinstance(analyses, list):
                analyses = []
            
            if not isinstance(stats, dict):
                stats = {
                    'total_analyses': 0,
                    'avg_readiness_score': 0,
                    'total_internships_matched': 0,
                    'total_gaps_detected': 0,
                    'has_github_analyses': 0
                }
            
            return Response({
                'status': 'success',
                'analyses': analyses,
                'statistics': stats,
                'pagination': {
                    'limit': limit,
                    'skip': skip,
                    'total': len(analyses)
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as mongo_error:
            # Log the specific MongoDB error but return a friendly response
            print(f"MongoDB operation failed: {str(mongo_error)}")
            return Response({
                'status': 'success',  # Still return success but with empty data
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
                },
                'warning': 'Database temporarily unavailable'
            }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'Failed to retrieve analysis history: {str(e)}',
            'analyses': [],
            'statistics': {}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
            return Response({
                'status': 'error',
                'message': 'MongoDB service not available'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        user_id = request.GET.get('user_id')
        stats = mongodb_service.get_analysis_statistics(user_id)
        
        return Response({
            'status': 'success',
            'statistics': stats
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'Failed to retrieve statistics: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
