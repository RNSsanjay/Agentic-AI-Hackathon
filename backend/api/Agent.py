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
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.3)
    logger.info("Gemini API initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Gemini API: {str(e)}")
    llm = None

# Mock skills data (removed GitHub-specific skills)
common_skills = ["Python", "JavaScript", "HTML", "CSS", "React", "Node.js", "Java", "C++", "SQL"]

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

# Agent 1: Student Profile Analyzer
def student_profile_analyzer(state: AnalysisState) -> AnalysisState:
    logger.info("Running Student Profile Analyzer")
    state["current_step"] = "Analyzing student profile..."
    state["step_progress"] = 20
    
    try:
        resume_text = state["resume_text"]
        
        # Extract detailed information first
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
        
        # Detect resume sections
        common_sections = ['education', 'experience', 'skills', 'projects', 'certifications', 'awards']
        for section in common_sections:
            if section.lower() in resume_text.lower():
                detailed_extraction["sections_detected"].append(section.title())
        
        state["detailed_extraction"] = detailed_extraction
        
        # Simplified prompt for better parsing
        prompt_text = f"""
Extract information from this resume and return ONLY a valid JSON object:

Resume Text (first 2000 chars): {resume_text[:2000]}

Return JSON with this exact structure:
{{
    "name": "extracted name or Unknown",
    "skills": ["skill1", "skill2"],
    "domains": ["domain1", "domain2"],
    "email": "email@example.com or null",
    "experience_level": "entry-level",
    "projects": ["project1", "project2"],
    "education": "degree/institution or null",
    "certifications": ["cert1", "cert2"]
}}
"""
        
        try:
            response = llm.invoke(prompt_text)
            result_text = response.content if hasattr(response, 'content') else str(response)
            
            # Clean the response
            result_text = result_text.strip()
            if result_text.startswith('```json'):
                result_text = result_text[7:-3].strip()
            elif result_text.startswith('```'):
                result_text = result_text[3:-3].strip()
            
            # Extract JSON using regex as fallback
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                result_text = json_match.group()
            
            profile = json.loads(result_text)
        except Exception as e:
            logger.warning(f"Profile parsing failed: {e}, using fallback")
            profile = {
                "name": "Unknown",
                "skills": ["Python", "JavaScript"],
                "domains": state["preferences"],
                "email": None,
                "experience_level": "entry-level",
                "projects": [],
                "education": None,
                "certifications": []
            }
        
        # Ensure skills are valid
        skills = profile.get("skills", [])
        profile["skills"] = skills[:10]  # Limit to 10 skills
        profile["domains"] = profile.get("domains", state["preferences"])
        
        state["student_profile"] = profile
        state["extraction_info"] = {
            "chars_extracted": len(resume_text),
            "paragraphs_extracted": resume_text.count('\n\n') + 1,
            "email_found": bool(profile.get("email")),
            "phone_found": detailed_extraction["phone_patterns_found"] > 0,
            "skills_count": len(profile.get("skills", [])),
            "projects_count": len(profile.get("projects", [])),
            "sections_found": detailed_extraction["sections_detected"]
        }
        
        state["current_step"] = "Profile analysis completed"
        state["step_progress"] = 40
        return state
    except Exception as e:
        logger.error(f"Profile analysis error: {e}")
        state["error"] = f"Profile analysis failed: {str(e)}"
        return state

