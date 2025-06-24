#!/usr/bin/env python3
"""
Test script to verify all API endpoints are working properly
"""

import requests
import json
import sys
import os

# Add the Django project to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_URL = 'http://127.0.0.1:8000'

def test_endpoint(method, endpoint, description, data=None, files=None):
    """Test a single endpoint"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        print(f"\n🧪 Testing {method} {endpoint}")
        print(f"📝 {description}")
        
        if method == 'GET':
            response = requests.get(url, timeout=10)
        elif method == 'POST':
            if files:
                response = requests.post(url, data=data, files=files, timeout=30)
            else:
                response = requests.post(url, json=data, timeout=30)
        elif method == 'DELETE':
            response = requests.delete(url, timeout=10)
        else:
            print(f"❌ Unsupported method: {method}")
            return False
        
        print(f"📊 Status Code: {response.status_code}")
        
        # Try to parse JSON response
        try:
            json_response = response.json()
            print(f"✅ Response: {json.dumps(json_response, indent=2)}")
        except:
            print(f"📄 Response: {response.text[:200]}...")
        
        # Check if the response is successful
        if response.status_code in [200, 201]:
            print(f"✅ Success!")
            return True
        else:
            print(f"⚠️ Warning: Status code {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error: {str(e)}")
        return False

def main():
    print("🚀 Starting API Endpoint Tests")
    print("=" * 50)
    
    # Test basic endpoints
    tests = [
        ('GET', '/api/internships/', 'Get internships data'),
        ('GET', '/api/dashboard/stats/', 'Get dashboard statistics'),
        ('GET', '/api/activity/', 'Get recent activity'),
        ('GET', '/api/analysis/history/', 'Get analysis history'),
        ('GET', '/api/analysis/statistics/', 'Get analysis statistics'),
    ]
    
    success_count = 0
    total_tests = len(tests)
    
    for method, endpoint, description in tests:
        if test_endpoint(method, endpoint, description):
            success_count += 1
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {success_count}/{total_tests} tests passed")
    
    if success_count == total_tests:
        print("🎉 All tests passed!")
        return True
    else:
        print("⚠️ Some tests failed. Please check the server and try again.")
        return False

if __name__ == '__main__':
    main()
