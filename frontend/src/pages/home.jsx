import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import {
  FileText, Brain, Target, BarChart3, Upload, Github, Clock,
  AlertCircle, Star, CheckCircle, User, Award, TrendingUp, RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';

const Home = () => {
  const { user } = useAuth();
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedResume, setUploadedResume] = useState(null);
  const [preferences, setPreferences] = useState('["Web Development", "Data Science"]');
  const [error, setError] = useState('');
  const [analysisStep, setAnalysisStep] = useState('');
  const [progress, setProgress] = useState(0);

  const quickActions = [
    {
      title: 'Resume Analysis',
      description: 'AI-powered comprehensive resume analysis',
      icon: <Brain className="w-8 h-8" />,
      color: 'from-purple-600 to-blue-600',
      onClick: () => document.getElementById('resume-upload').click()
    },
    {
      title: 'Smart Skill Mapping',
      description: 'Automatic skill extraction and mapping',
      icon: <Target className="w-8 h-8" />,
      color: 'from-green-600 to-teal-600',
      onClick: () => toast.info('Skill mapping included in resume analysis')
    },
    {
      title: 'Portfolio Intelligence',
      description: 'AI-driven portfolio gap analysis',
      icon: <Award className="w-8 h-8" />,
      color: 'from-orange-600 to-red-600',
      onClick: () => toast.info('Portfolio analysis included in resume analysis')
    },
    {
      title: 'Readiness Score',
      description: 'Comprehensive internship readiness evaluation',
      icon: <CheckCircle className="w-8 h-8" />,
      color: 'from-pink-600 to-purple-600',
      onClick: () => toast.info('Readiness score included in resume analysis')
    }
  ];

  const recentActivity = analysisResults ? [
    {
      title: 'Resume analyzed',
      time: new Date(analysisResults.processing_timestamp).toLocaleString(),
      icon: <FileText className="w-4 h-4" />,
      status: 'completed'
    },
    {
      title: `${analysisResults.internship_recommendations?.length || 0} internships matched`,
      time: new Date(analysisResults.processing_timestamp).toLocaleString(),
      icon: <Target className="w-4 h-4" />,
      status: 'completed'
    },
    {
      title: `${analysisResults.portfolio_gaps?.length || 0} portfolio gaps identified`,
      time: new Date(analysisResults.processing_timestamp).toLocaleString(),
      icon: <AlertCircle className="w-4 h-4" />,
      status: 'completed'
    }
  ] : [
    { title: 'Waiting for resume upload', time: 'Pending', icon: <Upload className="w-4 h-4" />, status: 'pending' }
  ];

  const stats = analysisResults ? [
    {
      label: 'Internships Matched',
      value: analysisResults.internship_recommendations?.length || 0,
      change: `+${analysisResults.internship_recommendations?.length || 0} new`,
      icon: <Target className="w-5 h-5" />,
      color: 'text-blue-400'
    },
    {
      label: 'Readiness Score',
      value: analysisResults.readiness_evaluations?.[0]
        ? `${Math.round(analysisResults.readiness_evaluations[0].readiness_score * 100)}%`
        : '0%',
      change: 'Latest analysis',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'text-green-400'
    },
    {
      label: 'Skills Identified',
      value: analysisResults.student_profile?.skills?.length || 0,
      change: `+${analysisResults.student_profile?.skills?.length || 0}`,
      icon: <Brain className="w-5 h-5" />,
      color: 'text-purple-400'
    },
    {
      label: 'Portfolio Gaps',
      value: analysisResults.portfolio_gaps?.length || 0,
      change: 'To improve',
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'text-orange-400'
    }
  ] : [
    { label: 'Internships Matched', value: '0', change: 'Upload resume to start', icon: <Target className="w-5 h-5" />, color: 'text-gray-400' },
    { label: 'Readiness Score', value: '0%', change: 'Analysis pending', icon: <BarChart3 className="w-5 h-5" />, color: 'text-gray-400' },
    { label: 'Skills Identified', value: '0', change: 'Analysis pending', icon: <Brain className="w-5 h-5" />, color: 'text-gray-400' },
    { label: 'Portfolio Gaps', value: '0', change: 'Analysis pending', icon: <AlertCircle className="w-5 h-5" />, color: 'text-gray-400' }
  ];

  const validateFile = (file) => {
    const errors = [];
    if (!file) errors.push('Please select a file');
    if (file && !['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
      errors.push('File must be a DOC or DOCX document');
    }
    if (file && file.size > 5 * 1024 * 1024) errors.push('File size must be less than 5MB');
    if (file && file.size < 1024) errors.push('File seems too small to be a valid resume');
    return errors;
  };

  const validatePreferences = (prefs) => {
    try {
      const parsed = JSON.parse(prefs || '[]');
      if (!Array.isArray(parsed)) throw new Error('Preferences must be an array');
      return parsed.filter(p => typeof p === 'string' && p.trim());
    } catch {
      return [];
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    const fileErrors = validateFile(file);
    if (fileErrors.length > 0) {
      setError(fileErrors.join('. '));
      toast.error(fileErrors[0]);
      return;
    }
    setUploadedResume(file);
    setError('');
    await analyzeResume(file);
  };

  const analyzeResume = async (file) => {
    setIsAnalyzing(true);
    setError('');
    setProgress(0);

    const validatedPrefs = validatePreferences(preferences);
    if (!validatedPrefs.length) {
      setError('Please provide valid preferences in JSON array format');
      toast.error('Invalid preferences format');
      setIsAnalyzing(false);
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('preferences', JSON.stringify(validatedPrefs));

    const steps = [
      'Uploading resume...',
      'Extracting text content...',
      'Analyzing student profile...',
      'Matching internships...',
      'Identifying portfolio gaps...',
      'Evaluating readiness...',
      'Finalizing recommendations...'
    ];

    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      if (stepIndex < steps.length) {
        setAnalysisStep(steps[stepIndex]);
        setProgress((stepIndex / steps.length) * 90);
        stepIndex++;
      }
    }, 3000);

    try {
      const response = await axios.post(
        'http://127.0.0.1:8000/api/analyze/resume/',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 180000,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            if (percentCompleted < 100) {
              setProgress(Math.min(15, percentCompleted / 10));
              setAnalysisStep(`Uploading... ${percentCompleted}%`);
            }
          }
        }
      );

      clearInterval(stepInterval);

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setAnalysisStep(response.data.current_step || 'Analysis complete!');
      setProgress(100);
      setAnalysisResults(response.data);
      toast.success('Resume analyzed successfully!');

      if (response.data.detailed_extraction) {
        const extraction = response.data.detailed_extraction;
        const info = [
          `${extraction.total_words} words processed`,
          `${response.data.internship_recommendations?.length || 0} internships matched`,
          `${extraction.sections_detected?.length || 0} resume sections detected`,
          response.data.extraction_info.email_found ? '✓ Contact info found' : '⚠️ Add contact information'
        ].filter(Boolean);

        setTimeout(() => {
          toast.info(`Analysis summary: ${info.join(' • ')}`);
        }, 1000);
      }

    } catch (err) {
      clearInterval(stepInterval);

      let errorMessage = 'Analysis failed. Please try again.';

      if (err.response?.status === 400) {
        errorMessage = err.response.data.error || 'Invalid file or data format';
      } else if (err.response?.status === 503) {
        errorMessage = 'AI service temporarily unavailable';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Analysis timeout. Please try with a smaller file.';
      } else {
        errorMessage = err.response?.data?.error || err.message || 'Unknown error occurred';
      }

      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);

      if (err.response?.data?.debug_info) {
        console.error('Debug info:', err.response.data.debug_info);
      }

      setProgress(0);
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setAnalysisStep(''), 3000);
    }
  };

  const retryAnalysis = () => {
    if (uploadedResume) {
      analyzeResume(uploadedResume);
    } else {
      toast.error('Please upload a resume first');
    }
  };

  const resetAnalysis = () => {
    setAnalysisResults(null);
    setUploadedResume(null);
    setError('');
    setPreferences('["Web Development", "Data Science"]');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-4xl font-bold mb-2">
            Welcome to InternAI, {user?.first_name || 'Student'}! 🤖
          </h2>
          <p className="text-blue-400 text-lg">
            AI-powered resume analysis for internship matching.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4 hover:bg-gray-800/20 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">{stat.label}</h3>
                <div className={stat.color}>{stat.icon}</div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold">{stat.value}</p>
                <span className="text-green-500 text-sm">{stat.change}</span>
              </div>
            </div>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {!analysisResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-8">
                  <div className="text-center mb-6">
                    <Brain className="w-16 h-16 mx-auto text-blue-400 mb-4" />
                    <h3 className="text-2xl font-bold mb-2">Resume Analysis</h3>
                    <p className="text-gray-400">
                      Upload your resume to match with internships.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-1 gap-4">
                      <input
                        type="text"
                        value={preferences}
                        onChange={(e) => setPreferences(e.target.value)}
                        placeholder='["Web Development", "AI"]'
                        className="p-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:border-blue-500"
                      />
                    </div>
                    <label className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-blue-500 transition-colors block cursor-pointer">
                      <input
                        id="resume-upload"
                        type="file"
                        accept=".doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isAnalyzing}
                      />
                      <div className="space-y-2">
                        <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50">
                          {isAnalyzing ? (
                            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-5 h-5 mr-2" />
                          )}
                          {isAnalyzing ? 'Processing...' : 'Upload Resume'}
                        </div>
                        <p className="text-sm text-gray-400">
                          Max 5MB, DOC/DOCX only.
                        </p>
                      </div>
                    </label>
                    {error && (
                      <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-center justify-between">
                        <div className="flex items-center">
                          <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                          <p className="text-red-400">{error}</p>
                        </div>
                        <button
                          onClick={retryAnalysis}
                          className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded text-sm"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                    {isAnalyzing && (
                      <div className="mt-6 text-center">
                        <div className="inline-flex items-center text-blue-400 mb-3">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400 mr-3"></div>
                          <span className="font-medium">{analysisStep || 'Initializing...'}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                          <div
                            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-400">
                          Processing may take up to 60 seconds.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            {analysisResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="w-6 h-6 text-blue-400 mr-3" />
                    <div>
                      <h3 className="font-semibold text-blue-400">Analysis Complete!</h3>
                      <p className="text-sm text-gray-400">
                        Results generated successfully.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={resetAnalysis}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
                  >
                    New Analysis
                  </button>
                </div>

                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-green-400" />
                    Resume Text Extraction
                  </h3>

                  <div className="bg-gray-800/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-300">Extracted Content</h4>
                      <span className="text-xs text-gray-400">
                        {analysisResults.detailed_extraction?.total_characters || 0} characters
                      </span>
                    </div>
                    <div className="max-h-40 overflow-y-auto bg-gray-900/50 p-3 rounded text-sm text-gray-300 whitespace-pre-wrap border">
                      {analysisResults.file_info?.resume_text ||
                        "Resume text will be displayed here after extraction..."}
                    </div>
                  </div>

                  {analysisResults.detailed_extraction && (
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-gray-800/30 rounded-lg p-3">
                        <p className="text-gray-400 text-xs mb-1">Document Statistics</p>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span>Words:</span>
                            <span className="font-mono">{analysisResults.detailed_extraction.total_words}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Characters:</span>
                            <span className="font-mono">{analysisResults.detailed_extraction.total_characters}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Lines:</span>
                            <span className="font-mono">{analysisResults.detailed_extraction.total_lines}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Paragraphs:</span>
                            <span className="font-mono">{analysisResults.detailed_extraction.paragraphs}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-3">
                        <p className="text-gray-400 text-xs mb-1">Contact Detection</p>
                        <div className="text-sm space-y-1">
                          <div className={`flex items-center justify-between ${analysisResults.detailed_extraction.email_patterns_found > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            <span>📧 Email:</span>
                            <span className="font-mono">{analysisResults.detailed_extraction.email_patterns_found}</span>
                          </div>
                          <div className={`flex items-center justify-between ${analysisResults.detailed_extraction.phone_patterns_found > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            <span>📱 Phone:</span>
                            <span className="font-mono">{analysisResults.detailed_extraction.phone_patterns_found}</span>
                          </div>
                          <div className={`flex items-center justify-between ${analysisResults.detailed_extraction.url_patterns_found > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                            <span>🔗 URLs:</span>
                            <span className="font-mono">{analysisResults.detailed_extraction.url_patterns_found}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-3">
                        <p className="text-gray-400 text-xs mb-1">Resume Sections</p>
                        <div className="flex flex-wrap gap-1">
                          {analysisResults.detailed_extraction.sections_detected?.length > 0 ? (
                            analysisResults.detailed_extraction.sections_detected.map((section, idx) => (
                              <span key={idx} className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded">
                                {section}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs italic">No standard sections detected</span>
                          )}
                        </div>
                        {analysisResults.detailed_extraction.sections_detected?.length > 0 && (
                          <div className="mt-2 text-xs text-gray-400">
                            {analysisResults.detailed_extraction.sections_detected.length} sections found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2 text-blue-400" />
                    Profile Summary
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Name</p>
                      <p className="font-semibold">{analysisResults.student_profile?.name || 'Not detected'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Experience Level</p>
                      <p className="font-semibold capitalize">{analysisResults.student_profile?.experience_level || 'Entry-level'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Contact Info</p>
                      <div className="text-sm space-y-1">
                        {analysisResults.student_profile?.email && (
                          <div className="text-blue-300">📧 {analysisResults.student_profile.email}</div>
                        )}
                        {analysisResults.student_profile?.education && (
                          <div className="text-green-300">🎓 {analysisResults.student_profile.education}</div>
                        )}
                        {!analysisResults.student_profile?.email && (
                          <div className="text-gray-400">No email detected</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Skills ({analysisResults.student_profile?.skills?.length || 0})</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysisResults.student_profile?.skills?.slice(0, 6).map((skill, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-600/20 text-blue-300 text-xs rounded">
                            {skill}
                          </span>
                        ))}
                        {(analysisResults.student_profile?.skills?.length || 0) > 6 && (
                          <span className="px-2 py-1 bg-gray-600/20 text-gray-300 text-xs rounded">
                            +{analysisResults.student_profile.skills.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>

                    {analysisResults.student_profile?.projects && analysisResults.student_profile.projects.length > 0 && (
                      <div className="md:col-span-2">
                        <p className="text-gray-400 text-sm">Projects ({analysisResults.student_profile.projects.length})</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {analysisResults.student_profile.projects.slice(0, 4).map((project, idx) => (
                            <span key={idx} className="px-2 py-1 bg-green-600/20 text-green-300 text-xs rounded">
                              {project}
                            </span>
                          ))}
                          {analysisResults.student_profile.projects.length > 4 && (
                            <span className="px-2 py-1 bg-gray-600/20 text-gray-300 text-xs rounded">
                              +{analysisResults.student_profile.projects.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {analysisResults.student_profile?.certifications && analysisResults.student_profile.certifications.length > 0 && (
                      <div className="md:col-span-2">
                        <p className="text-gray-400 text-sm">Certifications ({analysisResults.student_profile.certifications.length})</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {analysisResults.student_profile.certifications.map((cert, idx) => (
                            <span key={idx} className="px-2 py-1 bg-yellow-600/20 text-yellow-300 text-xs rounded">
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-purple-400" />
                    Internship Recommendations
                  </h3>
                  <div className="space-y-4">
                    {analysisResults.internship_recommendations?.map((rec, index) => (
                      <div key={index} className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/50 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-lg">{rec.title}</h4>
                              <span className="px-2 py-1 bg-blue-600/20 text-blue-300 text-xs rounded">
                                {rec.domain}
                              </span>
                            </div>
                            <p className="text-purple-400 font-medium">{rec.company}</p>
                          </div>
                          <div className="flex items-center bg-gray-700/50 px-3 py-1 rounded-lg">
                            <Star className="w-4 h-4 text-yellow-400 mr-1" />
                            <span className="font-bold">{(rec.matching_score * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm mb-3">{rec.justification}</p>
                        <div className="flex flex-wrap gap-2">
                          {rec.requirements?.map((req, idx) => (
                            <span key={idx} className="px-2 py-1 bg-emerald-600/20 text-emerald-300 text-xs rounded">
                              {req}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 text-red-400" />
                    Portfolio Gaps
                  </h3>
                  <div className="space-y-3">
                    {analysisResults.portfolio_gaps?.map((gap, index) => (
                      <div key={index} className="bg-gray-800/30 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold capitalize">{gap.gap_type} Gap</h4>
                              <span className={`px-2 py-1 text-xs rounded-lg ${
                                gap.priority === 'high' ? 'bg-red-600/20 text-red-300' :
                                gap.priority === 'medium' ? 'bg-yellow-600/20 text-yellow-300' :
                                'bg-green-600/20 text-green-300'
                              }`}>
                                {gap.priority} priority
                              </span>
                            </div>
                            <p className="text-gray-300 text-sm mb-2">{gap.description}</p>
                            <div className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                              <p className="text-green-400 text-sm font-medium">{gap.suggested_action}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-green-400" />
                    Extraction Details
                  </h3>
                  {analysisResults.detailed_extraction && (
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-gray-800/30 rounded-lg p-3">
                        <p className="text-gray-400 text-xs">Document Stats</p>
                        <div className="text-sm space-y-1">
                          <div>{analysisResults.detailed_extraction.total_words} words</div>
                          <div>{analysisResults.detailed_extraction.total_characters} characters</div>
                          <div>{analysisResults.detailed_extraction.paragraphs} paragraphs</div>
                        </div>
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-3">
                        <p className="text-gray-400 text-xs">Contact Information</p>
                        <div className="text-sm space-y-1">
                          <div className={analysisResults.detailed_extraction.email_patterns_found > 0 ? 'text-green-400' : 'text-red-400'}>
                            📧 {analysisResults.detailed_extraction.email_patterns_found} email(s)
                          </div>
                          <div className={analysisResults.detailed_extraction.phone_patterns_found > 0 ? 'text-green-400' : 'text-red-400'}>
                            📱 {analysisResults.detailed_extraction.phone_patterns_found} phone(s)
                          </div>
                          <div className={analysisResults.detailed_extraction.url_patterns_found > 0 ? 'text-green-400' : 'text-gray-400'}>
                            🔗 {analysisResults.detailed_extraction.url_patterns_found} URL(s)
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-3">
                        <p className="text-gray-400 text-xs">Sections Found</p>
                        <div className="flex flex-wrap gap-1">
                          {analysisResults.detailed_extraction.sections_detected?.length > 0 ? (
                            analysisResults.detailed_extraction.sections_detected.map((section, idx) => (
                              <span key={idx} className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded">
                                {section}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">No standard sections detected</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Name</p>
                      <p className="font-semibold">{analysisResults.student_profile?.name || 'Not detected'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Experience Level</p>
                      <p className="font-semibold capitalize">{analysisResults.student_profile?.experience_level || 'Entry-level'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Contact Info</p>
                      <div className="text-sm space-y-1">
                        {analysisResults.student_profile?.email && (
                          <div className="text-blue-300">📧 {analysisResults.student_profile.email}</div>
                        )}
                        {analysisResults.student_profile?.education && (
                          <div className="text-green-300">🎓 {analysisResults.student_profile.education}</div>
                        )}
                        {!analysisResults.student_profile?.email && (
                          <div className="text-gray-400">No email detected</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Skills ({analysisResults.student_profile?.skills?.length || 0})</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysisResults.student_profile?.skills?.slice(0, 6).map((skill, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-600/20 text-blue-300 text-xs rounded">
                            {skill}
                          </span>
                        ))}
                        {(analysisResults.student_profile?.skills?.length || 0) > 6 && (
                          <span className="px-2 py-1 bg-gray-600/20 text-gray-300 text-xs rounded">
                            +{analysisResults.student_profile.skills.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {!analysisResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-2xl font-bold mb-6">AI-Powered Features</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {quickActions.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      className="group cursor-pointer"
                      onClick={item.onClick}
                    >
                      <div className="block p-6 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl hover:border-blue-500/50 transition-all">
                        <div className={`inline-flex p-3 bg-gradient-to-r ${item.color} rounded-lg mb-4 group-hover:scale-110 transition-transform`}>
                          <div className="text-white">{item.icon}</div>
                        </div>
                        <h4 className="text-xl font-semibold mb-2">{item.title}</h4>
                        <p className="text-gray-400">{item.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-400" />
                Analysis Progress
              </h3>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg">
                    <div className={`${activity.status === 'completed' ? 'text-blue-400' : 'text-gray-400'}`}>
                      {activity.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-gray-400">{activity.time}</p>
                    </div>
                    {activity.status === 'completed' && (
                      <CheckCircle className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                ))}
              </div>
              {analysisResults?.detailed_extraction && (
                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-300 mb-2">Processing Summary</h4>
                  <div className="text-xs text-blue-200 space-y-1">
                    <div>✓ {analysisResults.detailed_extraction.total_words} words analyzed</div>
                    <div>✓ {analysisResults.extraction_info.skills_count} skills extracted</div>
                    <div>✓ {analysisResults.extraction_info.projects_count} projects identified</div>
                    <div>✓ {analysisResults.internship_recommendations?.length || 0} internships matched</div>
                    <div>✓ {analysisResults.detailed_extraction.sections_detected?.length || 0} resume sections detected</div>
                  </div>
                  {analysisResults.current_step && (
                    <div className="mt-3 pt-2 border-t border-blue-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-300">Status:</span>
                        <span className="text-xs text-blue-200">{analysisResults.current_step}</span>
                      </div>
                      {analysisResults.step_progress && (
                        <div className="mt-1">
                          <div className="w-full bg-blue-900/30 rounded-full h-1">
                            <div
                              className="bg-blue-400 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${analysisResults.step_progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {analysisResults?.readiness_evaluations?.[0] && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                  Next Steps
                </h3>
                <div className="space-y-3">
                  {analysisResults.readiness_evaluations[0].next_steps?.map((step, index) => (
                    <div key={index} className="p-3 bg-gray-800/30 rounded-lg">
                      <p className="text-sm font-medium">{step}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-blue-400 mr-2" />
                    <p className="text-sm text-blue-300">
                      Timeline: {analysisResults.readiness_evaluations[0].timeline}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