# Agent 2: Internship Matcher (Updated with RAG)
def internship_matcher(state: AnalysisState) -> AnalysisState:
    logger.info("Running Internship Matcher with RAG")
    state["current_step"] = "Matching internships using RAG system..."
    state["step_progress"] = 60
    
    try:
        profile = state["student_profile"]
        preferences = state["preferences"]
        
        # Use RAG system for internship matching
        rag_matches = internship_rag.find_matching_internships(
            profile=profile,
            preferences=preferences,
            top_k=5
        )
        
        recommendations = []
        
        if rag_matches:
            # Convert RAG matches to our format
            for match in rag_matches[:3]:  # Take top 3
                recommendation = {
                    "id": match.get("id", ""),
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
                    "tags": match.get("tags", [])
                }
                recommendations.append(recommendation)
        
        # Fallback if RAG doesn't return enough results
        while len(recommendations) < 3:
            fallback_rec = {
                "id": f"FALLBACK{len(recommendations) + 1}",
                "title": "Software Engineering Intern",
                "company": "TechCorp",
                "domain": preferences[0] if preferences else "Web Development",
                "location": "Remote",
                "duration": "12 weeks",
                "stipend": "Competitive",
                "matching_score": 0.70,
                "justification": "Profile shows potential for software development role",
                "requirements": ["Python", "Communication Skills", "Problem Solving"],
                "preferred_skills": ["Git", "Databases"],
                "description": "Entry-level software development position",
                "responsibilities": ["Code development", "Testing", "Documentation"],
                "experience_level": "entry-level",
                "application_deadline": "2024-04-30",
                "tags": ["entry-level", "mentorship"]
            }
            recommendations.append(fallback_rec)
        
        state["internship_recommendations"] = recommendations
        state["current_step"] = f"Found {len(recommendations)} matching internships using RAG"
        
        # Log RAG performance
        if rag_matches:
            avg_score = sum(r["matching_score"] for r in recommendations) / len(recommendations)
            logger.info(f"RAG matching completed with average score: {avg_score:.3f}")
        
        return state
        
    except Exception as e:
        logger.error(f"RAG-based internship matching error: {str(e)}")
        # Fallback to original logic
        state["current_step"] = "Using fallback internship matching..."
        
        recommendations = [
            {
                "id": "FALLBACK1",
                "title": "Software Engineering Intern",
                "company": "TechCorp",
                "domain": preferences[0] if preferences else "Web Development",
                "location": "Remote",
                "matching_score": 0.75,
                "justification": "Fallback recommendation based on preferences",
                "requirements": ["Python", "Communication Skills"],
                "description": "Entry-level software development position"
            }
        ]
        
        state["internship_recommendations"] = recommendations
        return state

# Agent 3: Portfolio Gap Detector
def portfolio_gap_detector(state: AnalysisState) -> AnalysisState:
    logger.info("Running Portfolio Gap Detector")
    state["current_step"] = "Identifying portfolio gaps..."
    state["step_progress"] = 75
    
    try:
        profile = state["student_profile"]
        recommendations = state["internship_recommendations"]
        
        prompt_text = f"""
Student has skills: {', '.join(profile.get('skills', []))}
Applying for: {', '.join([r['title'] for r in recommendations])}

Identify 2-3 portfolio gaps. Return ONLY valid JSON array:
[
    {{
        "gap_type": "technical",
        "description": "Missing advanced JavaScript frameworks",
        "priority": "high",
        "suggested_action": "Build a React.js project"
    }}
]
"""
        
        try:
            response = llm.invoke(prompt_text)
            result_text = response.content if hasattr(response, 'content') else str(response)
            
            # Clean and extract JSON
            result_text = result_text.strip()
            if result_text.startswith('```json'):
                result_text = result_text[7:-3].strip()
            elif result_text.startswith('```'):
                result_text = result_text[3:-3].strip()
            
            json_match = re.search(r'\[.*\]', result_text, re.DOTALL)
            if json_match:
                result_text = json_match.group()
            
            gaps = json.loads(result_text)
            
            # Validate gaps
            for gap in gaps:
                gap.setdefault('gap_type', 'technical')
                gap.setdefault('description', 'Skill enhancement needed')
                gap.setdefault('priority', 'medium')
                gap.setdefault('suggested_action', 'Practice and build projects')
                
        except Exception as e:
            logger.warning(f"Gap detection parsing failed: {e}, using fallback")
            gaps = [
                {
                    "gap_type": "technical",
                    "description": "Need more hands-on project experience",
                    "priority": "high",
                    "suggested_action": "Build 2-3 portfolio projects"
                },
                {
                    "gap_type": "experience",
                    "description": "Limited industry exposure",
                    "priority": "medium",
                    "suggested_action": "Participate in hackathons or open source"
                }
            ]
        
        state["portfolio_gaps"] = gaps
        state["current_step"] = "Gap analysis completed"
        return state
    except Exception as e:
        logger.error(f"Portfolio gap detection error: {e}")
        state["error"] = f"Portfolio gap detection failed: {str(e)}"
        return state

