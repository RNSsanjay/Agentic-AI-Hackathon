import pymongo
from pymongo import MongoClient
from django.conf import settings
import logging
from datetime import datetime
from bson import ObjectId
import json
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class MongoDBService:
    def __init__(self):
        self.client = None
        self.db = None
        self.collection = None
        self.analysis_collection = None
        self.connect()
    
    def connect(self):
        """Connect to MongoDB"""
        try:
            self.client = MongoClient(settings.MONGODB_URI)
            self.db = self.client[settings.MONGODB_DATABASE]
            self.collection = self.db[settings.MONGODB_COLLECTION]
            
            # Create analysis collection for storing agent results
            self.analysis_collection = self.db["analysis_results"]
            
            # Test connection
            self.client.admin.command('ping')
            logger.info("✅ MongoDB connected successfully")
            
            # Create indexes for better performance
            self.create_indexes()
            
        except Exception as e:
            logger.error(f"❌ MongoDB connection failed: {str(e)}")
            self.client = None
    
    def create_indexes(self):
        """Create indexes for better query performance"""
        try:
            # Index on analysis_id for fast lookups
            self.analysis_collection.create_index("analysis_id", unique=True)
            
            # Index on timestamp for chronological queries
            self.analysis_collection.create_index([("timestamp", -1)])
            
            # Index on user_id for user-specific queries
            self.analysis_collection.create_index("user_id")
            
            # Compound index for user + timestamp
            self.analysis_collection.create_index([("user_id", 1), ("timestamp", -1)])
            
            logger.info("✅ MongoDB indexes created successfully")
            
        except Exception as e:
            logger.warning(f"⚠️ Index creation warning: {str(e)}")
    
    def save_analysis_result(self, analysis_data: Dict[str, Any], user_id: str = None) -> str:
        """Save analysis result to MongoDB"""
        try:
            if not self.analysis_collection:
                logger.error("MongoDB not connected")
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
    
    def get_analysis_by_id(self, analysis_id: str) -> Optional[Dict]:
        """Get analysis result by ID"""
        try:
            if not self.analysis_collection:
                return None
            
            result = self.analysis_collection.find_one({"analysis_id": analysis_id})
            
            if result:
                # Convert ObjectId to string for JSON serialization
                result["_id"] = str(result["_id"])
                return result
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error retrieving analysis: {str(e)}")
            return None
    
    def get_analysis_history(self, user_id: str = None, limit: int = 50, skip: int = 0) -> List[Dict]:
        """Get analysis history for a user or all users"""
        try:
            if not self.analysis_collection:
                return []
            
            # Build query
            query = {}
            if user_id:
                query["user_id"] = user_id
            
            # Get results sorted by timestamp (newest first)
            cursor = self.analysis_collection.find(query).sort("timestamp", -1).skip(skip).limit(limit)
            
            results = []
            for doc in cursor:
                # Convert ObjectId to string and format for frontend
                doc["_id"] = str(doc["_id"])
                
                # Create summary for history view
                summary = {
                    "analysis_id": doc["analysis_id"],
                    "user_id": doc["user_id"],
                    "timestamp": doc["timestamp"],
                    "student_name": doc.get("student_profile", {}).get("name", "Unknown"),
                    "overall_readiness_score": doc.get("overall_readiness_score", 0),
                    "total_internships_matched": doc.get("total_internships_matched", 0),
                    "total_gaps_detected": doc.get("total_gaps_detected", 0),
                    "analysis_summary": doc.get("analysis_summary", ""),
                    "github_username": doc.get("github_analysis", {}).get("username") if doc.get("github_analysis") else None,
                    "primary_skills": doc.get("student_profile", {}).get("skills", [])[:5],  # Top 5 skills
                    "domains": doc.get("student_profile", {}).get("domains", []),
                    "experience_level": doc.get("student_profile", {}).get("experience_level", "entry-level")
                }
                results.append(summary)
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Error retrieving analysis history: {str(e)}")
            return []
    
    def get_analysis_statistics(self, user_id: str = None) -> Dict:
        """Get analysis statistics"""
        try:
            if not self.analysis_collection:
                return {}
            
            # Build query
            query = {}
            if user_id:
                query["user_id"] = user_id
            
            # Count total analyses
            total_analyses = self.analysis_collection.count_documents(query)
            
            # Get average readiness score
            pipeline = [
                {"$match": query},
                {"$group": {
                    "_id": None,
                    "avg_readiness_score": {"$avg": "$overall_readiness_score"},
                    "total_internships_matched": {"$sum": "$total_internships_matched"},
                    "total_gaps_detected": {"$sum": "$total_gaps_detected"}
                }}
            ]
            
            result = list(self.analysis_collection.aggregate(pipeline))
            stats = result[0] if result else {}
            
            # Get most recent analysis
            recent_analysis = self.analysis_collection.find_one(
                query, 
                sort=[("timestamp", -1)]
            )
            
            return {
                "total_analyses": total_analyses,
                "avg_readiness_score": round(stats.get("avg_readiness_score", 0), 1),
                "total_internships_matched": stats.get("total_internships_matched", 0),
                "total_gaps_detected": stats.get("total_gaps_detected", 0),
                "last_analysis_date": recent_analysis.get("timestamp") if recent_analysis else None,
                "has_github_analyses": self.analysis_collection.count_documents({
                    **query, 
                    "github_analysis": {"$exists": True, "$ne": None}
                })
            }
            
        except Exception as e:
            logger.error(f"❌ Error retrieving statistics: {str(e)}")
            return {}
    
    def delete_analysis(self, analysis_id: str) -> bool:
        """Delete an analysis result"""
        try:
            if not self.analysis_collection:
                return False
            
            result = self.analysis_collection.delete_one({"analysis_id": analysis_id})
            
            if result.deleted_count > 0:
                logger.info(f"✅ Analysis {analysis_id} deleted successfully")
                return True
            else:
                logger.warning(f"⚠️ Analysis {analysis_id} not found")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error deleting analysis: {str(e)}")
            return False
    
    def search_analyses(self, search_term: str, user_id: str = None, limit: int = 20) -> List[Dict]:
        """Search analyses by student name, skills, or other criteria"""
        try:
            if not self.analysis_collection:
                return []
            
            # Build search query
            search_query = {
                "$or": [
                    {"student_profile.name": {"$regex": search_term, "$options": "i"}},
                    {"student_profile.skills": {"$regex": search_term, "$options": "i"}},
                    {"student_profile.domains": {"$regex": search_term, "$options": "i"}},
                    {"analysis_summary": {"$regex": search_term, "$options": "i"}}
                ]
            }
            
            # Add user filter if provided
            if user_id:
                search_query = {"$and": [{"user_id": user_id}, search_query]}
            
            # Execute search
            cursor = self.analysis_collection.find(search_query).sort("timestamp", -1).limit(limit)
            
            results = []
            for doc in cursor:
                doc["_id"] = str(doc["_id"])
                
                # Create summary for search results
                summary = {
                    "analysis_id": doc["analysis_id"],
                    "user_id": doc["user_id"],
                    "timestamp": doc["timestamp"],
                    "student_name": doc.get("student_profile", {}).get("name", "Unknown"),
                    "overall_readiness_score": doc.get("overall_readiness_score", 0),
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
            if readiness_evaluations:
                # Get the overall evaluation (first one)
                overall_eval = readiness_evaluations[0]
                score = overall_eval.get("readiness_score", 0)
                
                # Convert to percentage if it's a decimal
                if score <= 1.0:
                    score = score * 100
                
                return round(score, 1)
            
            return 0.0
            
        except Exception:
            return 0.0
    
    def _generate_analysis_summary(self, analysis_data: Dict) -> str:
        """Generate a brief summary of the analysis"""
        try:
            profile = analysis_data.get("student_profile", {})
            internships = len(analysis_data.get("internship_recommendations", []))
            gaps = len(analysis_data.get("portfolio_gaps", []))
            
            name = profile.get("name", "Student")
            experience_level = profile.get("experience_level", "entry-level")
            primary_skills = profile.get("skills", [])[:3]
            
            summary_parts = [
                f"{name} ({experience_level})",
                f"{internships} internships matched",
                f"{gaps} areas for improvement"
            ]
            
            if primary_skills:
                summary_parts.append(f"Skills: {', '.join(primary_skills)}")
            
            if profile.get("github_analysis"):
                github_score = profile["github_analysis"].get("github_score", 0)
                summary_parts.append(f"GitHub Score: {github_score}/100")
            
            return " | ".join(summary_parts)
            
        except Exception:
            return "Analysis completed successfully"
    
    def close_connection(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")

# Global instance
mongodb_service = MongoDBService()
