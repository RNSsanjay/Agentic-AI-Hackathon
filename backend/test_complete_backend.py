#!/usr/bin/env python3
"""
Comprehensive test script to verify the InternAI backend functionality
This script tests all endpoints and verifies MongoDB integration
"""

import requests
import json
import sys
import time
from datetime import datetime

BASE_URL = 'http://127.0.0.1:8000'

def print_test_header(test_name):
    print("\n" + "="*80)
    print(f"🧪 {test_name}")
    print("="*80)

def print_result(success, message):
    icon = "✅" if success else "❌"
    print(f"{icon} {message}")

def test_endpoint(method, endpoint, description, data=None, expected_status=200):
    """Test a single endpoint"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        print(f"\n🔍 Testing {method} {endpoint}")
        print(f"📝 {description}")
        
        if method == 'GET':
            response = requests.get(url, timeout=10)
        elif method == 'POST':
            response = requests.post(url, json=data, timeout=30)
        elif method == 'DELETE':
            response = requests.delete(url, timeout=10)
        else:
            print_result(False, f"Unsupported method: {method}")
            return False
        
        print(f"📊 Status Code: {response.status_code}")
        
        success = response.status_code == expected_status
        
        try:
            json_response = response.json()
            print(f"📄 Response: {json.dumps(json_response, indent=2)[:300]}...")
            
            # Additional validation for specific endpoints
            if endpoint == '/api/dashboard/stats/' and success:
                stats = json_response.get('stats', {})
                if all(key in stats for key in ['readiness_score', 'internship_match_count', 'gaps_detected']):
                    print_result(True, "Dashboard stats structure is correct")
                else:
                    print_result(False, "Dashboard stats missing required fields")
                    success = False
                    
            elif endpoint == '/api/analysis/statistics/' and success:
                statistics = json_response.get('statistics', {})
                if all(key in statistics for key in ['total_analyses', 'avg_readiness_score']):
                    print_result(True, "Analysis statistics structure is correct")
                else:
                    print_result(False, "Analysis statistics missing required fields")
                    success = False
                    
        except json.JSONDecodeError:
            print(f"📄 Non-JSON Response: {response.text[:200]}...")
        
        if success:
            print_result(True, f"Test passed for {endpoint}")
        else:
            print_result(False, f"Test failed for {endpoint} (Expected: {expected_status}, Got: {response.status_code})")
            
        return success
            
    except requests.exceptions.RequestException as e:
        print_result(False, f"Request failed: {str(e)}")
        return False

def test_mongodb_connection():
    """Test MongoDB connection specifically"""
    print_test_header("MongoDB Connection Test")
    
    success = test_endpoint('GET', '/api/test/mongodb/', 'Test MongoDB connection')
    
    if success:
        print_result(True, "MongoDB connection is working!")
    else:
        print_result(False, "MongoDB connection failed - check configuration")
    
    return success

def test_dashboard_stats():
    """Test dashboard statistics with detailed validation"""
    print_test_header("Dashboard Statistics Test")
    
    try:
        response = requests.get(f"{BASE_URL}/api/dashboard/stats/")
        if response.status_code == 200:
            data = response.json()
            stats = data.get('stats', {})
            
            print(f"📊 Dashboard Stats:")
            print(f"   - Readiness Score: {stats.get('readiness_score', 'N/A')}")
            print(f"   - Internship Matches: {stats.get('internship_match_count', 'N/A')}")
            print(f"   - Gaps Detected: {stats.get('gaps_detected', 'N/A')}")
            print(f"   - Total Internships: {stats.get('total_available_internships', 'N/A')}")
            print(f"   - Using Real Data: {stats.get('using_real_data', 'N/A')}")
            
            # Validate that zeros are properly displayed
            if stats.get('using_real_data') is False:
                if (stats.get('readiness_score') == 0 and 
                    stats.get('internship_match_count') == 0 and 
                    stats.get('gaps_detected') == 0):
                    print_result(True, "Zero stats are correctly displayed before analysis")
                    return True
                else:
                    print_result(False, "Stats should be zero when no analysis is done")
                    return False
            else:
                print_result(True, "Real analysis data is being used")
                return True
        else:
            print_result(False, f"Dashboard stats request failed: {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Dashboard stats test failed: {str(e)}")
        return False

def test_analysis_endpoints():
    """Test analysis-related endpoints"""
    print_test_header("Analysis Endpoints Test")
    
    endpoints = [
        ('/api/analysis/history/', 'Get analysis history'),
        ('/api/analysis/statistics/', 'Get analysis statistics'),
    ]
    
    all_passed = True
    for endpoint, description in endpoints:
        success = test_endpoint('GET', endpoint, description)
        all_passed = all_passed and success
    
    return all_passed

def main():
    print("🚀 Starting InternAI Backend Tests")
    print(f"⏰ Test Time: {datetime.now().isoformat()}")
    
    # Test results tracking
    test_results = {}
    
    # Run tests
    test_results['mongodb'] = test_mongodb_connection()
    test_results['dashboard'] = test_dashboard_stats()
    test_results['analysis'] = test_analysis_endpoints()
    
    # Basic endpoint tests
    print_test_header("Basic Endpoint Tests")
    basic_tests = [
        ('/api/internships/', 'Get internships data'),
        ('/api/activity/', 'Get recent activity'),
    ]
    
    basic_success = True
    for endpoint, description in basic_tests:
        success = test_endpoint('GET', endpoint, description)
        basic_success = basic_success and success
    
    test_results['basic'] = basic_success
    
    # Final results
    print_test_header("Test Results Summary")
    total_tests = len(test_results)
    passed_tests = sum(test_results.values())
    
    for test_name, result in test_results.items():
        print_result(result, f"{test_name.title()} tests")
    
    print(f"\n📊 Overall Results: {passed_tests}/{total_tests} test categories passed")
    
    if passed_tests == total_tests:
        print_result(True, "All tests passed! 🎉")
        print("\n💡 Your InternAI backend is ready for use!")
        return True
    else:
        print_result(False, f"Some tests failed. Please check the issues above.")
        print("\n🔧 Tips:")
        if not test_results['mongodb']:
            print("   - Check MongoDB connection string in settings.py")
            print("   - Ensure MongoDB server is running")
        if not test_results['dashboard']:
            print("   - Check dashboard stats logic in views.py")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
