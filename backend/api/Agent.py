from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import docx
import json
import os
import logging
import re
from datetime import datetime
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Dict, Any
from django.conf import settings
from utils.rag_system import internship_rag

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

# Initialize Gemini API
try:
    os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash", 
        temperature=0.3,
        convert_system_message_to_human=True
    )
    logger.info("Gemini API initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Gemini API: {str(e)}")
    llm = None

# Mock skills data (removed GitHub-specific skills)
common_skills = ["Python", "JavaScript", "HTML", "CSS", "React", "Node.js", "Java", "C++", "SQL"]

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

# State definition for LangGraph
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
    agent_communications: List[Dict]  # New field for tracking agent communications

# Fixed Agent 1: Student Profile Analyzer
def student_profile_analyzer(state: AnalysisState) -> AnalysisState:
    agent_name = "STUDENT_PROFILE_ANALYZER"
    
    # Initialize agent communications if not present
    if "agent_communications" not in state:
        state["agent_communications"] = []
    
    # Add initial communication
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
        
        # Micro goal 1: Text preprocessing
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
        
        log_agent_communication(agent_name, "RESUME TEXT RECEIVED", {
            "text_length": len(resume_text),
            "word_count": len(resume_text.split()),
            "preferences": state["preferences"]
        }, micro_goal="Process and validate resume text input")
        
        # Pre-extract basic information for better fallback
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', resume_text)
        phone_match = re.search(r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', resume_text)
        linkedin_match = re.search(r'(?:linkedin\.com/in/|linkedin\.com/profile/)[^\s]+', resume_text, re.IGNORECASE)
        github_match = re.search(r'(?:github\.com/)[^\s]+', resume_text, re.IGNORECASE)
        
        # Extract detailed information
        detailed_extraction = {
            "total_characters": len(resume_text),
            "total_words": len(resume_text.split()),
            "total_lines": len(resume_text.split('\n')),
            "paragraphs": resume_text.count('\n\n') + 1,
            "email_patterns_found": len(re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', resume_text)),
            "phone_patterns_found": len(re.findall(r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', resume_text)),
            "url_patterns_found": len(re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', resume_text)),
            "sections_detected": []
        }
        
        # Micro goal 2: Section detection
        section_patterns = {
            'education': [r'\bEDUCATION\b', r'\b(?:education|academic|degree|university|college)\b', r'\bB\.?S\.?\b', r'\bM\.?S\.?\b', r'\bPh\.?D\.?\b'],
            'experience': [r'\bRELEVANT EXPERIENCE\b', r'\bEXPERIENCE\b', r'\b(?:experience|employment|work|career|job)\b', r'\b(?:intern|internship)\b'],
            'skills': [r'\bSKILLS\b', r'\b(?:skills|technologies|technical|programming)\b', r'\b(?:languages|frameworks|tools)\b'],
            'projects': [r'\bCLASS PROJECT EXPERIENCE\b', r'\bPROJECT[S]?\b', r'\b(?:projects|portfolio|work)\b'],
            'certifications': [r'\bCERTIFICATIONS\b', r'\b(?:certifications?|certificates?|credentials?)\b'],
            'awards': [r'\bHONORS AND AWARDS\b', r'\bAWARDS\b', r'\b(?:awards?|honors?|achievements?|recognition)\b'],
            'summary': [r'\bSUMMARY\b', r'\b(?:summary|objective|profile|about)\b'],
            'contact': [r'\bCONTACT\b', r'\b(?:contact|phone|email|address)\b'],
            'involvement': [r'\bCAMPUS & COMMUNITY INVOLVEMENT\b', r'\bINVOLVEMENT\b', r'\bVOLUNTEER\b', r'\bEXTRACURRICULAR\b']
        }
        
        for section, patterns in section_patterns.items():
            for pattern in patterns:
                if re.search(pattern, resume_text, re.IGNORECASE):
                    detailed_extraction["sections_detected"].append(section.title())
                    break
        
        # Update communication log
        comm_log = {
            "agent": agent_name,
            "step": "PATTERN_EXTRACTION",
            "micro_goal": "Detect resume sections and extract metadata",
            "status": "completed",
            "timestamp": datetime.utcnow().isoformat(),
            "data": detailed_extraction
        }
        state["agent_communications"].append(comm_log)
        
        log_agent_communication(agent_name, "PATTERN EXTRACTION COMPLETED", detailed_extraction,
                               micro_goal="Successfully detected resume sections and patterns")
        
        state["detailed_extraction"] = detailed_extraction
        state["current_step"] = "Processing resume with Gemini AI..."
        state["step_progress"] = 30
        
        # Micro goal 3: AI Processing
        comm_log = {
            "agent": agent_name,
            "step": "AI_PROCESSING_START",
            "micro_goal": "Send structured prompt to Gemini AI for profile extraction",
            "status": "processing",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {"ai_model": "gemini-1.5-flash", "temperature": 0.3}
        }
        state["agent_communications"].append(comm_log)
        
        # Enhanced prompt for better resume section handling
        prompt_text = f"""
You are an expert resume parser. Extract detailed information from this resume and return ONLY a valid JSON object with no additional text or formatting.

RESUME TEXT:
{resume_text}

Important Note: This resume likely has standard sections like EDUCATION, EXPERIENCE, SKILLS, etc. Pay special attention to identifying and extracting information from these specific sections. Check for headers in ALL CAPS format.

Return this EXACT JSON structure:
{{
    "name": "Full person name (look at the beginning of resume)",
    "email": "{email_match.group() if email_match else None}",
    "phone": "{phone_match.group() if phone_match else None}",
    "location": "City, State or Country if mentioned",
    "linkedin": "{linkedin_match.group() if linkedin_match else None}",
    "github": "{github_match.group() if github_match else None}",
    "website": "Personal website URL if found",
    "summary": "Professional summary or objective text",
    "skills": ["List all technical skills, programming languages, frameworks mentioned - PAY SPECIAL ATTENTION to the SKILLS section if present"],
    "programming_languages": ["Python", "Java", "JavaScript", "etc - only if mentioned"],
    "frameworks": ["React", "Django", "Angular", "etc - only if mentioned"],
    "tools": ["Git", "Docker", "VS Code", "etc - only if mentioned"],
    "databases": ["MySQL", "MongoDB", "PostgreSQL", "etc - only if mentioned"],
    "domains": ["Web Development", "Data Science", "etc - infer from skills"],
    "experience_level": "entry-level OR intermediate OR senior",
    "education": [
        {{
            "degree": "Degree name (e.g., Bachelor of Science in...)",
            "institution": "University name",
            "year": "Year",
            "gpa": "GPA if mentioned"
        }}
    ],
    "experience": [
        {{
            "title": "Job title",
            "company": "Company name",
            "duration": "Duration",
            "description": "Key responsibilities and achievements"
        }}
    ],
    "projects": [
        {{
            "name": "Project name",
            "description": "Project description",
            "technologies": ["Technologies used"],
            "duration": "Duration if mentioned"
        }}
    ],
    "certifications": [
        {{
            "name": "Certification name",
            "issuer": "Issuing organization",
            "year": "Year obtained"
        }}
    ],
    "achievements": ["Awards, honors, achievements"],
    "languages": ["English", "Spanish", "etc"],
    "years_of_experience": "0-1, 1-2, 2-5, 5+",
    "community_involvement": [
        {{
            "organization": "Organization name",
            "role": "Your role",
            "duration": "Duration",
            "description": "Description of activities"
        }}
    ]
}}

CRITICAL: Return ONLY the JSON object, no other text, no code blocks, no explanations.
"""
        
        try:
            log_agent_communication(agent_name, "SENDING REQUEST TO GEMINI AI",
                                   micro_goal="Process resume with AI for structured data extraction")
            
            # Fixed Gemini API call with better error handling
            if not llm:
                raise Exception("Gemini LLM not initialized")
            
            # Try multiple approaches to get the response
            response = None
            result_text = None
            
            try:
                # Method 1: Direct invoke
                response = llm.invoke(prompt_text)
                
                # Handle different response structures for newer Gemini API
                if hasattr(response, 'content'):
                    result_text = response.content
                elif hasattr(response, 'text'):
                    result_text = response.text
                elif hasattr(response, 'parts') and response.parts:
                    # Handle parts-based response structure
                    if hasattr(response.parts[0], 'text'):
                        result_text = response.parts[0].text
                    else:
                        result_text = str(response.parts[0])
                elif hasattr(response, 'candidates') and response.candidates:
                    # Handle candidates-based response
                    candidate = response.candidates[0]
                    if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                        result_text = candidate.content.parts[0].text
                    elif hasattr(candidate, 'text'):
                        result_text = candidate.text
                elif isinstance(response, str):
                    result_text = response
                else:
                    # Last resort: convert to string and try to extract JSON
                    result_text = str(response)
                    
            except Exception as invoke_error:
                logger.error(f"Direct invoke failed: {str(invoke_error)}")
                
                # Method 2: Try with different model initialization
                try:
                    from langchain_google_genai import GoogleGenerativeAI
                    backup_llm = GoogleGenerativeAI(
                        model="gemini-1.5-flash",
                        temperature=0.3,
                        google_api_key=settings.GEMINI_API_KEY
                    )
                    result_text = backup_llm.invoke(prompt_text)
                except Exception as backup_error:
                    logger.error(f"Backup LLM failed: {str(backup_error)}")
                    raise Exception(f"Both Gemini API methods failed: {str(invoke_error)}")
            
            if not result_text:
                raise Exception("No response text received from Gemini API")
            
            comm_log = {
                "agent": agent_name,
                "step": "AI_RESPONSE_RECEIVED",
                "micro_goal": "Parse and validate AI response for profile data",
                "status": "processing",
                "timestamp": datetime.utcnow().isoformat(),
                "data": {
                    "response_length": len(result_text),
                    "response_preview": result_text[:200],
                    "response_type": type(response).__name__
                }
            }
            state["agent_communications"].append(comm_log)
            
            log_agent_communication(agent_name, "RECEIVED RESPONSE FROM GEMINI", {
                "response_length": len(result_text),
                "response_preview": result_text[:200],
                "response_type": type(response).__name__
            }, micro_goal="Successfully received AI response")
            
            # Enhanced JSON extraction with better error handling
            result_text = result_text.strip()
            
            # Remove markdown formatting and any wrapper text
            if '```json' in result_text:
                json_start = result_text.find('```json') + 7
                json_end = result_text.find('```', json_start)
                if json_end != -1:
                    result_text = result_text[json_start:json_end].strip()
            elif '```' in result_text:
                json_start = result_text.find('```') + 3
                json_end = result_text.rfind('```')
                if json_end != -1 and json_end > json_start:
                    result_text = result_text[json_start:json_end].strip()
            
            # Try to extract JSON from the response
            json_patterns = [
                r'\{.*\}',  # Standard JSON object
                r'(?s)\{.*?\}',  # Multiline JSON object
            ]
            
            extracted_json = None
            for pattern in json_patterns:
                match = re.search(pattern, result_text, re.DOTALL)
                if match:
                    extracted_json = match.group()
                    break
            
            if extracted_json:
                result_text = extracted_json
            
            # Clean up common JSON issues
            result_text = re.sub(r',\s*}', '}', result_text)  # Remove trailing commas in objects
            result_text = re.sub(r',\s*]', ']', result_text)  # Remove trailing commas in arrays
            result_text = result_text.replace("'", '"')  # Replace single quotes with double quotes
            result_text = re.sub(r'(\w+):', r'"\1":', result_text)  # Quote unquoted keys
            result_text = re.sub(r':\s*([^",\[\]{}]+?)(?=[,}])', r': "\1"', result_text)  # Quote unquoted string values
            
            try:
                profile = json.loads(result_text)
            except json.JSONDecodeError as json_error:
                logger.error(f"JSON parsing failed: {str(json_error)}")
                logger.error(f"Problematic JSON: {result_text[:500]}")
                
                # Try to fix common JSON issues and parse again
                result_text = fix_common_json_issues(result_text)
                try:
                    profile = json.loads(result_text)
                except json.JSONDecodeError:
                    raise Exception(f"Failed to parse JSON after cleaning: {str(json_error)}")
            
            # Enhanced validation and completion
            profile = enhance_extracted_profile(profile, resume_text, state["preferences"])
            
            comm_log = {
                "agent": agent_name,
                "step": "AI_PARSING_SUCCESS",
                "micro_goal": "Successfully parsed AI response into structured profile",
                "status": "completed",
                "timestamp": datetime.utcnow().isoformat(),
                "data": {
                    "extracted_fields": list(profile.keys()),
                    "skills_count": len(profile.get('skills', [])),
                    "name_found": bool(profile.get('name') and profile['name'] != 'Unknown'),
                    "contact_info": bool(profile.get('email') or profile.get('phone'))
                }
            }
            state["agent_communications"].append(comm_log)
            
            log_agent_communication(agent_name, "GEMINI PARSING SUCCESSFUL", {
                "extracted_fields": list(profile.keys()),
                "skills_count": len(profile.get('skills', [])),
                "name_found": bool(profile.get('name') and profile['name'] != 'Unknown'),
                "contact_info": bool(profile.get('email') or profile.get('phone'))
            }, success=True, micro_goal="Profile extraction completed successfully")
            
        except Exception as e:
            error_msg = str(e)
            comm_log = {
                "agent": agent_name,
                "step": "AI_PARSING_FAILED",
                "micro_goal": "Fallback to manual extraction due to AI parsing failure",
                "status": "fallback",
                "timestamp": datetime.utcnow().isoformat(),
                "data": {"error": error_msg}
            }
            state["agent_communications"].append(comm_log)
            
            log_agent_communication(agent_name, f"GEMINI PARSING FAILED: {error_msg}", 
                                   success=False, micro_goal="Activating fallback extraction system")
            
            # Enhanced fallback with intelligent extraction
            profile = create_enhanced_fallback_profile(resume_text, state["preferences"])
        
        # Final validation and enhancement
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
        
        # Final success communication
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
        
        log_agent_communication(agent_name, "ANALYSIS COMPLETED SUCCESSFULLY", {
            "profile_completeness": calculate_profile_completeness(profile),
            "extraction_info": state["extraction_info"]
        }, success=True, micro_goal="Student profile fully analyzed and validated")
        
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
        
        log_agent_communication(agent_name, f"CRITICAL FAILURE: {error_msg}", 
                               success=False, micro_goal="Error handling and cleanup")
        state["error"] = f"Profile analysis failed: {error_msg}"
        return state

# Enhanced Agent 2: Internship Matcher
def internship_matcher(state: AnalysisState) -> AnalysisState:
    agent_name = "INTERNSHIP_MATCHER"
    
    comm_log = {
        "agent": agent_name,
        "step": "INITIALIZATION",
        "micro_goal": "Initialize internship matching with RAG system",
        "status": "started",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {}
    }
    state["agent_communications"].append(comm_log)
    
    log_agent_communication(agent_name, "STARTING INTERNSHIP MATCHING",
                           micro_goal="Match student profile with available internships")
    
    state["current_step"] = "Matching internships using AI and RAG system..."
    state["step_progress"] = 60
    
    try:
        profile = state["student_profile"]
        preferences = state["preferences"]
        
        comm_log = {
            "agent": agent_name,
            "step": "PROFILE_VALIDATION",
            "micro_goal": "Validate and prepare profile for RAG matching",
            "status": "processing",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "skills_count": len(profile.get("skills", [])),
                "experience_level": profile.get("experience_level"),
                "preferences": preferences,
                "profile_completeness": calculate_profile_completeness(profile)
            }
        }
        state["agent_communications"].append(comm_log)
        
        log_agent_communication(agent_name, "PROFILE RECEIVED", {
            "skills_count": len(profile.get("skills", [])),
            "experience_level": profile.get("experience_level"),
            "preferences": preferences,
            "profile_completeness": calculate_profile_completeness(profile)
        }, micro_goal="Profile validated for internship matching")
        
        # Enhanced profile for RAG matching
        enhanced_profile = {
            "skills": profile.get("skills", []),
            "programming_languages": profile.get("programming_languages", []),
            "frameworks": profile.get("frameworks", []),
            "tools": profile.get("tools", []),
            "domains": profile.get("domains", []),
            "experience_level": profile.get("experience_level", "entry-level"),
            "years_of_experience": profile.get("years_of_experience", "0-1"),
            "education": profile.get("education", []),
            "projects": profile.get("projects", [])
        }
        
        comm_log = {
            "agent": agent_name,
            "step": "RAG_QUERY_START",
            "micro_goal": "Query RAG system for matching internships",
            "status": "processing",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {"query_parameters": {"top_k": 8, "preferences": preferences}}
        }
        state["agent_communications"].append(comm_log)
        
        log_agent_communication(agent_name, "QUERYING RAG SYSTEM",
                               micro_goal="Search for matching internships in database")
        
        # Use RAG system for internship matching
        try:
            rag_matches = internship_rag.find_matching_internships(
                profile=enhanced_profile,
                preferences=preferences,
                top_k=8
            )
            
            comm_log = {
                "agent": agent_name,
                "step": "RAG_RESPONSE_SUCCESS",
                "micro_goal": "Process RAG matches and calculate compatibility scores",
                "status": "completed",
                "timestamp": datetime.utcnow().isoformat(),
                "data": {
                    "matches_found": len(rag_matches),
                    "avg_score": sum(m.get("matching_score", 0) for m in rag_matches) / len(rag_matches) if rag_matches else 0
                }
            }
            state["agent_communications"].append(comm_log)
            
            log_agent_communication(agent_name, "RAG SYSTEM RESPONSE", {
                "matches_found": len(rag_matches),
                "avg_score": sum(m.get("matching_score", 0) for m in rag_matches) / len(rag_matches) if rag_matches else 0
            }, success=len(rag_matches) > 0, micro_goal="RAG matching completed successfully")
            
        except Exception as e:
            comm_log = {
                "agent": agent_name,
                "step": "RAG_SYSTEM_FAILED",
                "micro_goal": "Handle RAG system failure and prepare fallback",
                "status": "fallback",
                "timestamp": datetime.utcnow().isoformat(),
                "data": {"error": str(e)}
            }
            state["agent_communications"].append(comm_log)
            
            log_agent_communication(agent_name, f"RAG SYSTEM FAILED: {str(e)}", 
                                   success=False, micro_goal="Activating fallback recommendation system")
            rag_matches = []
        
        recommendations = []
        
        if rag_matches and len(rag_matches) >= 3:
            # Convert RAG matches to our format
            for i, match in enumerate(rag_matches[:5]):
                recommendation = {
                    "id": match.get("id", f"RAG_{i+1}"),
                    "title": match.get("title", "Software Engineering Intern"),
                    "company": match.get("company", "TechCorp"),
                    "domain": match.get("domain", "Technology"),
                    "location": match.get("location", "Remote"),
                    "duration": match.get("duration", "12 weeks"),
                    "stipend": match.get("stipend", "Competitive"),
                    "matching_score": match.get("matching_score", 0.75),
                    "justification": match.get("justification", "Good skill and domain match"),
                    "requirements": match.get("requirements", ["Python", "Communication Skills"]),
                    "preferred_skills": match.get("preferred_skills", []),
                    "description": match.get("description", ""),
                    "responsibilities": match.get("responsibilities", []),
                    "experience_level": match.get("experience_level", "entry-level"),
                    "application_deadline": match.get("application_deadline", ""),
                    "tags": match.get("tags", []),
                    "qualifications": match.get("qualifications", []),
                    "skill_match_percentage": calculate_skill_match(profile.get("skills", []), match.get("requirements", [])),
                    "domain_match": any(domain.lower() in match.get("domain", "").lower() for domain in preferences)
                }
                recommendations.append(recommendation)
            
            comm_log = {
                "agent": agent_name,
                "step": "RAG_MATCHING_SUCCESS",
                "micro_goal": "Successfully generated recommendations from RAG matches",
                "status": "completed",
                "timestamp": datetime.utcnow().isoformat(),
                "data": {
                    "recommendations_generated": len(recommendations),
                    "fallback_needed": False
                }
            }
            state["agent_communications"].append(comm_log)
            
            log_agent_communication(agent_name, "RAG MATCHING SUCCESSFUL", {
                "recommendations_generated": len(recommendations),
                "fallback_needed": False
            }, success=True, micro_goal="RAG-based recommendations completed")
        
        else:
            comm_log = {
                "agent": agent_name,
                "step": "INTELLIGENT_FALLBACK",
                "micro_goal": "Generate intelligent recommendations using fallback system",
                "status": "processing",
                "timestamp": datetime.utcnow().isoformat(),
                "data": {"reason": "Insufficient RAG matches"}
            }
            state["agent_communications"].append(comm_log)
            
            log_agent_communication(agent_name, "INSUFFICIENT RAG MATCHES - USING INTELLIGENT FALLBACK",
                                   micro_goal="Generate backup recommendations based on preferences")
            recommendations = generate_intelligent_recommendations(profile, preferences, rag_matches)
        
        state["internship_recommendations"] = recommendations
        state["current_step"] = f"Found {len(recommendations)} matching internships"
        
        # Calculate performance metrics
        avg_score = sum(r["matching_score"] for r in recommendations) / len(recommendations)
        skill_matches = sum(r.get("skill_match_percentage", 0) for r in recommendations) / len(recommendations)
        
        comm_log = {
            "agent": agent_name,
            "step": "MATCHING_COMPLETED",
            "micro_goal": "Finalize internship recommendations with performance metrics",
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "total_recommendations": len(recommendations),
                "average_matching_score": f"{avg_score:.3f}",
                "average_skill_match": f"{skill_matches:.1f}%",
                "rag_used": len(rag_matches) >= 3
            }
        }
        state["agent_communications"].append(comm_log)
        
        log_agent_communication(agent_name, "MATCHING COMPLETED SUCCESSFULLY", {
            "total_recommendations": len(recommendations),
            "average_matching_score": f"{avg_score:.3f}",
            "average_skill_match": f"{skill_matches:.1f}%",
            "rag_used": len(rag_matches) >= 3
        }, success=True, micro_goal="Internship matching completed with quality metrics")
        
        return state
        
    except Exception as e:
        error_msg = str(e)
        comm_log = {
            "agent": agent_name,
            "step": "CRITICAL_FAILURE",
            "micro_goal": "Handle critical failure in internship matching",
            "status": "failed",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {"error": error_msg}
        }
        state["agent_communications"].append(comm_log)
        
        log_agent_communication(agent_name, f"CRITICAL FAILURE: {error_msg}", 
                               success=False, micro_goal="Error handling for matching failure")
        state["error"] = f"Internship matching failed: {error_msg}"
        return state

# Agent 3: Enhanced Portfolio Gap Detector
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
    
    state["current_step"] = "Analyzing portfolio gaps with AI insights..."
    state["step_progress"] = 75
    
    try:
        profile = state["student_profile"]
        recommendations = state["internship_recommendations"]
        
        comm_log = {
            "agent": agent_name,
            "step": "GAP_ANALYSIS_START",
            "micro_goal": "Analyze skill gaps between profile and target internships",
            "status": "processing",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "profile_skills": len(profile.get('skills', [])),
                "target_internships": len(recommendations),
                "analysis_method": "AI + Rule-based"
            }
        }
        state["agent_communications"].append(comm_log)
        
        # Generate intelligent gaps based on profile analysis
        gaps = generate_intelligent_gaps(profile, recommendations)
        
        comm_log = {
            "agent": agent_name,
            "step": "GAP_ANALYSIS_COMPLETED",
            "micro_goal": "Portfolio gaps identified with actionable recommendations",
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "gaps_identified": len(gaps),
                "high_priority": sum(1 for g in gaps if g.get('priority') == 'high'),
                "medium_priority": sum(1 for g in gaps if g.get('priority') == 'medium'),
                "low_priority": sum(1 for g in gaps if g.get('priority') == 'low')
            }
        }
        state["agent_communications"].append(comm_log)
        
        state["portfolio_gaps"] = gaps
        state["current_step"] = "Portfolio gap analysis completed with AI insights"
        return state
        
    except Exception as e:
        error_msg = str(e)
        comm_log = {
            "agent": agent_name,
            "step": "CRITICAL_FAILURE", 
            "micro_goal": "Handle gap analysis failure",
            "status": "failed",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {"error": error_msg}
        }
        state["agent_communications"].append(comm_log)
        
        state["error"] = f"Portfolio gap detection failed: {error_msg}"
        return state

# Agent 4: Readiness Evaluator
def readiness_evaluator(state: AnalysisState) -> AnalysisState:
    agent_name = "READINESS_EVALUATOR"
    
    comm_log = {
        "agent": agent_name,
        "step": "INITIALIZATION",
        "micro_goal": "Finalize and align all recommendations",
        "status": "started",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {}
    }
    state["agent_communications"].append(comm_log)
    
    state["current_step"] = "Evaluating internship readiness..."
    state["step_progress"] = 90
    
    try:
        profile = state["student_profile"]
        recommendations = state["internship_recommendations"]
        gaps = state["portfolio_gaps"]
        
        # Generate readiness evaluation
        evaluations = [{
            "internship_title": recommendations[0]['title'] if recommendations else "Software Engineering Intern",
            "readiness_score": calculate_readiness_score(profile, gaps),
            "next_steps": generate_next_steps(profile, gaps),
            "timeline": estimate_preparation_timeline(gaps)
        }]
        
        comm_log = {
            "agent": agent_name,
            "step": "READINESS_EVALUATED",
            "micro_goal": "Calculate readiness scores and preparation timeline",
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "readiness_score": evaluations[0]["readiness_score"],
                "next_steps_count": len(evaluations[0]["next_steps"]),
                "timeline": evaluations[0]["timeline"]
            }
        }
        state["agent_communications"].append(comm_log)
        
        state["readiness_evaluations"] = evaluations
        state["current_step"] = "Readiness evaluation completed"
        return state
        
    except Exception as e:
        error_msg = str(e)
        comm_log = {
            "agent": agent_name,
            "step": "CRITICAL_FAILURE",
            "micro_goal": "Handle readiness evaluation failure",
            "status": "failed",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {"error": error_msg}
        }
        state["agent_communications"].append(comm_log)
        
        state["error"] = f"Readiness evaluation failed: {error_msg}"
        return state

