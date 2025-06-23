import json
import os
from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from django.conf import settings
import logging

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
        self.load_internships()
        
    def load_internships(self):
        """Load internships from JSON file"""
        try:
            json_path = os.path.join(settings.BASE_DIR, 'data', 'internships.json')
            with open(json_path, 'r') as f:
                data = json.load(f)
                self.internships = data['internships']
            
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
        text_parts = [
            ' '.join(profile.get('skills', [])),
            ' '.join(profile.get('domains', [])),
            ' '.join(preferences),
            profile.get('experience_level', ''),
            ' '.join(profile.get('projects', [])),
            ' '.join(profile.get('certifications', []))
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

# Global instance
internship_rag = InternshipRAG()
