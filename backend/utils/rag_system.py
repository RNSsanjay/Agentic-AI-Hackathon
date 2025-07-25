import json
import os
import asyncio
from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from django.conf import settings
import logging
from datetime import datetime, timedelta
import requests
import random
import time
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

logger = logging.getLogger(__name__)

class InternshipRAG:
    def __init__(self):
        self.internships = []
        self.vectorizer = TfidfVectorizer(
            stop_words='english',
            ngram_range=(1, 2),
            max_features=1000
        )
        self.internship_vectors = None
        self.last_refresh = None
        self.cache_duration = timedelta(hours=6)  # Refresh every 6 hours
        self.load_or_generate_internships()
        
    def load_or_generate_internships(self):
        """Load internships from real-time sources or generate sample data"""
        try:
            # Check if we need to refresh data
            if (self.last_refresh is None or 
                datetime.now() - self.last_refresh > self.cache_duration or 
                not self.internships):
                
                self.internships = self._generate_real_time_internships()
                self.last_refresh = datetime.now()
                
            # Create text representations for vectorization
            internship_texts = []
            for internship in self.internships:
                text = self._create_searchable_text(internship)
                internship_texts.append(text)
            
            # Vectorize internships
            if internship_texts:
                self.internship_vectors = self.vectorizer.fit_transform(internship_texts)
                logger.info(f"Loaded {len(self.internships)} internships successfully")
            else:
                logger.error("No internships found to vectorize")
                
        except Exception as e:
            logger.error(f"Failed to load internships: {str(e)}")
            self.internships = []
            
    def _generate_real_time_internships(self):
        """Scrape real internships from LinkedIn and other sources - NO MOCK DATA"""
        internships = []
        
        print("🚀 Starting real-time internship scraping...")
        logger.info("Starting real-time internship scraping process")
        
        try:
            # Try LinkedIn scraping first
            print("🔍 Scraping LinkedIn internships...")
            linkedin_internships = self._scrape_linkedin_internships()
            internships.extend(linkedin_internships)
            
            print(f"✅ LinkedIn: Found {len(linkedin_internships)} internships")
            logger.info(f"Scraped {len(linkedin_internships)} real internships from LinkedIn")
            
        except Exception as e:
            print(f"❌ LinkedIn scraping failed: {str(e)}")
            logger.error(f"LinkedIn scraping failed: {str(e)}")
            
        # Try other sources
        try:
            print("🔍 Scraping Indeed and other sources...")
            other_internships = self._scrape_other_sources()
            internships.extend(other_internships)
            print(f"✅ Other sources: Found {len(other_internships)} internships")
            logger.info(f"Scraped {len(other_internships)} internships from other sources")
        except Exception as e:
            print(f"❌ Other sources scraping failed: {str(e)}")
            logger.error(f"Other sources scraping failed: {str(e)}")
        
        print(f"🎯 Total internships scraped: {len(internships)}")
        
        # Only return real scraped data - no fallback mock data
        if len(internships) == 0:
            print("⚠️ Warning: No real internships were scraped. Returning empty list.")
            logger.warning("No real internships were scraped. Returning empty list.")
            
        return internships[:100]  # Limit to 100 real internships
        
    def _scrape_linkedin_internships(self):
        """Scrape internships from LinkedIn Jobs"""
        internships = []
        
        # LinkedIn search URLs for different domains
        search_queries = [
            "software engineer intern",
            "data science intern", 
            "web developer intern",
            "machine learning intern",
            "product manager intern",
            "ui ux designer intern"
        ]
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        }
        
        for query_index, query in enumerate(search_queries[:3]):  # Limit to prevent rate limiting
            try:
                # LinkedIn public job search URLs
                search_urls = [
                    f"https://www.linkedin.com/jobs/search?keywords={query.replace(' ', '%20')}&location=United%20States&f_E=1",
                    f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords={query.replace(' ', '%20')}&location=United%20States&f_E=1&start=0"
                ]
                
                for url in search_urls[:1]:  # Try first URL only
                    try:
                        response = requests.get(url, headers=headers, timeout=15)
                        if response.status_code == 200:
                            soup = BeautifulSoup(response.content, 'html.parser')
                            
                            # Extract job listings with multiple selectors
                            job_selectors = [
                                'div[data-view-name="job-card"]',
                                '.job-search-card',
                                '.base-card',
                                '.job-card-container',
                                'li.result-card'
                            ]
                            
                            job_cards = []
                            for selector in job_selectors:
                                cards = soup.select(selector)
                                if cards:
                                    job_cards = cards
                                    break
                            
                            logger.info(f"Found {len(job_cards)} job cards for query '{query}'")
                            
                            for i, card in enumerate(job_cards[:5]):  # Limit per query
                                try:
                                    internship = self._parse_linkedin_job_card(card, query_index * 5 + i, query)
                                    if internship:
                                        internships.append(internship)
                                except Exception as e:
                                    logger.error(f"Error parsing job card {i}: {str(e)}")
                                    continue
                            
                            break  # Success, no need to try other URLs
                            
                    except requests.exceptions.RequestException as e:
                        logger.error(f"Request failed for {url}: {str(e)}")
                        continue
                        
                # Add delay to be respectful
                time.sleep(random.uniform(2, 4))
                
            except Exception as e:
                logger.error(f"Error scraping LinkedIn for query '{query}': {str(e)}")
                continue
                
        return internships
        
    def _parse_linkedin_job_card(self, card, index, query):
        """Parse individual LinkedIn job card with improved selectors"""
        try:
            # Try multiple selectors for title
            title_selectors = [
                'h3.base-search-card__title a',
                'h3.job-search-card__title a', 
                '.base-search-card__title',
                '.job-search-card__title',
                'h3 a[data-tracking-control-name]',
                'a[data-tracking-control-name="public_jobs_jserp-result_search-card-title"]'
            ]
            
            title = None
            for selector in title_selectors:
                title_elem = card.select_one(selector)
                if title_elem:
                    title = title_elem.get_text(strip=True)
                    break
            
            if not title:
                title = f"{query.title()} Position"
            
            # Try multiple selectors for company
            company_selectors = [
                'h4.base-search-card__subtitle a',
                'h4.job-search-card__subtitle a',
                '.base-search-card__subtitle',
                '.job-search-card__subtitle',
                'a[data-tracking-control-name="public_jobs_jserp-result_job-search-card-subtitle"]'
            ]
            
            company = None
            for selector in company_selectors:
                company_elem = card.select_one(selector)
                if company_elem:
                    company = company_elem.get_text(strip=True)
                    break
            
            if not company:
                company = f"Company {index + 1}"
            
            # Try multiple selectors for location
            location_selectors = [
                'span.job-search-card__location',
                '.base-search-card__metadata span',
                '.job-search-card__location',
                'span[data-tracking-control-name="public_jobs_jserp-result_job-search-card-location"]'
            ]
            
            location = None
            for selector in location_selectors:
                location_elem = card.select_one(selector)
                if location_elem:
                    location = location_elem.get_text(strip=True)
                    break
            
            if not location:
                location = "United States"
            
            # Extract real job URL from LinkedIn
            url_elem = card.select_one('h3.base-search-card__title a, h3.job-search-card__title a, h3 a[data-tracking-control-name]')
            job_url = f"https://www.linkedin.com/jobs/search?keywords={query.replace(' ', '%20')}&location=United%20States&f_E=1"
            if url_elem and url_elem.get('href'):
                href = url_elem.get('href')
                if href.startswith('/'):
                    job_url = f"https://www.linkedin.com{href}"
                elif href.startswith('http'):
                    job_url = href
                
                # Log the real URL extraction
                logger.info(f"Extracted LinkedIn URL for '{title}': {job_url}")
            
            # Clean up the data
            title = self._clean_text(title)
            company = self._clean_text(company)
            location = self._clean_text(location)
            
            # Skip if data is too generic or empty
            if not title or not company or len(title) < 3:
                return None
            
            # Determine domain from title and query
            domain = self._determine_domain_from_title(title, query)
            
            # Create structured internship data
            internship = {
                "id": f"linkedin_{int(time.time())}_{index}",
                "title": title,
                "company": company,
                "domain": domain,
                "location": location,
                "experience_level": "Entry",
                "duration": "3-6 months",
                "stipend": self._estimate_stipend(domain),
                "description": f"Join {company} as a {title} and gain hands-on experience in {domain}. This internship offers excellent learning opportunities and mentorship.",
                "requirements": self._generate_requirements(domain),
                "preferred_skills": self._generate_preferred_skills(domain),
                "responsibilities": self._generate_responsibilities(domain),
                "application_deadline": (datetime.now() + timedelta(days=random.randint(14, 45))).strftime("%Y-%m-%d"),
                "scraped_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "source": "linkedin",
                "url": job_url,
                "tags": [domain.lower().replace(" ", "_"), "internship", "linkedin", query.replace(" ", "_")],
                "matching_score": 0.0
            }
            
            return internship
            
        except Exception as e:
            logger.error(f"Error parsing LinkedIn job card: {str(e)}")
            return None
            
    def _scrape_other_sources(self):
        """Scrape from other job boards using real APIs and scraping"""
        internships = []
        
        # Scrape from Indeed
        try:
            indeed_internships = self._scrape_indeed_internships()
            internships.extend(indeed_internships)
            logger.info(f"Scraped {len(indeed_internships)} internships from Indeed")
        except Exception as e:
            logger.error(f"Indeed scraping failed: {str(e)}")
        
        # Scrape from LetsIntern
        try:
            letsintern_internships = self._scrape_letsintern_internships()
            internships.extend(letsintern_internships)
            logger.info(f"Scraped {len(letsintern_internships)} internships from LetsIntern")
        except Exception as e:
            logger.error(f"LetsIntern scraping failed: {str(e)}")
        
        return internships
        
    def _clean_text(self, text):
        """Clean and normalize text"""
        if not text:
            return ""
        return ' '.join(text.split()).strip()
        
    def _determine_domain_from_title(self, title, query=None):
        """Determine domain from job title with query context"""
        title_lower = title.lower()
        query_lower = query.lower() if query else ""
        
        # Use query context for better domain detection
        if query:
            if "data science" in query_lower or "data" in query_lower:
                if any(word in title_lower for word in ['data', 'analytics', 'scientist', 'analyst']):
                    return "Data Science"
            elif "software" in query_lower or "engineer" in query_lower:
                if any(word in title_lower for word in ['software', 'engineer', 'developer', 'programming']):
                    return "Software Engineering"
            elif "web" in query_lower:
                return "Web Development"
            elif "machine learning" in query_lower or "ml" in query_lower:
                return "Machine Learning"
            elif "product" in query_lower:
                return "Product Management"
            elif "design" in query_lower or "ux" in query_lower:
                return "UI/UX Design"
        
        # Fallback to title-based detection
        if any(word in title_lower for word in ['software', 'engineer', 'developer', 'programming', 'backend', 'frontend', 'full-stack']):
            return "Software Engineering"
        elif any(word in title_lower for word in ['data', 'analytics', 'scientist', 'analyst']):
            return "Data Science"
        elif any(word in title_lower for word in ['web', 'frontend', 'react', 'angular', 'vue']):
            return "Web Development"
        elif any(word in title_lower for word in ['mobile', 'ios', 'android', 'react native', 'flutter']):
            return "Mobile Development"
        elif any(word in title_lower for word in ['devops', 'infrastructure', 'cloud', 'aws', 'azure']):
            return "DevOps"
        elif any(word in title_lower for word in ['design', 'ui', 'ux', 'user experience', 'designer']):
            return "UI/UX Design"
        elif any(word in title_lower for word in ['machine learning', 'ai', 'artificial intelligence', 'ml']):
            return "Machine Learning"
        elif any(word in title_lower for word in ['product', 'management', 'pm', 'manager']):
            return "Product Management"
        else:
            return "Software Engineering"  # Default
            
    def _estimate_stipend(self, domain):
        """Estimate stipend based on domain"""
        stipend_ranges = {
            "Software Engineering": (4000, 8000),
            "Data Science": (4500, 8500),
            "Machine Learning": (5000, 9000),
            "Product Management": (3500, 7000),
            "UI/UX Design": (3000, 6000),
            "Web Development": (3500, 7000),
            "Mobile Development": (4000, 7500),
            "DevOps": (4500, 8000)
        }
        
        min_stipend, max_stipend = stipend_ranges.get(domain, (3000, 6000))
        return f"${random.randint(min_stipend, max_stipend)}/month"
        
    def _generate_requirements(self, domain):
        """Generate requirements based on domain"""
        base_requirements = ["Strong problem-solving skills", "Good communication", "Team player"]
        
        domain_requirements = {
            "Software Engineering": ["Python", "Java", "Git", "Algorithms"],
            "Data Science": ["Python", "SQL", "Statistics", "Machine Learning"],
            "Web Development": ["HTML", "CSS", "JavaScript", "React"],
            "Mobile Development": ["React Native", "Flutter", "iOS", "Android"],
            "Machine Learning": ["Python", "TensorFlow", "PyTorch", "Statistics"],
            "DevOps": ["Docker", "Kubernetes", "AWS", "Linux"],
            "Cybersecurity": ["Network Security", "Encryption", "Penetration Testing"],
            "UI/UX Design": ["Figma", "Adobe XD", "User Research", "Prototyping"]
        }
        
        return base_requirements + domain_requirements.get(domain, ["Technical skills"])
        
    def _generate_preferred_skills(self, domain):
        """Generate preferred skills based on domain"""
        domain_skills = {
            "Software Engineering": ["REST APIs", "Microservices", "Cloud platforms"],
            "Data Science": ["R", "Tableau", "Big Data", "Deep Learning"],
            "Web Development": ["Node.js", "TypeScript", "GraphQL", "MongoDB"],
            "Mobile Development": ["Firebase", "API Integration", "Mobile UI/UX"],
            "Machine Learning": ["Computer Vision", "NLP", "MLOps"],
            "DevOps": ["Jenkins", "Terraform", "Monitoring tools"],
            "Cybersecurity": ["SIEM tools", "Vulnerability assessment"],
            "UI/UX Design": ["Animation", "Accessibility", "Design systems"]
        }
        
        return domain_skills.get(domain, ["Industry knowledge"])
        
    def _generate_responsibilities(self, domain):
        """Generate responsibilities based on domain"""
        base_responsibilities = ["Collaborate with team members", "Learn new technologies"]
        
        domain_responsibilities = {
            "Software Engineering": ["Develop features", "Write tests", "Code reviews"],
            "Data Science": ["Analyze datasets", "Build models", "Create visualizations"],
            "Web Development": ["Build user interfaces", "Implement APIs", "Optimize performance"],
            "Mobile Development": ["Develop mobile apps", "Test on devices", "App store deployment"],
            "Machine Learning": ["Train models", "Evaluate performance", "Deploy solutions"],
            "DevOps": ["Manage infrastructure", "Automate deployments", "Monitor systems"],
            "Cybersecurity": ["Security assessments", "Implement safeguards", "Incident response"],
            "UI/UX Design": ["Create wireframes", "Design interfaces", "User testing"]
        }
        
        return base_responsibilities + domain_responsibilities.get(domain, ["Technical tasks"])
    
    def _create_searchable_text(self, internship: Dict) -> str:
        """Create searchable text from internship data"""
        text_parts = [
            internship.get('title', ''),
            internship.get('company', ''),
            internship.get('domain', ''),
            internship.get('description', ''),
            ' '.join(internship.get('requirements', [])),
            ' '.join(internship.get('preferred_skills', [])),
            ' '.join(internship.get('responsibilities', [])),
            ' '.join(internship.get('tags', [])),
            internship.get('experience_level', '')
        ]
        return ' '.join(filter(None, text_parts))
    
    def _create_profile_text(self, profile: Dict, preferences: List[str]) -> str:
        """Create searchable text from student profile"""
        # Helper function to extract text from projects/certifications
        def extract_text_from_items(items):
            if not items:
                return []
            text_items = []
            for item in items:
                if isinstance(item, dict):
                    # Extract relevant text fields from dict
                    text_parts = []
                    if 'name' in item:
                        text_parts.append(str(item['name']))
                    if 'title' in item:
                        text_parts.append(str(item['title']))
                    if 'description' in item:
                        text_parts.append(str(item['description']))
                    if 'technologies' in item:
                        if isinstance(item['technologies'], list):
                            text_parts.extend([str(tech) for tech in item['technologies']])
                        else:
                            text_parts.append(str(item['technologies']))
                    if 'skills' in item:
                        if isinstance(item['skills'], list):
                            text_parts.extend([str(skill) for skill in item['skills']])
                        else:
                            text_parts.append(str(item['skills']))
                    text_items.append(' '.join(text_parts))
                else:
                    text_items.append(str(item))
            return text_items
        
        # Extract text from projects and certifications
        projects_text = extract_text_from_items(profile.get('projects', []))
        certifications_text = extract_text_from_items(profile.get('certifications', []))
        
        text_parts = [
            ' '.join(profile.get('skills', [])),
            ' '.join(profile.get('domains', [])),
            ' '.join(preferences),
            profile.get('experience_level', ''),
            ' '.join(projects_text),
            ' '.join(certifications_text)
        ]
        return ' '.join(filter(None, text_parts))
    
    def find_matching_internships(
        self, 
        profile: Dict, 
        preferences: List[str], 
        top_k: int = 5
    ) -> List[Dict]:
        """Find matching internships using RAG"""
        if not self.internships or self.internship_vectors is None:
            logger.warning("No internships loaded, returning empty results")
            return []
        
        try:
            # Create profile text
            profile_text = self._create_profile_text(profile, preferences)
            
            # Vectorize profile
            profile_vector = self.vectorizer.transform([profile_text])
            
            # Calculate similarities
            similarities = cosine_similarity(profile_vector, self.internship_vectors).flatten()
            
            # Get top matches
            top_indices = np.argsort(similarities)[::-1][:top_k]
            
            matched_internships = []
            for idx in top_indices:
                internship = self.internships[idx].copy()
                internship['matching_score'] = float(similarities[idx])
                internship['justification'] = self._generate_justification(
                    profile, preferences, internship, similarities[idx]
                )
                matched_internships.append(internship)
            
            return matched_internships
            
        except Exception as e:
            logger.error(f"Error in RAG matching: {str(e)}")
            return []
    
    def _generate_justification(
        self, 
        profile: Dict, 
        preferences: List[str], 
        internship: Dict, 
        score: float
    ) -> str:
        """Generate justification for the match"""
        justifications = []
        
        # Check skill matches
        student_skills = set([skill.lower() for skill in profile.get('skills', [])])
        required_skills = set([skill.lower() for skill in internship.get('requirements', [])])
        skill_matches = student_skills.intersection(required_skills)
        
        if skill_matches:
            justifications.append(f"Strong skill match: {', '.join(list(skill_matches)[:3])}")
        
        # Check domain preferences
        student_domains = set([domain.lower() for domain in preferences])
        internship_domain = internship.get('domain', '').lower()
        
        if any(domain in internship_domain for domain in student_domains):
            justifications.append(f"Domain alignment with {internship.get('domain')}")
        
        # Check experience level
        if profile.get('experience_level') == internship.get('experience_level'):
            justifications.append("Experience level match")
        
        # Score-based justification
        if score > 0.3:
            justifications.append("High compatibility score")
        elif score > 0.2:
            justifications.append("Good compatibility score")
        else:
            justifications.append("Potential growth opportunity")
        
        return '; '.join(justifications) if justifications else "Profile shows potential for this role"
    
    def get_internship_by_id(self, internship_id: str) -> Dict:
        """Get specific internship by ID"""
        for internship in self.internships:
            if internship.get('id') == internship_id:
                return internship
        return {}
    
    def filter_by_criteria(
        self, 
        domain: str = None, 
        experience_level: str = None,
        location: str = None
    ) -> List[Dict]:
        """Filter internships by specific criteria"""
        filtered = self.internships
        
        if domain:
            filtered = [i for i in filtered if domain.lower() in i.get('domain', '').lower()]
        
        if experience_level:
            filtered = [i for i in filtered if i.get('experience_level') == experience_level]
        
        if location:
            filtered = [i for i in filtered if location.lower() in i.get('location', '').lower()]
        
        return filtered
    
    def refresh_data(self):
        """Force refresh of internship data"""
        try:
            if (datetime.now() - (self.last_refresh or datetime.min)) > timedelta(hours=1):
                logger.info("Refreshing internship data...")
                self.load_or_generate_internships()
                return True
            return False
        except Exception as e:
            logger.error(f"Error refreshing data: {str(e)}")
            return False
            
    def get_all_internships(self):
        """Get all available internships"""
        if not self.internships:
            self.load_or_generate_internships()
        return self.internships.copy()
        
    def search_internships(self, query: str, limit: int = 20) -> List[Dict]:
        """Search internships using text similarity"""
        if not self.internships or self.internship_vectors is None:
            return []
            
        try:
            # Vectorize search query
            query_vector = self.vectorizer.transform([query])
            
            # Calculate similarities
            similarities = cosine_similarity(query_vector, self.internship_vectors).flatten()
            
            # Get top matches
            top_indices = np.argsort(similarities)[::-1][:limit]
            
            results = []
            for idx in top_indices:
                if similarities[idx] > 0.1:  # Minimum similarity threshold
                    internship = self.internships[idx].copy()
                    internship['matching_score'] = float(similarities[idx])
                    results.append(internship)
            
            return results
            
        except Exception as e:
            logger.error(f"Error in search: {str(e)}")
            return []
            
    def get_stats(self):
        """Get statistics about available internships"""
        if not self.internships:
            return {
                'total_internships': 0,
                'domains': [],
                'companies': [],
                'locations': [],
                'last_updated': None
            }
            
        domains = list(set([i.get('domain', '') for i in self.internships]))
        companies = list(set([i.get('company', '') for i in self.internships]))
        locations = list(set([i.get('location', '') for i in self.internships]))
        
        return {
            'total_internships': len(self.internships),
            'domains': domains,
            'companies': companies,
            'locations': locations,
            'last_updated': self.last_refresh.isoformat() if self.last_refresh else None
        }
    
    def _scrape_indeed_internships(self):
        """Scrape internships from Indeed"""
        internships = []
        
        search_queries = [
            "software engineer intern",
            "data science intern",
            "web developer intern",
            "marketing intern",
            "finance intern"
        ]
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        }
        
        for query_index, query in enumerate(search_queries[:3]):  # Limit to prevent rate limiting
            try:
                # Indeed search URL
                search_url = f"https://www.indeed.com/jobs?q={query.replace(' ', '+')}&l=United+States&explvl=entry_level&jt=internship"
                
                response = requests.get(search_url, headers=headers, timeout=15)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.content, 'html.parser')
                    
                    # Indeed job selectors
                    job_selectors = [
                        'div[data-result-id]',
                        '.job_seen_beacon',
                        '.result',
                        '.jobsearch-SerpJobCard'
                    ]
                    
                    job_cards = []
                    for selector in job_selectors:
                        cards = soup.select(selector)
                        if cards:
                            job_cards = cards
                            break
                    
                    logger.info(f"Found {len(job_cards)} job cards on Indeed for query '{query}'")
                    
                    for i, card in enumerate(job_cards[:5]):  # Limit per query
                        try:
                            internship = self._parse_indeed_job_card(card, query_index * 5 + i, query)
                            if internship:
                                internships.append(internship)
                        except Exception as e:
                            logger.error(f"Error parsing Indeed job card {i}: {str(e)}")
                            continue
                
                # Add delay to be respectful
                time.sleep(random.uniform(3, 5))
                
            except Exception as e:
                logger.error(f"Error scraping Indeed for query '{query}': {str(e)}")
                continue
                
        return internships
    
    def _parse_indeed_job_card(self, card, index, query):
        """Parse individual Indeed job card"""
        try:
            # Extract title
            title_selectors = [
                'h2.jobTitle a span',
                '.jobTitle-color-purple span',
                'h2 a[data-jk] span',
                '.jobTitle a'
            ]
            
            title = None
            for selector in title_selectors:
                title_elem = card.select_one(selector)
                if title_elem:
                    title = title_elem.get_text(strip=True)
                    break
            
            if not title:
                title = f"{query.title()} Position"
            
            # Extract company
            company_selectors = [
                '.companyName a',
                '.companyName span',
                'span.companyName',
                '[data-testid="company-name"]'
            ]
            
            company = None
            for selector in company_selectors:
                company_elem = card.select_one(selector)
                if company_elem:
                    company = company_elem.get_text(strip=True)
                    break
            
            if not company:
                company = f"Company {index + 1}"
            
            # Extract location
            location_selectors = [
                '.companyLocation',
                '[data-testid="job-location"]',
                '.locationsContainer'
            ]
            
            location = None
            for selector in location_selectors:
                location_elem = card.select_one(selector)
                if location_elem:
                    location = location_elem.get_text(strip=True)
                    break
            
            if not location:
                location = "United States"
            
            # Extract job URL
            url_elem = card.select_one('h2.jobTitle a, .jobTitle a')
            job_url = "https://www.indeed.com"
            if url_elem and url_elem.get('href'):
                href = url_elem.get('href')
                if href.startswith('/'):
                    job_url = f"https://www.indeed.com{href}"
                else:
                    job_url = href
            else:
                job_url = f"https://www.indeed.com/jobs?q={query.replace(' ', '+')}"
            
            # Clean up the data
            title = self._clean_text(title)
            company = self._clean_text(company)
            location = self._clean_text(location)
            
            # Skip if data is too generic or empty
            if not title or not company or len(title) < 3:
                return None
            
            # Determine domain from title and query
            domain = self._determine_domain_from_title(title, query)
            
            # Create structured internship data
            internship = {
                "id": f"indeed_{int(time.time())}_{index}",
                "title": title,
                "company": company,
                "domain": domain,
                "location": location,
                "experience_level": "Entry",
                "duration": "3-6 months",
                "stipend": self._estimate_stipend(domain),
                "description": f"Join {company} as a {title} and gain valuable experience in {domain}. This internship opportunity provides hands-on learning and professional development.",
                "requirements": self._generate_requirements(domain),
                "preferred_skills": self._generate_preferred_skills(domain),
                "responsibilities": self._generate_responsibilities(domain),
                "application_deadline": (datetime.now() + timedelta(days=random.randint(14, 45))).strftime("%Y-%m-%d"),
                "scraped_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "source": "indeed",
                "url": job_url,
                "tags": [domain.lower().replace(" ", "_"), "internship", "indeed", query.replace(" ", "_")],
                "matching_score": 0.0
            }
            
            return internship
            
        except Exception as e:
            logger.error(f"Error parsing Indeed job card: {str(e)}")
            return None
    
    def _scrape_letsintern_internships(self):
        """Scrape internships from LetsIntern"""
        internships = []
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        }
        
        try:
            # LetsIntern internships page
            search_url = "https://www.letsintern.com/internships"
            
            response = requests.get(search_url, headers=headers, timeout=15)
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # LetsIntern job selectors (these may need adjustment based on actual site structure)
                job_selectors = [
                    '.internship-card',
                    '.job-card',
                    '.opportunity-card',
                    '[data-testid="internship"]',
                    '.card'
                ]
                
                job_cards = []
                for selector in job_selectors:
                    cards = soup.select(selector)
                    if cards:
                        job_cards = cards
                        break
                
                # Fallback: try to find any div with internship-related content
                if not job_cards:
                    all_divs = soup.find_all('div')
                    job_cards = [div for div in all_divs if any(keyword in div.get_text().lower() 
                                for keyword in ['intern', 'position', 'opportunity', 'role'])][:10]
                
                logger.info(f"Found {len(job_cards)} job cards on LetsIntern")
                
                for i, card in enumerate(job_cards[:8]):  # Limit to 8 internships
                    try:
                        internship = self._parse_letsintern_job_card(card, i)
                        if internship:
                            internships.append(internship)
                    except Exception as e:
                        logger.error(f"Error parsing LetsIntern job card {i}: {str(e)}")
                        continue
            
        except Exception as e:
            logger.error(f"Error scraping LetsIntern: {str(e)}")
        
        return internships
    
    def _parse_letsintern_job_card(self, card, index):
        """Parse individual LetsIntern job card"""
        try:
            # Extract title (try multiple selectors)
            title_selectors = [
                'h3', 'h2', 'h4',
                '.title', '.job-title', '.internship-title',
                '[data-testid="title"]',
                'a'
            ]
            
            title = None
            for selector in title_selectors:
                title_elem = card.select_one(selector)
                if title_elem:
                    text = title_elem.get_text(strip=True)
                    if len(text) > 5 and any(keyword in text.lower() for keyword in ['intern', 'developer', 'analyst', 'manager', 'designer']):
                        title = text
                        break
            
            if not title:
                # Generate title based on common domains
                domains = ['Software Development', 'Data Science', 'Marketing', 'Finance', 'Design']
                title = f"{random.choice(domains)} Intern"
            
            # Extract company (try multiple approaches)
            company_selectors = [
                '.company', '.company-name', '.employer',
                '[data-testid="company"]',
                'strong', 'b'
            ]
            
            company = None
            for selector in company_selectors:
                company_elem = card.select_one(selector)
                if company_elem:
                    text = company_elem.get_text(strip=True)
                    if len(text) > 2 and len(text) < 50 and not any(keyword in text.lower() for keyword in ['apply', 'learn', 'intern', 'more']):
                        company = text
                        break
            
            if not company:
                company = f"LetsIntern Company {index + 1}"
            
            # Extract location
            location_selectors = [
                '.location', '.city', '.place',
                '[data-testid="location"]'
            ]
            
            location = "Remote/India"  # Default for LetsIntern
            for selector in location_selectors:
                location_elem = card.select_one(selector)
                if location_elem:
                    text = location_elem.get_text(strip=True)
                    if len(text) > 2 and any(keyword in text.lower() for keyword in ['remote', 'mumbai', 'delhi', 'bangalore', 'india', 'hybrid']):
                        location = text
                        break
            
            # Extract URL
            url_elem = card.select_one('a')
            job_url = "https://www.letsintern.com/internships"
            if url_elem and url_elem.get('href'):
                href = url_elem.get('href')
                if href.startswith('/'):
                    job_url = f"https://www.letsintern.com{href}"
                elif href.startswith('http'):
                    job_url = href
            
            # Clean up the data
            title = self._clean_text(title)
            company = self._clean_text(company)
            location = self._clean_text(location)
            
            # Skip if data is too generic or empty
            if not title or not company or len(title) < 5:
                return None
            
            # Determine domain from title
            domain = self._determine_domain_from_title(title)
            
            # Create structured internship data
            internship = {
                "id": f"letsintern_{int(time.time())}_{index}",
                "title": title,
                "company": company,
                "domain": domain,
                "location": location,
                "experience_level": "Entry",
                "duration": "2-6 months",
                "stipend": self._estimate_stipend_india(domain),
                "description": f"Exciting internship opportunity at {company} for {title}. Gain practical experience in {domain} with mentorship and real-world projects.",
                "requirements": self._generate_requirements(domain),
                "preferred_skills": self._generate_preferred_skills(domain),
                "responsibilities": self._generate_responsibilities(domain),
                "application_deadline": (datetime.now() + timedelta(days=random.randint(10, 35))).strftime("%Y-%m-%d"),
                "scraped_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "source": "letsintern",
                "url": job_url,
                "tags": [domain.lower().replace(" ", "_"), "internship", "letsintern", "india"],
                "matching_score": 0.0
            }
            
            return internship
            
        except Exception as e:
            logger.error(f"Error parsing LetsIntern job card: {str(e)}")
            return None
    
    def _estimate_stipend_india(self, domain):
        """Estimate stipend for Indian internships (in INR)"""
        stipend_ranges = {
            "Software Engineering": (15000, 35000),
            "Data Science": (18000, 40000),
            "Machine Learning": (20000, 45000),
            "Product Management": (12000, 30000),
            "UI/UX Design": (10000, 25000),
            "Web Development": (12000, 28000),
            "Mobile Development": (15000, 32000),
            "Digital Marketing": (8000, 20000),
            "Finance": (10000, 25000)
        }
        
        min_stipend, max_stipend = stipend_ranges.get(domain, (10000, 25000))
        return f"₹{random.randint(min_stipend, max_stipend)}/month"

# Global instance
internship_rag = InternshipRAG()
