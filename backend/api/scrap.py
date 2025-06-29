import json
import asyncio
import logging
import random
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
from pathlib import Path
import threading
from concurrent.futures import ThreadPoolExecutor

# Try to import Gemini service for text processing
try:
    from utils.gemini_service import gemini_service
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    gemini_service = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class InternshipScraper:
    def __init__(self):
        self.timeout = 30000  # 30 seconds
        self.max_retries = 3
        self.retry_delay = 2000  # 2 seconds
        self.data_file_path = os.path.join(settings.BASE_DIR, 'data', 'internships.json')
        self.ensure_data_directory()
        
        # Platform configurations
        self.platforms = {
            'indeed': {
                'name': 'Indeed',
                'base_url': 'https://in.indeed.com',
                'search_path': '/jobs',
                'enabled': True
            },
            'linkedin': {
                'name': 'LinkedIn',
                'base_url': 'https://www.linkedin.com',
                'search_path': '/jobs/search',
                'enabled': True
            },
            'naukri': {
                'name': 'Naukri',
                'base_url': 'https://www.naukri.com',
                'search_path': '',
                'enabled': True
            },
            'internshala': {
                'name': 'Internshala',
                'base_url': 'https://internshala.com',
                'search_path': '/internships',
                'enabled': True
            },
            'letsintern': {
                'name': 'LetsIntern',
                'base_url': 'https://www.letsintern.com',
                'search_path': '/internships',
                'enabled': True
            }
        }

    def ensure_data_directory(self):
        """Ensure the data directory exists"""
        data_dir = os.path.dirname(self.data_file_path)
        os.makedirs(data_dir, exist_ok=True)

    def load_existing_internships(self) -> Dict:
        """Load existing internships from JSON file"""
        try:
            if os.path.exists(self.data_file_path):
                with open(self.data_file_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return {"internships": []}
        except Exception as e:
            logger.error(f"Error loading existing internships: {e}")
            return {"internships": []}

    def save_internships(self, internships: List[Dict]):
        """Save internships to JSON file with comprehensive validation and duplicate checking"""
        try:
            # First validate and filter internships
            valid_internships = self.filter_and_validate_internships(internships)
            logger.info(f"Validated {len(valid_internships)} out of {len(internships)} scraped internships")
            
            # Load existing data
            existing_data = self.load_existing_internships()
            existing_internships = existing_data.get("internships", [])
            
            # Filter out expired internships
            current_date = datetime.now()
            active_internships = []
            
            for internship in existing_internships:
                deadline_str = internship.get('application_deadline')
                if deadline_str:
                    try:
                        deadline = datetime.strptime(deadline_str, '%Y-%m-%d')
                        if deadline >= current_date:
                            active_internships.append(internship)
                    except ValueError:
                        # Keep internships with invalid date formats
                        active_internships.append(internship)
                else:
                    # Keep internships without deadlines
                    active_internships.append(internship)
            
            # Add new valid internships (avoiding duplicates)
            existing_ids = {internship.get('id') for internship in active_internships if internship.get('id')}
            existing_titles_companies = {(internship.get('title', '').lower(), internship.get('company', '').lower()) 
                                       for internship in active_internships}
            
            added_count = 0
            for new_internship in valid_internships:
                # Check for duplicates
                new_id = new_internship.get('id')
                new_title_company = (new_internship.get('title', '').lower(), new_internship.get('company', '').lower())
                
                if new_id not in existing_ids and new_title_company not in existing_titles_companies:
                    # Generate unique ID if not present
                    if not new_id:
                        new_internship['id'] = self.generate_unique_id(new_internship)
                    
                    # Set default deadline if not present (30 days from now)
                    if not new_internship.get('application_deadline'):
                        deadline = current_date + timedelta(days=30)
                        new_internship['application_deadline'] = deadline.strftime('%Y-%m-%d')
                    
                    active_internships.append(new_internship)
                    added_count += 1
            
            # Save updated data
            updated_data = {"internships": active_internships}
            with open(self.data_file_path, 'w', encoding='utf-8') as f:
                json.dump(updated_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Saved {len(active_internships)} total internships ({added_count} new, {len(existing_internships) - len(active_internships)} expired removed)")
            return len(active_internships)
            
        except Exception as e:
            logger.error(f"Error saving internships: {e}")
            return 0

    def generate_unique_id(self, internship: Dict) -> str:
        """Generate a unique ID for an internship"""
        title = internship.get('title', '').upper()
        company = internship.get('company', '').upper()
        source = internship.get('source', 'SCRAPED').upper()
        
        # Create a base ID from title and company
        base_id = f"{source}_{title[:3]}_{company[:3]}_{random.randint(100, 999)}"
        return base_id.replace(' ', '_').replace('.', '').replace(',', '')

    async def scrape_indeed(self, keyword="internship", location="India", max_pages=2):
        """Scrape internships from Indeed with improved robustness"""
        internships = []
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]

        async with async_playwright() as p:
            browser = None
            try:
                browser = await p.chromium.launch(
                    headless=True,
                    args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                )
                page = await browser.new_page()

                for page_num in range(max_pages):
                    try:
                        start = page_num * 10
                        url = f"https://in.indeed.com/jobs?q={keyword}&l={location}&start={start}"

                        logger.info(f"Scraping Indeed page {page_num + 1}: {url}")

                        # Randomly select a user agent
                        await page.set_extra_http_headers({
                            'User-Agent': random.choice(user_agents)
                        })

                        # Try to load the page with retries
                        await self._load_page_with_retry(page, url)

                        # Wait for job cards to be present
                        await page.wait_for_selector('[data-jk]', timeout=self.timeout)

                        # Extract job listings
                        job_cards = await page.query_selector_all('[data-jk]')

                        if not job_cards:
                            logger.warning(f"No job cards found on page {page_num + 1}")
                            continue

                        for card in job_cards:
                            try:
                                internship = await self._extract_indeed_job_data(card)
                                if internship and self._is_internship_relevant(internship):
                                    internships.append(internship)
                            except Exception as e:
                                logger.error(f"Error extracting job data: {str(e)}")
                                continue

                        logger.info(f"Scraped {len(job_cards)} job cards from page {page_num + 1}")

                    except Exception as e:
                        logger.error(f"Error scraping page {page_num + 1}: {str(e)}")
                        continue

            except Exception as e:
                logger.error(f"Error scraping Indeed: {str(e)}")
            finally:
                if browser:
                    await browser.close()

        return internships

    async def scrape_linkedin(self, keyword="internship", location="India", max_pages=2):
        """Scrape internships from LinkedIn with improved robustness"""
        internships = []
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]

        async with async_playwright() as p:
            browser = None
            try:
                browser = await p.chromium.launch(
                    headless=True,
                    args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                )
                page = await browser.new_page()

                for page_num in range(max_pages):
                    try:
                        start = page_num * 25
                        url = f"https://www.linkedin.com/jobs/search?keywords={keyword}&location={location}&start={start}&f_E=1"

                        logger.info(f"Scraping LinkedIn page {page_num + 1}: {url}")

                        # Randomly select a user agent
                        await page.set_extra_http_headers({
                            'User-Agent': random.choice(user_agents)
                        })

                        # Try to load the page with retries
                        await self._load_page_with_retry(page, url)

                        # Wait for job cards to be present
                        await page.wait_for_selector('.job-search-card', timeout=self.timeout)

                        # Extract job listings
                        job_cards = await page.query_selector_all('.job-search-card')

                        if not job_cards:
                            logger.warning(f"No job cards found on page {page_num + 1}")
                            continue

                        for card in job_cards:
                            try:
                                internship = await self._extract_linkedin_job_data(card)
                                if internship and self._is_internship_relevant(internship):
                                    internships.append(internship)
                            except Exception as e:
                                logger.error(f"Error extracting LinkedIn job data: {str(e)}")
                                continue

                        logger.info(f"Scraped {len(job_cards)} job cards from page {page_num + 1}")

                    except Exception as e:
                        logger.error(f"Error scraping LinkedIn page {page_num + 1}: {str(e)}")
                        continue

            except Exception as e:
                logger.error(f"Error scraping LinkedIn: {str(e)}")
            finally:
                if browser:
                    await browser.close()

        return internships

    async def scrape_naukri(self, keyword="internship", location="India", max_pages=2):
        """Scrape internships from Naukri.com with improved robustness"""
        internships = []
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]

        async with async_playwright() as p:
            browser = None
            try:
                browser = await p.chromium.launch(
                    headless=True,
                    args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                )
                page = await browser.new_page()

                for page_num in range(1, max_pages + 1):
                    try:
                        # URL encode the parameters
                        encoded_keyword = keyword.replace(' ', '%20')
                        encoded_location = location.replace(' ', '%20').replace(',', '%2C')
                        url = f"https://www.naukri.com/{encoded_keyword}-jobs-in-{encoded_location}-{page_num}"

                        logger.info(f"Scraping Naukri page {page_num}: {url}")

                        # Randomly select a user agent
                        await page.set_extra_http_headers({
                            'User-Agent': random.choice(user_agents)
                        })

                        # Try to load the page with retries
                        await self._load_page_with_retry(page, url)

                        # Wait for job cards to be present
                        await page.wait_for_selector('.jobTuple', timeout=self.timeout)

                        # Extract job listings
                        job_cards = await page.query_selector_all('.jobTuple')

                        if not job_cards:
                            logger.warning(f"No job cards found on page {page_num}")
                            continue

                        for card in job_cards[:10]:  # Limit to first 10 per page
                            try:
                                internship = await self._extract_naukri_job_data(card)
                                if internship and self._is_internship_relevant(internship):
                                    internships.append(internship)
                            except Exception as e:
                                logger.error(f"Error extracting Naukri job data: {str(e)}")
                                continue

                        logger.info(f"Scraped {len(job_cards)} job cards from page {page_num}")

                    except Exception as e:
                        logger.error(f"Error scraping Naukri page {page_num}: {str(e)}")
                        continue

            except Exception as e:
                logger.error(f"Error scraping Naukri: {str(e)}")
            finally:
                if browser:
                    await browser.close()

        return internships

    async def scrape_internshala(self, keyword="internship", location="India", max_pages=2):
        """Scrape internships from Internshala with improved robustness"""
        internships = []
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]

        async with async_playwright() as p:
            browser = None
            try:
                browser = await p.chromium.launch(
                    headless=True,
                    args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                )
                page = await browser.new_page()

                for page_num in range(1, max_pages + 1):
                    try:
                        # Internshala URL structure
                        if keyword.lower() != "internship":
                            url = f"https://internshala.com/internships/{keyword.replace(' ', '-')}-internships/"
                        else:
                            url = f"https://internshala.com/internships/page-{page_num}/"

                        logger.info(f"Scraping Internshala page {page_num}: {url}")

                        # Set random user agent
                        await page.set_extra_http_headers({
                            'User-Agent': random.choice(user_agents)
                        })

                        # Load page with retries
                        await self._load_page_with_retry(page, url)

                        # Wait for internship cards
                        await page.wait_for_selector('.internship_meta', timeout=self.timeout)

                        # Extract internship listings
                        internship_cards = await page.query_selector_all('.internship_meta')

                        if not internship_cards:
                            logger.warning(f"No internship cards found on page {page_num}")
                            continue

                        for card in internship_cards[:15]:  # Limit per page
                            try:
                                internship = await self._extract_internshala_data(card)
                                if internship:
                                    internships.append(internship)
                            except Exception as e:
                                logger.error(f"Error extracting Internshala data: {str(e)}")
                                continue

                        logger.info(f"Scraped {len(internship_cards)} internship cards from page {page_num}")

                    except Exception as e:
                        logger.error(f"Error scraping Internshala page {page_num}: {str(e)}")
                        continue

            except Exception as e:
                logger.error(f"Error scraping Internshala: {str(e)}")
            finally:
                if browser:
                    await browser.close()

        return internships

    async def scrape_letsintern(self, keyword="internship", location="India", max_pages=2):
        """Scrape internships from LetsIntern with improved robustness"""
        internships = []
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]

        async with async_playwright() as p:
            browser = None
            try:
                browser = await p.chromium.launch(
                    headless=True,
                    args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                )
                page = await browser.new_page()

                for page_num in range(1, max_pages + 1):
                    try:
                        # LetsIntern URL structure
                        base_url = "https://www.letsintern.com/internships"
                        if keyword.lower() != "internship":
                            url = f"{base_url}?search={keyword.replace(' ', '+')}&page={page_num}"
                        else:
                            url = f"{base_url}?page={page_num}"

                        logger.info(f"Scraping LetsIntern page {page_num}: {url}")

                        # Set random user agent
                        await page.set_extra_http_headers({
                            'User-Agent': random.choice(user_agents)
                        })

                        # Load page with retries
                        await self._load_page_with_retry(page, url)

                        # Wait for internship cards
                        await page.wait_for_selector('.card-content', timeout=self.timeout)

                        # Extract internship listings
                        internship_cards = await page.query_selector_all('.card-content')

                        if not internship_cards:
                            logger.warning(f"No internship cards found on page {page_num}")
                            continue

                        for card in internship_cards[:15]:  # Limit per page
                            try:
                                internship = await self._extract_letsintern_data(card)
                                if internship:
                                    internships.append(internship)
                            except Exception as e:
                                logger.error(f"Error extracting LetsIntern data: {str(e)}")
                                continue

                        logger.info(f"Scraped {len(internship_cards)} internship cards from page {page_num}")

                    except Exception as e:
                        logger.error(f"Error scraping LetsIntern page {page_num}: {str(e)}")
                        continue

            except Exception as e:
                logger.error(f"Error scraping LetsIntern: {str(e)}")
            finally:
                if browser:
                    await browser.close()

        return internships

    def _is_internship_relevant(self, internship: Dict) -> bool:
        """Check if the scraped job is relevant (internship-related)"""
        title = internship.get('title', '').lower()
        internship_keywords = ['intern', 'internship', 'trainee', 'student', 'fresher', 'graduate program']
        return any(keyword in title for keyword in internship_keywords)

    async def _load_page_with_retry(self, page, url):
        """Helper method to load a page with retries"""
        for attempt in range(self.max_retries):
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=self.timeout)
                await page.wait_for_timeout(self.retry_delay)
                return
            except PlaywrightTimeoutError as e:
                if attempt == self.max_retries - 1:
                    raise
                logger.warning(f"Timeout loading page (attempt {attempt + 1}): {e}")
                await page.wait_for_timeout(self.retry_delay * (attempt + 1))
            except Exception as e:
                if attempt == self.max_retries - 1:
                    raise
                logger.warning(f"Error loading page (attempt {attempt + 1}): {e}")
                await page.wait_for_timeout(self.retry_delay * (attempt + 1))

    async def _get_inner_text(self, element, selector):
        """Helper method to get inner text of an element with retries"""
        for attempt in range(self.max_retries):
            try:
                elem = await element.query_selector(selector)
                if elem:
                    text = await elem.inner_text()
                    return text.strip() if text else "N/A"
                return "N/A"
            except Exception as e:
                if attempt == self.max_retries - 1:
                    logger.error(f"Failed to get inner text after {self.max_retries} attempts: {e}")
                    return "N/A"
                await asyncio.sleep(0.5)

    async def _get_attribute(self, element, selector, attribute):
        """Helper method to get attribute of an element with retries"""
        for attempt in range(self.max_retries):
            try:
                elem = await element.query_selector(selector)
                if elem:
                    return await elem.get_attribute(attribute)
                return ""
            except Exception as e:
                if attempt == self.max_retries - 1:
                    logger.error(f"Failed to get attribute after {self.max_retries} attempts: {e}")
                    return ""
                await asyncio.sleep(0.5)

    async def _extract_indeed_job_data(self, card):
        """Extract job data from Indeed job card with improved cleaning using Gemini AI"""
        try:
            title = await self._get_inner_text(card, 'h2 a span')
            company = await self._get_inner_text(card, '[data-testid="company-name"]')
            location_text = await self._get_inner_text(card, '[data-testid="job-location"]')
            summary = await self._get_inner_text(card, '.slider_container .slider_item')
            link = await self._get_attribute(card, 'h2 a', 'href')

            if not title or self._clean_text(title) == "N/A":
                return None

            # Clean and validate link
            if link and not link.startswith('http'):
                link = f"https://in.indeed.com{link}"
            link = self._validate_url(link)

            # Extract salary if available
            salary_elem = await card.query_selector('[data-testid="salary-snippet"]')
            salary = await salary_elem.inner_text() if salary_elem else "Not specified"

            # Create raw data for Gemini processing
            raw_data = {
                'title': title,
                'company': company,
                'location': location_text,
                'description': summary,
                'stipend': salary,
                'source': 'Indeed'
            }

            # Use Gemini to extract and structure data if available
            if GEMINI_AVAILABLE and gemini_service.available:
                try:
                    processed_data = gemini_service.extract_internship_details(raw_data)
                    title_clean = processed_data.get('title', self._clean_text(title))
                    company_clean = processed_data.get('company', self._clean_text(company))
                    location_clean = processed_data.get('location', self._clean_text(location_text))
                    summary_clean = processed_data.get('description', self._clean_text(summary))
                    salary_clean = processed_data.get('stipend', self._clean_text(salary))
                    skills = processed_data.get('skills', [])
                    internship_type = processed_data.get('type', 'Not specified')
                except Exception as e:
                    logger.warning(f"Gemini processing failed for Indeed data: {e}")
                    # Fallback to basic cleaning
                    title_clean = self._clean_text(title)
                    company_clean = self._clean_text(company) 
                    location_clean = self._clean_text(location_text)
                    summary_clean = self._clean_text(summary)
                    salary_clean = self._clean_text(salary)
                    skills = self._extract_skills_from_text(summary_clean)
                    internship_type = 'Not specified'
            else:
                # Basic cleaning without Gemini
                title_clean = self._clean_text(title)
                company_clean = self._clean_text(company) 
                location_clean = self._clean_text(location_text)
                summary_clean = self._clean_text(summary)
                salary_clean = self._clean_text(salary)
                skills = self._extract_skills_from_text(summary_clean)
                internship_type = 'Not specified'

            return {
                'id': self.generate_unique_id({'title': title_clean, 'company': company_clean, 'source': 'Indeed'}),
                'title': title_clean,
                'company': company_clean,
                'location': location_clean,
                'domain': self._extract_domain_from_title(title_clean),
                'duration': "Not specified",
                'stipend': salary_clean,
                'requirements': skills if isinstance(skills, list) else [skills] if skills else [],
                'preferred_skills': [],
                'description': self._truncate_text(summary_clean, 200),
                'responsibilities': [],
                'qualifications': [summary_clean] if summary_clean and summary_clean != "N/A" else [],
                'experience_level': "entry-level",
                'tags': ["indeed", "remote-friendly", "real-time", internship_type.lower()],
                'link': link,
                'source': 'Indeed',
                'type': internship_type,
                'scraped_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'application_deadline': (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
            }
        except Exception as e:
            logger.error(f"Error extracting Indeed job data: {str(e)}")
            return None

    async def _extract_linkedin_job_data(self, card):
        """Extract job data from LinkedIn job card with improved cleaning using Gemini AI"""
        try:
            title = await self._get_inner_text(card, '.base-search-card__title')
            company = await self._get_inner_text(card, '.base-search-card__subtitle')
            location_text = await self._get_inner_text(card, '.job-search-card__location')
            link = await self._get_attribute(card, '.base-card__full-link', 'href')

            if not title or self._clean_text(title) == "N/A":
                return None

            # Clean and validate link
            link = self._validate_url(link)

            # Create raw data for Gemini processing
            raw_data = {
                'title': title,
                'company': company,
                'location': location_text,
                'description': f"Professional internship opportunity at {company}. Apply directly through LinkedIn.",
                'source': 'LinkedIn'
            }

            # Use Gemini to extract and structure data if available
            if GEMINI_AVAILABLE and gemini_service.available:
                try:
                    processed_data = gemini_service.extract_internship_details(raw_data)
                    title_clean = processed_data.get('title', self._clean_text(title))
                    company_clean = processed_data.get('company', self._clean_text(company))
                    location_clean = processed_data.get('location', self._clean_text(location_text))
                    skills = processed_data.get('skills', [])
                    internship_type = processed_data.get('type', 'Not specified')
                except Exception as e:
                    logger.warning(f"Gemini processing failed for LinkedIn data: {e}")
                    title_clean = self._clean_text(title)
                    company_clean = self._clean_text(company)
                    location_clean = self._clean_text(location_text)
                    skills = self._extract_skills_from_text(title_clean)
                    internship_type = 'Not specified'
            else:
                title_clean = self._clean_text(title)
                company_clean = self._clean_text(company)
                location_clean = self._clean_text(location_text)
                skills = self._extract_skills_from_text(title_clean)
                internship_type = 'Not specified'

            return {
                'id': self.generate_unique_id({'title': title_clean, 'company': company_clean, 'source': 'LinkedIn'}),
                'title': title_clean,
                'company': company_clean,
                'location': location_clean,
                'domain': self._extract_domain_from_title(title_clean),
                'duration': "Not specified",
                'stipend': "Not specified",
                'requirements': skills if isinstance(skills, list) else [skills] if skills else [],
                'preferred_skills': [],
                'description': f"Professional internship opportunity at {company_clean}. Apply directly through LinkedIn.",
                'responsibilities': [],
                'qualifications': [],
                'experience_level': "entry-level",
                'tags': ["linkedin", "professional", "real-time", internship_type.lower()],
                'link': link,
                'source': 'LinkedIn',
                'type': internship_type,
                'scraped_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'application_deadline': (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
            }
        except Exception as e:
            logger.error(f"Error extracting LinkedIn job data: {str(e)}")
            return None

    async def _extract_naukri_job_data(self, card):
        """Extract job data from Naukri job card with improved cleaning"""
        try:
            title = await self._get_inner_text(card, '.title')
            company = await self._get_inner_text(card, '.comp-name')
            location_text = await self._get_inner_text(card, '.locWdth')
            summary = await self._get_inner_text(card, '.job-desc')
            link = await self._get_attribute(card, '.title', 'href')

            # Clean all text fields
            title_clean = self._clean_text(title)
            company_clean = self._clean_text(company)
            location_clean = self._clean_text(location_text)
            summary_clean = self._clean_text(summary)

            if not title_clean or title_clean == "N/A":
                return None

            # Clean and validate link
            if link and not link.startswith('http'):
                link = f"https://www.naukri.com{link}"
            link = self._validate_url(link)

            # Extract experience if available
            exp_elem = await card.query_selector('.expwdth')
            experience = await exp_elem.inner_text() if exp_elem else "Fresher"
            experience_clean = self._clean_text(experience)

            return {
                'id': self.generate_unique_id({'title': title_clean, 'company': company_clean, 'source': 'Naukri'}),
                'title': title_clean,
                'company': company_clean,
                'location': location_clean,
                'domain': self._extract_domain_from_title(title_clean),
                'duration': "Not specified",
                'stipend': "Not specified",
                'requirements': self._extract_skills_from_text(summary_clean),
                'preferred_skills': [],
                'description': self._truncate_text(summary_clean, 200),
                'responsibilities': [],
                'qualifications': [experience_clean] if experience_clean else [],
                'experience_level': "entry-level" if "fresher" in experience_clean.lower() else "intermediate",
                'tags': ["naukri", "india-focused", "real-time"],
                'link': link,
                'source': 'Naukri',
                'scraped_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'application_deadline': (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
            }
        except Exception as e:
            logger.error(f"Error extracting Naukri job data: {str(e)}")
            return None

    async def _extract_internshala_data(self, card):
        """Extract internship data from Internshala card with improved cleaning"""
        try:
            # Use more specific selectors for Internshala
            title = await self._get_inner_text(card, '.heading .job-internship-name')
            if not title:
                title = await self._get_inner_text(card, '.profile h3 a')
            if not title:
                title = await self._get_inner_text(card, '.heading a')
                
            company = await self._get_inner_text(card, '.company-name')
            if not company:
                company = await self._get_inner_text(card, '.company_name')
                
            location_text = await self._get_inner_text(card, '.location_link')
            duration = await self._get_inner_text(card, '.internship_duration')
            stipend = await self._get_inner_text(card, '.stipend')
            
            # Get link with multiple selectors
            link = await self._get_attribute(card, '.heading .job-internship-name', 'href')
            if not link:
                link = await self._get_attribute(card, '.profile h3 a', 'href')
            if not link:
                link = await self._get_attribute(card, '.heading a', 'href')

            # Clean all text fields
            title_clean = self._clean_text(title)
            company_clean = self._clean_text(company)
            location_clean = self._clean_text(location_text)
            duration_clean = self._clean_text(duration)
            stipend_clean = self._clean_text(stipend)

            if not title_clean or title_clean == "N/A":
                return None

            # Clean and validate link
            if link and not link.startswith('http'):
                link = f"https://internshala.com{link}"
            link = self._validate_url(link)

            # Extract skills/tags
            skills = []
            skill_elements = await card.query_selector_all('.round_tabs a, .skill-tag, .tags a')
            for skill_elem in skill_elements[:5]:  # Limit to 5 skills
                skill_text = await skill_elem.inner_text()
                if skill_text and skill_text.strip():
                    skill_clean = self._clean_text(skill_text)
                    if skill_clean != "N/A":
                        skills.append(skill_clean)

            return {
                'id': self.generate_unique_id({'title': title_clean, 'company': company_clean, 'source': 'Internshala'}),
                'title': title_clean,
                'company': company_clean,
                'location': location_clean,
                'domain': self._extract_domain_from_title(title_clean),
                'duration': duration_clean,
                'stipend': stipend_clean,
                'requirements': skills,
                'preferred_skills': skills[:3],
                'description': f"Internship at {company_clean}. Duration: {duration_clean}. Stipend: {stipend_clean}",
                'responsibilities': [],
                'qualifications': skills,
                'experience_level': "entry-level",
                'tags': ["internshala", "verified", "student-friendly"],
                'link': link,
                'source': 'Internshala',
                'scraped_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'application_deadline': (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
            }
        except Exception as e:
            logger.error(f"Error extracting Internshala data: {str(e)}")
            return None

    async def _extract_letsintern_data(self, card):
        """Extract internship data from LetsIntern card with improved cleaning"""
        try:
            # Use multiple selectors for LetsIntern
            title = await self._get_inner_text(card, '.internship-title')
            if not title:
                title = await self._get_inner_text(card, '.job-title')
            if not title:
                title = await self._get_inner_text(card, 'h3')
                
            company = await self._get_inner_text(card, '.company-name')
            if not company:
                company = await self._get_inner_text(card, '.company')
                
            location_text = await self._get_inner_text(card, '.location')
            duration = await self._get_inner_text(card, '.duration')
            stipend = await self._get_inner_text(card, '.stipend')
            
            # Get link with multiple selectors
            link = await self._get_attribute(card, 'a', 'href')
            if not link:
                link = await self._get_attribute(card, '.internship-title', 'href')

            # Clean all text fields
            title_clean = self._clean_text(title)
            company_clean = self._clean_text(company)
            location_clean = self._clean_text(location_text)
            duration_clean = self._clean_text(duration)
            stipend_clean = self._clean_text(stipend)

            if not title_clean or title_clean == "N/A":
                return None

            # Clean and validate link
            if link and not link.startswith('http'):
                link = f"https://www.letsintern.com{link}"
            link = self._validate_url(link)

            # Extract description/requirements
            description = await self._get_inner_text(card, '.description')
            if not description:
                description = await self._get_inner_text(card, '.job-description')
            description_clean = self._clean_text(description)
            
            # Extract skills from description
            skills = self._extract_skills_from_text(description_clean)

            return {
                'id': self.generate_unique_id({'title': title_clean, 'company': company_clean, 'source': 'LetsIntern'}),
                'title': title_clean,
                'company': company_clean,
                'location': location_clean,
                'domain': self._extract_domain_from_title(title_clean),
                'duration': duration_clean,
                'stipend': stipend_clean,
                'requirements': skills,
                'preferred_skills': skills[:3],
                'description': self._truncate_text(description_clean, 200),
                'responsibilities': [],
                'qualifications': [description_clean] if description_clean and description_clean != "N/A" else [],
                'experience_level': "entry-level",
                'tags': ["letsintern", "remote-friendly", "flexible"],
                'link': link,
                'source': 'LetsIntern',
                'scraped_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'application_deadline': (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
            }
        except Exception as e:
            logger.error(f"Error extracting LetsIntern data: {str(e)}")
            return None

    def _extract_domain_from_title(self, title: str) -> str:
        """Extract domain from job title with improved cleaning"""
        if not title:
            return "General"
        
        title_clean = self._clean_text(title).lower()
        
        # Domain mapping with cleaned patterns
        domain_patterns = {
            'Software Engineering': ['software', 'engineer', 'developer', 'programming', 'coding'],
            'Data Science': ['data', 'analyst', 'analytics', 'science', 'scientist', 'ml', 'machine learning'],
            'Web Development': ['web', 'frontend', 'backend', 'fullstack', 'react', 'angular', 'vue'],
            'Mobile Development': ['mobile', 'ios', 'android', 'react native', 'flutter', 'app'],
            'UI/UX Design': ['ui', 'ux', 'design', 'designer', 'user interface', 'user experience'],
            'DevOps': ['devops', 'cloud', 'aws', 'azure', 'docker', 'kubernetes', 'infrastructure'],
            'Cybersecurity': ['security', 'cyber', 'penetration', 'ethical hacking'],
            'Product Management': ['product', 'manager', 'pm', 'strategy'],
            'Marketing': ['marketing', 'digital marketing', 'seo', 'social media'],
            'Sales': ['sales', 'business development', 'account'],
            'Content Writing': ['content', 'writer', 'copywriter', 'editor'],
            'Business Analytics': ['business', 'analytics', 'consultant', 'analysis']
        }
        
        for domain, keywords in domain_patterns.items():
            for keyword in keywords:
                if keyword in title_clean:
                    return domain
        
        return "General"

    def _extract_skills_from_text(self, text: str) -> List[str]:
        """Extract skills from job description text with improved cleaning"""
        if not text or self._clean_text(text) == "N/A":
            return []
        
        text_clean = self._clean_text(text).lower()
        
        # Enhanced skills list with more comprehensive coverage
        
        
        
        
        # Return top 6 skills to avoid overwhelming

    def _clean_text(self, text):
        """Helper method to clean text and remove invalid characters using Gemini AI"""
        if GEMINI_AVAILABLE and gemini_service.available:
            try:
                return gemini_service.clean_text(text)
            except Exception as e:
                logger.warning(f"Gemini text cleaning failed, using fallback: {e}")
                return self._enhanced_clean_text(text)
        else:
            return self._enhanced_clean_text(text)

    def _truncate_text(self, text, length):
        """Helper method to truncate text properly"""
        clean_text = self._clean_text(text)
        if clean_text == "N/A":
            return clean_text
        return f"{clean_text[:length]}..." if len(clean_text) > length else clean_text
    
    def _validate_url(self, url):
        """Validate and clean URL"""
        return self._improved_validate_url(url)

    def validate_internship_data(self, internship: Dict) -> bool:
        """Comprehensive validation of internship data quality"""
        if not internship:
            return False
        
        # Check required fields
        required_fields = ['title', 'company', 'source']
        for field in required_fields:
            value = internship.get(field)
            if not value or self._clean_text(value) in ["N/A", "", "None", "null"]:
                logger.warning(f"Invalid internship: missing {field}")
                return False
        
        # Validate title quality
        title = self._clean_text(internship.get('title', ''))
        if len(title) < 3 or title.count('*') > 0:
            logger.warning(f"Invalid title: {title}")
            return False
        
        # Validate company name
        company = self._clean_text(internship.get('company', ''))
        if len(company) < 2 or company.count('*') > 0:
            logger.warning(f"Invalid company: {company}")
            return False
        
        # Validate URL if present
        link = internship.get('link')
        if link and not self._validate_url(link):
            logger.warning(f"Invalid URL: {link}")
            # Don't reject the internship for invalid URL, just clear it
            internship['link'] = None
        
        # Clean all text fields to ensure no asterisks
        text_fields = ['title', 'company', 'location', 'domain', 'duration', 'stipend', 'description']
        for field in text_fields:
            if field in internship:
                cleaned = self._clean_text(internship[field])
                internship[field] = cleaned
        
        # Clean arrays
        array_fields = ['requirements', 'preferred_skills', 'responsibilities', 'qualifications', 'tags']
        for field in array_fields:
            if field in internship and isinstance(internship[field], list):
                cleaned_array = []
                for item in internship[field]:
                    cleaned_item = self._clean_text(str(item))
                    if cleaned_item != "N/A" and len(cleaned_item) > 0:
                        cleaned_array.append(cleaned_item)
                internship[field] = cleaned_array[:6]  # Limit to 6 items
        
        return True

    def filter_and_validate_internships(self, internships: List[Dict]) -> List[Dict]:
        """Filter and validate a list of internships"""
        valid_internships = []
        
        for internship in internships:
            if self.validate_internship_data(internship):
                # Additional checks for relevance
                if self._is_internship_relevant(internship):
                    valid_internships.append(internship)
                else:
                    logger.info(f"Filtered out non-relevant job: {internship.get('title', 'Unknown')}")
            else:
                logger.warning(f"Filtered out invalid internship: {internship.get('title', 'Unknown')}")
        
        return valid_internships

    def _enhanced_clean_text(self, text):
        """Enhanced text cleaning with better asterisk and unwanted character removal"""
        if not text:
            return "N/A"
        
        # Convert to string if not already
        text = str(text).strip()
        
        # Remove all types of asterisks and related characters
        asterisk_chars = ['*', '**', '***', '****', '•', '▪', '▫', '◦', '‣', '⁃']
        for char in asterisk_chars:
            text = text.replace(char, '')
        
        # Remove excessive whitespace and special characters
        text = ' '.join(text.split())
        
        # Remove HTML tags if any slipped through
        import re
        text = re.sub(r'<[^>]+>', '', text)
        
        # Remove common unwanted patterns
        unwanted_patterns = [
            r'\s+[-–—]\s*$',  # Trailing dashes
            r'^\s*[-–—]\s+',  # Leading dashes
            r'\s*\|\s*$',     # Trailing pipes
            r'^\s*\|\s*',     # Leading pipes
            r'\s*…\s*',       # Ellipsis
        ]
        
        for pattern in unwanted_patterns:
            text = re.sub(pattern, '', text)
        
        # Clean up common problematic phrases
        problematic_phrases = [
            'Apply now*', 'Click here*', 'Visit website*',
            '*Required', '*Mandatory', '*Optional'
        ]
        
        for phrase in problematic_phrases:
            text = text.replace(phrase, phrase.replace('*', ''))
        
        # Final cleanup
        text = ' '.join(text.split())
        
        return text if text and len(text.strip()) > 0 else "N/A"

    def _improved_validate_url(self, url):
        """Improved URL validation with better cleaning"""
        if not url:
            return None
        
        # Convert to string and clean
        url = str(url).strip()
        
        # Remove asterisks and other unwanted characters
        url = url.replace('*', '').replace('**', '').replace('***', '')
        url = url.strip()
        
        # Check if URL is valid
        if not url or url.lower() in ['n/a', 'none', 'null', '', 'undefined']:
            return None
        
        # Add protocol if missing but looks like a URL
        if url.startswith('www.') or url.startswith('//'):
            url = 'https://' + url.lstrip('/')
        
        # Basic URL validation
        import re
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
            r'localhost|'  # localhost...
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        
        if url_pattern.match(url):
            return url
        
        return None

