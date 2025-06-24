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
        if not self.is_connected():
            self.connect()
        if not self.is_connected():
            raise ConnectionError("MongoDB is not connected")
        return func(self, *args, **kwargs)
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
            self._validate_config()
            self.connect()

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

    def connect(self, max_retries: int = 3, retry_delay: float = 2.0):
        """Connect to MongoDB with retry mechanism"""
        if self.is_connected():
            return

        for attempt in range(max_retries):
            try:
                self.client = MongoClient(
                    settings.MONGODB_URI,
                    serverSelectionTimeoutMS=5000,
                    connectTimeoutMS=10000,
                    socketTimeoutMS=10000
                )
                self.db = self.client[settings.MONGODB_DATABASE]
                self.collection = self.db[settings.MONGODB_COLLECTION]
                self.analysis_collection = self.db["analysis_results"]

                # Test connection
                self.client.admin.command('ping')
                self._initialized = True
                self.create_indexes()
                logger.info("✅ MongoDB connected successfully")
                return

            except (ConnectionFailure, ConfigurationError) as e:
                logger.error(f"❌ MongoDB connection attempt {attempt + 1}/{max_retries} failed: {str(e)}")
                if attempt < max_retries - 1:
                    sleep(retry_delay)
                continue

        logger.error("❌ Failed to connect to MongoDB after all retries")
        self._initialized = False
        self.client = None

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
            logger.warning(f"⚠️ Index creation warning: {str(e)}")

    @ensure_connection
    def save_analysis_result(self, analysis_data: Dict[str, Any], user_id: str = None) -> Optional[str]:
        """Save analysis result to MongoDB"""
        try:
            if not analysis_data:
                logger.error("No analysis data provided")
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
                doc["_id"] = str(doc["_id"])
                summary = {
                    "analysis_id": doc["analysis_id"],
                    "user_id": doc["user_id"],
                    "timestamp": doc["timestamp"],
                    "student_name": doc.get("student_profile", {}).get("name", "Unknown"),
                    "overall_readiness_score": doc.get("overall_readiness_score", 0.0),
                    "total_internships_matched": doc.get("total_internships_matched", 0),
                    "total_gaps_detected": doc.get("total_gaps_detected", 0),
                    "analysis_summary": doc.get("analysis_summary", ""),
                    "github_username": doc.get("github_analysis", {}).get("username"),
                    "primary_skills": doc.get("student_profile", {}).get("skills", [])[:5],
                    "domains": doc.get("student_profile", {}).get("domains", []),
                    "experience_level": doc.get("student_profile", {}).get("experience_level", "entry-level")
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
            return {}

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
    def search_analyses(self, search_term: str, user_id: str = None, limit: int = 20) -> List[Dict]:
        """Search analyses by student name, skills, or other criteria"""
        try:
            if not search_term:
                return []

            search_query = {
                "$or": [
                    {"student_profile.name": {"$regex": search_term, "$options": "i"}},
                    {"student_profile.skills": {"$regex": search_term, "$options": "i"}},
                    {"student_profile.domains": {"$regex": search_term, "$options": "i"}},
                    {"analysis_summary": {"$regex": search_term, "$options": "i"}}
                ]
            }

            if user_id:
                search_query = {"$and": [{"user_id": user_id}, search_query]}

            cursor = self.analysis_collection.find(search_query).sort("timestamp", -1).limit(max(1, limit))
            results = []
            for doc in cursor:
                doc["_id"] = str(doc["_id"])
                summary = {
                    "analysis_id": doc["analysis_id"],
                    "user_id": doc["user_id"],
                    "timestamp": doc["timestamp"],
                    "student_name": doc.get("student_profile", {}).get("name", "Unknown"),
                    "overall_readiness_score": doc.get("overall_readiness_score", 0.0),
                    "total_internships_matched": doc.get("total_internships_matched", 0),
                    "analysis_summary": doc.get("analysis_summary", ""),
                    "primary_skills": doc.get("student_profile", {}).get("skills", [])[:3],
                    "match_reason": "Name, skills, or summary match"
                }
                results.append(summary)

            return results

        except Exception as e:
            logger.error(f"❌ Error searching analyses: {str(e)}")
            return []

    def _calculate_overall_score(self, analysis_data: Dict) -> float:
        """Calculate overall readiness score from analysis data"""
        try:
            readiness_evaluations = analysis_data.get("readiness_evaluations", [])
            if not readiness_evaluations:
                return 0.0

            overall_eval = readiness_evaluations[0]
            score = float(overall_eval.get("readiness_score", 0.0))
            return round(score * 100 if score <= 1.0 else score, 1)

        except (ValueError, IndexError, TypeError) as e:
            logger.warning(f"⚠️ Error calculating overall score: {str(e)}")
            return 0.0

    def _generate_analysis_summary(self, analysis_data: Dict) -> str:
        """Generate a brief summary of the analysis"""
        try:
            profile = analysis_data.get("student_profile", {})
            summary_parts = [
                f"{profile.get('name', 'Student')} ({profile.get('experience_level', 'entry-level')})",
                f"{len(analysis_data.get('internship_recommendations', []))} internships matched",
                f"{len(analysis_data.get('portfolio_gaps', []))} areas for improvement"
            ]

            if skills := profile.get("skills", [])[:3]:
                summary_parts.append(f"Skills: {', '.join(str(s) for s in skills)}")

            if github_analysis := profile.get("github_analysis"):
                github_score = github_analysis.get("github_score", 0)
                summary_parts.append(f"GitHub Score: {github_score}/100")

            return " | ".join(str(part) for part in summary_parts)

        except Exception as e:
            logger.warning(f"⚠️ Error generating analysis summary: {str(e)}")
            return "Analysis completed successfully"

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