# Agent 4: Readiness Evaluator
def readiness_evaluator(state: AnalysisState) -> AnalysisState:
    logger.info("Running Readiness Evaluator")
    state["current_step"] = "Evaluating internship readiness..."
    state["step_progress"] = 90
    
    try:
        profile = state["student_profile"]
        recommendations = state["internship_recommendations"]
        gaps = state["portfolio_gaps"]
        
        prompt_text = f"""
Student profile: {json.dumps(profile)}
Gaps identified: {len(gaps)} areas to improve

Evaluate readiness. Return ONLY valid JSON array:
[
    {{
        "internship_title": "{recommendations[0]['title'] if recommendations else 'Software Intern'}",
        "readiness_score": 0.75,
        "next_steps": ["Build portfolio project", "Practice coding"],
        "timeline": "2-3 months"
    }}
]
"""
        
        try:
            response = llm.invoke(prompt_text)
            result_text = response.content if hasattr(response, 'content') else str(response)
            
            # Clean and extract JSON
            result_text = result_text.strip()
            if result_text.startswith('```json'):
                result_text = result_text[7:-3].strip()
            elif result_text.startswith('```'):
                result_text = result_text[3:-3].strip()
            
            json_match = re.search(r'\[.*\]', result_text, re.DOTALL)
            if json_match:
                result_text = json_match.group()
            
            evaluations = json.loads(result_text)
            
        except Exception as e:
            logger.warning(f"Readiness parsing failed: {e}, using fallback")
            evaluations = [
                {
                    "internship_title": recommendations[0]['title'] if recommendations else "Software Engineering Intern",
                    "readiness_score": 0.70,
                    "next_steps": [
                        "Build 2-3 portfolio projects",
                        "Practice technical interviews",
                        "Strengthen core programming skills"
                    ],
                    "timeline": "2-3 months of focused preparation"
                }
            ]
        
        state["readiness_evaluations"] = evaluations
        state["current_step"] = "Readiness evaluation completed"
        return state
    except Exception as e:
        logger.error(f"Readiness evaluation error: {e}")
        state["error"] = f"Readiness evaluation failed: {str(e)}"
        return state

# Agent 5: Requirement Aligner
def requirement_aligner(state: AnalysisState) -> AnalysisState:
    logger.info("Running Requirement Aligner")
    state["current_step"] = "Finalizing recommendations..."
    state["step_progress"] = 100
    
    try:
        recommendations = state["internship_recommendations"]
        profile = state["student_profile"]
        
        # Add requirements to each recommendation
        common_requirements = ["Communication Skills", "Problem Solving", "Teamwork"]
        
        for i, rec in enumerate(recommendations):
            try:
                # Generate domain-specific requirements
                domain = rec.get('domain', 'General')
                if 'web' in domain.lower() or 'frontend' in rec.get('title', '').lower():
                    tech_requirements = ["HTML", "CSS", "JavaScript", "React"]
                elif 'data' in domain.lower() or 'science' in domain.lower():
                    tech_requirements = ["Python", "SQL", "Pandas", "Machine Learning"]
                elif 'backend' in rec.get('title', '').lower():
                    tech_requirements = ["Python", "APIs", "Databases", "Server Management"]
                else:
                    tech_requirements = ["Python", "Git", "Problem Solving"]
                
                rec["requirements"] = tech_requirements + common_requirements
                
            except Exception as e:
                logger.warning(f"Failed to align requirements for recommendation {i}: {e}")
                rec["requirements"] = ["Python", "Communication Skills", "Problem Solving"]
        
        state["internship_recommendations"] = recommendations
        state["processing_timestamp"] = datetime.utcnow().isoformat()
        state["current_step"] = "Analysis completed successfully!"
        return state
    except Exception as e:
        logger.error(f"Requirement alignment error: {str(e)}")
        # Don't fail the entire process for this step
        for rec in state["internship_recommendations"]:
            rec.setdefault("requirements", ["Python", "Communication Skills"])
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

class ResumeAnalysisView(APIView):
    def post(self, request):
        try:
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
            
            final_state = graph.invoke(initial_state)
            file_manager.delete_file(file_path)
            
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
            logger.error(f"API error: {str(e)}")
            return Response({
                "error": str(e),
                "debug_info": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)