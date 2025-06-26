import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Brain, Target, BarChart3, Upload, Github, Clock, AlertCircle, Star, CheckCircle, User, Award, TrendingUp, RefreshCw, Eye, EyeOff, MessageSquare, Activity, Zap, ChevronDown, ChevronUp, Code, Database, Globe, Briefcase, Mail, Phone, MapPin, Calendar, ExternalLink, Copy, Download, Share2, Building, DollarSign, Timer, Sparkles, ArrowRight, BookmarkPlus, Filter, Search, Heart, Users, Laptop } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';

// Constants
const AVAILABLE_DOMAINS = [
  'Web Development', 'Data Science', 'Mobile Development', 'Backend Development',
  'Frontend Development', 'Artificial Intelligence', 'Machine Learning', 'Cloud Computing',
  'Cybersecurity', 'DevOps', 'Game Development', 'Blockchain', 'IoT (Internet of Things)',
  'UI/UX Design', 'Quality Assurance', 'Database Administration', 'Network Engineering',
  'Product Management', 'Digital Marketing', 'Financial Technology'
];

const QUICK_ACTIONS = [
  {
    title: 'Resume Analysis',
    description: 'AI-powered comprehensive resume analysis',
    icon: <Brain className="w-8 h-8" />,
    color: 'from-purple-600 to-blue-600',
    onClick: () => document.getElementById('resume-upload')?.click()
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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    transition: { duration: 2, repeat: Infinity }
  }
};

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedResume, setUploadedResume] = useState(null);
  const [selectedPreferences, setSelectedPreferences] = useState(['Web Development', 'Data Science']);
  const [githubLink, setGithubLink] = useState('');
  const [error, setError] = useState('');
  const [analysisStep, setAnalysisStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [showAgentComm, setShowAgentComm] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState(null);
  const [showFullText, setShowFullText] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [internships, setInternships] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch internships (always needed for available count)
      const internshipsResponse = await axios.get('http://127.0.0.1:8000/api/internships/');
      if (internshipsResponse.data.status === 'success') {
        setInternships(internshipsResponse.data.internships);
      }

      // Only fetch dashboard stats to check if using_real_data is true
      // If no real analysis data exists, we'll show zeros
      const statsResponse = await axios.get('http://127.0.0.1:8000/api/dashboard/stats/');
      if (statsResponse.data.status === 'success') {
        // Only set dashboardStats if there's real analysis data, otherwise keep it null for zero state
        if (statsResponse.data.stats.using_real_data) {
          setDashboardStats(statsResponse.data.stats);
        } else {
          setDashboardStats(null); // Force zero state when no real analysis data
        }
      }

      // Fetch recent activity
      const activityResponse = await axios.get('http://127.0.0.1:8000/api/activity/');
      if (activityResponse.data.status === 'success') {
        setRecentActivity(activityResponse.data.activity);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // ⚡ REAL-TIME DASHBOARD STATS LOGIC ⚡
  // Priority: 1) Fresh analysis results (analysisResults) 2) Zero state (no database fallback)
  // This ensures home page shows real-time analysis data immediately, not stale DB values
  const dashboardStatsData = analysisResults ? [
    // PRIORITY #1: Fresh analysis results - show real-time data
    {
      label: 'Readiness Score',
      value: analysisResults.readiness_evaluations?.[0]
        ? `${Math.round(analysisResults.readiness_evaluations[0].readiness_score * 100) ||
        Math.round(analysisResults.readiness_evaluations[0].overall_score * 100) ||
        Math.round(analysisResults.readiness_evaluations[0].internship_readiness_score * 100) || 75}%`
        : '75%',
      change: 'Real-time analysis result',
      icon: <Star className="w-5 h-5" />,
      color: 'text-yellow-400',
      bgColor: 'from-yellow-600/20 to-yellow-400/20'
    },
    {
      label: 'Internship Matches',
      value: analysisResults.internship_recommendations?.length || 0,
      change: 'Live matching results',
      icon: <Target className="w-5 h-5" />,
      color: 'text-green-400',
      bgColor: 'from-green-600/20 to-green-400/20'
    },
    {
      label: 'Gaps Detected',
      value: analysisResults.portfolio_gaps?.length || 0,
      change: 'Current analysis gaps',
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'text-red-400',
      bgColor: 'from-red-600/20 to-red-400/20'
    },
    {
      label: 'Skills Identified',
      value: analysisResults.student_profile?.skills?.length || 0,
      change: 'Extracted from resume',
      icon: <Brain className="w-5 h-5" />,
      color: 'text-purple-400',
      bgColor: 'from-purple-600/20 to-purple-400/20'
    }
  ] : [
    // PRIORITY #2: Zero state - always show zeros when no analysis results
    // No database fallback to ensure clean zero state
    {
      label: 'Readiness Score',
      value: '0%',
      change: 'Upload resume to analyze',
      icon: <Star className="w-5 h-5" />,
      color: 'text-gray-400',
      bgColor: 'from-gray-600/20 to-gray-400/20'
    },
    {
      label: 'Internship Matches',
      value: '0',
      change: 'Upload resume to find matches',
      icon: <Target className="w-5 h-5" />,
      color: 'text-gray-400',
      bgColor: 'from-gray-600/20 to-gray-400/20'
    },
    {
      label: 'Gaps Detected',
      value: '0',
      change: 'Upload resume to detect gaps',
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'text-gray-400',
      bgColor: 'from-gray-600/20 to-gray-400/20'
    },
    {
      label: 'Available Internships',
      value: loading ? '...' : internships?.length || '20+',
      change: 'Ready for matching',
      icon: loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Briefcase className="w-5 h-5" />,
      color: 'text-blue-400',
      bgColor: 'from-blue-600/20 to-blue-400/20'
    }
  ];

  const activityData = analysisResults ? [
    {
      title: 'Resume analyzed with GitHub integration',
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
    },
    ...(analysisResults.student_profile?.github_analysis ? [{
      title: `GitHub analyzed: ${analysisResults.student_profile.github_analysis.public_repos} repos found`,
      time: new Date(analysisResults.processing_timestamp).toLocaleString(),
      icon: <Github className="w-4 h-4" />,
      status: 'completed'
    }] : [])
  ] : recentActivity.map(activity => ({
    ...activity,
    icon: activity.type === 'new_opportunity' ? <Sparkles className="w-4 h-4" /> :
      activity.type === 'deadline' ? <Clock className="w-4 h-4" /> :
        activity.type === 'match' ? <Target className="w-4 h-4" /> :
          <CheckCircle className="w-4 h-4" />,
    status: 'pending'
  }));

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
    if (file && !['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/pdf'].includes(file.type)) {
      errors.push('File must be a DOC, DOCX or PDF document');
    }
    if (file && file.size > 5 * 1024 * 1024) errors.push('File size must be less than 5MB');
    if (file && file.size < 1024) errors.push('File seems too small to be a valid resume');
    return errors;
  };

  const validatePreferences = (prefs) => {
    return Array.isArray(prefs) && prefs.length > 0 &&
      prefs.every(pref => typeof pref === 'string' && pref.trim().length > 0);
  };

  const handlePreferenceToggle = (domain) => {
    setSelectedPreferences(prev =>
      prev.includes(domain)
        ? prev.filter(p => p !== domain)
        : [...prev, domain]
    );
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
    if (!validatePreferences(selectedPreferences)) {
      setError('Please select at least one domain preference');
      toast.error('Please select at least one domain preference');
      return;
    }
    setIsAnalyzing(true);
    setError('');
    setProgress(0);
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('preferences', JSON.stringify(selectedPreferences));
    if (githubLink.trim()) {
      formData.append('github_link', githubLink.trim());
    }
    const steps = [
      'Uploading resume and GitHub profile...',
      'Student Profile Analyzer → Extracting skills and domains...',
      'Internship Matcher → Finding best-fit internships...',
      'Portfolio Gap Detector → Flagging missing skills...',
      'RAG-Powered Requirement Aligner → Retrieving real expectations...',
      'Readiness Evaluator → Calculating readiness scores...',
      'Generating personalized preparation plan...'
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
      await processAnalysisResults(response.data);
    } catch (err) {
      clearInterval(stepInterval);
      handleAnalysisError(err);
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setAnalysisStep(''), 3000);
    }
  };

  const processAnalysisResults = async (data) => {
    if (data.error) {
      throw new Error(data.error);
    }
    setAnalysisStep(data.current_step || 'Analysis complete!');
    setProgress(100);
    setAnalysisResults(data);
    toast.success('Resume analyzed successfully!');
    if (data.analysis_id) {
      toast.success('Analysis saved to history!', {
        icon: '💾',
        duration: 3000
      });
    }
    toast.success('Dashboard updated with real-time analysis results!', {
      icon: '📊',
      duration: 2000
    });
    if (data.detailed_extraction) {
      const extraction = data.detailed_extraction;
      const info = [
        `${extraction.total_words} words processed`,
        `${data.internship_recommendations?.length || 0} internships matched`,
        `${extraction.sections_detected?.length || 0} resume sections detected`,
        data.extraction_info?.email_found ? '✓ Contact info found' : '⚠️ Add contact information'
      ].filter(Boolean);
      setTimeout(() => {
        toast.info(`Analysis summary: ${info.join(' • ')}`);
      }, 1000);
    }
  };

  const handleAnalysisError = (err) => {
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
    setProgress(0);
    if (err.response?.data?.debug_info) {
      console.error('Debug info:', err.response.data.debug_info);
    }
  };

  const retryAnalysis = () => {
    if (uploadedResume) {
      analyzeResume(uploadedResume);
    } else {
      toast.error('Please upload a resume first');
    }
  };

  // Function to refresh and reset dashboard stats to zero state
  const refreshDashboardToZero = async () => {
    setDashboardStats(null);
    setAnalysisResults(null);

    // Re-fetch only internships for available count
    try {
      const internshipsResponse = await axios.get('http://127.0.0.1:8000/api/internships/');
      if (internshipsResponse.data.status === 'success') {
        setInternships(internshipsResponse.data.internships);
      }

      toast.success('Dashboard refreshed - all stats reset to zero', {
        icon: '🔄',
        duration: 2000
      });
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      toast.error('Failed to refresh dashboard');
    }
  };

  const resetAnalysis = () => {
    setAnalysisResults(null);
    setUploadedResume(null);
    setError('');
    setSelectedPreferences(['Web Development', 'Data Science']);

    // Reset dashboard stats to force zero state
    setDashboardStats(null);

    // Show confirmation that stats have been reset
    toast.info('Dashboard reset to zero state', {
      icon: '🔄',
      duration: 2000
    });
  };

  const getStatusIcon = (status) => {
    const icons = {
      success: <CheckCircle className="w-4 h-4 text-green-400" />,
      completed: <CheckCircle className="w-4 h-4 text-green-400" />,
      processing: <Activity className="w-4 h-4 text-blue-400 animate-pulse" />,
      started: <Activity className="w-4 h-4 text-blue-400 animate-pulse" />,
      failed: <AlertCircle className="w-4 h-4 text-red-400" />,
      fallback: <AlertCircle className="w-4 h-4 text-yellow-400" />,
      warning: <AlertCircle className="w-4 h-4 text-yellow-400" />
    };
    return icons[status] || <Clock className="w-4 h-4 text-gray-400" />;
  };

  const getStatusColor = (status) => {
    const colors = {
      success: 'text-green-400 bg-green-900/20 border-green-500/30',
      completed: 'text-green-400 bg-green-900/20 border-green-500/30',
      processing: 'text-blue-400 bg-blue-900/20 border-blue-500/30',
      started: 'text-blue-400 bg-blue-900/20 border-blue-500/30',
      failed: 'text-red-400 bg-red-900/20 border-red-500/30',
      fallback: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
      warning: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30'
    };
    return colors[status] || 'text-gray-400 bg-gray-900/20 border-gray-500/30';
  };

  const groupCommunicationsByAgent = (communications) => {
    if (!communications) return {};
    return communications.reduce((acc, comm) => {
      if (!acc[comm.agent]) {
        acc[comm.agent] = [];
      }
      acc[comm.agent].push(comm);
      return acc;
    }, {});
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      toast.success('Resume text copied to clipboard!');
      setTimeout(() => setCopiedText(false), 2000);
    } catch (err) {
      toast.error('Failed to copy text');
    }
  };

  const downloadAnalysis = () => {
    if (!analysisResults) return;
    const data = {
      profile: analysisResults.student_profile,
      recommendations: analysisResults.internship_recommendations,
      gaps: analysisResults.portfolio_gaps,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `internai-analysis-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Analysis downloaded successfully!');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full mx-auto mb-4"
            />
            <h2 className="text-xl font-semibold text-blue-400 mb-2">Loading InternAI Dashboard</h2>
            <p className="text-gray-400">Fetching real-time internship data and GitHub integration...</p>
          </motion.div>
        </div>
      ) : (
        <motion.div
          className="max-w-7xl mx-auto px-6 py-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <WelcomeSection user={user} navigate={navigate} refreshDashboardToZero={refreshDashboardToZero} />
          <StatsSection stats={dashboardStatsData} />
          <div className="grid lg:grid-cols-4 gap-8">
            <MainContent
              analysisResults={analysisResults}
              isAnalyzing={isAnalyzing}
              uploadedResume={uploadedResume}
              selectedPreferences={selectedPreferences}
              githubLink={githubLink}
              setGithubLink={setGithubLink}
              error={error}
              analysisStep={analysisStep}
              progress={progress}
              showAgentComm={showAgentComm}
              expandedAgent={expandedAgent}
              showFullText={showFullText}
              copiedText={copiedText}
              availableDomains={AVAILABLE_DOMAINS}
              quickActions={QUICK_ACTIONS}
              recentActivity={activityData}
              navigate={navigate}
              handlePreferenceToggle={handlePreferenceToggle}
              handleFileUpload={handleFileUpload}
              retryAnalysis={retryAnalysis}
              resetAnalysis={resetAnalysis}
              setShowAgentComm={setShowAgentComm}
              setExpandedAgent={setExpandedAgent}
              setShowFullText={setShowFullText}
              copyToClipboard={copyToClipboard}
              downloadAnalysis={downloadAnalysis}
              getStatusIcon={getStatusIcon}
              getStatusColor={getStatusColor}
              groupCommunicationsByAgent={groupCommunicationsByAgent}
            />
            <Sidebar
              analysisResults={analysisResults}
              recentActivity={activityData}
              showAgentComm={showAgentComm}
              setShowAgentComm={setShowAgentComm}
              setAnalysisResults={setAnalysisResults}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
};

const WelcomeSection = ({ user, navigate, refreshDashboardToZero }) => (
  <motion.div variants={itemVariants} className="mb-8">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Welcome to InternAI, {user?.first_name || 'Student'}! <span className="ml-2 text-black" role="img" aria-label="robot"> 🤖 </span>
        </h2>
        <p className="text-blue-400 text-lg">
          AI-powered resume analysis for intelligent internship matching.
        </p>
      </div>
      <div className="flex space-x-3">
        <motion.button
          onClick={() => navigate('/analysis-history')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-purple-500/25"
        >
          <Clock className="w-4 h-4 mr-2" />
          View History
        </motion.button>
        <motion.button
          onClick={refreshDashboardToZero}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg hover:shadow-gray-500/25"
          title="Reset dashboard to zero state"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset Stats
        </motion.button>
      </div>
    </div>
  </motion.div>
);

const StatsSection = ({ stats }) => (
  <motion.div
    variants={itemVariants}
    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
  >
    {stats.map((stat, index) => (
      <motion.div
        key={index}
        whileHover={{ scale: 1.02, y: -2 }}
        className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4 hover:bg-gray-800/20 transition-all duration-300 hover:border-blue-500/30"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">{stat.label}</h3>
          <motion.div
            className={stat.color}
            animate={stat.value !== '0' && stat.value !== '0%' ? "pulse" : ""}
            variants={pulseVariants}
          >
            {stat.icon}
          </motion.div>
        </div>
        <div className="flex items-end justify-between">
          <p className="text-2xl font-bold">{stat.value}</p>
          <span className="text-green-500 text-sm">{stat.change}</span>
        </div>
      </motion.div>
    ))}
  </motion.div>
);

const MainContent = ({
  analysisResults,
  isAnalyzing,
  uploadedResume,
  selectedPreferences,
  githubLink,
  setGithubLink,
  error,
  analysisStep,
  progress,
  showAgentComm,
  expandedAgent,
  showFullText,
  copiedText,
  availableDomains,
  quickActions,
  recentActivity,
  navigate,
  handlePreferenceToggle,
  handleFileUpload,
  retryAnalysis,
  resetAnalysis,
  setShowAgentComm,
  setExpandedAgent,
  setShowFullText,
  copyToClipboard,
  downloadAnalysis,
  getStatusIcon,
  getStatusColor,
  groupCommunicationsByAgent
}) => {
  return (
    <div className="lg:col-span-3 space-y-6">
      {!analysisResults ? (
        <UploadSection
          isAnalyzing={isAnalyzing}
          selectedPreferences={selectedPreferences}
          githubLink={githubLink}
          setGithubLink={setGithubLink}
          error={error}
          analysisStep={analysisStep}
          progress={progress}
          availableDomains={availableDomains}
          quickActions={quickActions}
          handlePreferenceToggle={handlePreferenceToggle}
          handleFileUpload={handleFileUpload}
          retryAnalysis={retryAnalysis}
        />
      ) : (
        <ResultsSection
          analysisResults={analysisResults}
          showAgentComm={showAgentComm}
          expandedAgent={expandedAgent}
          showFullText={showFullText}
          copiedText={copiedText}
          recentActivity={recentActivity}
          setShowAgentComm={setShowAgentComm}
          setExpandedAgent={setExpandedAgent}
          setShowFullText={setShowFullText}
          copyToClipboard={copyToClipboard}
          downloadAnalysis={downloadAnalysis}
          resetAnalysis={resetAnalysis}
          getStatusIcon={getStatusIcon}
          getStatusColor={getStatusColor}
          groupCommunicationsByAgent={groupCommunicationsByAgent}
          navigate={navigate}
        />
      )}
    </div>
  );
};

const UploadSection = ({
  isAnalyzing,
  selectedPreferences,
  githubLink,
  setGithubLink,
  error,
  analysisStep,
  progress,
  availableDomains,
  quickActions,
  handlePreferenceToggle,
  handleFileUpload,
  retryAnalysis
}) => {
  return (
    <motion.div variants={itemVariants} className="mb-8">
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-8 hover:border-blue-500/30 transition-all duration-300">
        <div className="text-center mb-6">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Brain className="w-16 h-16 mx-auto text-blue-400 mb-4" />
          </motion.div>
          <h3 className="text-2xl font-bold mb-2">AI-Powered Resume Analysis</h3>
          <p className="text-gray-400">
            Upload your resume and select preferred domains for personalized internship matching.
          </p>
        </div>
        <div className="space-y-6">
          <DomainPreferences
            selectedPreferences={selectedPreferences}
            availableDomains={availableDomains}
            handlePreferenceToggle={handlePreferenceToggle}
          />
          <div className="space-y-2">
            <label htmlFor="github-input" className="block text-sm font-medium text-gray-300">
              GitHub Profile (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Github className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="github-input"
                type="url"
                value={githubLink}
                onChange={(e) => setGithubLink(e.target.value)}
                placeholder="https://github.com/username"
                disabled={isAnalyzing}
                className="block w-full pl-10 pr-3 py-3 border border-gray-700 rounded-lg bg-gray-800/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-gray-500">
              Add your GitHub profile to enhance portfolio analysis and get better recommendations
            </p>
          </div>
          <motion.label
            whileHover={{ scale: 1.02 }}
            className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-blue-500 transition-all duration-300 block cursor-pointer group"
          >
            <input
              id="resume-upload"
              type="file"
              accept=".doc,.docx,.pdf"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isAnalyzing}
            />
            <div className="space-y-2">
              <motion.div
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 group-hover:shadow-lg group-hover:shadow-blue-500/25"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isAnalyzing ? (
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5 mr-2" />
                )}
                {isAnalyzing ? 'Processing with AI...' : 'Upload Resume'}
              </motion.div>
              <p className="text-sm text-gray-400">
                Max 5MB, DOC/DOCX/PDF only. Our AI will extract and analyze everything.
              </p>
            </div>
          </motion.label>
          {error && (
            <ErrorDisplay error={error} retryAnalysis={retryAnalysis} />
          )}
          {isAnalyzing && (
            <ProgressDisplay analysisStep={analysisStep} progress={progress} />
          )}
        </div>
      </div>
    </motion.div>
  );
};

const DomainPreferences = ({ selectedPreferences, availableDomains, handlePreferenceToggle }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-3">
      Select Your Domain Preferences ({selectedPreferences.length} selected)
    </label>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
      {availableDomains.map((domain) => (
        <button
          key={domain}
          onClick={() => handlePreferenceToggle(domain)}
          className={`p-2 text-xs rounded-lg transition-all ${selectedPreferences.includes(domain)
            ? 'bg-blue-600 text-white border-blue-500'
            : 'bg-gray-700/50 text-gray-300 border-gray-600 hover:bg-gray-600/50'
            } border`}
        >
          {domain}
        </button>
      ))}
    </div>
    <p className="text-xs text-gray-500 mt-2">
      Select multiple domains to get diverse internship recommendations
    </p>
    {selectedPreferences.length > 0 && (
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Selected Preferences:
        </label>
        <div className="flex flex-wrap gap-2">
          {selectedPreferences.map((pref, idx) => (
            <span
              key={idx}
              className="px-3 py-1 bg-blue-600/20 text-blue-300 text-sm rounded-full flex items-center gap-2"
            >
              {pref}
              <button
                onClick={() => handlePreferenceToggle(pref)}
                className="text-blue-400 hover:text-blue-200"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
    )}
  </div>
);

const ErrorDisplay = ({ error, retryAnalysis }) => (
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
);

const ProgressDisplay = ({ analysisStep, progress }) => (
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
);

const ResultsSection = ({
  analysisResults,
  showAgentComm,
  expandedAgent,
  showFullText,
  copiedText,
  recentActivity,
  setShowAgentComm,
  setExpandedAgent,
  setShowFullText,
  copyToClipboard,
  downloadAnalysis,
  resetAnalysis,
  getStatusIcon,
  getStatusColor,
  groupCommunicationsByAgent,
  navigate
}) => {
  return (
    <>
      <AnalysisCompleteBanner
        analysisResults={analysisResults}
        showAgentComm={showAgentComm}
        setShowAgentComm={setShowAgentComm}
        downloadAnalysis={downloadAnalysis}
        resetAnalysis={resetAnalysis}
        navigate={navigate}
      />
      <AgentCommunications
        analysisResults={analysisResults}
        showAgentComm={showAgentComm}
        expandedAgent={expandedAgent}
        setExpandedAgent={setExpandedAgent}
        getStatusIcon={getStatusIcon}
        getStatusColor={getStatusColor}
        groupCommunicationsByAgent={groupCommunicationsByAgent}
      />
      <ResumeTextExtraction
        analysisResults={analysisResults}
        showFullText={showFullText}
        copiedText={copiedText}
        setShowFullText={setShowFullText}
        copyToClipboard={copyToClipboard}
      />
      <ProfileSummary analysisResults={analysisResults} />
      <InternshipRecommendations analysisResults={analysisResults} />
      <PortfolioGaps analysisResults={analysisResults} />
      <ExtractionDetails analysisResults={analysisResults} />
      <GitHubAnalysis profile={analysisResults.student_profile} />
    </>
  );
};

const AnalysisCompleteBanner = ({ analysisResults, showAgentComm, setShowAgentComm, downloadAnalysis, resetAnalysis, navigate }) => (
  <motion.div
    initial={{ scale: 0.9 }}
    animate={{ scale: 1 }}
    className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-xl p-4"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 2 }}
        >
          <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
        </motion.div>
        <div>
          <h3 className="font-semibold text-green-400">AI Analysis Complete!</h3>
          <p className="text-sm text-gray-400">
            Resume processed successfully with {analysisResults.agent_communications?.length || 5} AI agents
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAgentComm(!showAgentComm)}
          className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg text-sm flex items-center gap-2 transition-all"
        >
          {showAgentComm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showAgentComm ? 'Hide' : 'View'} AI Logs
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/analysis-history')}
          className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-300 rounded-lg text-sm flex items-center gap-2 transition-all"
        >
          <Clock className="w-4 h-4" />
          View in History
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={downloadAnalysis}
          className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg text-sm flex items-center gap-2 transition-all"
        >
          <Download className="w-4 h-4" />
          Export
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={resetAnalysis}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-all"
        >
          New Analysis
        </motion.button>
      </div>
    </div>
  </motion.div>
);

const AgentCommunications = ({
  analysisResults,
  showAgentComm,
  expandedAgent,
  setExpandedAgent,
  getStatusIcon,
  getStatusColor,
  groupCommunicationsByAgent
}) => {
  return (
    <AnimatePresence>
      {showAgentComm && analysisResults.agent_communications && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6"
        >
          <h3 className="text-xl font-bold mb-4 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-cyan-400" />
            AI Agent Communication Logs
            <span className="ml-2 px-2 py-1 bg-cyan-600/20 text-cyan-300 text-xs rounded">
              {Object.keys(groupCommunicationsByAgent(analysisResults.agent_communications)).length} Agents
            </span>
          </h3>
          <div className="space-y-4">
            {Object.entries(groupCommunicationsByAgent(analysisResults.agent_communications)).map(([agentName, communications]) => (
              <AgentCommunicationItem
                key={agentName}
                agentName={agentName}
                communications={communications}
                expandedAgent={expandedAgent}
                setExpandedAgent={setExpandedAgent}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const AgentCommunicationItem = ({
  agentName,
  communications,
  expandedAgent,
  setExpandedAgent,
  getStatusIcon,
  getStatusColor
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="border border-gray-700 rounded-lg overflow-hidden"
    >
      <motion.button
        whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.7)' }}
        onClick={() => setExpandedAgent(expandedAgent === agentName ? null : agentName)}
        className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800/70 transition-all"
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: expandedAgent === agentName ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <Zap className="w-5 h-5 text-cyan-400" />
          </motion.div>
          <span className="font-semibold text-cyan-300">{agentName}</span>
          <span className="text-sm text-gray-400">({communications.length} steps)</span>
          <div className="flex gap-1">
            {communications.map((comm, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full ${comm.status === 'success' || comm.status === 'completed'
                  ? 'bg-green-400'
                  : comm.status === 'failed'
                    ? 'bg-red-400'
                    : comm.status === 'processing' || comm.status === 'started'
                      ? 'bg-blue-400'
                      : 'bg-yellow-400'
                  }`}
              />
            ))}
          </div>
        </div>
        <motion.div
          animate={{ rotate: expandedAgent === agentName ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </motion.div>
      </motion.button>
      <AnimatePresence>
        {expandedAgent === agentName && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-900/30"
          >
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {communications.map((comm, idx) => (
                <CommunicationStep
                  key={idx}
                  comm={comm}
                  idx={idx}
                  getStatusIcon={getStatusIcon}
                  getStatusColor={getStatusColor}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const CommunicationStep = ({ comm, idx, getStatusIcon, getStatusColor }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: idx * 0.1 }}
    className={`p-4 rounded-lg border ${getStatusColor(comm.status)}`}
  >
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-2">
        {getStatusIcon(comm.status)}
        <span className="font-medium text-sm">{comm.step}</span>
        <span className="text-xs opacity-70">
          {new Date(comm.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <span className={`px-2 py-1 text-xs rounded uppercase ${getStatusColor(comm.status)}`}>
        {comm.status}
      </span>
    </div>
    {comm.micro_goal && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-2 p-3 bg-gray-800/30 rounded text-sm border-l-2 border-yellow-400"
      >
        <span className="text-yellow-400 font-medium">🎯 Micro Goal:</span>
        <span className="ml-2 text-gray-200">{comm.micro_goal}</span>
      </motion.div>
    )}
    {comm.data && Object.keys(comm.data).length > 0 && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-2 p-3 bg-gray-800/20 rounded border"
      >
        <div className="text-xs text-gray-400 mb-2 font-medium">Processing Data:</div>
        <div className="text-sm space-y-1 max-h-32 overflow-y-auto">
          {Object.entries(comm.data).map(([key, value]) => (
            <div key={key} className="flex justify-between items-start gap-2">
              <span className="text-gray-300 capitalize text-xs">{key.replace(/_/g, ' ')}:</span>
              <span className="text-gray-100 font-mono text-xs text-right max-w-xs break-words">
                {typeof value === 'object'
                  ? `${JSON.stringify(value).slice(0, 30)}...`
                  : String(value).slice(0, 50) + (String(value).length > 50 ? '...' : '')
                }
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    )}
  </motion.div>
);

const ResumeTextExtraction = ({
  analysisResults,
  showFullText,
  copiedText,
  setShowFullText,
  copyToClipboard
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold flex items-center">
          <FileText className="w-5 h-5 mr-2 text-green-400" />
          Gemini AI Text Extraction
        </h3>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => copyToClipboard(analysisResults.file_info?.resume_text || '')}
            className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded text-sm flex items-center gap-1 transition-all"
          >
            <Copy className="w-3 h-3" />
            {copiedText ? 'Copied!' : 'Copy'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFullText(!showFullText)}
            className="px-3 py-1 bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 rounded text-sm transition-all"
          >
            {showFullText ? 'Collapse' : 'Expand'}
          </motion.button>
        </div>
      </div>
      {analysisResults.detailed_extraction && (
        <DocumentStatistics extraction={analysisResults.detailed_extraction} />
      )}
      <ExtractedTextDisplay
        analysisResults={analysisResults}
        showFullText={showFullText}
        setShowFullText={setShowFullText}
      />
    </motion.div>
  );
};

const DocumentStatistics = ({ extraction }) => (
  <div className="grid md:grid-cols-4 gap-4 mb-4">
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50"
    >
      <p className="text-gray-400 text-xs mb-1">Document Stats</p>
      <div className="text-sm space-y-1">
        <div className="flex justify-between">
          <span>Words:</span>
          <span className="font-mono text-green-400">{extraction.total_words?.toLocaleString() || '0'}</span>
        </div>
        <div className="flex justify-between">
          <span>Characters:</span>
          <span className="font-mono text-blue-400">{extraction.total_characters?.toLocaleString() || '0'}</span>
        </div>
        <div className="flex justify-between">
          <span>Paragraphs:</span>
          <span className="font-mono text-purple-400">{extraction.paragraphs || '0'}</span>
        </div>
      </div>
    </motion.div>
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50"
    >
      <p className="text-gray-400 text-xs mb-1">Contact Detection</p>
      <div className="text-sm space-y-1">
        <div className={`flex items-center justify-between ${extraction.email_patterns_found > 0 ? 'text-green-400' : 'text-red-400'}`}>
          <span>📧 Email:</span>
          <span className="font-mono">{extraction.email_patterns_found || '0'}</span>
        </div>
        <div className={`flex items-center justify-between ${extraction.phone_patterns_found > 0 ? 'text-green-400' : 'text-red-400'}`}>
          <span>📱 Phone:</span>
          <span className="font-mono">{extraction.phone_patterns_found || '0'}</span>
        </div>
        <div className={`flex items-center justify-between ${extraction.url_patterns_found > 0 ? 'text-green-400' : 'text-gray-400'}`}>
          <span>🔗 URLs:</span>
          <span className="font-mono">{extraction.url_patterns_found || '0'}</span>
        </div>
      </div>
    </motion.div>
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50"
    >
      <p className="text-gray-400 text-xs mb-1">AI Processing</p>
      <div className="text-sm space-y-1">
        <div className="text-green-400">✓ Text Extracted</div>
        <div className="text-green-400">✓ Patterns Detected</div>
        <div className="text-green-400">✓ Structure Analyzed</div>
      </div>
    </motion.div>
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50"
    >
      <p className="text-gray-400 text-xs mb-1">Sections Found</p>
      <div className="text-xs">
        <span className="text-purple-400 font-mono">
          {extraction.sections_detected?.length || 0} sections
        </span>
      </div>
      <div className="flex flex-wrap gap-1 mt-1">
        {extraction.sections_detected?.slice(0, 3).map((section, idx) => (
          <span key={idx} className="px-1 py-0.5 bg-purple-600/20 text-purple-300 text-xs rounded">
            {section}
          </span>
        ))}
        {(extraction.sections_detected?.length || 0) > 3 && (
          <span className="text-xs text-gray-400">+{extraction.sections_detected?.length - 3 || 0}</span>
        )}
      </div>
    </motion.div>
  </div>
);

const ExtractedTextDisplay = ({ analysisResults, showFullText, setShowFullText }) => (
  <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 overflow-hidden">
    <div className="flex items-center justify-between p-3 bg-gray-800/50 border-b border-gray-700/50">
      <h4 className="font-semibold text-gray-300 flex items-center">
        <Brain className="w-4 h-4 mr-2 text-blue-400" />
        Extracted Resume Content
      </h4>
      <span className="text-xs text-gray-400">
        Processed by Gemini AI
      </span>
    </div>
    <div className={`p-4 bg-gray-900/50 text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed ${showFullText ? 'max-h-none' : 'max-h-64'
      } overflow-y-auto transition-all duration-300`}>
      {analysisResults.file_info?.resume_text ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {showFullText
            ? analysisResults.file_info.resume_text
            : analysisResults.file_info.resume_text.slice(0, 1000) +
            (analysisResults.file_info.resume_text.length > 1000 ? '...' : '')
          }
        </motion.div>
      ) : (
        <div className="text-gray-500 italic text-center py-8">
          No resume text extracted. Please try uploading a different file.
        </div>
      )}
    </div>
    {!showFullText && analysisResults.file_info?.resume_text?.length > 1000 && (
      <div className="p-3 bg-gray-800/30 border-t border-gray-700/50 text-center">
        <motion.button
          whileHover={{ scale: 1.02 }}
          onClick={() => setShowFullText(true)}
          className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
        >
          Show full content ({(analysisResults.file_info.resume_text.length - 1000).toLocaleString()} more characters)
        </motion.button>
      </div>
    )}
  </div>
);

const ProfileSummary = ({ analysisResults }) => {
  const profile = analysisResults.student_profile || {};
  const extraction = analysisResults.detailed_extraction || {};
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6"
    >
      <h3 className="text-xl font-bold mb-4 flex items-center">
        <User className="w-5 h-5 mr-2 text-blue-400" />
        AI-Enhanced Profile Summary
        <span className="ml-2 px-2 py-1 bg-blue-600/20 text-blue-300 text-xs rounded">
          {Math.round(((profile.skills?.length || 0) / 25) * 100)}% Complete
        </span>
      </h3>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <PersonalInformation profile={profile} />
          <ContactInformation profile={profile} />
          {hasOnlineProfiles(profile) && <OnlineProfiles profile={profile} />}
          {profile.github_analysis && <GitHubAnalysis profile={profile} />}
        </div>
        <div className="space-y-4">
          <TechnicalSkills profile={profile} />
          {profile.education?.length > 0 && <Education profile={profile} />}
          {profile.summary && <ProfessionalSummary profile={profile} />}
        </div>
      </div>
    </motion.div>
  );
};

const PersonalInformation = ({ profile }) => (
  <motion.div
    whileHover={{ scale: 1.01 }}
    className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50"
  >
    <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
      <User className="w-4 h-4 mr-2" />
      Personal Information
    </h4>
    <div className="space-y-2">
      <div>
        <span className="text-xs text-gray-500">Name:</span>
        <p className="font-semibold text-lg">{profile.name || 'Not detected'}</p>
      </div>
      <div>
        <span className="text-xs text-gray-500">Experience Level:</span>
        <p className="font-semibold capitalize text-green-400">
          {profile.experience_level || 'Entry-level'}
          {profile.years_of_experience &&
            ` (${profile.years_of_experience})`}
        </p>
      </div>
    </div>
  </motion.div>
);

const ContactInformation = ({ profile }) => (
  <motion.div
    whileHover={{ scale: 1.01 }}
    className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50"
  >
    <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
      <Mail className="w-4 h-4 mr-2" />
      Contact Information
    </h4>
    <div className="space-y-2 text-sm">
      {profile.email && (
        <div className="text-blue-300 flex items-center">
          <Mail className="w-3 h-3 mr-1" />
          {profile.email}
        </div>
      )}
      {profile.phone && (
        <div className="text-green-300 flex items-center">
          <Phone className="w-3 h-3 mr-1" />
          {profile.phone}
        </div>
      )}
      {profile.education?.[0]?.institution && (
        <div className="text-purple-300 flex items-center">
          <Award className="w-3 h-3 mr-1" />
          {profile.education[0].institution}
        </div>
      )}
      {!profile.email && !profile.phone && (
        <div className="text-gray-400">No contact information detected</div>
      )}
    </div>
  </motion.div>
);

const hasOnlineProfiles = (profile) => {
  return profile.linkedin || profile.github || profile.website;
};

const OnlineProfiles = ({ profile }) => (
  <motion.div
    whileHover={{ scale: 1.01 }}
    className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50"
  >
    <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
      <Globe className="w-4 h-4 mr-2" />
      Online Presence
    </h4>
    <div className="space-y-2 text-sm">
      {profile.linkedin && (
        <div className="flex items-center text-blue-300">
          <Briefcase className="w-4 h-4 mr-2" />
          LinkedIn Profile
          <ExternalLink className="w-3 h-3 ml-1" />
        </div>
      )}
      {profile.github && (
        <div className="flex items-center text-purple-300">
          <Github className="w-4 h-4 mr-2" />
          GitHub Profile
          <ExternalLink className="w-3 h-3 ml-1" />
        </div>
      )}
      {profile.website && (
        <div className="flex items-center text-green-300">
          <Globe className="w-4 h-4 mr-2" />
          Personal Website
          <ExternalLink className="w-3 h-3 ml-1" />
        </div>
      )}
    </div>
  </motion.div>
);

const TechnicalSkills = ({ profile }) => (
  <motion.div
    whileHover={{ scale: 1.01 }}
    className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50"
  >
    <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
      <Code className="w-4 h-4 mr-2" />
      Technical Skills ({profile.skills?.length || 0} detected)
    </h4>
    <div className="space-y-3">
      {profile.programming_languages?.length > 0 && (
        <SkillCategory
          title="Programming Languages"
          items={profile.programming_languages}
          color="blue"
        />
      )}
      {profile.frameworks?.length > 0 && (
        <SkillCategory
          title="Frameworks"
          items={profile.frameworks}
          color="green"
        />
      )}
      {profile.tools?.length > 0 && (
        <SkillCategory
          title="Tools"
          items={profile.tools}
          color="purple"
        />
      )}
      {profile.databases?.length > 0 && (
        <SkillCategory
          title="Databases"
          items={profile.databases}
          color="orange"
        />
      )}
      {(!profile.programming_languages?.length &&
        !profile.frameworks?.length &&
        !profile.tools?.length &&
        !profile.databases?.length) &&
        profile.skills?.length > 0 && (
          <div>
            <span className="text-xs text-gray-500 mb-1 block">All Skills:</span>
            <div className="flex flex-wrap gap-1">
              {profile.skills.map((skill, idx) => (
                <motion.span
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="px-2 py-1 bg-gray-600/20 text-gray-300 text-xs rounded hover:bg-gray-600/30 transition-colors"
                >
                  {skill}
                </motion.span>
              ))}
            </div>
          </div>
        )}
    </div>
  </motion.div>
);

const SkillCategory = ({ title, items, color }) => {
  const colorClasses = {
    blue: 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/30',
    green: 'bg-green-600/20 text-green-300 hover:bg-green-600/30',
    purple: 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/30',
    orange: 'bg-orange-600/20 text-orange-300 hover:bg-orange-600/30'
  };
  return (
    <div>
      <span className="text-xs text-gray-500 flex items-center mb-1">
        {color === 'blue' && <Code className="w-3 h-3 mr-1" />}
        {title}:
      </span>
      <div className="flex flex-wrap gap-1">
        {items.map((item, idx) => (
          <motion.span
            key={idx}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.05 }}
            className={`px-2 py-1 ${colorClasses[color]} text-xs rounded cursor-pointer hover:${colorClasses[color]} transition-colors`}
          >
            {item}
          </motion.span>
        ))}
      </div>
    </div>
  );
};

const Education = ({ profile }) => (
  <motion.div
    whileHover={{ scale: 1.01 }}
    className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50"
  >
    <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
      <Award className="w-4 h-4 mr-2" />
      Education
    </h4>
    <div className="space-y-3">
      {profile.education.map((edu, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="bg-gray-900/30 rounded p-3 border border-gray-700/30"
        >
          <div className="font-semibold text-sm">{edu.degree}</div>
          <div className="text-sm text-gray-300">{edu.institution}</div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
            {edu.year && (
              <span className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                {edu.year}
              </span>
            )}
            {edu.gpa && (
              <span className="text-green-400 font-medium">GPA: {edu.gpa}</span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

const ProfessionalSummary = ({ profile }) => (
  <motion.div
    whileHover={{ scale: 1.01 }}
    className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50"
  >
    <h4 className="text-sm font-medium text-gray-400 mb-3">Professional Summary</h4>
    <div className="text-sm text-gray-300 leading-relaxed italic">
      "{profile.summary}"
    </div>
  </motion.div>
);

const InternshipRecommendations = ({ analysisResults }) => {
  if (!analysisResults?.internship_recommendations?.length) {
    return null;
  }
  const recommendations = analysisResults.internship_recommendations;
  const averageMatch = Math.round(
    (recommendations.reduce((acc, rec) => acc + rec.matching_score, 0) / recommendations.length) * 100
  );
  const uniqueDomains = new Set(recommendations.map(rec => rec.domain)).size;
  const highMatchCount = recommendations.filter(rec => rec.matching_score >= 0.8).length;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="col-span-full bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold flex items-center">
          <Target className="w-6 h-6 mr-3 text-purple-400" />
          AI-Matched Internship Recommendations
          <span className="ml-3 px-3 py-1 bg-purple-600/20 text-purple-300 text-sm rounded-lg font-medium">
            {recommendations.length} Found
          </span>
        </h3>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg text-sm flex items-center gap-2 transition-all font-medium"
          >
            <Eye className="w-4 h-4" />
            View All
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg text-sm flex items-center gap-2 transition-all font-medium"
          >
            <Download className="w-4 h-4" />
            Export
          </motion.button>
        </div>
      </div>
      <div className="relative mb-6 overflow-hidden">
        <motion.div
          className="flex gap-6 pb-4"
          style={{
            overflowX: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: '#6366f1 #1f2937'
          }}
          transition={{ duration: 0.8 }}
        >
          {recommendations.map((rec, index) => (
            <motion.div
              key={index}
              className="flex-shrink-0 w-80"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: index * 0.1,
                duration: 0.6,
                type: "spring",
                stiffness: 100
              }}
            >
              <InternshipCard rec={rec} index={index} />
            </motion.div>
          ))}
        </motion.div>
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-900/50 to-transparent pointer-events-none" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-700/30">
        <StatCard value={recommendations.length} label="Total Matches" color="purple" />
        <StatCard value={`${averageMatch}%`} label="Avg Match" color="green" />
        <StatCard value={uniqueDomains} label="Domains" color="blue" />
        <StatCard value={highMatchCount} label="High Match" color="yellow" />
      </div>
      <style jsx>{`
        .overflow-x-auto::-webkit-scrollbar {
          height: 8px;
        }
        .overflow-x-auto::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 4px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, rgba(99, 102, 241, 0.7), rgba(147, 51, 234, 0.7));
          border-radius: 4px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(90deg, rgba(99, 102, 241, 0.9), rgba(147, 51, 234, 0.9));
        }
        .overflow-x-auto {
          scroll-behavior: smooth;
        }
        @keyframes slideInRight {
          from {
            transform: translateX(100px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slideInRight 0.6s ease-out forwards;
        }
      `}</style>
    </motion.div>
  );
};

const InternshipCard = ({ rec, index }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const matchColor = rec.matching_score >= 0.8 ? 'from-emerald-500 to-green-600' :
    rec.matching_score >= 0.6 ? 'from-yellow-500 to-orange-500' :
      'from-red-500 to-pink-600';
  const matchText = rec.matching_score >= 0.8 ? 'Excellent Match' :
    rec.matching_score >= 0.6 ? 'Good Match' :
      'Partial Match';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, rotateY: 45 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{
        delay: index * 0.15,
        duration: 0.6,
        type: "spring",
        stiffness: 100
      }}
      whileHover={{
        scale: 1.03,
        y: -8,
        rotateX: 5,
        boxShadow: "0 25px 50px -12px rgba(168, 85, 247, 0.25)"
      }}
      className="group relative bg-gradient-to-br from-gray-900/80 via-gray-800/60 to-gray-900/80 backdrop-blur-xl rounded-2xl overflow-hidden border border-gray-700/50 hover:border-purple-500/50 transition-all duration-500 h-fit"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-blue-600/5 to-cyan-600/5"
        animate={{
          background: [
            "linear-gradient(45deg, rgba(147, 51, 234, 0.05), rgba(59, 130, 246, 0.05), rgba(6, 182, 212, 0.05))",
            "linear-gradient(225deg, rgba(59, 130, 246, 0.05), rgba(6, 182, 212, 0.05), rgba(147, 51, 234, 0.05))",
            "linear-gradient(45deg, rgba(147, 51, 234, 0.05), rgba(59, 130, 246, 0.05), rgba(6, 182, 212, 0.05))"
          ]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
      <div className="relative p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.8 }}
                className="p-2 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-xl border border-purple-500/30"
              >
                <Building className="w-5 h-5 text-purple-400" />
              </motion.div>
              <div>
                <motion.h3
                  className="text-xl font-bold text-white leading-tight group-hover:text-purple-300 transition-colors duration-300"
                  whileHover={{ x: 5 }}
                >
                  {rec.title}
                </motion.h3>
                <motion.p
                  className="text-purple-400 font-semibold text-lg"
                  whileHover={{ x: 5 }}
                >
                  {rec.company}
                </motion.p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 text-xs rounded-full ${matchColor} border`}>
                {matchText}
              </span>
              <span className="px-3 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                {rec.domain}
              </span>
            </div>
          </div>
          <div className="text-center ml-3">
            <motion.div
              className="bg-gradient-to-r from-yellow-500 to-orange-500 px-3 py-2 rounded-lg mb-1"
              whileHover={{ scale: 1.1 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Star className="w-4 h-4 text-white mx-auto mb-1" />
              <span className="font-bold text-white text-sm">
                {(rec.matching_score * 100).toFixed(0)}%
              </span>
            </motion.div>
            <div className="text-xs text-green-400 font-medium">Match</div>
          </div>
        </div>
      </div>
      <div className="p-6 pt-0">
        <div className="space-y-4 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Location:</span>
            <span className="text-gray-300">{rec.location || 'Remote'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Duration:</span>
            <span className="text-gray-300">{rec.duration || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Stipend:</span>
            <span className="text-gray-300">{rec.stipend || 'Unpaid'}</span>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowFullDescription(!showFullDescription)}
          className="w-full px-4 py-2 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg text-sm flex items-center justify-center gap-2 transition-all"
        >
          {showFullDescription ? 'Hide Details' : 'View Details'}
          <ChevronDown className={`w-4 h-4 transition-transform ${showFullDescription ? 'rotate-180' : ''}`} />
        </motion.button>
      </div>
      {showFullDescription && (
        <div className="p-6 pt-0 bg-gray-800/30 rounded-b-lg border-t border-gray-700/50">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Job Description</h4>
          <p className="text-sm text-gray-300 leading-relaxed mb-4">
            {rec.justification || 'No description provided.'}
          </p>
          <div className="space-y-2">
            <SkillList title="Required Skills" skills={rec.requirements} color="emerald" maxVisible={3} />
            {rec.preferred_skills?.length > 0 && (
              <SkillList title="Preferred Skills" skills={rec.preferred_skills} color="blue" maxVisible={2} />
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsLiked(!isLiked)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                ${isLiked ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
              `}
            >
              {isLiked ? <Heart className="w-4 h-4" /> : <Heart className="w-4 h-4 text-red-400" />}
              {isLiked ? 'Liked' : 'Like'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                ${isBookmarked ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
              `}
            >
              {isBookmarked ? <BookmarkPlus className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4 text-yellow-400" />}
              {isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </motion.button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const SkillList = ({ title, skills, color, maxVisible }) => {
  if (!skills?.length) return null;
  const colorClasses = {
    emerald: 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30',
    blue: 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/30'
  };
  return (
    <div>
      <span className="text-xs text-gray-500 font-medium mb-2 block">{title}:</span>
      <div className="flex flex-wrap gap-1">
        {skills.slice(0, maxVisible).map((skill, idx) => (
          <motion.span
            key={idx}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.05 }}
            className={`px-2 py-1 ${colorClasses[color]} text-xs rounded cursor-pointer hover:${colorClasses[color]} transition-colors`}
          >
            {skill}
          </motion.span>
        ))}
        {skills.length > maxVisible && (
          <span className="px-2 py-1 bg-gray-600/20 text-gray-400 text-xs rounded">
            +{skills.length - maxVisible}
          </span>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ value, label, color }) => {
  const colorClasses = {
    purple: 'bg-purple-600/10 border-purple-500/20 text-purple-400',
    green: 'bg-green-600/10 border-green-500/20 text-green-400',
    blue: 'bg-blue-600/10 border-blue-500/20 text-blue-400',
    yellow: 'bg-yellow-600/10 border-yellow-500/20 text-yellow-400'
  };
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`${colorClasses[color]} rounded-lg p-4 text-center`}
    >
      <div className="text-3xl font-bold">
        {value}
      </div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </motion.div>
  );
};

const PortfolioGaps = ({ analysisResults }) => {
  if (!analysisResults?.portfolio_gaps?.length) {
    return null;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6"
    >
      <h3 className="text-xl font-bold mb-4 flex items-center">
        <AlertCircle className="w-5 h-5 mr-2 text-red-400" />
        AI-Identified Portfolio Gaps
      </h3>
      <div className="space-y-3">
        {analysisResults.portfolio_gaps.map((gap, index) => (
          <PortfolioGapItem key={index} gap={gap} />
        ))}
      </div>
    </motion.div>
  );
};

const PortfolioGapItem = ({ gap }) => {
  const priorityColor = {
    high: 'bg-red-600/20 text-red-300',
    medium: 'bg-yellow-600/20 text-yellow-300',
    low: 'bg-green-600/20 text-green-300'
  };
  return (
    <div className="bg-gray-800/30 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold">{gap.title || `${gap.gap_type} Gap`}</h4>
            <span className={`px-2 py-1 text-xs rounded-lg ${priorityColor[gap.priority] || priorityColor.medium}`}>
              {gap.priority} priority
            </span>
            {gap.estimated_time && (
              <span className="px-2 py-1 bg-gray-600/20 text-gray-300 text-xs rounded">
                {gap.estimated_time}
              </span>
            )}
          </div>
          <p className="text-gray-300 text-sm mb-3">{gap.description}</p>
          <div className="flex items-center mb-2">
            <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
            <p className="text-green-400 text-sm font-medium">{gap.suggested_action}</p>
          </div>
        </div>
        {gap.resources?.length > 0 && (
          <div>
            <span className="text-xs text-gray-500">Recommended Resources:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {gap.resources.map((resource, idx) => (
                <span key={idx} className="px-2 py-1 bg-indigo-600/20 text-indigo-300 text-xs rounded">
                  {resource}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ExtractionDetails = ({ analysisResults }) => {
  if (!analysisResults) return null;
  const profile = analysisResults.student_profile || {};
  const extraction = analysisResults.detailed_extraction || {};
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center">
        <FileText className="w-5 h-5 mr-2 text-green-400" />
        Extraction Details
      </h3>
      {analysisResults.detailed_extraction && (
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <StatItem
            title="Document Stats"
            stats={[
              { label: 'Words', value: extraction.total_words || 0 },
              { label: 'Characters', value: extraction.total_characters || 0 },
              { label: 'Paragraphs', value: extraction.paragraphs || 0 }
            ]}
          />
          <StatItem
            title="Contact Information"
            stats={[
              { label: 'Email', value: extraction.email_patterns_found || 0, icon: '📧', hasValue: extraction.email_patterns_found > 0 },
              { label: 'Phone', value: extraction.phone_patterns_found || 0, icon: '📱', hasValue: extraction.phone_patterns_found > 0 },
              { label: 'URLs', value: extraction.url_patterns_found || 0, icon: '🔗', hasValue: extraction.url_patterns_found > 0 }
            ]}
          />
          <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50">
            <p className="text-gray-400 text-xs mb-1">AI Processing</p>
            <div className="text-sm space-y-1">
              <div className="text-green-400">✓ Text Extracted</div>
              <div className="text-green-400">✓ Patterns Detected</div>
              <div className="text-green-400">✓ Structure Analyzed</div>
            </div>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50">
            <p className="text-gray-400 text-xs mb-1">Sections Found</p>
            <div className="text-xs">
              <span className="text-purple-400 font-mono">
                {extraction.sections_detected?.length || 0} sections
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {extraction.sections_detected?.slice(0, 3).map((section, idx) => (
                <span key={idx} className="px-1 py-0.5 bg-purple-600/20 text-purple-300 text-xs rounded">
                  {section}
                </span>
              ))}
              {(extraction.sections_detected?.length || 0) > 3 && (
                <span className="text-xs text-gray-400">+{extraction.sections_detected?.length - 3 || 0}</span>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <InfoItem label="Name" value={profile.name || 'Not detected'} />
        <InfoItem label="Experience Level" value={profile.experience_level || 'Entry-level'} capitalize />
        <div>
          <p className="text-gray-400 text-sm">Contact Info</p>
          <div className="text-sm space-y-1">
            {profile.email && (
              <div className="text-blue-300 flex items-center">
                <Mail className="w-3 h-3 mr-1" />
                {profile.email}
              </div>
            )}
            {profile.phone && (
              <div className="text-green-300 flex items-center">
                <Phone className="w-3 h-3 mr-1" />
                {profile.phone}
              </div>
            )}
            {profile.education?.[0]?.institution && (
              <div className="text-purple-300 flex items-center">
                <Award className="w-3 h-3 mr-1" />
                {profile.education[0].institution}
              </div>
            )}
            {!profile.email && !profile.phone && (
              <div className="text-gray-400">No contact information detected</div>
            )}
          </div>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Skills ({profile.skills?.length || 0})</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {profile.skills?.slice(0, 6).map((skill, idx) => (
              <span key={idx} className="px-2 py-1 bg-blue-600/20 text-blue-300 text-xs rounded">
                {skill}
              </span>
            ))}
            {(profile.skills?.length || 0) > 6 && (
              <span className="px-2 py-1 bg-gray-600/20 text-gray-400 text-xs rounded">
                +{profile.skills.length - 6} more
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatItem = ({ title, stats }) => (
  <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50">
    <p className="text-gray-400 text-xs mb-1">{title}</p>
    {stats.map((stat, idx) => (
      <div key={idx} className="text-sm space-y-1">
        {stat.icon && <span>{stat.icon}</span>}
        {stat.hasValue !== undefined ? (
          <div className={stat.hasValue ? 'text-green-400' : 'text-red-400'}>
            {stat.label}: {stat.value}
          </div>
        ) : (
          <div className="flex justify-between">
            <span>{stat.label}:</span>
            <span className={`font-mono ${stat.color || ''}`}>{stat.value}</span>
          </div>
        )}
      </div>
    ))}
  </div>
);

const InfoItem = ({ label, value, capitalize }) => (
  <div>
    <p className="text-gray-400 text-sm">{label}</p>
    <p className={`font-semibold ${capitalize ? 'capitalize' : ''}`}>{value}</p>
  </div>
);

const Sidebar = ({ analysisResults, recentActivity, showAgentComm, setShowAgentComm, setAnalysisResults }) => {
  return (
    <div className="space-y-6">
      <ProgressCard recentActivity={recentActivity} analysisResults={analysisResults} />
      {analysisResults?.readiness_evaluations?.[0] && (
        <NextStepsCard readinessEvaluation={analysisResults.readiness_evaluations[0]} />
      )}
      <AIInsightsCard analysisResults={analysisResults} />
      <QuickActionsCard
        analysisResults={analysisResults}
        showAgentComm={showAgentComm}
        setShowAgentComm={setShowAgentComm}
        setAnalysisResults={setAnalysisResults}
      />
    </div>
  );
};

const ProgressCard = ({ recentActivity, analysisResults }) => {
  const completedCount = recentActivity.filter(a => a.status === 'completed').length;
  const totalCount = recentActivity.length;
  const aiSteps = analysisResults?.agent_communications?.length || 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 }}
      className="group bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl overflow-hidden hover:border-blue-500/30 transition-all duration-300"
    >
      <div className="p-4 cursor-pointer">
        <h3 className="text-lg font-semibold flex items-center justify-between">
          <span className="flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-400" />
            Progress
          </span>
          <motion.div
            animate={{ rotate: 0 }}
            className="group-hover:rotate-180 transition-transform duration-300"
          >
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </motion.div>
        </h3>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Status:</span>
            <span className="flex items-center text-green-400">
              <CheckCircle className="w-3 h-3 mr-1" />
              {completedCount}/{totalCount}
            </span>
          </div>
          {analysisResults && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">AI Steps:</span>
              <span className="text-blue-400 font-medium">
                {aiSteps}
              </span>
            </div>
          )}
        </div>
      </div>
      <AnimatePresence>
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          whileHover={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <div className="px-4 pb-4 border-t border-gray-700/50">
            <div className="space-y-3 mt-4">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center space-x-3 p-2 bg-gray-800/30 rounded-lg"
                >
                  <div className={`${activity.status === 'completed' ? 'text-blue-400' : 'text-gray-400'}`}>
                    {activity.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs text-gray-400">{activity.time}</p>
                  </div>
                  {activity.status === 'completed' && (
                    <CheckCircle className="w-3 h-3 text-blue-400 flex-shrink-0" />
                  )}
                </motion.div>
              ))}
            </div>
            {analysisResults?.detailed_extraction && (
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-300 mb-2">Summary</h4>
                <div className="text-xs text-blue-200 space-y-1">
                  <div>✓ {analysisResults.detailed_extraction.total_words || 0} words</div>
                  <div>✓ {analysisResults.extraction_info?.skills_count || 0} skills</div>
                  <div>✓ {analysisResults.internship_recommendations?.length || 0} matches</div>
                  <div>✓ {analysisResults.detailed_extraction.sections_detected?.length || 0} sections</div>
                </div>
                {analysisResults.agent_communications && (
                  <div className="mt-2 pt-2 border-t border-blue-500/20">
                    <div className="text-xs text-blue-200">
                      Success Rate: {Math.round(
                        (analysisResults.agent_communications.filter(c => c.status === 'success' || c.status === 'completed').length /
                          analysisResults.agent_communications.length) * 100
                      )}%
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

const NextStepsCard = ({ readinessEvaluation }) => {
  const steps = readinessEvaluation.next_steps || [];
  const timeline = readinessEvaluation.timeline;
  const [expandedStep, setExpandedStep] = useState(null);
  const processedSteps = Array.isArray(steps) ? steps.map((step, index) => {
    if (typeof step === 'string') {
      return {
        category: 'General',
        priority: 'Medium',
        action: step,
        description: 'Follow this recommendation to improve your readiness',
        goal: 'Enhance your skills and qualifications',
        timeline: '2-4 weeks',
        resources: ['Online tutorials', 'Practice exercises'],
        success_metrics: ['Complete the action item']
      };
    }
    return step;
  }) : [];
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30';
      default: return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl overflow-hidden hover:border-green-500/30 transition-all duration-300"
    >
      <div className="p-4">
        <h3 className="text-lg font-semibold flex items-center justify-between mb-4">
          <span className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
            Personalized Action Plan
          </span>
          <span className="text-sm text-gray-400">
            {processedSteps.length} action items
          </span>
        </h3>
        <div className="space-y-3">
          {processedSteps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-700/50 rounded-lg overflow-hidden hover:border-gray-600/50 transition-all duration-200"
            >
              <div
                className="p-3 cursor-pointer hover:bg-gray-800/30 transition-colors"
                onClick={() => setExpandedStep(expandedStep === index ? null : index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(step.priority)}`}>
                        {step.priority} Priority
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                        {step.category}
                      </span>
                    </div>
                    <h4 className="font-medium text-white flex items-center">
                      <Target className="w-4 h-4 mr-2 text-green-400" />
                      {step.action}
                    </h4>
                    <p className="text-sm text-gray-400 mt-1">{step.description}</p>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedStep === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </motion.div>
                </div>
              </div>
              <AnimatePresence>
                {expandedStep === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden border-t border-gray-700/50"
                  >
                    <div className="p-4 bg-gray-800/20 space-y-4">
                      <div>
                        <h5 className="flex items-center text-sm font-medium text-green-400 mb-2">
                          <Award className="w-4 h-4 mr-1" />
                          Goal to Achieve
                        </h5>
                        <p className="text-sm text-gray-300 bg-green-900/20 p-3 rounded border-l-2 border-green-500/50">
                          {step.goal}
                        </p>
                      </div>
                      <div>
                        <h5 className="flex items-center text-sm font-medium text-blue-400 mb-2">
                          <Clock className="w-4 h-4 mr-1" />
                          Timeline
                        </h5>
                        <span className="text-sm text-blue-300 bg-blue-900/20 px-3 py-1 rounded">
                          {step.timeline}
                        </span>
                      </div>
                      {step.resources && step.resources.length > 0 && (
                        <div>
                          <h5 className="flex items-center text-sm font-medium text-purple-400 mb-2">
                            <BookmarkPlus className="w-4 h-4 mr-1" />
                            Learning Resources
                          </h5>
                          <div className="space-y-1">
                            {step.resources.map((resource, resIndex) => (
                              <div key={resIndex} className="flex items-start text-sm text-gray-300">
                                <span className="text-purple-400 mr-2 mt-1">•</span>
                                {resource}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {step.success_metrics && step.success_metrics.length > 0 && (
                        <div>
                          <h5 className="flex items-center text-sm font-medium text-orange-400 mb-2">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Success Metrics
                          </h5>
                          <div className="space-y-1">
                            {step.success_metrics.map((metric, metricIndex) => (
                              <div key={metricIndex} className="flex items-start text-sm text-gray-300">
                                <CheckCircle className="w-3 h-3 text-orange-400 mr-2 mt-1 flex-shrink-0" />
                                {metric}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {step.project_ideas && (
                        <div>
                          <h5 className="flex items-center text-sm font-medium text-cyan-400 mb-2">
                            <Code className="w-4 h-4 mr-1" />
                            Project Ideas
                          </h5>
                          <div className="space-y-1">
                            {step.project_ideas.map((idea, ideaIndex) => (
                              <div key={ideaIndex} className="flex items-start text-sm text-gray-300">
                                <span className="text-cyan-400 mr-2 mt-1">→</span>
                                {idea}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {step.github_checklist && (
                        <div>
                          <h5 className="flex items-center text-sm font-medium text-gray-400 mb-2">
                            <Github className="w-4 h-4 mr-1" />
                            GitHub Checklist
                          </h5>
                          <div className="space-y-1">
                            {step.github_checklist.map((item, itemIndex) => (
                              <div key={itemIndex} className="flex items-start text-sm text-gray-300">
                                <span className="text-gray-400 mr-2 mt-1">☐</span>
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {step.learning_resources && (
                        <div>
                          <h5 className="flex items-center text-sm font-medium text-indigo-400 mb-2">
                            <Globe className="w-4 h-4 mr-1" />
                            Recommended Learning
                          </h5>
                          <div className="space-y-1">
                            {step.learning_resources.map((resource, resIndex) => (
                              <div key={resIndex} className="flex items-start text-sm text-gray-300">
                                <span className="text-indigo-400 mr-2 mt-1">📚</span>
                                {resource}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-lg">
          <div className="flex items-start">
            <Clock className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-green-300 font-medium">
                Overall Timeline: {timeline}
              </p>
              <p className="text-xs text-green-200 mt-1 leading-relaxed">
                Follow this personalized action plan to systematically improve your internship readiness and achieve your career goals.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const AIInsightsCard = ({ analysisResults }) => {
  if (!analysisResults) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-sm border border-purple-500/30 rounded-xl p-5 text-center"
      >
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Brain className="w-12 h-12 mx-auto text-purple-400 mb-3" />
        </motion.div>
        <p className="text-gray-400 text-sm leading-relaxed">
          Upload your resume to see AI-powered insights
        </p>
      </motion.div>
    );
  }
  const skills = analysisResults.student_profile?.skills || [];
  const recommendations = analysisResults.internship_recommendations || [];
  const averageMatch = Math.round(
    (recommendations.reduce((acc, rec) => acc + rec.matching_score, 0) / (recommendations.length || 1)) * 100
  );
  const gaps = analysisResults.portfolio_gaps || [];
  const focusArea = gaps.length > 0 ? gaps[0].title || 'Portfolio Enhancement' : 'Ready to apply!';
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6 }}
      className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-sm border border-purple-500/30 rounded-xl p-5"
    >
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Brain className="w-5 h-5 mr-2 text-purple-400" />
        AI Insights
      </h3>
      <div className="space-y-4">
        <div className="bg-purple-800/20 rounded-lg p-3 border border-purple-500/20">
          <h4 className="text-sm font-medium text-purple-300 mb-2">Top Skills</h4>
          <div className="flex flex-wrap gap-1">
            {skills.slice(0, 3).map((skill, idx) => (
              <span key={idx} className="px-2 py-1 bg-purple-600/20 text-purple-200 text-xs rounded">
                {skill}
              </span>
            ))}
            {skills.length > 3 && (
              <span className="px-2 py-1 bg-purple-600/30 text-purple-200 text-xs rounded">
                +{skills.length - 3}
              </span>
            )}
          </div>
        </div>
        <div className="bg-blue-800/20 rounded-lg p-3 border border-blue-500/20">
          <h4 className="text-sm font-medium text-blue-300 mb-2">Match Quality</h4>
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-200">Average:</span>
            <span className="text-xl font-bold text-blue-400">
              {averageMatch}%
            </span>
          </div>
        </div>
        <div className="bg-orange-800/20 rounded-lg p-3 border border-orange-500/20">
          <h4 className="text-sm font-medium text-orange-300 mb-2">Focus Area</h4>
          <div className="text-sm text-orange-200">
            {focusArea}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const QuickActionsCard = ({ analysisResults, showAgentComm, setShowAgentComm, setAnalysisResults }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.7 }}
      className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-5"
    >
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Zap className="w-5 h-5 mr-2 text-yellow-400" />
        Actions
      </h3>
      <div className="space-y-3">
        <motion.button
          whileHover={{ scale: 1.02, x: 3 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => document.getElementById('resume-upload')?.click()}
          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 rounded-lg border border-blue-500/20 transition-all"
        >
          <div className="flex items-center">
            <Upload className="w-4 h-4 mr-3 text-blue-400" />
            <span className="text-sm font-medium">Upload Resume</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 rotate-[-90deg]" />
        </motion.button>
        {analysisResults && (
          <>
            <motion.button
              whileHover={{ scale: 1.02, x: 3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const data = {
                  profile: analysisResults.student_profile,
                  recommendations: analysisResults.internship_recommendations,
                  gaps: analysisResults.portfolio_gaps,
                  timestamp: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `internai-analysis-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success('Analysis downloaded successfully!');
              }}
              className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-600/30 hover:to-teal-600/30 rounded-lg border border-green-500/20 transition-all"
            >
              <div className="flex items-center">
                <Download className="w-4 h-4 mr-3 text-green-400" />
                <span className="text-sm font-medium">Download Report</span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 rotate-[-90deg]" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, x: 3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setAnalysisResults(null);
                document.getElementById('resume-upload').value = '';
              }}
              className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-orange-600/20 to-red-600/20 hover:from-orange-600/30 hover:to-red-600/30 rounded-lg border border-orange-500/20 transition-all"
            >
              <div className="flex items-center">
                <RefreshCw className="w-4 h-4 mr-3 text-orange-400" />
                <span className="text-sm font-medium">New Analysis</span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 rotate-[-90deg]" />
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
};

const GitHubAnalysis = ({ profile }) => {
  const githubData = profile.github_analysis;
  if (!githubData) return null;
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50"
    >
      <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
        <Github className="w-4 h-4 mr-2" />
        GitHub Analysis
        <span className="ml-2 px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded">
          Score: {githubData.github_score}/100
        </span>
      </h4>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-900/30 rounded p-3">
          <div className="text-lg font-bold text-blue-400">{githubData.public_repos}</div>
          <div className="text-xs text-gray-400">Public Repos</div>
        </div>
        <div className="bg-gray-900/30 rounded p-3">
          <div className="text-lg font-bold text-green-400">{githubData.followers}</div>
          <div className="text-xs text-gray-400">Followers</div>
        </div>
        <div className="bg-gray-900/30 rounded p-3">
          <div className="text-lg font-bold text-purple-400">{githubData.total_stars}</div>
          <div className="text-xs text-gray-400">Total Stars</div>
        </div>
        <div className="bg-gray-900/30 rounded p-3">
          <div className="text-lg font-bold text-orange-400">{githubData.total_forks}</div>
          <div className="text-xs text-gray-400">Total Forks</div>
        </div>
      </div>
      {githubData.top_languages && githubData.top_languages.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">Top Languages:</div>
          <div className="flex flex-wrap gap-1">
            {githubData.top_languages.map((lang, idx) => (
              <span key={idx} className="px-2 py-1 bg-blue-600/20 text-blue-300 text-xs rounded">
                {lang}
              </span>
            ))}
          </div>
        </div>
      )}
      {githubData.project_types && githubData.project_types.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 mb-1">Project Types:</div>
          <div className="flex flex-wrap gap-1">
            {githubData.project_types.map((type, idx) => (
              <span key={idx} className="px-2 py-1 bg-green-600/20 text-green-300 text-xs rounded">
                {type}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3 flex items-center text-xs">
        <a
          href={`https://github.com/${githubData.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400 hover:text-purple-300 flex items-center"
        >
          View Profile <ExternalLink className="w-3 h-3 ml-1" />
        </a>
      </div>
    </motion.div>
  );
};

export default Home;