# Initialize scraper
scraper = InternshipScraper()

# Background task manager
class BackgroundTaskManager:
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=2)
        self.running_tasks = {}

    def run_scraping_task(self, task_id: str, sources: List[str], keyword: str, location: str, max_pages: int):
        """Run scraping task in background"""
        future = self.executor.submit(self._async_scraping_wrapper, sources, keyword, location, max_pages)
        self.running_tasks[task_id] = {'future': future, 'status': 'running'}
        return task_id

    def _async_scraping_wrapper(self, sources: List[str], keyword: str, location: str, max_pages: int):
        """Wrapper to run async scraping in thread"""
        return asyncio.run(self._scrape_all_sources(sources, keyword, location, max_pages))

    async def _scrape_all_sources(self, sources: List[str], keyword: str, location: str, max_pages: int):
        """Scrape from all specified sources"""
        all_internships = []
        
        if 'indeed' in sources:
            try:
                indeed_results = await scraper.scrape_indeed(keyword, location, max_pages)
                all_internships.extend(indeed_results)
                logger.info(f"Indeed scraped: {len(indeed_results)} jobs")
            except Exception as e:
                logger.error(f"Indeed scraping failed: {e}")

        if 'linkedin' in sources:
            try:
                linkedin_results = await scraper.scrape_linkedin(keyword, location, max_pages)
                all_internships.extend(linkedin_results)
                logger.info(f"LinkedIn scraped: {len(linkedin_results)} jobs")
            except Exception as e:
                logger.error(f"LinkedIn scraping failed: {e}")

        if 'naukri' in sources:
            try:
                naukri_results = await scraper.scrape_naukri(keyword, location, max_pages)
                all_internships.extend(naukri_results)
                logger.info(f"Naukri scraped: {len(naukri_results)} jobs")
            except Exception as e:
                logger.error(f"Naukri scraping failed: {e}")

        if 'internshala' in sources:
            try:
                internshala_results = await scraper.scrape_internshala(keyword, location, max_pages)
                all_internships.extend(internshala_results)
                logger.info(f"Internshala scraped: {len(internshala_results)} jobs")
            except Exception as e:
                logger.error(f"Internshala scraping failed: {e}")

        if 'letsintern' in sources:
            try:
                letsintern_results = await scraper.scrape_letsintern(keyword, location, max_pages)
                all_internships.extend(letsintern_results)
                logger.info(f"LetsIntern scraped: {len(letsintern_results)} jobs")
            except Exception as e:
                logger.error(f"LetsIntern scraping failed: {e}")

        # Save scraped internships
        saved_count = scraper.save_internships(all_internships)
        
        return {
            'success': True,
            'internships_scraped': len(all_internships),
            'internships_saved': saved_count,
            'sources': sources
        }

    def get_task_status(self, task_id: str):
        """Get status of a background task"""
        if task_id not in self.running_tasks:
            return {'status': 'not_found'}
        
        task = self.running_tasks[task_id]
        future = task['future']
        
        if future.done():
            try:
                result = future.result()
                task['status'] = 'completed'
                task['result'] = result
                return {'status': 'completed', 'result': result}
            except Exception as e:
                task['status'] = 'failed'
                task['error'] = str(e)
                return {'status': 'failed', 'error': str(e)}
        else:
            return {'status': 'running'}

