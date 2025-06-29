#!/usr/bin/env python3
"""
Test script to verify the new scraping functionality
"""
import os
import sys
import django
from django.conf import settings

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from utils.rag_system import InternshipRAG

def test_scraping():
    """Test the scraping functionality"""
    print("🚀 Testing InternshipRAG scraping functionality...")
    
    # Initialize the RAG system
    rag_system = InternshipRAG()
    
    # Get statistics
    stats = rag_system.get_stats()
    print(f"📊 Total internships loaded: {stats['total_internships']}")
    print(f"🏢 Companies: {len(stats['companies'])}")
    print(f"🌍 Locations: {len(stats['locations'])}")
    print(f"💼 Domains: {stats['domains']}")
    
    # Get all internships
    all_internships = rag_system.get_all_internships()
    
    if all_internships:
        print("\n✅ Sample internships found:")
        for i, internship in enumerate(all_internships[:3]):  # Show first 3
            print(f"\n{i+1}. {internship['title']}")
            print(f"   Company: {internship['company']}")
            print(f"   Domain: {internship['domain']}")
            print(f"   Source: {internship['source']}")
            print(f"   URL: {internship['url']}")
            print(f"   Location: {internship['location']}")
            print(f"   Stipend: {internship['stipend']}")
    else:
        print("❌ No internships found")
    
    # Test search functionality
    print("\n🔍 Testing search functionality...")
    search_results = rag_system.search_internships("software engineer", limit=3)
    print(f"Search results for 'software engineer': {len(search_results)} found")
    
    for result in search_results:
        print(f"- {result['title']} at {result['company']} (Score: {result.get('matching_score', 0):.2f})")

if __name__ == "__main__":
    test_scraping()
