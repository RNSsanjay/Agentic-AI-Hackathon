#!/usr/bin/env python
"""
Initialization script for the Django internship scraping system.
This script helps set up the environment and run initial scraping.
"""

import os
import sys
import subprocess
import asyncio
import json
from pathlib import Path

def run_command(command, description=""):
    """Run a shell command and handle errors"""
    print(f"\n{'='*50}")
    print(f"🔧 {description}")
    print(f"Running: {command}")
    print(f"{'='*50}")
    
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print("✅ Success!")
        if result.stdout:
            print("Output:", result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print("❌ Failed!")
        print("Error:", e.stderr)
        return False

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8+ is required")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} is compatible")
    return True

def install_dependencies():
    """Install required Python packages"""
    print("\n🚀 Installing dependencies...")
    
    # Install main requirements
    if not run_command("pip install -r requirements.txt", "Installing Python packages"):
        return False
    
    # Install Playwright browsers
    if not run_command("playwright install chromium", "Installing Playwright browser"):
        return False
    
    return True

def create_data_directory():
    """Create data directory and initialize empty JSON file"""
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    
    json_file = data_dir / "internships.json"
    if not json_file.exists():
        initial_data = {"internships": []}
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(initial_data, f, indent=2)
        print("✅ Created initial internships.json file")
    else:
        print("✅ internships.json already exists")

def run_django_setup():
    """Run Django migrations and setup"""
    print("\n🔧 Setting up Django...")
    
    # Run migrations
    if not run_command("python manage.py migrate", "Running Django migrations"):
        return False
    
    # Collect static files (if needed)
    # run_command("python manage.py collectstatic --noinput", "Collecting static files")
    
    return True

def run_initial_scraping():
    """Run initial scraping to populate data"""
    print("\n🕷️ Running initial scraping...")
    
    # Clean any expired entries first
    run_command("python manage.py cleanup_internships", "Cleaning expired internships")
    
    # Run scraping with limited pages for initial setup
    if not run_command(
        "python manage.py scrape_internships --pages 1 --keyword 'internship' --location 'India'",
        "Scraping initial internships data"
    ):
        print("⚠️ Initial scraping failed, but you can try again later")
        return False
    
    return True

def test_api():
    """Test if the API is working"""
    print("\n🧪 Testing API endpoints...")
    
    try:
        import requests
        
        # Test health endpoint
        response = requests.get("http://localhost:8000/api/health/", timeout=5)
        if response.status_code == 200:
            print("✅ Health endpoint working")
        else:
            print("⚠️ Health endpoint returned non-200 status")
            
        # Test internships endpoint
        response = requests.get("http://localhost:8000/api/internships/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            count = data.get('total_count', 0)
            print(f"✅ Internships endpoint working ({count} internships found)")
        else:
            print("⚠️ Internships endpoint returned non-200 status")
            
    except requests.exceptions.ConnectionError:
        print("⚠️ Django server is not running. Start it with: python manage.py runserver")
    except ImportError:
        print("⚠️ Requests library not available for testing")

def print_next_steps():
    """Print next steps for the user"""
    print(f"\n{'='*70}")
    print("🎉 SETUP COMPLETE!")
    print(f"{'='*70}")
    print("\n📋 Next Steps:")
    print("1. Start the Django development server:")
    print("   python manage.py runserver")
    print()
    print("2. Open the test page in your browser:")
    print("   http://localhost:8000/api/health/")
    print("   Or open: frontend/test_scraper.html")
    print()
    print("3. Available management commands:")
    print("   python manage.py scrape_internships --help")
    print("   python manage.py cleanup_internships --help")
    print()
    print("4. API Endpoints:")
    print("   POST /api/scrape/internships/        - Start scraping")
    print("   GET  /api/internships/               - Get internships")
    print("   GET  /api/scrape/stats/              - Get scraping stats")
    print("   POST /api/scrape/clean-expired/      - Clean expired data")
    print()
    print("5. Schedule regular scraping (recommended):")
    print("   Set up a cron job to run scraping every few hours")
    print("   Example: python manage.py scrape_internships --pages 2")
    print()
    print("📝 Configuration:")
    print("   - Edit backend/settings.py for database settings")
    print("   - Edit .env file for environment variables")
    print("   - Modify scraping sources in api/scrap.py")
    print(f"\n{'='*70}")

def main():
    """Main initialization function"""
    print("🚀 Django Internship Scraper Setup")
    print("This script will set up everything you need to get started.")
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    original_dir = os.getcwd()
    
    try:
        os.chdir(backend_dir)
        print(f"📁 Working in: {backend_dir.absolute()}")
        
        # Check Python version
        if not check_python_version():
            return False
        
        # Install dependencies
        if not install_dependencies():
            return False
        
        # Create data directory
        create_data_directory()
        
        # Run Django setup
        if not run_django_setup():
            return False
        
        # Run initial scraping
        run_initial_scraping()
        
        # Print completion message
        print_next_steps()
        
        return True
        
    except KeyboardInterrupt:
        print("\n❌ Setup interrupted by user")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False
    finally:
        os.chdir(original_dir)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
