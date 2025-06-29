import os
import logging
import re
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        self.api_key = os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not found in environment variables")
            self.available = False
            return
        
        try:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-pro')
            self.available = True
            logger.info("Gemini service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini service: {e}")
            self.available = False

    def clean_text(self, text: str) -> str:
        """Clean and format text using Gemini AI"""
        if not self.available or not text:
            return self._fallback_text_cleaning(text)
        
        try:
            prompt = f"""
            Clean and format the following text. Remove any formatting artifacts like asterisks (*), 
            extra whitespace, and make it readable. Return only the cleaned text without any explanations:

            Text to clean: {text}
            """
            
            response = self.model.generate_content(
                prompt,
                safety_settings={
                    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
                }
            )
            
            cleaned_text = response.text.strip()
            return cleaned_text if cleaned_text else self._fallback_text_cleaning(text)
            
        except Exception as e:
            logger.error(f"Error cleaning text with Gemini: {e}")
            return self._fallback_text_cleaning(text)

    def extract_internship_details(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and structure internship details using Gemini AI"""
        if not self.available:
            return self._fallback_internship_extraction(raw_data)
        
        try:
            # Prepare the data for Gemini
            raw_text = f"""
            Title: {raw_data.get('title', '')}
            Company: {raw_data.get('company', '')}
            Location: {raw_data.get('location', '')}
            Description: {raw_data.get('description', '')}
            Requirements: {raw_data.get('requirements', '')}
            Duration: {raw_data.get('duration', '')}
            Stipend: {raw_data.get('stipend', '')}
            """
            
            prompt = f"""
            Extract and structure the following internship information. Return a JSON object with these fields:
            - title: Clean internship title
            - company: Company name (cleaned)
            - location: Location (city, state/country)
            - description: Clean description (remove asterisks and formatting)
            - requirements: List of key requirements
            - duration: Internship duration
            - stipend: Compensation/stipend information
            - type: Internship type (Remote/On-site/Hybrid)
            - skills: List of required skills mentioned
            
            Raw data:
            {raw_text}
            
            Return only valid JSON without any explanations:
            """
            
            response = self.model.generate_content(
                prompt,
                safety_settings={
                    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
                }
            )
            
            # Try to parse the JSON response
            import json
            json_text = response.text.strip()
            
            # Clean the response to extract JSON
            if json_text.startswith('```json'):
                json_text = json_text[7:]
            if json_text.endswith('```'):
                json_text = json_text[:-3]
            
            structured_data = json.loads(json_text)
            
            # Merge with original data
            result = {**raw_data, **structured_data}
            
            # Clean specific fields
            result['title'] = self.clean_text(result.get('title', ''))
            result['company'] = self.clean_text(result.get('company', ''))
            result['description'] = self.clean_text(result.get('description', ''))
            
            return result
            
        except Exception as e:
            logger.error(f"Error extracting internship details with Gemini: {e}")
            return self._fallback_internship_extraction(raw_data)

    def _fallback_text_cleaning(self, text: str) -> str:
        """Fallback text cleaning without AI"""
        if not text:
            return ""
        
        # Remove asterisks and other formatting
        cleaned = re.sub(r'\*+', '', text)
        
        # Remove extra whitespace
        cleaned = re.sub(r'\s+', ' ', cleaned)
        
        # Remove special characters that are likely formatting artifacts
        cleaned = re.sub(r'[•◦▪▫]', '', cleaned)
        
        return cleaned.strip()

    def _fallback_internship_extraction(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback internship extraction without AI"""
        result = raw_data.copy()
        
        # Clean text fields
        text_fields = ['title', 'company', 'description', 'requirements', 'location']
        for field in text_fields:
            if field in result:
                result[field] = self._fallback_text_cleaning(result[field])
        
        # Extract skills from description if not present
        if 'skills' not in result or not result['skills']:
            description = result.get('description', '') + ' ' + result.get('requirements', '')
            result['skills'] = self._extract_skills_fallback(description)
        
        # Determine type from location/description
        if 'type' not in result:
            location_text = result.get('location', '').lower()
            description_text = result.get('description', '').lower()
            
            if 'remote' in location_text or 'remote' in description_text:
                result['type'] = 'Remote'
            elif 'hybrid' in location_text or 'hybrid' in description_text:
                result['type'] = 'Hybrid'
            else:
                result['type'] = 'On-site'
        
        return result

    def _extract_skills_fallback(self, text: str) -> list:
        """Extract skills from text without AI"""
        common_skills = [
            'python', 'javascript', 'java', 'react', 'node.js', 'html', 'css',
            'machine learning', 'data science', 'sql', 'mongodb', 'postgresql',
            'git', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'tensorflow',
            'pytorch', 'django', 'flask', 'express', 'angular', 'vue',
            'typescript', 'c++', 'c#', 'golang', 'rust', 'swift', 'kotlin'
        ]
        
        text_lower = text.lower()
        found_skills = []
        
        for skill in common_skills:
            if skill in text_lower:
                found_skills.append(skill.title())
        
        return found_skills[:10]  # Limit to 10 skills

# Create a global instance
gemini_service = GeminiService()
