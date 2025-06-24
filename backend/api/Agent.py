from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import docx
import json
import os
import logging
import re
from datetime import datetime
from typing import TypedDict, List, Dict, Any
from django.conf import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize LLM with proper error handling
llm = None
try:
    # Try different import methods for compatibility
    try:
        # Import google.generativeai directly to avoid the Modality issue
        import google.generativeai as genai
        
        class DirectGeminiLLM:
            def __init__(self, api_key):
                genai.configure(api_key=api_key)
                self.model = genai.GenerativeModel('gemini-1.5-flash')
            
            def invoke(self, prompt):
                try:
                    response = self.model.generate_content(prompt)
                    return SimpleResponse(response.text)
                except Exception as e:
                    logger.error(f"Gemini API error: {str(e)}")
                    raise e
        
        class SimpleResponse:
            def __init__(self, content):
                self.content = content
                self.text = content
        
        llm = DirectGeminiLLM(settings.GEMINI_API_KEY)
        logger.info("✅ Gemini API initialized with direct Google AI")
        
    except Exception as e:
        logger.error(f"Direct Gemini initialization failed: {str(e)}")
        
        # Fallback to langchain if available
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY
            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash", 
                temperature=0.3,
                convert_system_message_to_human=True
            )
            logger.info("✅ Gemini API initialized with ChatGoogleGenerativeAI")
        except Exception as e2:
            logger.error(f"ChatGoogleGenerativeAI also failed: {str(e2)}")
            llm = None

except Exception as e:
    logger.error(f"Failed to initialize Gemini API: {str(e)}")
    llm = None

# Try to import langgraph, with fallback if not available
try:
    from langgraph.graph import StateGraph, END
    LANGGRAPH_AVAILABLE = True
    logger.info("✅ LangGraph imported successfully")
except ImportError as e:
    logger.warning(f"LangGraph not available: {str(e)}. Using sequential processing.")
    LANGGRAPH_AVAILABLE = False

# Try to import RAG system with fallback
try:
    from utils.rag_system import internship_rag
    RAG_AVAILABLE = True
    logger.info("✅ RAG system imported successfully")
except ImportError as e:
    logger.warning(f"RAG system not available: {str(e)}")
    RAG_AVAILABLE = False
    internship_rag = None

# File Manager
class FileManager:
    def save_resume(self, file, user_id=None):
        try:
            file_id = f"resume_{datetime.utcnow().timestamp()}"
            file_path = os.path.join(settings.MEDIA_ROOT, f"resumes/{file_id}.docx")
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, 'wb+') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)
            file_info = {"size": file.size, "name": file.name}
            return file_path, file_id, file_info
        except Exception as e:
            logger.error(f"File save error: {str(e)}")
            raise

    def delete_file(self, file_path):
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            logger.error(f"File deletion error: {str(e)}")

file_manager = FileManager()

# Enhanced logging for agent communication with micro goals
def log_agent_communication(agent_name, step, data=None, success=True, micro_goal=None):
    """Log agent communication with detailed information and micro goals"""
    status = "✅ SUCCESS" if success else "❌ FAILED"
    logger.info(f"🤖 AGENT [{agent_name}] - {step} - {status}")
    
    if micro_goal:
        logger.info(f"   🎯 MICRO GOAL: {micro_goal}")
    
    if data and isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, list):
                logger.info(f"   📊 {key}: {len(value)} items")
            elif isinstance(value, str) and len(value) > 100:
                logger.info(f"   📝 {key}: {value[:100]}...")
            else:
                logger.info(f"   📋 {key}: {value}")
    logger.info("=" * 80)

# State definition for analysis
class AnalysisState(TypedDict):
    resume_text: str
    preferences: List[str]
    student_profile: Dict[str, Any]
    internship_recommendations: List[Dict]
    portfolio_gaps: List[Dict]
    readiness_evaluations: List[Dict]
    extraction_info: Dict[str, Any]
    processing_timestamp: str
    error: str
    current_step: str
    step_progress: int
    detailed_extraction: Dict[str, Any]
    agent_communications: List[Dict]