def calculate_readiness_score(profile, gaps):
    """Calculate readiness score based on profile completeness and gaps"""
    base_score = calculate_profile_completeness(profile) / 100
    gap_penalty = len([g for g in gaps if g.get('priority') == 'high']) * 0.1
    return max(0.3, min(0.95, base_score - gap_penalty))

def generate_next_steps(profile, gaps):
    """Generate next steps based on gaps"""
    steps = []
    for gap in gaps[:3]:  # Top 3 gaps
        steps.append(gap.get('suggested_action', 'Improve skills'))
    return steps

def estimate_preparation_timeline(gaps):
    """Estimate timeline based on gap priorities"""
    high_priority_gaps = [g for g in gaps if g.get('priority') == 'high']
    if len(high_priority_gaps) >= 2:
        return "3-4 months focused preparation"
    elif len(high_priority_gaps) == 1:
        return "2-3 months preparation"
    else:
        return "1-2 months preparation"

# Agent 5: Requirement Aligner
def requirement_aligner(state: AnalysisState) -> AnalysisState:
    agent_name = "REQUIREMENT_ALIGNER"
    
    comm_log = {
        "agent": agent_name,
        "step": "INITIALIZATION",
        "micro_goal": "Finalize and align all recommendations",
        "status": "started",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {}
    }
    state["agent_communications"].append(comm_log)
    
    state["current_step"] = "Finalizing recommendations..."
    state["step_progress"] = 100
    
    try:
        recommendations = state["internship_recommendations"]
        
        # Ensure all recommendations have proper requirements
        for i, rec in enumerate(recommendations):
            if not rec.get("requirements"):
                rec["requirements"] = generate_requirements_for_domain(rec.get('domain', 'Web Development'))
        
        comm_log = {
            "agent": agent_name,
            "step": "REQUIREMENTS_ALIGNED",
            "micro_goal": "All recommendations finalized with proper requirements",
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "recommendations_processed": len(recommendations),
                "requirements_added": sum(1 for r in recommendations if r.get("requirements"))
            }
        }
        state["agent_communications"].append(comm_log)
        
        state["internship_recommendations"] = recommendations
        state["processing_timestamp"] = datetime.utcnow().isoformat()
        state["current_step"] = "Analysis completed successfully!"
        return state
        
    except Exception as e:
        error_msg = str(e)
        comm_log = {
            "agent": agent_name,
            "step": "ALIGNMENT_WARNING",
            "micro_goal": "Handle requirement alignment issues",
            "status": "warning",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {"error": error_msg}
        }
        state["agent_communications"].append(comm_log)
        
        # Don't fail the entire process for this step
        state["processing_timestamp"] = datetime.utcnow().isoformat()
        state["current_step"] = "Analysis completed with minor issues"
        return state

