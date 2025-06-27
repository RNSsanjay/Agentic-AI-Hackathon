import pymongo
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ConfigurationError
from django.conf import settings
import logging
from datetime import datetime
from bson import ObjectId
from typing import Dict, List, Any, Optional
import threading
from functools import wraps
from time import sleep

logger = logging.getLogger(__name__)

def ensure_connection(func):
    """Decorator to ensure MongoDB connection before executing method"""
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        max_retries = 3
        for attempt in range(max_retries):
            if not self.is_connected():
                logger.info(f"🔄 MongoDB not connected, attempting connection (attempt {attempt + 1}/{max_retries})")
                try:
                    self.connect()
                except Exception as e:
                    logger.warning(f"⚠️ Connection attempt {attempt + 1} failed: {str(e)}")
                    if attempt == max_retries - 1:
                        logger.error("❌ All connection attempts failed")
                        # Return default values based on function name
                        if func.__name__ == 'get_analysis_statistics':
                            return {
                                "total_analyses": 0,
                                "avg_readiness_score": 0.0,
                                "total_internships_matched": 0,
                                "total_gaps_detected": 0,
                                "last_analysis_date": None,
                                "has_github_analyses": 0
                            }
                        elif func.__name__ == 'get_analysis_history':
                            return []
                        elif func.__name__ == 'save_analysis_result':
                            return None
                        else:
                            raise ConnectionError("MongoDB is not connected")
                    continue
            
            if self.is_connected():
                try:
                    return func(self, *args, **kwargs)
                except Exception as e:
                    logger.error(f"❌ Function {func.__name__} failed: {str(e)}")
                    # Return defaults for specific functions
                    if func.__name__ == 'get_analysis_statistics':
                        return {
                            "total_analyses": 0,
                            "avg_readiness_score": 0.0,
                            "total_internships_matched": 0,
                            "total_gaps_detected": 0,
                            "last_analysis_date": None,
                            "has_github_analyses": 0
                        }
                    elif func.__name__ == 'get_analysis_history':
                        return []
                    elif func.__name__ == 'save_analysis_result':
                        return None
                    else:
                        raise e
        
        raise ConnectionError("Could not establish MongoDB connection after multiple attempts")
    return wrapper

