#!/usr/bin/env python3

import os
import sys
import django

# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Setup Django
django.setup()

def test_mongodb_connection():
    try:
        from utils.mongodb_service import mongodb_service
        
        # Test connection
        if mongodb_service.client:
            print("✅ MongoDB connection successful")
            
            # Test saving a dummy analysis
            test_analysis = {
                "student_profile": {
                    "name": "Test Student",
                    "skills": ["Python", "JavaScript"],
                    "experience_level": "entry-level"
                },
                "internship_recommendations": [
                    {
                        "title": "Software Engineer Intern",
                        "company": "TechCorp",
                        "matching_score": 0.85
                    }
                ],
                "portfolio_gaps": [
                    {
                        "title": "Missing GitHub profile",
                        "priority": "high"
                    }
                ],
                "readiness_evaluations": [
                    {
                        "internship_title": "Overall Readiness",
                        "readiness_score": 0.75
                    }
                ]
            }
            
            analysis_id = mongodb_service.save_analysis_result(test_analysis, "test_user")
            if analysis_id:
                print(f"✅ Test analysis saved with ID: {analysis_id}")
                
                # Test retrieval
                retrieved = mongodb_service.get_analysis_by_id(analysis_id)
                if retrieved:
                    print("✅ Test analysis retrieved successfully")
                    
                    # Test deletion
                    deleted = mongodb_service.delete_analysis(analysis_id)
                    if deleted:
                        print("✅ Test analysis deleted successfully")
                    else:
                        print("❌ Failed to delete test analysis")
                else:
                    print("❌ Failed to retrieve test analysis")
            else:
                print("❌ Failed to save test analysis")
        else:
            print("❌ MongoDB connection failed")
            
    except Exception as e:
        print(f"❌ MongoDB test failed: {str(e)}")

def test_agent_imports():
    try:
        from api.Agent import ResumeAnalysisView, github_analyzer
        print("✅ Agent imports successful")
        
        # Test GitHub analyzer
        test_text = "Check out my GitHub profile: https://github.com/testuser"
        github_result = github_analyzer.get_github_insights(test_text)
        if github_result:
            print("✅ GitHub analyzer working")
        else:
            print("ℹ️ GitHub analyzer returned no results (expected for invalid profile)")
            
    except Exception as e:
        print(f"❌ Agent imports failed: {str(e)}")

def test_rag_system():
    try:
        from utils.rag_system import internship_rag
        print("✅ RAG system import successful")
        
        # Test RAG matching
        test_profile = {
            "skills": ["Python", "Django", "React"],
            "domains": ["Web Development"],
            "experience_level": "entry-level"
        }
        
        matches = internship_rag.find_matching_internships(
            test_profile, ["Web Development"], top_k=3
        )
        
        if matches:
            print(f"✅ RAG system found {len(matches)} matches")
        else:
            print("ℹ️ RAG system returned no matches")
            
    except Exception as e:
        print(f"❌ RAG system test failed: {str(e)}")

if __name__ == "__main__":
    print("🧪 Testing Backend Components...")
    print("="*50)
    
    test_mongodb_connection()
    print()
    
    test_agent_imports()
    print()
    
    test_rag_system()
    print()
    
    print("🏁 Testing complete!")