# Define the workflow graph
workflow = StateGraph(AnalysisState)
workflow.add_node("student_profile_analyzer", student_profile_analyzer)
workflow.add_node("internship_matcher", internship_matcher)
workflow.add_node("portfolio_gap_detector", portfolio_gap_detector)
workflow.add_node("readiness_evaluator", readiness_evaluator)
workflow.add_node("requirement_aligner", requirement_aligner)
workflow.set_entry_point("student_profile_analyzer")  # Define entrypoint
workflow.add_edge("student_profile_analyzer", "internship_matcher")
workflow.add_edge("internship_matcher", "portfolio_gap_detector")
workflow.add_edge("portfolio_gap_detector", "readiness_evaluator")
workflow.add_edge("readiness_evaluator", "requirement_aligner")
workflow.add_edge("requirement_aligner", END)
graph = workflow.compile()

# Enhanced logging for the workflow
def log_workflow_progress(step_name, state):
    """Log workflow progress"""
    logger.info(f"🔄 WORKFLOW STEP: {step_name}")
    logger.info(f"   📊 Current Step: {state.get('current_step', 'Unknown')}")
    logger.info(f"   📈 Progress: {state.get('step_progress', 0)}%")
    if state.get('error'):
        logger.error(f"   ❌ Error: {state['error']}")
    logger.info("-" * 80)