# Sequential workflow processor for when LangGraph is not available
class SequentialWorkflow:
    def __init__(self, agents):
        self.agents = agents
    
    def invoke(self, initial_state):
        state = initial_state.copy()
        
        for agent_name, agent_func in self.agents:
            try:
                logger.info(f"🔄 Running agent: {agent_name}")
                state = agent_func(state)
                if state.get('error'):
                    logger.error(f"❌ Agent {agent_name} failed: {state['error']}")
                    break
            except Exception as e:
                state['error'] = f"Agent {agent_name} failed: {str(e)}"
                logger.error(f"❌ Agent {agent_name} exception: {str(e)}")
                break
        
        return state

# Agent 1: Student Profile Analyzer
def student_profile_analyzer(state: AnalysisState) -> AnalysisState:
    agent_name = "STUDENT_PROFILE_ANALYZER"
    
    if "agent_communications" not in state:
        state["agent_communications"] = []
    
    comm_log = {
        "agent": agent_name,
        "step": "INITIALIZATION",
        "micro_goal": "Initialize profile analysis with resume text processing",
        "status": "started",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {}
    }
    state["agent_communications"].append(comm_log)
    
    log_agent_communication(agent_name, "STARTING ANALYSIS", 
                           micro_goal="Extract and analyze student profile from resume")
    
    state["current_step"] = "Analyzing student profile with AI..."
    state["step_progress"] = 20
    
    try:
        resume_text = state["resume_text"]
        
        # Text preprocessing
        comm_log = {
            "agent": agent_name,
            "step": "TEXT_PREPROCESSING",
            "micro_goal": "Extract basic patterns and document statistics",
            "status": "processing",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "text_length": len(resume_text),
                "word_count": len(resume_text.split()),
                "preferences": state["preferences"]
            }
        }
        state["agent_communications"].append(comm_log)
        
        # Extract detailed information
        detailed_extraction = extract_detailed_info(resume_text)
        state["detailed_extraction"] = detailed_extraction
        
        # AI Processing
        if llm:
            try:
                profile = process_with_ai(resume_text, state["preferences"], agent_name, state)
            except Exception as e:
                logger.warning(f"AI processing failed: {str(e)}, using fallback")
                profile = create_enhanced_fallback_profile(resume_text, state["preferences"])
        else:
            logger.warning("LLM not available, using fallback profile creation")
            profile = create_enhanced_fallback_profile(resume_text, state["preferences"])
        
        # Enhance and validate profile
        profile = enhance_extracted_profile(profile, resume_text, state["preferences"])
        profile = validate_and_enhance_profile(profile, state["preferences"])
        
        state["student_profile"] = profile
        state["extraction_info"] = {
            "chars_extracted": len(resume_text),
            "paragraphs_extracted": resume_text.count('\n\n') + 1,
            "email_found": bool(profile.get("email") and profile["email"] not in ['null', None, '']),
            "phone_found": bool(profile.get("phone") and profile["phone"] not in ['null', None, '']),
            "skills_count": len(profile.get("skills", [])),
            "projects_count": len(profile.get("projects", [])),
            "experience_count": len(profile.get("experience", [])),
            "education_count": len(profile.get("education", [])),
            "sections_found": detailed_extraction["sections_detected"]
        }
        
        # Success log
        comm_log = {
            "agent": agent_name,
            "step": "ANALYSIS_COMPLETED",
            "micro_goal": "Profile analysis completed with full data validation",
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "profile_completeness": calculate_profile_completeness(profile),
                "extraction_info": state["extraction_info"]
            }
        }
        state["agent_communications"].append(comm_log)
        
        state["current_step"] = "Profile analysis completed successfully"
        state["step_progress"] = 40
        return state
        
    except Exception as e:
        error_msg = str(e)
        comm_log = {
            "agent": agent_name,
            "step": "CRITICAL_FAILURE",
            "micro_goal": "Handle critical failure in profile analysis",
            "status": "failed",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {"error": error_msg}
        }
        state["agent_communications"].append(comm_log)
        
        state["error"] = f"Profile analysis failed: {error_msg}"
        return state

