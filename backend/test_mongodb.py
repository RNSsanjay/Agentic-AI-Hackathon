#!/usr/bin/env python3
"""
Test MongoDB connection and collection initialization
"""
import os
import sys
import django
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from utils.mongodb_service import mongodb_service

def test_mongodb_connection():
    """Test MongoDB connection and basic operations"""
    print("🔄 Testing MongoDB connection...")
    
    try:
        # Test connection
        if mongodb_service.is_connected():
            print("✅ MongoDB is already connected")
        else:
            print("🔄 Connecting to MongoDB...")
            mongodb_service.connect()
            
        if mongodb_service.is_connected():
            print("✅ MongoDB connection successful")
            
            # Test collection access
            try:
                # Test analysis statistics (should handle empty collection)
                stats = mongodb_service.get_analysis_statistics()
                print(f"📊 Statistics: {stats}")
                
                # Test analysis history (should handle empty collection)
                history = mongodb_service.get_analysis_history(limit=5)
                print(f"📝 Analysis history: {len(history)} records found")
                
                print("✅ All MongoDB operations successful")
                
            except Exception as e:
                print(f"❌ MongoDB operations failed: {str(e)}")
                
        else:
            print("❌ MongoDB connection failed")
            
    except Exception as e:
        print(f"❌ MongoDB test failed: {str(e)}")

def check_collections():
    """Check if collections exist and create indexes"""
    try:
        if mongodb_service.is_connected():
            # Check if collections exist
            collections = mongodb_service.db.list_collection_names()
            print(f"📁 Available collections: {collections}")
            
            # Ensure indexes are created
            mongodb_service.create_indexes()
            print("✅ Indexes created/verified")
            
    except Exception as e:
        print(f"❌ Collection check failed: {str(e)}")

if __name__ == "__main__":
    print("🚀 Starting MongoDB test...")
    test_mongodb_connection()
    check_collections()
    print("🎉 MongoDB test completed!")