class ResumeAnalysisView(APIView):
    def post(self, request):
        try:
            logger.info("🚀 STARTING RESUME ANALYSIS WORKFLOW")
            logger.info("=" * 80)
            
            if not llm:
                return Response({
                    "error": "AI service not available. Please check API configuration."
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            resume_file = request.FILES.get("resume")
            preferences = json.loads(request.data.get("preferences", "[]"))
            user_id = getattr(request.user, 'id', None) if hasattr(request, 'user') else None
            
            if not resume_file:
                return Response({
                    "error": "Resume file is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            if not resume_file.name.lower().endswith(('.doc', '.docx')):
                return Response({
                    "error": "File must be a DOC or DOCX document"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                file_path, file_id, file_info = file_manager.save_resume(resume_file, user_id)
                logger.info(f"Resume saved with ID: {file_id}")
            except Exception as e:
                return Response({
                    "error": f"Failed to save resume: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
            try:
                doc = docx.Document(file_path)
                resume_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
                for table in doc.tables:
                    for row in table.rows:
                        for cell in row.cells:
                            if cell.text.strip():
                                resume_text += "\n" + cell.text
                if not resume_text.strip():
                    file_manager.delete_file(file_path)
                    return Response({
                        "error": "Could not extract text from DOC file"
                    }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"DOC extraction error: {str(e)}")
                file_manager.delete_file(file_path)
                return Response({
                    "error": f"Failed to process DOC file: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
            initial_state = AnalysisState(
                resume_text=resume_text,
                preferences=preferences,
                student_profile={},
                internship_recommendations=[],
                portfolio_gaps=[],
                readiness_evaluations=[],
                extraction_info={},
                processing_timestamp="",
                error="",
                current_step="Starting analysis...",
                step_progress=0,
                detailed_extraction={}
            )
            
            logger.info(f"📋 INITIAL STATE PREPARED")
            logger.info(f"   📝 Resume Text Length: {len(resume_text)} characters")
            logger.info(f"   🎯 Preferences: {preferences}")
            logger.info("=" * 80)
            
            final_state = graph.invoke(initial_state)
            
            logger.info("🏁 WORKFLOW COMPLETED")
            logger.info(f"   ✅ Success: {not final_state.get('error')}")
            if final_state.get('error'):
                logger.error(f"   ❌ Final Error: {final_state['error']}")
            else:
                logger.info(f"   📊 Internships Found: {len(final_state.get('internship_recommendations', []))}")
                logger.info(f"   🎯 Portfolio Gaps: {len(final_state.get('portfolio_gaps', []))}")
            logger.info("=" * 80)
            
            if final_state["error"]:
                return Response({
                    "error": final_state["error"],
                    "debug_info": str(final_state["error"])
                }, status=status.HTTP_400_BAD_REQUEST)
            
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
                "file_info": {
                    "file_id": file_id,
                    "processed": True,
                    "chars_extracted": len(resume_text),
                    "resume_text": resume_text[:3000] + "..." if len(resume_text) > 3000 else resume_text  # Limit to first 3000 chars for display
                }
            }
            return Response(response_data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"💥 CRITICAL WORKFLOW FAILURE: {str(e)}")
            logger.error("=" * 80)
            return Response({
                "error": str(e),
                "debug_info": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def calculate_profile_completeness(profile):
    """Calculate profile completeness percentage"""
    important_fields = ["name", "email", "skills", "education", "experience"]
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

def generate_requirements_for_domain(domain):
    """Generate requirements based on domain"""
    domain_requirements = {
        "Web Development": ["HTML", "CSS", "JavaScript", "React", "Node.js"],
        "Data Science": ["Python", "SQL", "Pandas", "Machine Learning", "Statistics"],
        "Mobile Development": ["React Native", "JavaScript", "Mobile UI", "APIs"],
        "Backend Development": ["Python", "APIs", "Databases", "Server Management"],
        "Artificial Intelligence": ["Python", "Machine Learning", "Deep Learning", "TensorFlow"],
        "Machine Learning": ["Python", "Scikit-learn", "TensorFlow", "Data Analysis"],
        "Cybersecurity": ["Network Security", "Python", "Ethical Hacking", "Security Tools"],
        "Cloud Computing": ["AWS", "Docker", "Kubernetes", "DevOps"],
        "DevOps": ["Docker", "Kubernetes", "Jenkins", "CI/CD"],
        "UI/UX Design": ["Figma", "Adobe XD", "Prototyping", "User Research"],
        "Game Development": ["Unity", "C#", "Game Design", "3D Graphics"]
    }
    
    return domain_requirements.get(domain, ["Python", "Problem Solving", "Communication"])

def enhance_extracted_profile(profile, resume_text, preferences):
    """Enhance the extracted profile with better data validation and completion"""
    
    # Enhanced name extraction if name is missing or generic
    if not profile.get('name') or profile.get('name') in ['Unknown', 'null', '']:
        profile['name'] = extract_name_with_multiple_strategies(resume_text)
    
    # Enhanced skill extraction - merge with text-based extraction
    extracted_skills = extract_comprehensive_skills(resume_text)
    existing_skills = profile.get('skills', [])
    
    # Combine and deduplicate skills
    all_skills = list(set(existing_skills + extracted_skills))
    profile['skills'] = all_skills[:25]  # Limit to 25 most relevant
    
    # Categorize skills properly
    categorized_skills = categorize_skills_intelligently(all_skills)
    profile.update(categorized_skills)
    
    # Enhanced contact information extraction
    if not profile.get('email') or profile.get('email') == 'null':
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', resume_text)
        if email_match:
            profile['email'] = email_match.group()
    
    if not profile.get('phone') or profile.get('phone') == 'null':
        phone_match = re.search(r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', resume_text)
        if phone_match:
            profile['phone'] = phone_match.group()
    
    # Infer domains from skills and experience if not present
    if not profile.get('domains') or len(profile.get('domains', [])) == 0:
        profile['domains'] = infer_domains_from_profile(profile, preferences)
    
    # Improve experience level determination
    profile['experience_level'] = determine_experience_level_enhanced(resume_text, profile)
    
    return profile

def extract_name_with_multiple_strategies(text):
    """Enhanced name extraction with multiple strategies"""
    strategies = [
        # First check if name is at the very top of the resume
        r'^([A-Z][a-zA-Z]+\s+[A-Z]\.?\s*[a-zA-Z]*)',  # Look for format "Firstname M. Lastname" or "Firstname Lastname" at start
        # Strategy 2: Look for "Name:" pattern
        r'(?:Name|Full Name):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
        # Strategy 3: Look for all caps name (header style)
        r'^([A-Z\s]+)$',
        # Strategy 4: Look for name before contact info
        r'^([A-Z][a-z]+\s+[A-Z][a-z]+).*?(?:@|phone|tel)',
        # Strategy 5: Look for name in first few lines
        r'([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*\n'
    ]
    
    lines = text.split('\n')
    first_few_lines = '\n'.join(lines[:7])  # Extend to first 7 lines as name is often at top
    
    # Try each strategy
    for strategy in strategies:
        match = re.search(strategy, first_few_lines, re.MULTILINE)
        if match:
            name = match.group(1).strip()
            # Validate name (should be 2-4 words, reasonable length)
            words = name.split()
            if 1 <= len(words) <= 4 and all(len(word) > 0 for word in words):
                # Additional check: shouldn't be common resume words
                common_words = {'resume', 'curriculum', 'vitae', 'contact', 'email', 'phone', 'address'}
                if not any(word.lower() in common_words for word in words):
                    return name
    
    # Fallback: take the very first line if it looks like a name
    first_line = lines[0].strip()
    if first_line and 1 <= len(first_line.split()) <= 4:
        return first_line
    
    return "Unknown"

# Enhanced section detection for structured resumes
def extract_comprehensive_skills(text):
    """Extract skills using comprehensive keyword matching and context analysis"""
    
    # Try to extract skills from a dedicated SKILLS section first
    skills_section_match = re.search(r'SKILLS[:\s]*(.*?)(?:\n\n|\n[A-Z]+|\Z)', text, re.DOTALL | re.IGNORECASE)
    if skills_section_match:
        skills_text = skills_section_match.group(1)
        # Extract skills by category if they're organized that way
        categories = re.findall(r'([A-Za-z]+):\s*([^:]+?)(?=\n[A-Za-z]+:|$)', skills_text, re.DOTALL)
        if categories:
            extracted_skills = []
            for category, skills_list in categories:
                skills = [skill.strip() for skill in re.split(r'[,;]|\n', skills_list) if skill.strip()]
                extracted_skills.extend(skills)
            if extracted_skills:
                return extracted_skills

    # Expanded skill database with categories
    skill_database = {
        'programming_languages': [
            'Python', 'JavaScript', 'Java', 'C++', 'C#', 'C', 'PHP', 'Ruby', 'Go', 'Rust', 
            'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB', 'Perl', 'Objective-C', 'TypeScript'
        ],
        'web_technologies': [
            'HTML', 'CSS', 'React', 'Angular', 'Vue.js', 'Vue', 'Node.js', 'Express', 'jQuery', 
            'Bootstrap', 'Sass', 'SCSS', 'Webpack', 'Babel', 'npm', 'yarn'
        ],
        'frameworks': [
            'Django', 'Flask', 'Spring', 'Spring Boot', 'Laravel', 'Ruby on Rails', 'ASP.NET',
            '.NET', 'FastAPI', 'Fastify', 'Koa', 'Express.js'
        ],
        'databases': [
            'MySQL', 'PostgreSQL', 'MongoDB', 'SQLite', 'Redis', 'Cassandra', 'Oracle', 
            'SQL Server', 'MariaDB', 'DynamoDB', 'Neo4j', 'InfluxDB'
        ],
        'cloud_devops': [
            'AWS', 'Azure', 'Google Cloud', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 
            'Travis CI', 'CircleCI', 'Terraform', 'Ansible', 'Chef', 'Puppet'
        ],
        'data_science': [
            'Pandas', 'NumPy', 'Scikit-learn', 'TensorFlow', 'PyTorch', 'Keras', 'Matplotlib', 
            'Seaborn', 'Plotly', 'Jupyter', 'Apache Spark', 'Hadoop', 'Tableau', 'Power BI'
        ],
        'tools': [
            'Git', 'GitHub', 'GitLab', 'Bitbucket', 'JIRA', 'Confluence', 'Slack', 'Trello',
            'VS Code', 'IntelliJ', 'Eclipse', 'Vim', 'Emacs', 'Sublime Text'
        ],
        'testing': [
            'Jest', 'Mocha', 'Chai', 'Selenium', 'Cypress', 'JUnit', 'PyTest', 'PHPUnit',
            'Postman', 'Insomnia', 'SoapUI'
        ],
        'mobile': [
            'React Native', 'Flutter', 'Ionic', 'Xamarin', 'Android', 'iOS', 'Swift UI', 'UIKit'
        ]
    }
    
    found_skills = []
    text_lower = text.lower()
    
    # Extract skills by category
    for category, skills in skill_database.items():
        for skill in skills:
            # Use word boundary matching for better accuracy
            pattern = r'\b' + re.escape(skill.lower()) + r'\b'
            if re.search(pattern, text_lower):
                found_skills.append(skill)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_skills = []
    for skill in found_skills:
        if skill.lower() not in seen:
            seen.add(skill.lower())
            unique_skills.append(skill)
    
    return unique_skills

def categorize_skills_intelligently(skills):
    """Categorize skills into appropriate categories"""
    
    programming_langs = []
    frameworks = []
    tools = []
    databases = []
    
    # Define category mappings
    lang_keywords = ['python', 'javascript', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'typescript']
    framework_keywords = ['react', 'angular', 'vue', 'django', 'flask', 'spring', 'laravel', 'express', 'node.js']
    tool_keywords = ['git', 'docker', 'kubernetes', 'jenkins', 'vs code', 'intellij', 'jira', 'confluence']
    db_keywords = ['mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'oracle', 'cassandra']
    
    for skill in skills:
        skill_lower = skill.lower()
        
        if any(keyword in skill_lower for keyword in lang_keywords):
            programming_langs.append(skill)
        elif any(keyword in skill_lower for keyword in framework_keywords):
            frameworks.append(skill)
        elif any(keyword in skill_lower for keyword in db_keywords):
            databases.append(skill)
        elif any(keyword in skill_lower for keyword in tool_keywords):
            tools.append(skill)
    
    return {
        'programming_languages': programming_langs,
        'frameworks': frameworks,
        'tools': tools,
        'databases': databases
    }

def infer_domains_from_profile(profile, preferences):
    """Infer domains based on skills and experience"""
    
    inferred_domains = []
    skills = [skill.lower() for skill in profile.get('skills', [])]
    
    # Domain inference rules
    domain_rules = {
        'Web Development': ['html', 'css', 'javascript', 'react', 'angular', 'vue', 'node.js', 'express'],
        'Data Science': ['python', 'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'matplotlib', 'jupyter'],
        'Mobile Development': ['react native', 'flutter', 'swift', 'kotlin', 'android', 'ios'],
        'Backend Development': ['django', 'flask', 'spring', 'express', 'api', 'sql', 'postgresql'],
        'Cloud Computing': ['aws', 'azure', 'google cloud', 'docker', 'kubernetes'],
        'Machine Learning': ['tensorflow', 'pytorch', 'scikit-learn', 'keras', 'neural network'],
        'DevOps': ['docker', 'kubernetes', 'jenkins', 'ci/cd', 'terraform', 'ansible']
    }
    
    for domain, keywords in domain_rules.items():
        if any(keyword in skills for keyword in keywords):
            inferred_domains.append(domain)
    
    # If no domains inferred and preferences provided, use preferences
    if not inferred_domains and preferences:
        inferred_domains = preferences[:2]  # Take first 2 preferences
    
    return inferred_domains if inferred_domains else ['Web Development']

def determine_experience_level_enhanced(text, profile):
    """Enhanced experience level determination"""
    
    text_lower = text.lower()
    
    # Strong indicators for each level
    senior_indicators = [
        'senior', 'lead', 'principal', 'architect', 'manager', 'director',
        '5+ years', '6+ years', '7+ years', '8+ years', '9+ years', '10+ years',
        'mentoring', 'team lead', 'technical lead'
    ]
    
    intermediate_indicators = [
        'mid-level', 'intermediate', '2-4 years', '3+ years', '4+ years',
        'experienced', 'professional', 'developer ii', 'engineer ii'
    ]
    
    entry_indicators = [
        'entry', 'junior', 'intern', 'graduate', 'fresh', 'new grad',
        '0-1 years', '1+ years', 'trainee', 'associate'
    ]
    
    # Count experience entries
    experience_count = len(profile.get('experience', []))
    education_level = len(profile.get('education', []))
    
    # Check for explicit indicators
    for indicator in senior_indicators:
        if indicator in text_lower:
            return 'senior'
    
    for indicator in intermediate_indicators:
        if indicator in text_lower:
            return 'intermediate'
    
    for indicator in entry_indicators:
        if indicator in text_lower:
            return 'entry-level'
    
    # Fallback based on experience count and other factors
    if experience_count >= 3 or any('5+' in str(exp) for exp in profile.get('experience', [])):
        return 'senior'
    elif experience_count >= 1 or education_level > 1:
        return 'intermediate'
    else:
        return 'entry-level'

def create_enhanced_fallback_profile(resume_text, preferences):
    """Create enhanced fallback profile with intelligent extraction"""
    log_agent_communication("FALLBACK_SYSTEM", "CREATING ENHANCED PROFILE")
    
    # Use enhanced extraction functions
    name = extract_name_with_multiple_strategies(resume_text)
    
    # Look specifically for dedicated skills section
    skills_section = re.search(r'SKILLS[:\s]*(.*?)(?:\n\n|\n[A-Z]+|\Z)', resume_text, re.DOTALL | re.IGNORECASE)
    skills = []
    
    if skills_section:
        skills_text = skills_section.group(1)
        # Look for categorized skills (e.g., "Computer: Word, Excel")
        categories = re.findall(r'([A-Za-z]+):\s*([^:]+?)(?=\n[A-Za-z]+:|$)', skills_text, re.DOTALL)
        
        if categories:
            for category, skills_list in categories:
                category_skills = [skill.strip() for skill in re.split(r'[,;]|\n', skills_list) if skill.strip()]
                skills.extend(category_skills)
        else:
            # If no categories, split by common delimiters
            skills = [skill.strip() for skill in re.split(r'[,;]|\n', skills_text) if skill.strip()]
    
    if not skills:  # Fallback to comprehensive skill extraction
        skills = extract_comprehensive_skills(resume_text)
    
    # Try to extract education details
    education_section = re.search(r'EDUCATION(.*?)(?:\n\n|\n[A-Z]+|\Z)', resume_text, re.DOTALL | re.IGNORECASE)
    education = []
    
    if education_section:
        edu_text = education_section.group(1)
        # Extract university name and degree
        university_match = re.search(r'([^,\n]+)(?:,\s*([^,\n]+))?', edu_text)
        degree_match = re.search(r'Bachelor[s]?\s+of\s+(?:Science|Arts|Business)\s+(?:\/[A-Za-z]+)?\s+in\s+([^,\n]+)', edu_text, re.IGNORECASE)
        gpa_match = re.search(r'GPA:\s*([0-9.]+)', edu_text)
        
        education.append({
            "institution": university_match.group(1).strip() if university_match else "Unknown",
            "degree": degree_match.group(0) if degree_match else "Degree not specified",
            "year": re.search(r'(20\d{2})', edu_text).group(1) if re.search(r'(20\d{2})', edu_text) else "",
            "gpa": gpa_match.group(1) if gpa_match else ""
        })
    
    profile = {
        "name": name,
        "email": None,
        "phone": None,
        "location": None,
        "linkedin": None,
        "github": None,
        "website": None,
        "summary": "Profile extracted from resume text",
        "skills": skills,
        "programming_languages": [],
        "frameworks": [],
        "tools": [],
        "databases": [],
        "domains": infer_domains_from_profile({'skills': skills}, preferences),
        "experience_level": "entry-level",
        "education": education,
        "experience": [],
        "projects": [],
        "certifications": [],
        "achievements": [],
        "languages": ["English"],
        "years_of_experience": "0-1"
    }
    
    # Extract contact information
    email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', resume_text)
    if email_match:
        profile["email"] = email_match.group()
    
    phone_match = re.search(r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', resume_text)
    if phone_match:
        profile["phone"] = phone_match.group()
    
    # Determine experience level
    profile["experience_level"] = determine_experience_level_enhanced(resume_text, profile)
    
    return profile

def validate_and_enhance_profile(profile, preferences):
    """Validate and enhance profile data"""
    # Ensure required fields
    profile.setdefault("name", "Unknown")
    profile.setdefault("skills", ["Python", "JavaScript"])
    profile.setdefault("domains", preferences)
    profile.setdefault("experience_level", "entry-level")
    
    # Limit skills to reasonable number
    if len(profile.get("skills", [])) > 25:
        profile["skills"] = profile["skills"][:25]
    
    # Ensure all list fields are lists
    list_fields = ["skills", "programming_languages", "frameworks", "tools", "databases", 
                   "domains", "education", "experience", "projects", "certifications", 
                   "achievements", "languages"]
    
    for field in list_fields:
        if not isinstance(profile.get(field), list):
            profile[field] = []
    
    return profile

def generate_intelligent_recommendations(profile, preferences, partial_rag_matches):
    """Generate intelligent recommendations when RAG has insufficient data"""
    recommendations = []
    
    # Use any partial RAG matches first
    for match in partial_rag_matches[:2]:
        rec = {
            "id": match.get("id", f"PARTIAL_RAG_{len(recommendations)+1}"),
            "title": match.get("title", "Software Engineering Intern"),
            "company": match.get("company", "TechCorp"),
            "domain": match.get("domain", preferences[0] if preferences else "Technology"),
            "location": match.get("location", "Remote"),
            "duration": match.get("duration", "12 weeks"),
            "stipend": match.get("stipend", "Competitive"),
            "matching_score": match.get("matching_score", 0.75),
            "justification": match.get("justification", "Matched based on profile analysis"),
            "requirements": match.get("requirements", generate_requirements_for_domain(match.get("domain", "Web Development"))),
            "preferred_skills": match.get("preferred_skills", []),
            "description": match.get("description", ""),
            "responsibilities": match.get("responsibilities", []),
            "experience_level": profile.get("experience_level", "entry-level"),
            "application_deadline": match.get("application_deadline", ""),
            "tags": match.get("tags", []),
            "qualifications": match.get("qualifications", []),
            "skill_match_percentage": calculate_skill_match(profile.get("skills", []), match.get("requirements", [])),
            "domain_match": True
        }
        recommendations.append(rec)
    
    # Generate additional recommendations based on preferences
    companies = ["TechCorp", "InnovateTech", "FutureSoft", "DataDriven Inc", "CloudNative Co", "AI Solutions"]
    
    for i, domain in enumerate(preferences[:4]):  # Max 4 additional recommendations
        if len(recommendations) >= 5:
            break
            
        company = companies[len(recommendations) % len(companies)]
        
        rec = {
            "id": f"INTELLIGENT_{len(recommendations)+1}",
            "title": f"{domain} Intern",
            "company": company,
            "domain": domain,
            "location": "Remote" if len(recommendations) % 2 == 0 else "Hybrid",
            "duration": "12 weeks",
            "stipend": "$6000-8000/month",
            "matching_score": max(0.70, 0.85 - (len(recommendations) * 0.03)),
            "justification": f"Strong alignment with {domain} preference and technical skills",
            "requirements": generate_requirements_for_domain(domain),
            "preferred_skills": ["Team Collaboration", "Problem Solving", "Learning Agility"],
            "description": f"Hands-on {domain.lower()} internship with mentorship and real project experience",
            "responsibilities": [
                "Work on real-world projects",
                "Collaborate with senior developers", 
                "Participate in code reviews",
                "Learn industry best practices"
            ],
            "experience_level": profile.get("experience_level", "entry-level"),
            "application_deadline": "2024-04-30",
            "tags": ["mentorship", "remote-friendly", "growth-oriented"],
            "skill_match_percentage": calculate_skill_match(profile.get("skills", []), generate_requirements_for_domain(domain)),
            "domain_match": True
        }
        recommendations.append(rec)
    
    return recommendations

def generate_intelligent_gaps(profile, recommendations):
    """Generate intelligent gaps based on profile and recommendations"""
    gaps = []
    
    student_skills = set([skill.lower() for skill in profile.get('skills', [])])
    all_required_skills = set()
    
    for rec in recommendations:
        req_skills = set([skill.lower() for skill in rec.get('requirements', [])])
        all_required_skills.update(req_skills)
    
    missing_skills = all_required_skills - student_skills
    
    if missing_skills:
        gaps.append({
            "gap_type": "technical",
            "title": "Missing Technical Skills",
            "description": f"Key skills required for target internships: {', '.join(list(missing_skills)[:5])}",
            "priority": "high",
            "suggested_action": "Take online courses and build projects using these technologies",
            "estimated_time": "4-6 weeks",
            "resources": ["Coursera", "Udemy", "FreeCodeCamp", "GitHub"]
        })
    
    if len(profile.get('projects', [])) < 3:
        gaps.append({
            "gap_type": "portfolio",
            "title": "Insufficient Project Portfolio",
            "description": "Need more hands-on projects to demonstrate skills and experience",
            "priority": "high",
            "suggested_action": "Build 2-3 comprehensive projects showcasing different skills",
            "estimated_time": "6-8 weeks",
            "resources": ["GitHub", "Portfolio websites", "Project ideas online"]
        })
    
    if profile.get('experience_level') == 'entry-level' and not profile.get('experience'):
        gaps.append({
            "gap_type": "experience",
            "title": "Limited Professional Experience",
            "description": "Lack of industry exposure and professional work experience",
            "priority": "medium",
            "suggested_action": "Participate in hackathons, contribute to open source, or seek part-time opportunities",
            "estimated_time": "Ongoing",
            "resources": ["HackerEarth", "GitHub Open Source", "Local meetups"]
        })
    
    return gaps

def fix_common_json_issues(json_str):
    """Fix common JSON formatting issues"""
    try:
        # Replace None with null
        json_str = re.sub(r'\bNone\b', 'null', json_str)
        
        # Replace True/False with true/false
        json_str = re.sub(r'\bTrue\b', 'true', json_str)
        json_str = re.sub(r'\bFalse\b', 'false', json_str)
        
        # Remove any trailing commas
        json_str = re.sub(r',\s*}', '}', json_str)
        json_str = re.sub(r',\s*]', ']', json_str)
        
        # Ensure proper string quoting
        json_str = re.sub(r'([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', json_str)
        
        # Fix common value quoting issues
        json_str = re.sub(r':\s*([^",\[\]{}][^,\]}]*?)(?=[,}])', lambda m: f': "{m.group(1).strip()}"', json_str)
        
        return json_str
    except Exception:
        return json_str