class MongoDBService:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        """Implement thread-safe singleton pattern"""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(MongoDBService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, '_initialized'):
            self.client: Optional[MongoClient] = None
            self.db = None
            self.collection = None
            self.analysis_collection = None
            self._initialized = False
            
            # Try to validate config and connect, but don't fail on initialization
            try:
                self._validate_config()
                self.connect()
            except Exception as e:
                logger.warning(f"⚠️ MongoDB initialization warning: {str(e)}")
                logger.info("🔄 MongoDB will attempt to connect on first use")

    def _validate_config(self):
        """Validate MongoDB configuration settings"""
        required_settings = [
            'MONGODB_URI',
            'MONGODB_DATABASE',
            'MONGODB_COLLECTION'
        ]
        for setting in required_settings:
            if not hasattr(settings, setting):
                raise ConfigurationError(f"Missing required setting: {setting}")

    def connect(self, max_retries: int = 5, retry_delay: float = 1.5):
        """Connect to MongoDB with retry mechanism"""
        if self.is_connected():
            return True

        logger.info(f"🔄 Attempting MongoDB connection (max {max_retries} retries)...")
        
        for attempt in range(max_retries):
            try:
                self.client = MongoClient(
                    settings.MONGODB_URI,
                    serverSelectionTimeoutMS=8000,
                    connectTimeoutMS=15000,
                    socketTimeoutMS=15000,
                    maxPoolSize=10,
                    retryWrites=True,
                    retryReads=True
                )
                self.db = self.client[settings.MONGODB_DATABASE]
                self.collection = self.db[settings.MONGODB_COLLECTION]
                self.analysis_collection = self.db["analysis_results"]

                # Test connection with a simple ping
                self.client.admin.command('ping')
                self._initialized = True
                
                # Create indexes after successful connection
                try:
                    self.create_indexes()
                except Exception as index_error:
                    logger.warning(f"⚠️ Index creation failed: {str(index_error)} (continuing anyway)")
                
                logger.info(f"✅ MongoDB connected successfully on attempt {attempt + 1}")
                return True

            except (ConnectionFailure, ConfigurationError) as e:
                logger.warning(f"❌ MongoDB connection attempt {attempt + 1}/{max_retries} failed: {str(e)}")
                if attempt < max_retries - 1:
                    sleep(retry_delay)
                    retry_delay *= 1.5  # Exponential backoff
                continue
            except Exception as e:
                logger.error(f"❌ Unexpected error during MongoDB connection: {str(e)}")
                if attempt < max_retries - 1:
                    sleep(retry_delay)
                continue

        logger.error("❌ Failed to connect to MongoDB after all retries")
        self._initialized = False
        self.client = None
        return False

    def is_connected(self) -> bool:
        """Check if MongoDB is connected"""
        try:
            if self.client and self._initialized:
                self.client.admin.command('ping')
                return True
        except Exception:
            return False
        return False

    @ensure_connection
    def create_indexes(self):
        """Create indexes for better query performance"""
        try:
            indexes = [
                ("analysis_id", {"unique": True}),
                ("timestamp", {"direction": -1}),
                ("user_id", {}),
                ([("user_id", 1), ("timestamp", -1)], {})
            ]

            for index, options in indexes:
                if isinstance(index, str):
                    self.analysis_collection.create_index(index, **options)
                else:
                    self.analysis_collection.create_index(index, **options)

            logger.info("✅ MongoDB indexes created successfully")
        except Exception as e:
            logger.warning(f"⚠️ Index creation warning: {str(e)}")    @ensure_connection
    def save_analysis_result(self, analysis_data: Dict[str, Any], user_id: str = None) -> Optional[str]:
        """Save analysis result to MongoDB"""
        try:
            if not analysis_data:
                logger.error("No analysis data provided")
                return None

            if self.analysis_collection is None:
                logger.error("Analysis collection not available")
                return None

            # Generate unique analysis ID
            analysis_id = str(ObjectId())
            
            # Prepare document
            document = {
                "analysis_id": analysis_id,
                "user_id": user_id or "anonymous",
                "timestamp": datetime.utcnow(),
                "student_profile": analysis_data.get("student_profile", {}),
                "internship_recommendations": analysis_data.get("internship_recommendations", []),
                "portfolio_gaps": analysis_data.get("portfolio_gaps", []),
                "rag_aligned_requirements": analysis_data.get("rag_aligned_requirements", {}),
                "readiness_evaluations": analysis_data.get("readiness_evaluations", []),
                "extraction_info": analysis_data.get("extraction_info", {}),
                "detailed_extraction": analysis_data.get("detailed_extraction", {}),
                "agent_communications": analysis_data.get("agent_communications", []),
                "processing_timestamp": analysis_data.get("processing_timestamp"),
                "file_info": analysis_data.get("file_info", {}),
                "github_analysis": analysis_data.get("student_profile", {}).get("github_analysis"),
                "overall_readiness_score": self._calculate_overall_score(analysis_data),
                "total_internships_matched": len(analysis_data.get("internship_recommendations", [])),
                "total_gaps_detected": len(analysis_data.get("portfolio_gaps", [])),
                "analysis_summary": self._generate_analysis_summary(analysis_data)
            }
            
            # Insert document
            result = self.analysis_collection.insert_one(document)
            
            if result.inserted_id:
                logger.info(f"✅ Analysis result saved with ID: {analysis_id}")
                return analysis_id
            else:
                logger.error("❌ Failed to save analysis result")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error saving analysis result: {str(e)}")
            return None

            analysis_id = str(ObjectId())
            document = {
                "analysis_id": analysis_id,
                "user_id": user_id or "anonymous",
                "timestamp": datetime.utcnow(),
                "student_profile": analysis_data.get("student_profile", {}),
                "internship_recommendations": analysis_data.get("internship_recommendations", []),
                "portfolio_gaps": analysis_data.get("portfolio_gaps", []),
                "rag_aligned_requirements": analysis_data.get("rag_aligned_requirements", {}),
                "readiness_evaluations": analysis_data.get("readiness_evaluations", []),
                "extraction_info": analysis_data.get("extraction_info", {}),
                "detailed_extraction": analysis_data.get("detailed_extraction", {}),
                "agent_communications": analysis_data.get("agent_communications", []),
                "processing_timestamp": analysis_data.get("processing_timestamp", datetime.utcnow()),
                "file_info": analysis_data.get("file_info", {}),
                "github_analysis": analysis_data.get("student_profile", {}).get("github_analysis", {}),
                "overall_readiness_score": self._calculate_overall_score(analysis_data),
                "total_internships_matched": len(analysis_data.get("internship_recommendations", [])),
                "total_gaps_detected": len(analysis_data.get("portfolio_gaps", [])),
                "analysis_summary": self._generate_analysis_summary(analysis_data)
            }

            result = self.analysis_collection.insert_one(document)
            if result.inserted_id:
                logger.info(f"✅ Analysis result saved with ID: {analysis_id}")
                return analysis_id

            logger.error("❌ Failed to save analysis result")
            return None

        except Exception as e:
            logger.error(f"❌ Error saving analysis result: {str(e)}")
            return None

    @ensure_connection
    def get_analysis_by_id(self, analysis_id: str) -> Optional[Dict]:
        """Get analysis result by ID"""
        try:
            if not analysis_id:
                return None

            result = self.analysis_collection.find_one({"analysis_id": analysis_id})
            if result:
                result["_id"] = str(result["_id"])
                return result

            logger.info(f"No analysis found with ID: {analysis_id}")
            return None

        except Exception as e:
            logger.error(f"❌ Error retrieving analysis: {str(e)}")
            return None

    @ensure_connection
    def get_analysis_history(self, user_id: str = None, limit: int = 50, skip: int = 0) -> List[Dict]:
        """Get analysis history for a user or all users"""
        try:
            query = {"user_id": user_id} if user_id else {}
            cursor = self.analysis_collection.find(query).sort("timestamp", -1).skip(max(0, skip)).limit(max(1, limit))

            results = []
            for doc in cursor:
                if doc is None:
                    continue
                    
                doc["_id"] = str(doc["_id"])
                student_profile = doc.get("student_profile") or {}
                github_analysis = doc.get("github_analysis") or {}
                
                summary = {
                    "analysis_id": doc.get("analysis_id", "unknown"),
                    "user_id": doc.get("user_id", "unknown"),
                    "timestamp": doc.get("timestamp"),
                    "student_name": student_profile.get("name", "Unknown"),
                    "overall_readiness_score": doc.get("overall_readiness_score", 0.0),
                    "total_internships_matched": doc.get("total_internships_matched", 0),
                    "total_gaps_detected": doc.get("total_gaps_detected", 0),
                    "analysis_summary": doc.get("analysis_summary", ""),
                    "github_username": github_analysis.get("username"),
                    "primary_skills": student_profile.get("skills", [])[:5],
                    "domains": student_profile.get("domains", []),
                    "experience_level": student_profile.get("experience_level", "entry-level")
                }
                results.append(summary)

            return results

        except Exception as e:
            logger.error(f"❌ Error retrieving analysis history: {str(e)}")
            return []

    @ensure_connection
    def get_analysis_statistics(self, user_id: str = None) -> Dict:
        """Get analysis statistics"""
        try:
            query = {"user_id": user_id} if user_id else {}
            total_analyses = self.analysis_collection.count_documents(query)

            if total_analyses == 0:
                # Return empty stats for empty collection
                return {
                    "total_analyses": 0,
                    "avg_readiness_score": 0.0,
                    "total_internships_matched": 0,
                    "total_gaps_detected": 0,
                    "last_analysis_date": None,
                    "has_github_analyses": 0
                }

            pipeline = [
                {"$match": query},
                {"$group": {
                    "_id": None,
                    "avg_readiness_score": {"$avg": "$overall_readiness_score"},
                    "total_internships_matched": {"$sum": "$total_internships_matched"},
                    "total_gaps_detected": {"$sum": "$total_gaps_detected"}
                }}
            ]

            stats = next(iter(self.analysis_collection.aggregate(pipeline)), {})
            recent_analysis = self.analysis_collection.find_one(query, sort=[("timestamp", -1)])

            return {
                "total_analyses": total_analyses,
                "avg_readiness_score": round(stats.get("avg_readiness_score", 0.0), 1),
                "total_internships_matched": stats.get("total_internships_matched", 0),
                "total_gaps_detected": stats.get("total_gaps_detected", 0),
                "last_analysis_date": recent_analysis.get("timestamp") if recent_analysis else None,
                "has_github_analyses": self.analysis_collection.count_documents({
                    **query,
                    "github_analysis": {"$exists": True, "$ne": {}}
                })
            }

        except Exception as e:
            logger.error(f"❌ Error retrieving statistics: {str(e)}")
            return {
                "total_analyses": 0,
                "avg_readiness_score": 0.0,
                "total_internships_matched": 0,
                "total_gaps_detected": 0,
                "last_analysis_date": None,
                "has_github_analyses": 0
            }

    @ensure_connection
    def delete_analysis(self, analysis_id: str) -> bool:
        """Delete an analysis result"""
        try:
            if not analysis_id:
                return False

            result = self.analysis_collection.delete_one({"analysis_id": analysis_id})
            if result.deleted_count > 0:
                logger.info(f"✅ Analysis {analysis_id} deleted successfully")
                return True

            logger.warning(f"⚠️ Analysis {analysis_id} not found")
            return False

        except Exception as e:
            logger.error(f"❌ Error deleting analysis: {str(e)}")
            return False

    @ensure_connection
    def search_analyses(self, search_term: str, user_id: str = None, limit: int = 50) -> List[Dict]:
        """Search analyses by term"""
        try:
            query = {"user_id": user_id} if user_id else {}
            
            # Add text search
            if search_term:
                query["$or"] = [
                    {"analysis_summary": {"$regex": search_term, "$options": "i"}},
                    {"student_profile.name": {"$regex": search_term, "$options": "i"}},
                    {"student_profile.skills": {"$regex": search_term, "$options": "i"}}
                ]
            
            results = list(self.analysis_collection.find(query)
                          .sort("timestamp", -1)
                          .limit(limit))
            
            # Convert ObjectId to string for JSON serialization
            for result in results:
                result["_id"] = str(result["_id"])
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Error searching analyses: {str(e)}")
            return []

    def _calculate_overall_score(self, analysis_data: Dict[str, Any]) -> float:
        """Calculate overall readiness score from analysis data"""
        try:
            readiness_evaluations = analysis_data.get("readiness_evaluations", [])
            if readiness_evaluations:
                scores = []
                for eval in readiness_evaluations:
                    if isinstance(eval, dict):
                        # Try different score fields
                        score = eval.get("readiness_score") or eval.get("overall_score") or eval.get("score")
                        if score is not None:
                            scores.append(float(score))
                
                if scores:
                    return round(sum(scores) / len(scores), 2)
            
            # Fallback calculation
            internship_count = len(analysis_data.get("internship_recommendations", []))
            gaps_count = len(analysis_data.get("portfolio_gaps", []))
            
            # Simple scoring: more matches = higher score, more gaps = lower score
            base_score = min(90, 50 + (internship_count * 5))
            penalty = min(20, gaps_count * 2)
            
            return max(0, round(base_score - penalty, 2))
            
        except Exception as e:
            logger.warning(f"Score calculation failed: {str(e)}")
            return 0.0

    def _generate_analysis_summary(self, analysis_data: Dict[str, Any]) -> str:
        """Generate a summary of the analysis"""
        try:
            profile = analysis_data.get("student_profile", {})
            internships = analysis_data.get("internship_recommendations", [])
            gaps = analysis_data.get("portfolio_gaps", [])
            
            name = profile.get("name", "Student")
            skills_count = len(profile.get("skills", []))
            
            summary_parts = [
                f"Analysis for {name}",
                f"{skills_count} skills identified",
                f"{len(internships)} internship matches found",
                f"{len(gaps)} portfolio gaps detected"
            ]
            
            if profile.get("github_analysis"):
                summary_parts.append("GitHub profile analyzed")
            
            return " | ".join(summary_parts)
            
        except Exception as e:
            logger.warning(f"Summary generation failed: {str(e)}")
            return "Analysis completed"

    def close_connection(self):
        """Close MongoDB connection"""
        try:
            if self.client and self.is_connected():
                self.client.close()
                self._initialized = False
                self.client = None
                logger.info("✅ MongoDB connection closed successfully")
        except Exception as e:
            logger.error(f"❌ Error closing MongoDB connection: {str(e)}")

    def __del__(self):
        """Ensure connection is closed when object is deleted"""
        self.close_connection()

    @ensure_connection
    def test_connection(self) -> Dict[str, Any]:
        """Test MongoDB connection and return diagnostics"""
        try:
            if not self.client:
                return {
                    "connected": False,
                    "error": "No client initialized",
                    "details": {"client": "Not initialized"}
                }
            
            # Test connection with ping
            self.client.admin.command('ping')
            
            # Test collections access
            collections_info = {}
            if self.db:
                collections_info["database"] = self.db.name
                collections_info["collections"] = self.db.list_collection_names()
            
            return {
                "connected": True,
                "details": {
                    "client": "Connected",
                    "database": collections_info.get("database", "Unknown"),
                    "collections": collections_info.get("collections", []),
                    "analysis_collection_exists": "analysis_results" in collections_info.get("collections", [])
                }
            }
            
        except Exception as e:
            return {
                "connected": False,
                "error": str(e),
                "details": {"error_type": type(e).__name__}
            }

    @ensure_connection
    def get_user_analysis_count(self, user_id: str) -> int:
        """Get the total number of analyses for a specific user"""
        try:
            if not self.collection:
                logger.error("Collection not initialized")
                return 0
            
            count = self.collection.count_documents({'user_id': user_id})
            logger.info(f"📊 User {user_id} has {count} analyses")
            return count
            
        except Exception as e:
            logger.error(f"❌ Error getting user analysis count: {str(e)}")
            return 0

    @ensure_connection
    def get_user_analyses(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent analyses for a specific user"""
        try:
            if not self.collection:
                logger.error("Collection not initialized")
                return []
            
            # Get user's analyses sorted by timestamp (most recent first)
            cursor = self.collection.find(
                {'user_id': user_id}
            ).sort('timestamp', -1).limit(limit)
            
            analyses = []
            for doc in cursor:
                # Convert ObjectId to string for JSON serialization
                if '_id' in doc:
                    doc['_id'] = str(doc['_id'])
                analyses.append(doc)
            
            logger.info(f"📊 Retrieved {len(analyses)} analyses for user {user_id}")
            return analyses
            
        except Exception as e:
            logger.error(f"❌ Error getting user analyses: {str(e)}")
            return []

    @ensure_connection
    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive statistics for a specific user"""
        try:
            if not self.collection:
                logger.error("Collection not initialized")
                return {
                    'analyses_completed': 0,
                    'avg_readiness_score': 0,
                    'total_internships_matched': 0,
                    'total_gaps_detected': 0,
                    'last_analysis_date': None
                }
            
            # Aggregate user statistics
            pipeline = [
                {'$match': {'user_id': user_id}},
                {'$group': {
                    '_id': None,
                    'total_analyses': {'$sum': 1},
                    'avg_readiness': {'$avg': '$readiness_score'},
                    'total_internships': {'$sum': {'$size': {'$ifNull': ['$internship_recommendations', []]}}},
                    'total_gaps': {'$sum': {'$size': {'$ifNull': ['$portfolio_gaps', []]}}},
                    'last_analysis': {'$max': '$timestamp'}
                }}
            ]
            
            result = list(self.collection.aggregate(pipeline))
            
            if result:
                stats = result[0]
                return {
                    'analyses_completed': stats.get('total_analyses', 0),
                    'avg_readiness_score': round(stats.get('avg_readiness', 0) * 100, 1) if stats.get('avg_readiness') else 0,
                    'total_internships_matched': stats.get('total_internships', 0),
                    'total_gaps_detected': stats.get('total_gaps', 0),
                    'last_analysis_date': stats.get('last_analysis')
                }
            else:
                return {
                    'analyses_completed': 0,
                    'avg_readiness_score': 0,
                    'total_internships_matched': 0,
                    'total_gaps_detected': 0,
                    'last_analysis_date': None
                }
            
        except Exception as e:
            logger.error(f"❌ Error getting user stats: {str(e)}")
            return {
                'analyses_completed': 0,
                'avg_readiness_score': 0,
                'total_internships_matched': 0,
                'total_gaps_detected': 0,
                'last_analysis_date': None
            }

# Create global instance
mongodb_service = MongoDBService()