# Initialize background task manager
task_manager = BackgroundTaskManager()

# Django Views
@api_view(['POST'])
@permission_classes([AllowAny])
def scrape_internships(request):
    """API endpoint to scrape internships"""
    try:
        data = request.data
        keyword = data.get('keyword', 'internship')
        location = data.get('location', 'India')
        sources = data.get('sources', ['indeed', 'linkedin', 'naukri', 'internshala', 'letsintern'])
        max_pages = min(int(data.get('max_pages', 2)), 5)  # Limit to 5 pages max
        background = data.get('background', False)

        if background:
            # Run in background
            task_id = f"scrape_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{random.randint(1000, 9999)}"
            task_manager.run_scraping_task(task_id, sources, keyword, location, max_pages)
            
            return Response({
                'success': True,
                'message': 'Scraping started in background',
                'task_id': task_id
            })
        else:
            # Run synchronously
            async def scrape_sync():
                all_internships = []

                if 'indeed' in sources:
                    try:
                        indeed_results = await scraper.scrape_indeed(keyword, location, max_pages)
                        all_internships.extend(indeed_results)
                        logger.info(f"Indeed scraped: {len(indeed_results)} jobs")
                    except Exception as e:
                        logger.error(f"Indeed scraping failed: {e}")

                if 'linkedin' in sources:
                    try:
                        linkedin_results = await scraper.scrape_linkedin(keyword, location, max_pages)
                        all_internships.extend(linkedin_results)
                        logger.info(f"LinkedIn scraped: {len(linkedin_results)} jobs")
                    except Exception as e:
                        logger.error(f"LinkedIn scraping failed: {e}")

                if 'naukri' in sources:
                    try:
                        naukri_results = await scraper.scrape_naukri(keyword, location, max_pages)
                        all_internships.extend(naukri_results)
                        logger.info(f"Naukri scraped: {len(naukri_results)} jobs")
                    except Exception as e:
                        logger.error(f"Naukri scraping failed: {e}")

                if 'internshala' in sources:
                    try:
                        internshala_results = await scraper.scrape_internshala(keyword, location, max_pages)
                        all_internships.extend(internshala_results)
                        logger.info(f"Internshala scraped: {len(internshala_results)} jobs")
                    except Exception as e:
                        logger.error(f"Internshala scraping failed: {e}")

                if 'letsintern' in sources:
                    try:
                        letsintern_results = await scraper.scrape_letsintern(keyword, location, max_pages)
                        all_internships.extend(letsintern_results)
                        logger.info(f"LetsIntern scraped: {len(letsintern_results)} jobs")
                    except Exception as e:
                        logger.error(f"LetsIntern scraping failed: {e}")

                # Save scraped internships
                saved_count = scraper.save_internships(all_internships)

                return {
                    'success': True,
                    'internships_scraped': len(all_internships),
                    'internships_saved': saved_count,
                    'internships': all_internships
                }

            # Run async function in current thread
            result = asyncio.run(scrape_sync())
            return Response(result)

    except Exception as e:
        logger.error(f"Error in scrape_internships: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_scraping_task_status(request, task_id):
    """Get status of a scraping task"""
    try:
        task_status = task_manager.get_task_status(task_id)
        return Response(task_status)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def clean_expired_internships(request):
    """Remove expired internships from the database"""
    try:
        # Load existing data
        existing_data = scraper.load_existing_internships()
        existing_internships = existing_data.get("internships", [])
        
        # Filter out expired internships
        current_date = datetime.now()
        active_internships = []
        expired_count = 0
        
        for internship in existing_internships:
            deadline_str = internship.get('application_deadline')
            if deadline_str:
                try:
                    deadline = datetime.strptime(deadline_str, '%Y-%m-%d')
                    if deadline >= current_date:
                        active_internships.append(internship)
                    else:
                        expired_count += 1
                except ValueError:
                    # Keep internships with invalid date formats
                    active_internships.append(internship)
            else:
                # Keep internships without deadlines
                active_internships.append(internship)
        
        # Save cleaned data
        cleaned_data = {"internships": active_internships}
        with open(scraper.data_file_path, 'w', encoding='utf-8') as f:
            json.dump(cleaned_data, f, indent=2, ensure_ascii=False)
        
        return Response({
            'success': True,
            'message': f'Removed {expired_count} expired internships',
            'active_internships': len(active_internships),
            'removed_count': expired_count
        })
        
    except Exception as e:
        logger.error(f"Error cleaning expired internships: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_scraping_stats(request):
    """Get statistics about scraped internships"""
    try:
        data = scraper.load_existing_internships()
        internships = data.get("internships", [])
        
        # Calculate statistics
        total_internships = len(internships)
        sources = {}
        domains = {}
        experience_levels = {}
        recent_scrapes = 0
        
        current_date = datetime.now()
        for internship in internships:
            # Count by source
            source = internship.get('source', 'Unknown')
            sources[source] = sources.get(source, 0) + 1
            
            # Count by domain
            domain = internship.get('domain', 'Unknown')
            domains[domain] = domains.get(domain, 0) + 1
            
            # Count by experience level
            exp_level = internship.get('experience_level', 'Unknown')
            experience_levels[exp_level] = experience_levels.get(exp_level, 0) + 1
            
            # Count recent scrapes (last 24 hours)
            scraped_at = internship.get('scraped_at')
            if scraped_at:
                try:
                    scraped_date = datetime.strptime(scraped_at, '%Y-%m-%d %H:%M:%S')
                    if (current_date - scraped_date).days < 1:
                        recent_scrapes += 1
                except ValueError:
                    pass
        
        return Response({
            'success': True,
            'statistics': {
                'total_internships': total_internships,
                'recent_scrapes_24h': recent_scrapes,
                'sources': sources,
                'domains': domains,
                'experience_levels': experience_levels
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting scraping stats: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint"""
    return Response({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'scraper_ready': True
    })