def extract_detailed_info(resume_text):
    """Extract detailed information from resume text"""
    detailed_extraction = {
        "total_characters  ": len(resume_text),
        "total_words": len(resume_text.split()),
        "total_lines": len(resume_text.split('\n')),
        "paragraphs": resume_text.count('\n\n') + 1,
        "email_patterns_found": len(re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', resume_text)),
        "phone_patterns_found": len(re.findall(r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', resume_text)),
        "url_patterns_found": len(re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', resume_text)),
        "sections_detected": []
    }
    
    # Section detection
    section_patterns = {
        'education': [r'\bEDUCATION\b', r'\b(?:education|academic|degree|university|college)\b'],
        'experience': [r'\bEXPERIENCE\b', r'\b(?:experience|employment|work|career|job)\b'],
        'skills': [r'\bSKILLS\b', r'\b(?:skills|technologies|technical|programming)\b'],
        'projects': [r'\bPROJECT[S]?\b', r'\b(?:projects|portfolio|work)\b'],
        'certifications': [r'\bCERTIFICATIONS\b', r'\b(?:certifications?|certificates?)\b'],
        'awards': [r'\bAWARDS\b', r'\b(?:awards?|honors?|achievements?)\b']
    }
    
    for section, patterns in section_patterns.items():
        for pattern in patterns:
            if re.search(pattern, resume_text, re.IGNORECASE):
                detailed_extraction["sections_detected"].append(section.title())
                break
    
    return detailed_extraction

def process_with_ai(resume_text, preferences, agent_name, state):
    """Process resume with AI"""
    prompt_text = f"""
You are an expert resume parser. Extract detailed information from this resume and return ONLY a valid JSON object.

RESUME TEXT:
{resume_text}

Return this EXACT JSON structure:
{{
    "name": "Full person name",
    "email": "email@example.com or null",
    "phone": "phone number or null",
    "location": "location or null",
    "linkedin": "LinkedIn URL or null",
    "github": "GitHub URL or null",
    "website": "website URL or null",
    "summary": "Professional summary text or null",
    "skills": ["List all technical skills found"],
    "programming_languages": ["Python", "Java", etc],
    "frameworks": ["React", "Django", etc],
    "tools": ["Git", "Docker", etc],
    "databases": ["MySQL", "MongoDB", etc],
    "domains": ["Web Development", "Data Science", etc],
    "experience_level": "entry-level OR intermediate OR senior",
    "education": [
        {{
            "degree": "Degree name",
            "institution": "University name",
            "year": "Year or null",
            "gpa": "GPA or null"
        }}
    ],
    "experience": [
        {{
            "title": "Job title",
            "company": "Company name",
            "duration": "Duration",
            "description": "Description"
        }}
    ],
    "projects": [
        {{
            "name": "Project name",
            "description": "Description",
            "technologies": ["Tech used"],
            "duration": "Duration or null"
        }}
    ],
    "certifications": [],
    "achievements": [],
    "languages": ["English"],
    "years_of_experience": "0-1, 1-2, 2-5, 5+"
}}

CRITICAL: Return ONLY the JSON object, no other text.
"""
    
    try:
        response = llm.invoke(prompt_text)
        
        # Handle different response formats
        result_text = None
        if hasattr(response, 'content'):
            result_text = response.content
        elif hasattr(response, 'text'):
            result_text = response.text
        else:
            result_text = str(response)
        
        # Clean and parse JSON
        result_text = clean_json_response(result_text)
        profile = json.loads(result_text)
        
        return profile
        
    except Exception as e:
        logger.error(f"AI processing error: {str(e)}")
        raise e

def clean_json_response(text):
    """Clean JSON response from AI"""
    text = text.strip()
    
    # Remove markdown formatting
    if '```json' in text:
        start = text.find('```json') + 7
        end = text.find('```', start)
        if end != -1:
            text = text[start:end].strip()
    elif '```' in text:
        start = text.find('```') + 3
        end = text.rfind('```')
        if end != -1 and end > start:
            text = text[start:end].strip()
    
    # Extract JSON object
    json_match = re.search(r'\{.*\}', text, re.DOTALL)
    if json_match:
        text = json_match.group()
    
    # Fix common JSON issues
    text = re.sub(r',\s*}', '}', text)
    text = re.sub(r',\s*]', ']', text)
    text = text.replace("'", '"')
    text = re.sub(r'\bNone\b', 'null', text)
    text = re.sub(r'\bTrue\b', 'true', text)
    text = re.sub(r'\bFalse\b', 'false', text)
    
    return text

# Agent 2: Internship Matcher
def internship_matcher(state: AnalysisState) -> AnalysisState:
    agent_name = "INTERNSHIP_MATCHER"
    
    comm_log = {
        "agent": agent_name,
        "step": "INITIALIZATION",
        "micro_goal": "Initialize internship matching",
        "status": "started",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {}
    }
    state["agent_communications"].append(comm_log)
    
    state["current_step"] = "Matching internships..."
    state["step_progress"] = 60
    
    try:
        profile = state["student_profile"]
        preferences = state["preferences"]
        
        # Try RAG system if available
        recommendations = []
        if RAG_AVAILABLE and internship_rag:
            try:
                rag_matches = internship_rag.find_matching_internships(
                    profile=profile,
                    preferences=preferences,
                    top_k=8
                )
                recommendations = process_rag_matches(rag_matches, profile)
            except Exception as e:
                logger.warning(f"RAG system failed: {str(e)}")
                recommendations = []
        
        # Generate fallback recommendations if needed
        if len(recommendations) < 3:
            fallback_recs = generate_intelligent_recommendations(profile, preferences, recommendations)
            recommendations.extend(fallback_recs)
        
        state["internship_recommendations"] = recommendations[:6]  # Limit to 6
        
        comm_log = {
            "agent": agent_name,
            "step": "MATCHING_COMPLETED",
            "micro_goal": "Successfully matched internships",
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {"recommendations_count": len(recommendations)}
        }
        state["agent_communications"].append(comm_log)
        
        return state
        
    except Exception as e:
        error_msg = str(e)
        state["error"] = f"Internship matching failed: {error_msg}"
        return state

def process_rag_matches(rag_matches, profile):
    """Process RAG matches into recommendation format"""
    recommendations = []
    for i, match in enumerate(rag_matches):
        rec = {
            "id": match.get("id", f"RAG_{i+1}"),
            "title": match.get("title", "Software Engineering Intern"),
            "company": match.get("company", "TechCorp"),
            "domain": match.get("domain", "Technology"),
            "location": match.get("location", "Remote"),
            "duration": match.get("duration", "12 weeks"),
            "stipend": match.get("stipend", "Competitive"),
            "matching_score": match.get("matching_score", 0.75),
            "justification": match.get("justification", "Good skill match"),
            "requirements": match.get("requirements", ["Python", "Communication"]),
            "preferred_skills": match.get("preferred_skills", []),
            "description": match.get("description", ""),
            "experience_level": match.get("experience_level", "entry-level"),
            "application_deadline": match.get("application_deadline", ""),
            "skill_match_percentage": calculate_skill_match(
                profile.get("skills", []), 
                match.get("requirements", [])
            ),
            "domain_match": True
        }
        recommendations.append(rec)
    return recommendations

# Agent 3: Portfolio Gap Detector
def portfolio_gap_detector(state: AnalysisState) -> AnalysisState:
    agent_name = "PORTFOLIO_GAP_DETECTOR"
    
    comm_log = {
        "agent": agent_name,
        "step": "INITIALIZATION",
        "micro_goal": "Initialize portfolio gap analysis",
        "status": "started",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {}
    }
    state["agent_communications"].append(comm_log)
    
    state["current_step"] = "Analyzing portfolio gaps..."
    state["step_progress"] = 75
    
    try:
        profile = state["student_profile"]
        recommendations = state["internship_recommendations"]
        
        gaps = generate_intelligent_gaps(profile, recommendations)
        
        state["portfolio_gaps"] = gaps
        
        comm_log = {
            "agent": agent_name,
            "step": "GAP_ANALYSIS_COMPLETED",
            "micro_goal": "Portfolio gaps identified",
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {"gaps_found": len(gaps)}
        }
        state["agent_communications"].append(comm_log)
        
        return state
        
    except Exception as e:
        state["error"] = f"Portfolio gap detection failed: {str(e)}"
        return state

# Agent 4: Readiness Evaluator
def readiness_evaluator(state: AnalysisState) -> AnalysisState:
    agent_name = "READINESS_EVALUATOR"
    
    comm_log = {
        "agent": agent_name,
        "step": "INITIALIZATION",
        "micro_goal": "Calculate readiness scores",
        "status": "started",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {}
    }
    state["agent_communications"].append(comm_log)
    
    state["current_step"] = "Evaluating readiness..."
    state["step_progress"] = 90
    
    try:
        profile = state["student_profile"]
        recommendations = state["internship_recommendations"]
        gaps = state["portfolio_gaps"]
        
        evaluations = [{
            "internship_title": recommendations[0]['title'] if recommendations else "Software Engineering Intern",
            "readiness_score": calculate_readiness_score(profile, gaps),
            "next_steps": generate_next_steps(profile, gaps),
            "timeline": estimate_preparation_timeline(gaps)
        }]
        
        state["readiness_evaluations"] = evaluations
        state["processing_timestamp"] = datetime.utcnow().isoformat()
        state["current_step"] = "Analysis completed successfully!"
        state["step_progress"] = 100
        
        comm_log = {
            "agent": agent_name,
            "step": "READINESS_EVALUATED",
            "micro_goal": "Readiness evaluation completed",
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {"readiness_score": evaluations[0]["readiness_score"]}
        }
        state["agent_communications"].append(comm_log)
        
        return state
        
    except Exception as e:
        state["error"] = f"Readiness evaluation failed: {str(e)}"
        return state

# Utility functions
def calculate_profile_completeness(profile):
    """Calculate profile completeness percentage"""
    important_fields = ["name", "email", "skills", "education"]
    completed_fields = sum(1 for field in important_fields if profile.get(field))
    return (completed_fields / len(important_fields)) * 100

def calculate_skill_match(student_skills, required_skills):
    """Calculate skill match percentage"""
    if not student_skills or not required_skills:
        return 0
    
    student_skills_lower = [skill.lower() for skill in student_skills]
    required_skills_lower = [skill.lower() for skill in required_skills]
    
    matches = sum(1 for req_skill in required_skills_lower if req_skill in student_skills_lower)
    return (matches / len(required_skills_lower)) * 100

def calculate_readiness_score(profile, gaps):
    """Calculate readiness score"""
    base_score = calculate_profile_completeness(profile) / 100
    gap_penalty = len([g for g in gaps if g.get('priority') == 'high']) * 0.1
    return max(0.3, min(0.95, base_score - gap_penalty))

def generate_next_steps(profile, gaps):
    """Generate next steps"""
    steps = []
    for gap in gaps[:3]:
        steps.append(gap.get('suggested_action', 'Improve skills'))
    return steps

def estimate_preparation_timeline(gaps):
    """Estimate timeline"""
    high_priority_gaps = [g for g in gaps if g.get('priority') == 'high']
    if len(high_priority_gaps) >= 2:
        return "3-4 months preparation"
    elif len(high_priority_gaps) == 1:
        return "2-3 months preparation"
    else:
        return "1-2 months preparation"

def enhance_extracted_profile(profile, resume_text, preferences):
    """Enhance extracted profile"""
    # Extract skills if missing
    if not profile.get('skills'):
        profile['skills'] = extract_comprehensive_skills(resume_text)
    
    # Extract contact info if missing
    if not profile.get('email'):
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-ZaZ0-9.-]+\.[A-Z|a-z]{2,}\b', resume_text)
        if email_match:
            profile['email'] = email_match.group()
    
    if not profile.get('phone'):
        phone_match = re.search(r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', resume_text)
        if phone_match:
            profile['phone'] = phone_match.group()
    
    return profile

def extract_comprehensive_skills(text):
    """Extract skills from text"""
    skill_database = [
        'Python', 'JavaScript', 'Java', 'C++', 'C#', 'HTML', 'CSS', 'React', 
        'Angular', 'Vue', 'Node.js', 'Django', 'Flask', 'Spring', 'MySQL', 
        'PostgreSQL', 'MongoDB', 'Git', 'Docker', 'AWS', 'Azure'
    ]
    
    found_skills = []
    text_lower = text.lower()
    
    for skill in skill_database:
        if skill.lower() in text_lower:
            found_skills.append(skill)
    
    return found_skills

def validate_and_enhance_profile(profile, preferences):
    """Validate and enhance profile"""
    profile.setdefault("name", "Unknown")
    profile.setdefault("skills", ["Python", "JavaScript"])
    profile.setdefault("domains", preferences[:2] if preferences else ["None"])
    profile.setdefault("experience_level", "entry-level")
    
    # Ensure lists
    list_fields = ["skills", "programming_languages", "frameworks", "tools", 
                   "databases", "domains", "education", "experience", "projects"]
    for field in list_fields:
        if not isinstance(profile.get(field), list):
            profile[field] = []
    
    return profile

def create_enhanced_fallback_profile(resume_text, preferences):
    """Create fallback profile"""
    return {
        "name": extract_name_from_text(resume_text),
        "email": extract_email_from_text(resume_text),
        "phone": extract_phone_from_text(resume_text),
        "skills": extract_comprehensive_skills(resume_text),
        "domains": preferences[:2] if preferences else ["None"],
        "experience_level": "entry-level",
        "education": [],
        "experience": [],
        "projects": [],
        "programming_languages": [],
        "frameworks": [],
        "tools": [],
        "databases": []
    }

def extract_name_from_text(text):
    """Extract name from text"""
    lines = text.split('\n')
    first_line = lines[0].strip() if lines else ""
    if first_line and len(first_line.split()) <= 4:
        return first_line
    return "Unknown"

def extract_email_from_text(text):
    """Extract email from text"""
    match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
    return match.group() if match else None

def extract_phone_from_text(text):
    """Extract phone from text"""
    match = re.search(r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
    return match.group() if match else None

def generate_intelligent_recommendations(profile, preferences, existing_recs):
    """Generate intelligent recommendations"""
    recommendations = []
    companies = ["TechCorp", "InnovateTech", "FutureSoft", "DataDriven Inc"]
    
    for i, domain in enumerate(preferences[:4]):
        if len(recommendations) + len(existing_recs) >= 6:
            break
        
        rec = {
            "id": f"GEN_{i+1}",
            "title": f"{domain} Intern",
            "company": companies[i % len(companies)],
            "domain": domain,
            "location": "Remote" if i % 2 == 0 else "Hybrid",
            "duration": "12 weeks",
            "stipend": "$6000-8000/month",
            "matching_score": max(0.70, 0.85 - (i * 0.03)),
            "justification": f"Strong match for {domain} preference",
            "requirements": generate_requirements_for_domain(domain),
            "preferred_skills": ["Communication", "Team Work"],
            "description": f"Hands-on {domain.lower()} internship",
            "experience_level": profile.get("experience_level", "entry-level"),
            "application_deadline": "2024-04-30",
            "skill_match_percentage": calculate_skill_match(
                profile.get("skills", []), 
                generate_requirements_for_domain(domain)
            ),
            "domain_match": True
        }
        recommendations.append(rec)
    
    return recommendations

def generate_requirements_for_domain(domain):
    """Generate requirements for domain"""
    domain_requirements = {
        "Web Development": ["HTML", "CSS", "JavaScript", "React"],
        "Data Science": ["Python", "SQL", "Pandas", "Statistics"],
        "Mobile Development": ["React Native", "JavaScript", "Mobile UI"],
        "Backend Development": ["Python", "APIs", "Databases"],
        "Machine Learning": ["Python", "Scikit-learn", "TensorFlow"]
    }
    return domain_requirements.get(domain, ["Python", "Communication"])

def generate_intelligent_gaps(profile, recommendations):
    """Generate intelligent gaps"""
    gaps = []
    
    # Skill gaps
    student_skills = set([skill.lower() for skill in profile.get('skills', [])])
    all_required = set()
    
    for rec in recommendations:
        req_skills = set([skill.lower() for skill in rec.get('requirements', [])])
        all_required.update(req_skills)
    
    missing_skills = all_required - student_skills
    
    if missing_skills:
        gaps.append({
            "gap_type": "technical",
            "title": "Missing Technical Skills",
            "description": f"Key skills needed: {', '.join(list(missing_skills)[:5])}",
            "priority": "high",
            "suggested_action": "Take online courses and build projects",
            "estimated_time": "4-6 weeks",
            "resources": ["Coursera", "Udemy", "FreeCodeCamp"]
        })
    
    # Project portfolio gap
    if len(profile.get('projects', [])) < 3:
        gaps.append({
            "gap_type": "portfolio",
            "title": "Insufficient Projects",
            "description": "Need more projects to demonstrate skills",
            "priority": "high",
            "suggested_action": "Build 2-3 comprehensive projects",
            "estimated_time": "6-8 weeks",
            "resources": ["GitHub", "Portfolio websites"]
        })
    
    return gaps

# Main workflow setup
if LANGGRAPH_AVAILABLE:
    # Use LangGraph if available
    from langgraph.graph import StateGraph, END
    
    workflow = StateGraph(AnalysisState)
    workflow.add_node("student_profile_analyzer", student_profile_analyzer)
    workflow.add_node("internship_matcher", internship_matcher)
    workflow.add_node("portfolio_gap_detector", portfolio_gap_detector)
    workflow.add_node("readiness_evaluator", readiness_evaluator)
    
    workflow.set_entry_point("student_profile_analyzer")
    workflow.add_edge("student_profile_analyzer", "internship_matcher")
    workflow.add_edge("internship_matcher", "portfolio_gap_detector")
    workflow.add_edge("portfolio_gap_detector", "readiness_evaluator")
    workflow.add_edge("readiness_evaluator", END)
    
    graph = workflow.compile()
else:
    # Use sequential workflow
    agents = [
        ("student_profile_analyzer", student_profile_analyzer),
        ("internship_matcher", internship_matcher),
        ("portfolio_gap_detector", portfolio_gap_detector),
        ("readiness_evaluator", readiness_evaluator)
    ]
    graph = SequentialWorkflow(agents)

class ResumeAnalysisView(APIView):
    def post(self, request):
        try:
            logger.info("🚀 STARTING RESUME ANALYSIS WORKFLOW")
            
            if not llm:
                return Response({
                    "error": "AI service not available. Please check configuration.",
                    "fallback_available": True
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            # Get request data
            resume_file = request.FILES.get("resume")
            preferences = json.loads(request.data.get("preferences", "[]"))
            
            if not resume_file:
                return Response({
                    "error": "Resume file is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Save file
            try:
                file_path, file_id, file_info = file_manager.save_resume(resume_file)
            except Exception as e:
                return Response({
                    "error": f"Failed to save resume: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Extract text
            try:
                doc = docx.Document(file_path)
                resume_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
                
                # Extract from tables too
                for table in doc.tables:
                    for row in table.rows:
                        for cell in row.cells:
                            if cell.text.strip():
                                resume_text += "\n" + cell.text
                
                if not resume_text.strip():
                    file_manager.delete_file(file_path)
                    return Response({
                        "error": "Could not extract text from document"
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except Exception as e:
                file_manager.delete_file(file_path)
                return Response({
                    "error": f"Failed to process document: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Initialize state
            initial_state = {
                "resume_text": resume_text,
                "preferences": preferences,
                "student_profile": {},
                "internship_recommendations": [],
                "portfolio_gaps": [],
                "readiness_evaluations": [],
                "extraction_info": {},
                "processing_timestamp": "",
                "error": "",
                "current_step": "Starting analysis...",
                "step_progress": 0,
                "detailed_extraction": {},
                "agent_communications": []
            }
            
            # Run workflow
            final_state = graph.invoke(initial_state)
            
            # Clean up
            file_manager.delete_file(file_path)
            
            if final_state.get("error"):
                return Response({
                    "error": final_state["error"]
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Prepare response
            response_data = {
                "student_profile": final_state["student_profile"],
                "internship_recommendations": final_state["internship_recommendations"],
                "portfolio_gaps": final_state["portfolio_gaps"],
                "readiness_evaluations": final_state["readiness_evaluations"],
                "extraction_info": final_state["extraction_info"],
                "detailed_extraction": final_state["detailed_extraction"],
                "processing_timestamp": final_state["processing_timestamp"],
                "current_step": final_state["current_step"],
                "step_progress": final_state["step_progress"],
                "agent_communications": final_state["agent_communications"],
                "file_info": {
                    "file_id": file_id,
                    "processed": True,
                    "chars_extracted": len(resume_text),
                    "resume_text": resume_text[:3000] + "..." if len(resume_text) > 3000 else resume_text
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"💥 CRITICAL WORKFLOW FAILURE: {str(e)}")
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)