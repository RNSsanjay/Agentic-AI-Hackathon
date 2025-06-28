import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Brain, Target, BarChart3, Upload, Github, Clock, AlertCircle, Star, CheckCircle, User, Award, TrendingUp, RefreshCw, Eye, EyeOff, MessageSquare, Activity, Zap, ChevronDown, ChevronUp, Code, Database, Globe, Briefcase, Mail, Phone, MapPin, Calendar, ExternalLink, Copy, Download, Share2, Building, DollarSign, Timer, Sparkles, ArrowRight, BookmarkPlus, Filter, Search, Heart, Users, Laptop, Layers, Settings, FolderOpen, GitBranch } from 'lucide-react';
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
  const [customDomain, setCustomDomain] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
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

  // Dashboard stats logic
  const dashboardStatsData = analysisResults ? [
    {
      label: 'Readiness Score',
      value: analysisResults.readiness_evaluations?.[0]
        ? `${Math.round(analysisResults.readiness_evaluations[0].readiness_score * 100) ||
        Math.round(analysisResults.readiness_evaluations[0].overall_score * 100) ||
        Math.round(analysisResults.readiness_evaluations[0].internship_readiness_score * 100) || 75}%`
        : '75%',
      change: 'Real-time analysis result',
      icon: <Star className="w-5 h-5" />,
      color: 'text-blue-600',
      bgColor: 'from-blue-100 to-blue-50'
    },
    {
      label: 'Internship Matches',
      value: analysisResults.internship_recommendations?.length || 0,
      change: 'Live matching results',
      icon: <Target className="w-5 h-5" />,
      color: 'text-green-600',
      bgColor: 'from-green-100 to-green-50'
    },
    {
      label: 'Gaps Detected',
      value: analysisResults.portfolio_gaps?.length || 0,
      change: 'Current analysis gaps',
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'text-orange-600',
      bgColor: 'from-orange-100 to-orange-50'
    },
    {
      label: 'Skills Identified',
      value: analysisResults.student_profile?.skills?.length || 0,
      change: 'Extracted from resume',
      icon: <Brain className="w-5 h-5" />,
      color: 'text-purple-600',
      bgColor: 'from-purple-100 to-purple-50'
    }
  ] : [
    {
      label: 'Readiness Score',
      value: '0%',
      change: 'Upload resume to analyze',
      icon: <Star className="w-5 h-5" />,
      color: 'text-blue-500',
      bgColor: 'from-blue-100 to-blue-50'
    },
    {
      label: 'Internship Matches',
      value: '0',
      change: 'Upload resume to find matches',
      icon: <Target className="w-5 h-5" />,
      color: 'text-purple-500',
      bgColor: 'from-purple-100 to-purple-50'
    },
    {
      label: 'Gaps Detected',
      value: '0',
      change: 'Upload resume to detect gaps',
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'text-orange-500',
      bgColor: 'from-orange-100 to-orange-50'
    },
    {
      label: 'Available Internships',
      value: loading ? '...' : internships?.length || '20+',
      change: 'Ready for matching',
      icon: loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Briefcase className="w-5 h-5" />,
      color: 'text-blue-600',
      bgColor: 'from-blue-100 to-blue-50'
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

  const validateFile = (file) => {
    const errors = [];
    if (!file) errors.push('Please select a file');
    if (file && !['application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type) && !file.name.toLowerCase().endsWith('.docx')) {
      errors.push('File must be a DOCX document only');
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
    if (domain === 'Other') {
      setShowCustomInput(!showCustomInput);
      if (showCustomInput && customDomain.trim()) {
        // Remove custom domain if closing input
        setSelectedPreferences(prev => prev.filter(p => p !== customDomain.trim()));
        setCustomDomain('');
      }
      return;
    }

    setSelectedPreferences(prev =>
      prev.includes(domain)
        ? prev.filter(p => p !== domain)
        : [...prev, domain]
    );
  };

  const handleCustomDomainAdd = () => {
    if (customDomain.trim() && !selectedPreferences.includes(customDomain.trim())) {
      setSelectedPreferences(prev => [...prev, customDomain.trim()]);
      setCustomDomain('');
      setShowCustomInput(false);
      toast.success('Custom domain added successfully!');
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

  const refreshDashboardToZero = async () => {
    setDashboardStats(null);
    setAnalysisResults(null);
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
    setCustomDomain('');
    setShowCustomInput(false);
    setDashboardStats(null);
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
    return icons[status] || <Clock className="w-4 h-4 text-blue-400" />;
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
    return colors[status] || 'text-blue-400 bg-blue-900/20 border-blue-500/30';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 text-blue-900 relative overflow-hidden">
      {/* Floating animated elements - no rotation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 left-20 w-16 h-16 bg-blue-200/30 rounded-full"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 120, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-40 right-32 w-24 h-24 bg-indigo-300/20 rounded-lg"
        />
        <motion.div
          animate={{
            x: [0, 60, 0],
            y: [0, -80, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-40 left-1/4 w-20 h-20 bg-blue-400/15 rounded-full"
        />
      </div>

      <Navbar />
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-blue-600 mb-2">Loading InternAI Dashboard</h2>
            <p className="text-blue-600">Fetching real-time internship data and GitHub integration...</p>
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
              showCustomInput={showCustomInput}
              customDomain={customDomain}
              setCustomDomain={setCustomDomain}
              handleCustomDomainAdd={handleCustomDomainAdd}
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
              navigate={navigate}
            />
            <Sidebar
              analysisResults={analysisResults}
              recentActivity={activityData}
              showAgentComm={showAgentComm}
              setShowAgentComm={setShowAgentComm}
              setAnalysisResults={setAnalysisResults}
            />
          </div>
          {/* Features Section */}
          <FeaturesSection />
        </motion.div>
      )}
    </div>
  );
};

const WelcomeSection = ({ user, navigate, refreshDashboardToZero }) => (
  <motion.div variants={itemVariants} className="mb-8">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent pb-4">
          Welcome to InternAI, {user?.first_name || 'Student'}! <span className="ml-2 text-white" role="img" aria-label="robot"> 🤖 </span>
        </h2>
        <p className="text-blue-600 text-lg font-medium">
          AI-powered resume analysis for intelligent internship matching.
        </p>
      </div>
      <div className="flex space-x-3">
        <motion.button
          onClick={() => navigate('/analysis-history')}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-indigo-500/25 group"
        >
          <div className="flex items-center">
            <div className="p-1 bg-white/20 rounded-lg mr-3 group-hover:bg-white/30 transition-all">
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="font-semibold">View History</div>
              <div className="text-xs text-indigo-100">All analysis reports</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" />
        </motion.button>
        <motion.button
          onClick={refreshDashboardToZero}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm text-blue-600 border border-blue-200 rounded-xl hover:bg-white hover:shadow-lg transition-all"
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
        whileHover={{ scale: 1.02, y: -4 }}
        className="bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-6 hover:bg-white hover:shadow-xl hover:shadow-blue-100 transition-all duration-300"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider">{stat.label}</h3>
          <motion.div
            className={stat.color}
            animate={stat.value !== '0' && stat.value !== '0%' ? "pulse" : ""}
            variants={pulseVariants}
          >
            {stat.icon}
          </motion.div>
        </div>
        <div className="flex items-end justify-between">
          <p className="text-3xl font-bold text-blue-800">{stat.value}</p>
          <span className="text-blue-600 text-sm font-medium bg-blue-50 px-2 py-1 rounded-full">
            {stat.change}
          </span>
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
  showCustomInput,
  customDomain,
  setCustomDomain,
  handleCustomDomainAdd,
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
  groupCommunicationsByAgent,
  navigate
}) => {
  return (
    <div className="lg:col-span-3 space-y-6">
      {!analysisResults ? (
        <UploadSection
          isAnalyzing={isAnalyzing}
          selectedPreferences={selectedPreferences}
          showCustomInput={showCustomInput}
          customDomain={customDomain}
          setCustomDomain={setCustomDomain}
          handleCustomDomainAdd={handleCustomDomainAdd}
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
  showCustomInput,
  customDomain,
  setCustomDomain,
  handleCustomDomainAdd,
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
      <div className="bg-white/90 backdrop-blur-sm border border-blue-200 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300">
        <div className="text-center mb-8">

          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg ml-[400px] mb-4">
            <Brain className="w-10 h-10 text-white" />
          </div>

          <h3 className="text-3xl font-bold mb-3 text-blue-800">AI-Powered Resume Analysis</h3>
          <p className="text-blue-600 text-lg">
            Upload your resume and select preferred domains for personalized internship matching.
          </p>
        </div>
        <div className="space-y-8">              <DomainPreferences
          selectedPreferences={selectedPreferences}
          availableDomains={availableDomains}
          handlePreferenceToggle={handlePreferenceToggle}
          showCustomInput={showCustomInput}
          customDomain={customDomain}
          setCustomDomain={setCustomDomain}
          handleCustomDomainAdd={handleCustomDomainAdd}
        />

          <div className="space-y-2">
            <label htmlFor="github-input" className="block text-sm font-semibold text-blue-700">
              GitHub Profile (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Github className="h-5 w-5 text-blue-500" />
              </div>
              <input
                id="github-input"
                type="url"
                value={githubLink}
                onChange={(e) => setGithubLink(e.target.value)}
                placeholder="https://github.com/username"
                disabled={isAnalyzing}
                className="block w-full pl-10 pr-3 py-3 border border-blue-300 rounded-xl bg-white/80 text-blue-800 placeholder-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              />
            </div>
            <p className="text-xs text-blue-600">
              Add your GitHub profile to enhance portfolio analysis and get better recommendations
            </p>
          </div>
          <motion.label
            whileHover={{ scale: 1.01, y: -2 }}
            className="border-2 border-dashed border-blue-300 rounded-2xl p-8 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-300 block cursor-pointer group relative overflow-hidden"
          >
            {/* Animated background effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              initial={false}
            />

            <input
              id="resume-upload"
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isAnalyzing}
            />
            <div className="space-y-4 relative z-10">
              <motion.div
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-white font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                {isAnalyzing ? (
                  <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5 mr-3" />
                )}
                {isAnalyzing ? 'Processing with AI...' : 'Upload Resume'}
              </motion.div>
              <p className="text-sm text-blue-600 font-medium">
                Max 5MB, DOCX only. Our AI will extract and analyze everything.
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

const DomainPreferences = ({ selectedPreferences, availableDomains, handlePreferenceToggle, showCustomInput, customDomain, setCustomDomain, handleCustomDomainAdd }) => (
  <div>
    <label className="block text-sm font-semibold text-blue-700 mb-4">
      Select Your Domain Preferences ({selectedPreferences.length} selected)
    </label>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-6 bg-blue-50/80 rounded-2xl border border-blue-200">
      {availableDomains.map((domain) => (
        <motion.button
          key={domain}
          onClick={() => handlePreferenceToggle(domain)}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          className={`p-3 text-sm rounded-xl transition-all font-medium border-2 ${selectedPreferences.includes(domain)
            ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200'
            : 'bg-white/80 text-blue-700 border-blue-200 hover:bg-white hover:border-blue-300 hover:text-blue-600'
            }`}
        >
          {domain}
        </motion.button>
      ))}

      {/* Other Option */}
      <motion.button
        onClick={() => handlePreferenceToggle('Other')}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        className={`p-3 text-sm rounded-xl transition-all font-medium border-2 flex items-center justify-center ${showCustomInput
          ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-200'
          : 'bg-white/80 text-orange-700 border-orange-200 hover:bg-white hover:border-orange-300 hover:text-orange-600'
          }`}
      >
        <span className="mr-2">✨</span>
        Other
      </motion.button>
    </div>

    {/* Custom Domain Input */}
    <AnimatePresence>
      {showCustomInput && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-200"
        >
          <label className="block text-sm font-semibold text-orange-700 mb-3">
            Enter your custom domain:
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCustomDomainAdd()}
              placeholder="e.g., Robotics, E-commerce, HealthTech..."
              className="flex-1 px-4 py-3 bg-white border border-orange-300 rounded-xl text-orange-800 placeholder-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <motion.button
              onClick={handleCustomDomainAdd}
              disabled={!customDomain.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </motion.button>
          </div>
          <p className="text-xs text-orange-600 mt-2">
            Add a specific domain that's not listed above
          </p>
        </motion.div>
      )}
    </AnimatePresence>

    <p className="text-xs text-blue-600 mt-3">
      Select multiple domains to get diverse internship recommendations
    </p>
    {selectedPreferences.length > 0 && (
      <div className="mt-4">
        <label className="block text-sm font-semibold text-blue-700 mb-3">
          Selected Preferences:
        </label>
        <div className="flex flex-wrap gap-2">
          {selectedPreferences.map((pref, idx) => (
            <motion.span
              key={idx}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-4 py-2 bg-blue-100 text-blue-700 text-sm rounded-full flex items-center gap-2 border border-blue-200"
            >
              {pref}
              <motion.button
                onClick={() => handlePreferenceToggle(pref)}
                whileHover={{ scale: 1.1 }}
                className="text-blue-500 hover:text-blue-700 font-bold"
              >
                ×
              </motion.button>
            </motion.span>
          ))}
        </div>
      </div>
    )}
  </div>
);

const ErrorDisplay = ({ error, retryAnalysis }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between"
  >
    <div className="flex items-center">
      <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
      <p className="text-red-700 font-medium">{error}</p>
    </div>
    <motion.button
      onClick={retryAnalysis}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-all"
    >
      Retry
    </motion.button>
  </motion.div>
);

const ProgressDisplay = ({ analysisStep, progress }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="mt-6 text-center"
  >
    <div className="inline-flex items-center text-blue-600 mb-4">
      <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full mr-3 animate-spin" />
      <span className="font-semibold text-lg">{analysisStep || 'Initializing...'}</span>
    </div>
    <div className="w-full bg-blue-100 rounded-full h-4 mb-3 overflow-hidden">
      <motion.div
        className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500 shadow-lg"
        style={{ width: `${progress}%` }}
        animate={{
          boxShadow: [
            "0 0 10px rgba(59, 130, 246, 0.3)",
            "0 0 20px rgba(59, 130, 246, 0.5)",
            "0 0 10px rgba(59, 130, 246, 0.3)"
          ]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
    <p className="text-sm text-blue-600 font-medium">
      Processing may take up to 60 seconds. Our AI agents are working hard! 🤖
    </p>
  </motion.div>
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
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    className="bg-gradient-to-r from-green-50 via-blue-50 to-green-50 border border-green-300 rounded-2xl p-6 shadow-lg"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <motion.div
          animate={{
            rotate: [0, 360],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 2 }}
          className="bg-green-500 rounded-full p-2 mr-4"
        >
          <CheckCircle className="w-8 h-8 text-white" />
        </motion.div>
        <div>
          <h3 className="text-xl font-bold text-green-700">AI Analysis Complete!</h3>
          <p className="text-blue-600 font-medium">
            Resume processed successfully with {analysisResults.agent_communications?.length || 5} AI agents
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAgentComm(!showAgentComm)}
          className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl text-sm flex items-center gap-2 transition-all font-medium"
        >
          {showAgentComm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showAgentComm ? 'Hide' : 'View'} AI Logs
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/analysis-history')}
          className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl text-sm flex items-center gap-2 transition-all font-semibold"
        >
          <Clock className="w-4 h-4" />
          View History
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={downloadAnalysis}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm flex items-center gap-2 transition-all font-medium shadow-lg"
        >
          <Download className="w-4 h-4" />
          Export
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={resetAnalysis}
          className="px-4 py-2 bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 rounded-xl text-sm transition-all font-medium"
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
          className="bg-blue-900/50 backdrop-blur-sm border border-blue-800 rounded-lg p-6"
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
      className="border border-blue-700 rounded-lg overflow-hidden"
    >
      <motion.button
        whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.7)' }}
        onClick={() => setExpandedAgent(expandedAgent === agentName ? null : agentName)}
        className="w-full flex items-center justify-between p-4 bg-blue-800/50 hover:bg-blue-800/70 transition-all"
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: expandedAgent === agentName ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <Zap className="w-5 h-5 text-cyan-400" />
          </motion.div>
          <span className="font-semibold text-cyan-300">{agentName}</span>
          <span className="text-sm text-blue-400">({communications.length} steps)</span>
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
          <ChevronDown className="w-5 h-5 text-blue-400" />
        </motion.div>
      </motion.button>
      <AnimatePresence>
        {expandedAgent === agentName && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-900/30"
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
        className="mb-2 p-3 bg-blue-800/30 rounded text-sm border-l-2 border-yellow-400"
      >
        <span className="text-yellow-400 font-medium">🎯 Micro Goal:</span>
        <span className="ml-2 text-blue-200">{comm.micro_goal}</span>
      </motion.div>
    )}
    {comm.data && Object.keys(comm.data).length > 0 && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-2 p-3 bg-blue-800/20 rounded border"
      >
        <div className="text-xs text-blue-400 mb-2 font-medium">Processing Data:</div>
        <div className="text-sm space-y-1 max-h-32 overflow-y-auto">
          {Object.entries(comm.data).map(([key, value]) => (
            <div key={key} className="flex justify-between items-start gap-2">
              <span className="text-blue-300 capitalize text-xs">{key.replace(/_/g, ' ')}:</span>
              <span className="text-blue-100 font-mono text-xs text-right max-w-xs break-words">
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
      className="bg-white border-2 border-blue-100 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold flex items-center text-blue-900">
          <FileText className="w-6 h-6 mr-3 text-blue-600" />
          Gemini AI Text Extraction
        </h3>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => copyToClipboard(analysisResults.file_info?.resume_text || '')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Copy className="w-4 h-4" />
            {copiedText ? 'Copied!' : 'Copy Text'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFullText(!showFullText)}
            className="px-4 py-2 bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-200 hover:border-blue-300 rounded-lg text-sm transition-all duration-200"
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
  <div className="grid md:grid-cols-4 gap-4 mb-6">
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200 shadow-sm hover:shadow-md transition-all duration-200"
    >
      <p className="text-blue-800 font-semibold text-sm mb-3">Document Statistics</p>
      <div className="text-sm space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Words:</span>
          <span className="font-bold text-blue-700 bg-white px-2 py-1 rounded-md">
            {extraction.total_words?.toLocaleString() || '0'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Characters:</span>
          <span className="font-bold text-blue-700 bg-white px-2 py-1 rounded-md">
            {extraction.total_characters?.toLocaleString() || '0'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Paragraphs:</span>
          <span className="font-bold text-blue-700 bg-white px-2 py-1 rounded-md">
            {extraction.paragraphs || '0'}
          </span>
        </div>
      </div>
    </motion.div>

    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-4 border border-blue-200 shadow-sm hover:shadow-md transition-all duration-200"
    >
      <p className="text-blue-800 font-semibold text-sm mb-3">Contact Detection</p>
      <div className="text-sm space-y-2">
        <div className={`flex items-center justify-between p-2 rounded-lg ${
          extraction.email_patterns_found > 0 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <span className="flex items-center">📧 Email</span>
          <span className="font-bold">{extraction.email_patterns_found || '0'}</span>
        </div>
        <div className={`flex items-center justify-between p-2 rounded-lg ${
          extraction.phone_patterns_found > 0 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <span className="flex items-center">📱 Phone</span>
          <span className="font-bold">{extraction.phone_patterns_found || '0'}</span>
        </div>
        <div className={`flex items-center justify-between p-2 rounded-lg ${
          extraction.url_patterns_found > 0 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <span className="flex items-center">🔗 URLs</span>
          <span className="font-bold">{extraction.url_patterns_found || '0'}</span>
        </div>
      </div>
    </motion.div>

    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-gradient-to-br from-blue-50 to-cyan-100 rounded-xl p-4 border border-blue-200 shadow-sm hover:shadow-md transition-all duration-200"
    >
      <p className="text-blue-800 font-semibold text-sm mb-3">AI Processing</p>
      <div className="text-sm space-y-2">
        <div className="flex items-center text-green-700 bg-green-50 p-2 rounded-lg border border-green-200">
          <span className="mr-2">✓</span>
          <span>Text Extracted</span>
        </div>
        <div className="flex items-center text-green-700 bg-green-50 p-2 rounded-lg border border-green-200">
          <span className="mr-2">✓</span>
          <span>Patterns Detected</span>
        </div>
        <div className="flex items-center text-green-700 bg-green-50 p-2 rounded-lg border border-green-200">
          <span className="mr-2">✓</span>
          <span>Structure Analyzed</span>
        </div>
      </div>
    </motion.div>

    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-gradient-to-br from-blue-50 to-purple-100 rounded-xl p-4 border border-blue-200 shadow-sm hover:shadow-md transition-all duration-200"
    >
      <p className="text-blue-800 font-semibold text-sm mb-3">Sections Found</p>
      <div className="mb-2">
        <span className="text-blue-700 font-bold text-lg bg-white px-3 py-1 rounded-lg border border-blue-200">
          {extraction.sections_detected?.length || 0}
        </span>
        <span className="text-gray-600 text-sm ml-2">sections</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {extraction.sections_detected?.slice(0, 3).map((section, idx) => (
          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md border border-blue-200 font-medium">
            {section}
          </span>
        ))}
        {(extraction.sections_detected?.length || 0) > 3 && (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md border border-gray-200">
            +{extraction.sections_detected?.length - 3 || 0} more
          </span>
        )}
      </div>
    </motion.div>
  </div>
);

const ExtractedTextDisplay = ({ analysisResults, showFullText, setShowFullText }) => (
  <div className="bg-white rounded-xl border-2 border-blue-100 overflow-hidden shadow-inner">
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
      <h4 className="font-semibold flex items-center">
        <Brain className="w-5 h-5 mr-2" />
        Extracted Resume Content
      </h4>
      <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
        Processed by Gemini AI
      </span>
    </div>
    <div className={`p-6 bg-gray-50 text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed border-l-4 border-blue-400 ${
      showFullText ? 'max-h-none' : 'max-h-80'
    } overflow-y-auto transition-all duration-300`}>
      {analysisResults.file_info?.resume_text ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm"
        >
          {showFullText
            ? analysisResults.file_info.resume_text
            : analysisResults.file_info.resume_text.slice(0, 1000) +
            (analysisResults.file_info.resume_text.length > 1000 ? '...' : '')
          }
        </motion.div>
      ) : (
        <div className="text-gray-500 italic text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No resume text extracted. Please try uploading a different file.</p>
        </div>
      )}
    </div>
    {!showFullText && analysisResults.file_info?.resume_text?.length > 1000 && (
      <div className="p-4 bg-blue-50 border-t border-blue-100 text-center">
        <motion.button
          whileHover={{ scale: 1.02 }}
          onClick={() => setShowFullText(true)}
          className="text-blue-600 hover:text-blue-800 font-medium bg-white px-4 py-2 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
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
  const completionPercentage = Math.round(((profile.skills?.length || 0) / 25) * 100);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white border-2 border-blue-100 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold flex items-center text-blue-900">
          <User className="w-6 h-6 mr-3 text-blue-600" />
          AI-Enhanced Profile Summary
        </h3>
        <div className="flex items-center space-x-3">
          {/* <div className="flex items-center">
            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
            <span className="ml-2 text-sm font-semibold text-gray-600">
              {completionPercentage}%
            </span>
          </div> */}
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full border border-blue-200">
            Profile Complete
          </span>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <PersonalInformation profile={profile} />
          <ContactInformation profile={profile} />
          {hasOnlineProfiles(profile) && <OnlineProfiles profile={profile} />}
          {profile.github_analysis && <GitHubAnalysis profile={profile} />}
        </div>
        <div className="space-y-6">
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
    whileHover={{ scale: 1.02, y: -2 }}
    className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-blue-200 hover:border-blue-300 transition-all duration-300 shadow-md hover:shadow-lg"
  >
    <div className="flex items-center mb-6">
      <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl mr-4 shadow-md">
        <User className="w-6 h-6 text-white" />
      </div>
      <div>
        <h4 className="text-lg font-semibold text-blue-800">Personal Information</h4>
        <p className="text-blue-600 text-sm">Professional profile details</p>
      </div>
    </div>

    <div className="space-y-6">
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-blue-700 text-sm font-medium">Full Name</span>
          <User className="w-4 h-4 text-blue-600" />
        </div>
        <p className="font-bold text-xl text-blue-900">
          {profile.name || 'Not detected'}
        </p>
        {!profile.name && (
          <p className="text-blue-600 text-xs mt-1">Add your name to improve profile visibility</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-700 text-sm font-medium">Experience Level</span>
            <Award className="w-4 h-4 text-green-600" />
          </div>
          <p className="font-bold text-lg text-green-900 capitalize">
            {profile.experience_level || 'Entry-level'}
          </p>
          {profile.years_of_experience && (
            <p className="text-green-700 text-sm mt-1">
              {profile.years_of_experience} years
            </p>
          )}
        </div>

        <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-700 text-sm font-medium">Profile Status</span>
            <CheckCircle className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse" />
            <p className="font-medium text-purple-900">Active</p>
          </div>
          <p className="text-purple-700 text-xs mt-1">
            Profile successfully analyzed
          </p>
        </div>
      </div>

      {profile.location && (
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-orange-700 text-sm font-medium">Location</span>
            <MapPin className="w-4 h-4 text-orange-600" />
          </div>
          <p className="font-medium text-orange-900">{profile.location}</p>
        </div>
      )}
    </div>
  </motion.div>
);  

const ContactInformation = ({ profile }) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -2 }}
    className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-blue-200 hover:border-blue-300 transition-all duration-300 shadow-md hover:shadow-lg"
  >
    <div className="flex items-center mb-6">
      <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl mr-4 shadow-md">
        <Mail className="w-6 h-6 text-white" />
      </div>
      <div>
        <h4 className="text-lg font-semibold text-blue-800">Contact Information</h4>
        <p className="text-blue-600 text-sm">Professional contact details</p>
      </div>
    </div>

    <div className="space-y-4">
      {profile.email ? (
        <motion.div
          whileHover={{ x: 5 }}
          className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-all group"
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-600 rounded-lg mr-3 shadow-md">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-blue-700 font-medium">Email Address</p>
              <p className="text-blue-900 font-mono text-sm">{profile.email}</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              navigator.clipboard.writeText(profile.email);
              toast.success('Email copied to clipboard!');
            }}
            className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-all"
          >
            <Copy className="w-4 h-4 text-blue-600" />
          </motion.button>
        </motion.div>
      ) : (
        <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-center">
          <Mail className="w-8 h-8 text-red-500 mx-auto mb-2 opacity-70" />
          <p className="text-red-700 text-sm font-medium">No email detected</p>
          <p className="text-red-600 text-xs mt-1">Add email to improve contact visibility</p>
        </div>
      )}

      {profile.phone ? (
        <motion.div
          whileHover={{ x: 5 }}
          className="flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-xl border border-green-200 transition-all group"
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-600 rounded-lg mr-3 shadow-md">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-green-700 font-medium">Phone Number</p>
              <p className="text-green-900 font-mono text-sm">{profile.phone}</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              navigator.clipboard.writeText(profile.phone);
              toast.success('Phone number copied to clipboard!');
            }}
            className="p-2 bg-green-100 hover:bg-green-200 rounded-lg transition-all"
          >
            <Copy className="w-4 h-4 text-green-600" />
          </motion.button>
        </motion.div>
      ) : (
        <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-center">
          <Phone className="w-8 h-8 text-red-500 mx-auto mb-2 opacity-70" />
          <p className="text-red-700 text-sm font-medium">No phone number detected</p>
          <p className="text-red-600 text-xs mt-1">Add phone number for better accessibility</p>
        </div>
      )}

      {profile.education?.[0]?.institution && (
        <motion.div
          whileHover={{ x: 5 }}
          className="flex items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 transition-all"
        >
          <div className="p-2 bg-purple-600 rounded-lg mr-3 shadow-md">
            <Award className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-purple-700 font-medium">Primary Institution</p>
            <p className="text-purple-900 text-sm">{profile.education[0].institution}</p>
          </div>
        </motion.div>
      )}

      {!profile.email && !profile.phone && !profile.education?.[0]?.institution && (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
          <p className="text-gray-600 text-sm font-medium">No contact information detected</p>
          <p className="text-gray-500 text-xs mt-1">Add contact details to improve networking opportunities</p>
        </div>
      )}
    </div>
  </motion.div>
);

const hasOnlineProfiles = (profile) => {
  return profile.linkedin || profile.github || profile.website;
};

const OnlineProfiles = ({ profile }) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -2 }}
    className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-blue-200 hover:border-blue-300 transition-all duration-300 shadow-md hover:shadow-lg"
  >
    <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
      <Globe className="w-5 h-5 mr-3 text-blue-600" />
      Online Presence
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="ml-2 w-2 h-2 bg-green-500 rounded-full"
      />
    </h4>
    <div className="space-y-4">
      {profile.linkedin && (
        <motion.div
          whileHover={{ x: 5 }}
          className="flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-all group"
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-600 rounded-lg mr-3 shadow-md">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-blue-700 font-medium">LinkedIn Profile</p>
              <p className="text-blue-600 text-sm">Professional networking</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-blue-500 group-hover:text-blue-600 transition-colors" />
        </motion.div>
      )}
      {profile.github && (
        <motion.div
          whileHover={{ x: 5 }}
          className="flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 transition-all group"
        >
          <div className="flex items-center">
            <div className="p-2 bg-purple-600 rounded-lg mr-3 shadow-md">
              <Github className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-purple-700 font-medium">GitHub Profile</p>
              <p className="text-purple-600 text-sm">Code repositories</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-purple-500 group-hover:text-purple-600 transition-colors" />
        </motion.div>
      )}
      {profile.website && (
        <motion.div
          whileHover={{ x: 5 }}
          className="flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-xl border border-green-200 transition-all group"
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-600 rounded-lg mr-3 shadow-md">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-green-700 font-medium">Personal Website</p>
              <p className="text-green-600 text-sm">Portfolio showcase</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-green-500 group-hover:text-green-600 transition-colors" />
        </motion.div>
      )}
      {!profile.linkedin && !profile.github && !profile.website && (
        <div className="text-center py-8">
          <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
          <p className="text-gray-600 text-sm font-medium">No online profiles detected</p>
          <p className="text-gray-500 text-xs mt-1">Add LinkedIn or GitHub links to enhance your profile</p>
        </div>
      )}
    </div>
  </motion.div>
);

const TechnicalSkills = ({ profile }) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -2 }}
    className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-blue-200 hover:border-blue-300 transition-all duration-300 shadow-md hover:shadow-lg"
  >
    <div className="flex items-center justify-between mb-6">
      <h4 className="text-lg font-semibold text-blue-800 flex items-center">
        <Code className="w-5 h-5 mr-3 text-blue-600" />
        Technical Skills
      </h4>
      <div className="flex items-center">
        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full border border-blue-300">
          {profile.skills?.length || 0} skills
        </span>
      </div>
    </div>

    <div className="space-y-6">
      {profile.programming_languages?.length > 0 && (
        <SkillCategory
          title="Programming Languages"
          items={profile.programming_languages}
          color="blue"
          icon={<Code className="w-4 h-4" />}
        />
      )}
      {profile.frameworks?.length > 0 && (
        <SkillCategory
          title="Frameworks & Libraries"
          items={profile.frameworks}
          color="green"
          icon={<Layers className="w-4 h-4" />}
        />
      )}
      {profile.tools?.length > 0 && (
        <SkillCategory
          title="Development Tools"
          items={profile.tools}
          color="purple"
          icon={<Settings className="w-4 h-4" />}
        />
      )}
      {profile.databases?.length > 0 && (
        <SkillCategory
          title="Databases"
          items={profile.databases}
          color="orange"
          icon={<Database className="w-4 h-4" />}
        />
      )}

      {(!profile.programming_languages?.length &&
        !profile.frameworks?.length &&
        !profile.tools?.length &&
        !profile.databases?.length) &&
        profile.skills?.length > 0 && (
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center mb-3">
              <Sparkles className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">All Detected Skills</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill, idx) => (
                <motion.span
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="px-3 py-2 bg-white text-blue-700 text-sm rounded-lg hover:bg-blue-100 transition-all border border-blue-300 cursor-pointer font-medium shadow-sm"
                >
                  {skill}
                </motion.span>
              ))}
            </div>
          </div>
        )}

      {(!profile.skills?.length || profile.skills.length === 0) && (
        <div className="text-center py-8">
          <Code className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
          <p className="text-gray-600 text-sm font-medium">No technical skills detected</p>
          <p className="text-gray-500 text-xs mt-1">Add relevant skills to your resume</p>
        </div>
      )}
    </div>
  </motion.div>
);

const SkillCategory = ({ title, items, color, icon }) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50 hover:bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-200',
      buttonBg: 'bg-blue-100',
      skillBg: 'bg-white hover:bg-blue-50'
    },
    green: {
      bg: 'bg-green-50 hover:bg-green-100',
      text: 'text-green-700',
      border: 'border-green-200',
      buttonBg: 'bg-green-100',
      skillBg: 'bg-white hover:bg-green-50'
    },
    purple: {
      bg: 'bg-purple-50 hover:bg-purple-100',
      text: 'text-purple-700',
      border: 'border-purple-200',
      buttonBg: 'bg-purple-100',
      skillBg: 'bg-white hover:bg-purple-50'
    },
    orange: {
      bg: 'bg-orange-50 hover:bg-orange-100',
      text: 'text-orange-700',
      border: 'border-orange-200',
      buttonBg: 'bg-orange-100',
      skillBg: 'bg-white hover:bg-orange-50'
    }
  };

  const colorClass = colorClasses[color];

  return (
    <div className={`${colorClass.bg} rounded-xl p-4 border ${colorClass.border} transition-all`}>
      <div className="flex items-center mb-3">
        <div className={`p-1 ${colorClass.buttonBg} rounded-lg mr-2`}>
          {icon}
        </div>
        <span className={`text-sm font-medium ${colorClass.text}`}>
          {title}
        </span>
        <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full font-medium">
          {items.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <motion.span
            key={idx}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.05, y: -2 }}
            className={`px-3 py-2 ${colorClass.skillBg} ${colorClass.text} text-sm rounded-lg cursor-pointer transition-all border ${colorClass.border} font-medium shadow-sm`}
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
    whileHover={{ scale: 1.02, y: -2 }}
    className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-blue-200 hover:border-blue-300 transition-all duration-300 shadow-md hover:shadow-lg"
  >
    <div className="flex items-center justify-between mb-6">
      <h4 className="text-lg font-semibold text-blue-800 flex items-center">
        <Award className="w-5 h-5 mr-3 text-blue-600" />
        Education
      </h4>
      <div className="flex items-center">
        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full border border-blue-300">
          {profile.education?.length || 0} institutions
        </span>
      </div>
    </div>

    <div className="space-y-4">
      {profile.education && profile.education.length > 0 ? (
        profile.education.map((edu, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.02, x: 5 }}
            className="bg-blue-50 rounded-xl p-5 border border-blue-200 hover:border-blue-300 transition-all group hover:shadow-md"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h5 className="font-bold text-blue-900 text-lg group-hover:text-blue-700 transition-colors">
                  {edu.degree || 'Degree'}
                </h5>
                <p className="text-blue-700 font-medium">{edu.institution || 'Institution'}</p>
              </div>
              <div className="text-right">
                {edu.gpa && (
                  <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold border border-green-300">
                    GPA: {edu.gpa}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm">
              {edu.year && (
                <div className="flex items-center text-blue-600">
                  <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                  <span className="font-medium">{edu.year}</span>
                </div>
              )}
              {edu.location && (
                <div className="flex items-center text-blue-600">
                  <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                  <span>{edu.location}</span>
                </div>
              )}
            </div>

            {edu.description && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-blue-300">
                <p className="text-blue-800 text-sm italic">{edu.description}</p>
              </div>
            )}

            {edu.achievements && edu.achievements.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-blue-600 mb-2 font-medium">Achievements:</p>
                <div className="flex flex-wrap gap-2">
                  {edu.achievements.map((achievement, achieveIdx) => (
                    <span key={achieveIdx} className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full border border-yellow-300">
                      {achievement}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))
      ) : (
        <div className="text-center py-8">
          <Award className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
          <p className="text-gray-600 text-sm font-medium">No education information detected</p>
          <p className="text-gray-500 text-xs mt-1">Add your educational background to enhance your profile</p>
        </div>
      )}
    </div>
  </motion.div>
);

const ProfessionalSummary = ({ profile }) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -2 }}
    className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-blue-200 hover:border-blue-300 transition-all duration-300 shadow-md hover:shadow-lg"
  >
    <div className="flex items-center mb-6">
      <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl mr-4 shadow-md">
        <Sparkles className="w-6 h-6 text-white" />
      </div>
      <div>
        <h4 className="text-lg font-semibold text-blue-800">Professional Summary</h4>
        <p className="text-blue-600 text-sm">AI-generated professional overview</p>
      </div>
    </div>

    <div className="relative">
      <div className="absolute top-0 left-0 text-6xl text-blue-300/30 font-serif">"</div>
      <div className="pl-8 pr-4">
        <p className="text-blue-900 text-lg leading-relaxed italic font-medium">
          {profile.summary}
        </p>
      </div>
      <div className="absolute bottom-0 right-0 text-6xl text-blue-300/30 font-serif rotate-180">"</div>
    </div>

    <div className="mt-6 flex items-center justify-between pt-4 border-t border-blue-200">
      <div className="flex items-center text-sm text-blue-600">
        <Brain className="w-4 h-4 mr-2" />
        Generated by AI Analysis
      </div>
      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm transition-all border border-blue-300"
        >
          <Copy className="w-3 h-3 mr-1 inline" />
          Copy
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm transition-all border border-purple-300"
        >
          <RefreshCw className="w-3 h-3 mr-1 inline" />
          Regenerate
        </motion.button>
      </div>
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
      className="col-span-full bg-white border-2 border-blue-100 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300"
    >
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-bold flex items-center text-blue-900">
          <Target className="w-6 h-6 mr-3 text-blue-600" />
          AI-Matched Internship Recommendations
          <span className="ml-3 px-4 py-2 bg-blue-100 text-blue-800 text-sm rounded-full font-medium border border-blue-200">
            {recommendations.length} Found
          </span>
        </h3>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2 transition-all font-medium shadow-md hover:shadow-lg"
          >
            <Eye className="w-4 h-4" />
            View All
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="px-5 py-2 bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-200 hover:border-blue-300 rounded-lg text-sm flex items-center gap-2 transition-all font-medium"
          >
            <Download className="w-4 h-4" />
            Export
          </motion.button>
        </div>
      </div>
      
      <div className="relative mb-8 overflow-hidden">
        <motion.div
          className="flex gap-6 pb-4"
          style={{
            overflowX: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: '#3b82f6 #f1f5f9'
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
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent pointer-events-none" />
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-blue-100">
        <StatCard value={recommendations.length} label="Total Matches" color="blue" />
        <StatCard value={`${averageMatch}%`} label="Avg Match" color="green" />
        <StatCard value={uniqueDomains} label="Domains" color="purple" />
        <StatCard value={highMatchCount} label="High Match" color="orange" />
      </div>
    </motion.div>
  );
};

const InternshipCard = ({ rec, index }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  const matchColor = rec.matching_score >= 0.8 ? 'bg-green-100 text-green-800 border-green-200' :
    rec.matching_score >= 0.6 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
      'bg-red-100 text-red-800 border-red-200';
  const matchText = rec.matching_score >= 0.8 ? 'Excellent Match' :
    rec.matching_score >= 0.6 ? 'Good Match' :
      'Partial Match';
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: index * 0.15,
        duration: 0.6,
        type: "spring",
        stiffness: 100
      }}
      whileHover={{
        scale: 1.03,
        y: -8,
        boxShadow: "0 25px 50px -12px rgba(59, 130, 246, 0.25)"
      }}
      className="group relative bg-white rounded-2xl overflow-hidden border-2 border-blue-100 hover:border-blue-300 transition-all duration-300 shadow-lg hover:shadow-xl h-fit"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-blue-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.8 }}
                className="p-3 bg-blue-100 rounded-xl border border-blue-200"
              >
                <Building className="w-5 h-5 text-blue-600" />
              </motion.div>
              <div>
                <motion.h3
                  className="text-xl font-bold text-blue-900 leading-tight group-hover:text-blue-700 transition-colors duration-300"
                  whileHover={{ x: 5 }}
                >
                  {rec.title}
                </motion.h3>
                <motion.p
                  className="text-blue-600 font-semibold text-lg"
                  whileHover={{ x: 5 }}
                >
                  {rec.company}
                </motion.p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 text-xs rounded-full border font-medium ${matchColor}`}>
                {matchText}
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full border border-gray-200 font-medium">
                {rec.domain}
              </span>
            </div>
          </div>
          <div className="text-center ml-3">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 rounded-xl mb-1 shadow-md"
              whileHover={{ scale: 1.1 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Star className="w-5 h-5 text-white mx-auto mb-1" />
              <span className="font-bold text-white text-sm">
                {(rec.matching_score * 100).toFixed(0)}%
              </span>
            </motion.div>
            <div className="text-xs text-blue-600 font-medium">Match Score</div>
          </div>
        </div>
      </div>
      
      <div className="p-6 pt-0">
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-lg">
            <span className="text-gray-600 font-medium">Location:</span>
            <span className="text-gray-800 font-semibold">{rec.location || 'Remote'}</span>
          </div>
          <div className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-lg">
            <span className="text-gray-600 font-medium">Duration:</span>
            <span className="text-gray-800 font-semibold">{rec.duration || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-lg">
            <span className="text-gray-600 font-medium">Stipend:</span>
            <span className="text-gray-800 font-semibold">{rec.stipend || 'Unpaid'}</span>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowFullDescription(!showFullDescription)}
          className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm flex items-center justify-center gap-2 transition-all font-medium"
        >
          {showFullDescription ? 'Hide Details' : 'View Details'}
          <ChevronDown className={`w-4 h-4 transition-transform ${showFullDescription ? 'rotate-180' : ''}`} />
        </motion.button>
      </div>
      
      {showFullDescription && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-6 pt-0 bg-blue-50/50 border-t border-blue-100"
        >
          <h4 className="text-sm font-semibold text-blue-800 mb-3">Job Description</h4>
          <p className="text-sm text-gray-700 leading-relaxed mb-4 bg-white p-4 rounded-lg border border-blue-100">
            {rec.justification || 'No description provided.'}
          </p>
          
          <div className="space-y-3">
            <SkillList title="Required Skills" skills={rec.requirements} color="green" maxVisible={3} />
            {rec.preferred_skills?.length > 0 && (
              <SkillList title="Preferred Skills" skills={rec.preferred_skills} color="blue" maxVisible={2} />
            )}
          </div>
          
          <div className="mt-6 flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsLiked(!isLiked)}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 border-2
                ${isLiked ? 'bg-red-500 text-white border-red-500' : 'bg-white text-red-500 border-red-200 hover:bg-red-50'}
              `}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              {isLiked ? 'Liked' : 'Like'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 border-2
                ${isBookmarked ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-yellow-600 border-yellow-200 hover:bg-yellow-50'}
              `}
            >
              <BookmarkPlus className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              {isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </motion.button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

const SkillList = ({ title, skills, color, maxVisible }) => {
  if (!skills?.length) return null;
  
  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
  };
  
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <span className="text-sm text-gray-700 font-semibold mb-3 block">{title}:</span>
      <div className="flex flex-wrap gap-2">
        {skills.slice(0, maxVisible).map((skill, idx) => (
          <motion.span
            key={idx}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.05 }}
            className={`px-3 py-1 ${colorClasses[color]} text-sm rounded-full cursor-pointer transition-all border font-medium`}
          >
            {skill}
          </motion.span>
        ))}
        {skills.length > maxVisible && (
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full border border-gray-200 font-medium">
            +{skills.length - maxVisible} more
          </span>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ value, label, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800'
  };
  
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={`${colorClasses[color]} rounded-xl p-6 text-center border-2 shadow-sm hover:shadow-md transition-all duration-200`}
    >
      <div className="text-3xl font-bold mb-2">
        {value}
      </div>
      <div className="text-sm font-medium">{label}</div>
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
      className="bg-white border-2 border-blue-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
    >
      <h3 className="text-2xl font-bold mb-6 flex items-center text-blue-900">
        <AlertCircle className="w-6 h-6 mr-3 text-red-500" />
        AI-Identified Portfolio Gaps
      </h3>
      <div className="space-y-4">
        {analysisResults.portfolio_gaps.map((gap, index) => (
          <PortfolioGapItem key={index} gap={gap} />
        ))}
      </div>
    </motion.div>
  );
};

const PortfolioGapItem = ({ gap }) => {
  const priorityColor = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200'
  };
  
  return (
    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h4 className="font-bold text-gray-900 text-lg">{gap.title || `${gap.gap_type} Gap`}</h4>
            <span className={`px-3 py-1 text-sm rounded-full border font-medium ${priorityColor[gap.priority] || priorityColor.medium}`}>
              {gap.priority} priority
            </span>
            {gap.estimated_time && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full border border-blue-200 font-medium">
                {gap.estimated_time}
              </span>
            )}
          </div>
          <p className="text-gray-700 text-sm mb-4 leading-relaxed">{gap.description}</p>
          <div className="flex items-center mb-3 bg-green-50 p-3 rounded-lg border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <p className="text-green-800 text-sm font-medium">{gap.suggested_action}</p>
          </div>
        </div>
        {gap.resources?.length > 0 && (
          <div className="ml-6">
            <span className="text-sm text-gray-600 font-semibold mb-2 block">Resources:</span>
            <div className="flex flex-wrap gap-2">
              {gap.resources.map((resource, idx) => (
                <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full border border-indigo-200 font-medium">
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
    <div className="bg-white border-2 border-blue-100 rounded-2xl p-8 shadow-lg">
      <h3 className="text-2xl font-bold mb-6 flex items-center text-blue-900">
        <FileText className="w-6 h-6 mr-3 text-blue-600" />
        Extraction Details
      </h3>
      
      {analysisResults.detailed_extraction && (
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <StatItem
            title="Document Statistics"
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
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <p className="text-blue-800 font-semibold text-sm mb-3">AI Processing</p>
            <div className="text-sm space-y-2">
              <div className="flex items-center text-green-700 bg-green-50 p-2 rounded-lg border border-green-200">
                <span className="mr-2">✓</span>
                <span>Text Extracted</span>
              </div>
              <div className="flex items-center text-green-700 bg-green-50 p-2 rounded-lg border border-green-200">
                <span className="mr-2">✓</span>
                <span>Patterns Detected</span>
              </div>
              <div className="flex items-center text-green-700 bg-green-50 p-2 rounded-lg border border-green-200">
                <span className="mr-2">✓</span>
                <span>Structure Analyzed</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid md:grid-cols-2 gap-6">
        <InfoItem label="Name" value={profile.name || 'Not detected'} />
        <InfoItem label="Experience Level" value={profile.experience_level || 'Entry-level'} capitalize />
        
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <p className="text-gray-700 font-semibold text-sm mb-3">Contact Information</p>
          <div className="text-sm space-y-2">
            {profile.email && (
              <div className="text-blue-700 flex items-center bg-blue-50 p-2 rounded-lg border border-blue-200">
                <Mail className="w-4 h-4 mr-2" />
                {profile.email}
              </div>
            )}
            {profile.phone && (
              <div className="text-green-700 flex items-center bg-green-50 p-2 rounded-lg border border-green-200">
                <Phone className="w-4 h-4 mr-2" />
                {profile.phone}
              </div>
            )}
            {profile.education?.[0]?.institution && (
              <div className="text-purple-700 flex items-center bg-purple-50 p-2 rounded-lg border border-purple-200">
                <Award className="w-4 h-4 mr-2" />
                {profile.education[0].institution}
              </div>
            )}
            {!profile.email && !profile.phone && (
              <div className="text-gray-500 italic">No contact information detected</div>
            )}
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <p className="text-gray-700 font-semibold text-sm mb-3">Skills ({profile.skills?.length || 0})</p>
          <div className="flex flex-wrap gap-2">
            {profile.skills?.slice(0, 6).map((skill, idx) => (
              <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full border border-blue-200 font-medium">
                {skill}
              </span>
            ))}
            {(profile.skills?.length || 0) > 6 && (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full border border-gray-200 font-medium">
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
  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
    <p className="text-blue-800 font-semibold text-sm mb-3">{title}</p>
    <div className="space-y-2">
      {stats.map((stat, idx) => (
        <div key={idx} className="text-sm">
          {stat.hasValue !== undefined ? (
            <div className={`flex items-center justify-between p-2 rounded-lg border ${
              stat.hasValue 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              <span className="flex items-center">
                {stat.icon && <span className="mr-2">{stat.icon}</span>}
                {stat.label}
              </span>
              <span className="font-bold">{stat.value}</span>
            </div>
          ) : (
            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-blue-200">
              <span className="text-gray-700">{stat.label}:</span>
              <span className="font-bold text-blue-700">{stat.value}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

const InfoItem = ({ label, value, capitalize }) => (
  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
    <p className="text-gray-600 font-semibold text-sm mb-2">{label}</p>
    <p className={`font-bold text-gray-900 ${capitalize ? 'capitalize' : ''}`}>{value}</p>
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
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 }}
      className="group relative bg-gradient-to-br from-slate-900/90 via-blue-900/80 to-purple-900/90 backdrop-blur-xl border-2 border-blue-500/30 rounded-3xl overflow-hidden hover:border-purple-400/50 transition-all duration-500 shadow-2xl hover:shadow-blue-500/25"
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            background: [
              "radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.3) 0%, transparent 50%)",
              "radial-gradient(circle at 40% 40%, rgba(168, 85, 247, 0.3) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)"
            ]
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute inset-0"
        />
      </div>

      <div className="relative z-10 p-6 cursor-pointer">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold flex items-center text-white">
            <motion.div
            //  animate={{ rotate: [0, 360] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl mr-4 shadow-lg"
            >
              <Clock className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <span className="bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
                Progress Tracker
              </span>
              <div className="text-sm text-blue-200 font-normal mt-1">
                Real-time analysis status
              </div>
            </div>
          </h3>
          <motion.div
            animate={{ rotate: 0 }}
            className="group-hover:rotate-180 transition-transform duration-300"
          >
            <ChevronDown className="w-5 h-5 text-blue-300" />
          </motion.div>
        </div>

        {/* Progress Ring */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="rgba(59, 130, 246, 0.2)"
                strokeWidth="8"
                fill="none"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="40"
                stroke="url(#progressGradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                initial={{ strokeDasharray: "0, 251.32" }}
                animate={{ strokeDasharray: `${(progressPercentage * 251.32) / 100}, 251.32` }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="50%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-lg font-bold text-white">{Math.round(progressPercentage)}%</div>
                <div className="text-xs text-blue-300">Complete</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <motion.div 
            whileHover={{ scale: 1.05, y: -2 }}
            className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-4 border border-green-400/30 shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-green-300 font-medium">Completed</div>
                <div className="text-2xl font-bold text-green-400 flex items-center">
                  {completedCount}
                  <CheckCircle className="w-5 h-5 ml-2" />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.05, y: -2 }}
            className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl p-4 border border-blue-400/30 shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-300 font-medium">AI Steps</div>
                <div className="text-2xl font-bold text-blue-400 flex items-center">
                  {aiSteps}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Zap className="w-5 h-5 ml-2" />
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <AnimatePresence>
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          whileHover={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden relative z-10"
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <div className="px-6 pb-6 border-t border-blue-400/20">
            <div className="space-y-4 mt-6">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
                  whileHover={{ scale: 1.02, x: 5 }}
                  className="flex items-center space-x-4 p-4 bg-gradient-to-r from-slate-800/50 to-blue-900/30 rounded-2xl border border-blue-400/20 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <motion.div 
                    animate={{ 
                      scale: activity.status === 'completed' ? [1, 1.2, 1] : 1,
                      rotate: activity.status === 'completed' ? [0, 360, 0] : 0 
                    }}
                    transition={{ duration: 0.6 }}
                    className={`p-3 rounded-2xl ${
                      activity.status === 'completed' 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg' 
                        : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-300'
                    }`}
                  >
                    {activity.icon}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{activity.title}</p>
                    <p className="text-xs text-blue-300 mt-1">{activity.time}</p>
                  </div>
                  {activity.status === 'completed' && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    >
                      <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
            
            {analysisResults?.detailed_extraction && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-6 p-5 bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-2 border-blue-400/30 rounded-3xl backdrop-blur-sm shadow-xl"
              >
                <h4 className="text-lg font-bold text-blue-300 mb-4 flex items-center">
                  <motion.div
                    //  animate={{ rotate: [0, 360] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  >
                    <Brain className="w-5 h-5 mr-3 text-purple-400" />
                  </motion.div>
                  Analysis Summary
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 p-3 rounded-xl border border-blue-400/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-blue-300">📝 Words</span>
                      <span className="font-bold text-blue-400">{analysisResults.detailed_extraction.total_words || 0}</span>
                    </div>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-3 rounded-xl border border-green-400/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-green-300">⚡ Skills</span>
                      <span className="font-bold text-green-400">{analysisResults.extraction_info?.skills_count || 0}</span>
                    </div>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-gradient-to-r from-purple-500/20 to-violet-500/20 p-3 rounded-xl border border-purple-400/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-purple-300">🎯 Matches</span>
                      <span className="font-bold text-purple-400">{analysisResults.internship_recommendations?.length || 0}</span>
                    </div>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 p-3 rounded-xl border border-orange-400/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-orange-300">📋 Sections</span>
                      <span className="font-bold text-orange-400">{analysisResults.detailed_extraction.sections_detected?.length || 0}</span>
                    </div>
                  </motion.div>
                </div>
                
                {analysisResults.agent_communications && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="mt-4 pt-4 border-t border-blue-400/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-blue-300 font-medium">🤖 AI Success Rate:</span>
                      <motion.span 
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-xl font-bold text-emerald-400"
                      >
                        {Math.round(
                          (analysisResults.agent_communications.filter(c => c.status === 'success' || c.status === 'completed').length /
                            analysisResults.agent_communications.length) * 100
                        )}%
                      </motion.span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
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
      case 'high': return 'text-red-300 bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-400/40';
      case 'medium': return 'text-yellow-300 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/40';
      case 'low': return 'text-green-300 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400/40';
      default: return 'text-blue-300 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-400/40';
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 }}
      className="relative bg-gradient-to-br from-emerald-900/60 via-green-900/50 to-teal-900/60 backdrop-blur-xl border-2 border-green-400/30 rounded-3xl overflow-hidden hover:border-emerald-400/50 transition-all duration-500 shadow-2xl hover:shadow-green-500/25"
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            background: [
              "radial-gradient(circle at 30% 20%, rgba(34, 197, 94, 0.2) 0%, transparent 50%)",
              "radial-gradient(circle at 70% 80%, rgba(16, 185, 129, 0.2) 0%, transparent 50%)",
              "radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.2) 0%, transparent 50%)",
              "radial-gradient(circle at 30% 20%, rgba(34, 197, 94, 0.2) 0%, transparent 50%)"
            ]
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute inset-0"
        />
        <div className="absolute top-4 right-4 text-6xl opacity-10">🎯</div>
        <div className="absolute bottom-4 left-4 text-5xl opacity-10">📈</div>
      </div>

      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold flex items-center text-white">
            <motion.div
              animate={{ 
                y: [0, -3, 0],
                // rotateY: [0, 180, 360]
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl mr-4 shadow-lg"
            >
              <TrendingUp className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <span className="bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent">
                Personalized Action Plan
              </span>
              <div className="text-sm text-green-200 font-normal mt-1">
                AI-powered career roadmap
              </div>
            </div>
          </h3>
          <motion.span 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 text-sm rounded-2xl border border-green-400/30 font-bold shadow-lg"
          >
            {processedSteps.length} action items
          </motion.span>
        </div>
        <div className="space-y-4">
          {processedSteps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.15, type: "spring", stiffness: 200 }}
              className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 border-2 border-green-400/20 rounded-2xl overflow-hidden hover:border-green-400/40 transition-all duration-300 shadow-xl backdrop-blur-sm"
            >
              <div
                className="p-5 cursor-pointer hover:bg-gradient-to-r hover:from-green-900/20 hover:to-emerald-900/20 transition-all duration-300"
                onClick={() => setExpandedStep(expandedStep === index ? null : index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <motion.span 
                        whileHover={{ scale: 1.05 }}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${getPriorityColor(step.priority)} shadow-lg`}
                      >
                        {step.priority} Priority
                      </motion.span>
                      <span className="text-sm text-green-300 bg-gradient-to-r from-green-800/30 to-emerald-800/30 px-3 py-1 rounded-xl border border-green-400/30">
                        {step.category}
                      </span>
                    </div>
                    <h4 className="font-bold text-lg text-white flex items-center mb-2">
                      <motion.div
                        //  animate={{ rotate: [0, 360] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      >
                        <Target className="w-5 h-5 mr-3 text-green-400" />
                      </motion.div>
                      {step.action}
                    </h4>
                    <p className="text-sm text-green-200 leading-relaxed">{step.description}</p>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedStep === index ? 180 : 0 }}
                    transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
                    className="ml-4"
                  >
                    <ChevronDown className="w-6 h-6 text-green-400" />
                  </motion.div>
                </div>
              </div>
              
              <AnimatePresence>
                {expandedStep === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="overflow-hidden border-t border-green-400/20"
                  >
                    <div className="p-6 bg-gradient-to-r from-slate-900/40 to-green-900/20 space-y-6">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <h5 className="flex items-center text-lg font-bold text-green-300 mb-3">
                          <Award className="w-5 h-5 mr-2" />
                          Goal to Achieve
                        </h5>
                        <p className="text-sm text-green-100 bg-gradient-to-r from-green-900/30 to-emerald-900/30 p-4 rounded-xl border-l-4 border-green-400 shadow-lg">
                          {step.goal}
                        </p>
                      </motion.div>
                      
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <h5 className="flex items-center text-lg font-bold text-blue-300 mb-3">
                          <Clock className="w-5 h-5 mr-2" />
                          Timeline
                        </h5>
                        <span className="inline-block text-sm text-blue-100 bg-gradient-to-r from-blue-900/30 to-cyan-900/30 px-4 py-2 rounded-xl border border-blue-400/30 shadow-lg">
                          📅 {step.timeline}
                        </span>
                      </motion.div>
                      
                      {step.resources && step.resources.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          <h5 className="flex items-center text-lg font-bold text-purple-300 mb-3">
                            <BookmarkPlus className="w-5 h-5 mr-2" />
                            Learning Resources
                          </h5>
                          <div className="space-y-2">
                            {step.resources.map((resource, resIndex) => (
                              <motion.div 
                                key={resIndex}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + resIndex * 0.1 }}
                                className="flex items-start text-sm text-purple-100 p-3 bg-gradient-to-r from-purple-900/20 to-violet-900/20 rounded-xl border border-purple-400/20"
                              >
                                <span className="text-purple-400 mr-3 mt-1 text-lg">📚</span>
                                {resource}
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                      
                      {step.success_metrics && step.success_metrics.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 }}
                        >
                          <h5 className="flex items-center text-lg font-bold text-orange-300 mb-3">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Success Metrics
                          </h5>
                          <div className="space-y-2">
                            {step.success_metrics.map((metric, metricIndex) => (
                              <motion.div 
                                key={metricIndex}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + metricIndex * 0.1 }}
                                className="flex items-start text-sm text-orange-100 p-3 bg-gradient-to-r from-orange-900/20 to-amber-900/20 rounded-xl border border-orange-400/20"
                              >
                                <CheckCircle className="w-4 h-4 text-orange-400 mr-3 mt-1 flex-shrink-0" />
                                {metric}
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                      
                      {/* Additional sections with enhanced styling */}
                      {step.project_ideas && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 }}
                        >
                          <h5 className="flex items-center text-lg font-bold text-cyan-300 mb-3">
                            <Code className="w-5 h-5 mr-2" />
                            Project Ideas
                          </h5>
                          <div className="space-y-2">
                            {step.project_ideas.map((idea, ideaIndex) => (
                              <motion.div 
                                key={ideaIndex}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + ideaIndex * 0.1 }}
                                className="flex items-start text-sm text-cyan-100 p-3 bg-gradient-to-r from-cyan-900/20 to-teal-900/20 rounded-xl border border-cyan-400/20"
                              >
                                <span className="text-cyan-400 mr-3 mt-1 text-lg">�</span>
                                {idea}
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-6 p-6 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-400/30 rounded-3xl backdrop-blur-sm shadow-xl"
        >
          <div className="flex items-start">
            <motion.div
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            >
              <Clock className="w-2 h-6 text-green-400 mr-4 mt-1 flex-shrink-0" />
            </motion.div>
            <div>
              <p className="text-lg text-green-300 font-bold mb-2">
                🎯 Overall Timeline: {timeline}
              </p>
              <p className="text-sm text-green-200 leading-relaxed">
                Follow this personalized action plan to systematically improve your internship readiness and achieve your career goals. Each step is designed to build upon the previous one for maximum impact.
              </p>
              <motion.div 
                className="mt-4 flex items-center space-x-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <div className="flex items-center text-sm text-green-300">
                  <Star className="w-4 h-4 mr-1" />
                  AI-Powered
                </div>
                <div className="flex items-center text-sm text-green-300">
                  <Target className="w-4 h-4 mr-1" />
                  Personalized
                </div>
                <div className="flex items-center text-sm text-green-300">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Results-Driven
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
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
        className="relative bg-gradient-to-br from-purple-900/60 via-violet-900/50 to-indigo-900/60 backdrop-blur-xl border-2 border-purple-400/30 rounded-3xl p-8 text-center shadow-2xl overflow-hidden"
      >
        {/* Animated background */}
        <div className="absolute inset-0">
          <motion.div
            animate={{
              background: [
                "radial-gradient(circle at 20% 50%, rgba(147, 51, 234, 0.3) 0%, transparent 70%)",
                "radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.3) 0%, transparent 70%)",
                "radial-gradient(circle at 50% 80%, rgba(168, 85, 247, 0.3) 0%, transparent 70%)",
                "radial-gradient(circle at 20% 50%, rgba(147, 51, 234, 0.3) 0%, transparent 70%)"
              ]
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute inset-0"
          />
        </div>

        <div className="relative z-10">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Brain className="w-16 h-16 mx-auto text-purple-400 mb-4" />
          </motion.div>
          <h3 className="text-xl font-bold text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text mb-2">
            AI Insights
          </h3>
          <p className="text-purple-200 text-sm leading-relaxed">
            Upload your resume to unlock powerful AI-driven insights and personalized recommendations
          </p>
          <motion.div 
            className="mt-4 text-purple-300 text-xs"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🚀 Powered by Advanced AI
          </motion.div>
        </div>
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
      className="relative bg-gradient-to-br from-purple-900/60 via-violet-900/50 to-indigo-900/60 backdrop-blur-xl border-2 border-purple-400/30 rounded-3xl p-6 shadow-2xl overflow-hidden"
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            background: [
              "radial-gradient(circle at 30% 20%, rgba(147, 51, 234, 0.2) 0%, transparent 50%)",
              "radial-gradient(circle at 70% 80%, rgba(139, 92, 246, 0.2) 0%, transparent 50%)",
              "radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.2) 0%, transparent 50%)",
              "radial-gradient(circle at 30% 20%, rgba(147, 51, 234, 0.2) 0%, transparent 50%)"
            ]
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute inset-0"
        />
        <div className="absolute top-4 right-4 text-4xl opacity-10">🧠</div>
        <div className="absolute bottom-4 left-4 text-3xl opacity-10">⚡</div>
      </div>

      <div className="relative z-10">
        <h3 className="text-xl font-bold mb-6 flex items-center text-white">
          <motion.div
            animate={{ 
              // rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 6, repeat: Infinity }}
            className="p-3 bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl mr-4 shadow-lg"
          >
            <Brain className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <span className="bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
              AI Insights
            </span>
            <div className="text-sm text-purple-200 font-normal mt-1">
              Intelligent analysis
            </div>
          </div>
        </h3>
        
        <div className="space-y-5">
          <motion.div 
            whileHover={{ scale: 1.02, y: -2 }}
            className="bg-gradient-to-r from-purple-800/30 to-violet-800/30 rounded-2xl p-5 border-2 border-purple-400/30 shadow-lg backdrop-blur-sm"
          >
            <h4 className="text-lg font-bold text-purple-300 mb-3 flex items-center">
              <Sparkles className="w-5 h-5 mr-2" />
              Top Skills
            </h4>
            <div className="flex flex-wrap gap-2">
              {skills.slice(0, 3).map((skill, idx) => (
                <motion.span 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="px-3 py-2 bg-gradient-to-r from-purple-600/30 to-violet-600/30 text-purple-200 text-sm rounded-xl border border-purple-400/30 font-medium shadow-md"
                >
                  ⚡ {skill}
                </motion.span>
              ))}
              {skills.length > 3 && (
                <motion.span 
                  whileHover={{ scale: 1.1 }}
                  className="px-3 py-2 bg-gradient-to-r from-purple-600/40 to-violet-600/40 text-purple-200 text-sm rounded-xl border border-purple-400/40 font-bold"
                >
                  +{skills.length - 3} more
                </motion.span>
              )}
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.02, y: -2 }}
            className="bg-gradient-to-r from-blue-800/30 to-cyan-800/30 rounded-2xl p-5 border-2 border-blue-400/30 shadow-lg backdrop-blur-sm"
          >
            <h4 className="text-lg font-bold text-blue-300 mb-3 flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Match Quality
            </h4>
            <div className="flex items-center justify-between">
              <span className="text-blue-200 font-medium">Average Score:</span>
              <motion.span 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-3xl font-bold text-blue-400"
              >
                {averageMatch}%
              </motion.span>
            </div>
            <div className="mt-3 bg-blue-900/30 rounded-xl h-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${averageMatch}%` }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
              />
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.02, y: -2 }}
            className="bg-gradient-to-r from-orange-800/30 to-amber-800/30 rounded-2xl p-5 border-2 border-orange-400/30 shadow-lg backdrop-blur-sm"
          >
            <h4 className="text-lg font-bold text-orange-300 mb-3 flex items-center">
              <Award className="w-5 h-5 mr-2" />
              Focus Area
            </h4>
            <div className="text-lg text-orange-200 font-medium flex items-center">
              🎯 {focusArea}
            </div>
            <div className="mt-2 text-sm text-orange-300/80">
              {gaps.length > 0 ? 'Areas for improvement identified' : 'Great job! You\'re ready to apply'}
            </div>
          </motion.div>
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
      className="relative bg-gradient-to-br from-slate-900/90 via-gray-900/80 to-slate-800/90 backdrop-blur-xl border-2 border-gray-600/30 rounded-3xl overflow-hidden hover:border-blue-400/50 transition-all duration-500 shadow-2xl hover:shadow-blue-500/25"
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            background: [
              "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 50% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)"
            ]
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute inset-0"
        />
        <div className="absolute top-4 right-4 text-4xl opacity-10">⚡</div>
        <div className="absolute bottom-4 left-4 text-3xl opacity-10">🚀</div>
      </div>

      <div className="relative z-10 p-6">
        <h3 className="text-xl font-bold mb-6 flex items-center text-white">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl mr-4 shadow-lg"
          >
            <Zap className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
              Quick Actions
            </span>
            <div className="text-sm text-gray-200 font-normal mt-1">
              Essential tools at your fingertips
            </div>
          </div>
        </h3>
        
        <div className="space-y-4">
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => document.getElementById('resume-upload')?.click()}
            className="w-full group relative bg-gradient-to-r from-blue-600/30 to-purple-600/30 hover:from-blue-600/50 hover:to-purple-600/50 border-2 border-blue-400/30 hover:border-purple-400/50 rounded-2xl p-4 transition-all duration-300 shadow-lg hover:shadow-blue-500/25 backdrop-blur-sm overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl mr-4 shadow-md"
                >
                  <Upload className="w-5 h-5 text-white" />
                </motion.div>
                <div className="text-left">
                  <span className="text-white font-bold block">Upload Resume</span>
                  <span className="text-blue-200 text-sm">Start your AI analysis</span>
                </div>
              </div>
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <ChevronDown className="w-5 h-5 text-blue-300 rotate-[-90deg]" />
              </motion.div>
            </div>
          </motion.button>

          {analysisResults && (
            <>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
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
                className="w-full group relative bg-gradient-to-r from-green-600/30 to-emerald-600/30 hover:from-green-600/50 hover:to-emerald-600/50 border-2 border-green-400/30 hover:border-emerald-400/50 rounded-2xl p-4 transition-all duration-300 shadow-lg hover:shadow-green-500/25 backdrop-blur-sm overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center">
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl mr-4 shadow-md"
                    >
                      <Download className="w-5 h-5 text-white" />
                    </motion.div>
                    <div className="text-left">
                      <span className="text-white font-bold block">Download Report</span>
                      <span className="text-green-200 text-sm">Save your analysis</span>
                    </div>
                  </div>
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <ChevronDown className="w-5 h-5 text-green-300 rotate-[-90deg]" />
                  </motion.div>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setAnalysisResults(null);
                  document.getElementById('resume-upload').value = '';
                }}
                className="w-full group relative bg-gradient-to-r from-orange-600/30 to-red-600/30 hover:from-orange-600/50 hover:to-red-600/50 border-2 border-orange-400/30 hover:border-red-400/50 rounded-2xl p-4 transition-all duration-300 shadow-lg hover:shadow-orange-500/25 backdrop-blur-sm overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center">
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl mr-4 shadow-md"
                    >
                      <RefreshCw className="w-5 h-5 text-white" />
                    </motion.div>
                    <div className="text-left">
                      <span className="text-white font-bold block">New Analysis</span>
                      <span className="text-orange-200 text-sm">Start fresh</span>
                    </div>
                  </div>
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <ChevronDown className="w-5 h-5 text-orange-300 rotate-[-90deg]" />
                  </motion.div>
                </div>
              </motion.button>
            </>
          )}
        </div>
        
        {/* Add some additional info or tips */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-6 p-4 bg-gradient-to-r from-gray-800/50 to-slate-800/50 border border-gray-600/30 rounded-2xl backdrop-blur-sm"
        >
          <div className="flex items-center text-sm text-gray-300">
            <motion.div
              //  animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Brain className="w-4 h-4 mr-3 text-blue-400" />
            </motion.div>
            <div>
              <div className="font-medium text-blue-300">💡 Pro Tip</div>
              <div className="text-xs mt-1 text-gray-400">
                Upload multiple resume versions to find the best match for different industries
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

const GitHubAnalysis = ({ profile }) => {
  const githubData = profile.github_analysis;
  if (!githubData) return null;
  
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="relative bg-gradient-to-br from-gray-900/60 via-slate-900/50 to-gray-800/60 backdrop-blur-xl border-2 border-gray-600/30 rounded-3xl p-6 shadow-2xl hover:shadow-purple-500/25 overflow-hidden"
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            background: [
              "radial-gradient(circle at 30% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 70% 80%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 30% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)"
            ]
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute inset-0"
        />
        <div className="absolute top-4 right-4 text-5xl opacity-10">🐙</div>
        <div className="absolute bottom-4 left-4 text-4xl opacity-10">⭐</div>
      </div>

      <div className="relative z-10">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <motion.div
              //  animate={{ rotate: [0, 360] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="p-3 bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl mr-3 shadow-lg"
            >
              <Github className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <span className="bg-gradient-to-r from-purple-300 to-violet-300 bg-clip-text text-transparent">
                GitHub Analysis
              </span>
              <div className="text-sm text-gray-300 font-normal mt-1">
                Code portfolio insights
              </div>
            </div>
          </div>
          <motion.span 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-300 text-sm rounded-2xl border border-purple-400/30 font-bold shadow-lg"
          >
            Score: {githubData.github_score}/100
          </motion.span>
        </h4>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div 
            whileHover={{ scale: 1.05, y: -2 }}
            className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl p-4 border border-blue-400/30 shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-400 flex items-center">
                  {githubData.public_repos}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <FileText className="w-5 h-5 ml-2" />
                  </motion.div>
                </div>
                <div className="text-sm text-blue-300 font-medium">Public Repos</div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.05, y: -2 }}
            className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-4 border border-green-400/30 shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-400 flex items-center">
                  {githubData.followers}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Users className="w-5 h-5 ml-2" />
                  </motion.div>
                </div>
                <div className="text-sm text-green-300 font-medium">Followers</div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.05, y: -2 }}
            className="bg-gradient-to-r from-purple-500/20 to-violet-500/20 rounded-2xl p-4 border border-purple-400/30 shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-400 flex items-center">
                  {githubData.total_stars}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Star className="w-5 h-5 ml-2" />
                  </motion.div>
                </div>
                <div className="text-sm text-purple-300 font-medium">Total Stars</div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.05, y: -2 }}
            className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-2xl p-4 border border-orange-400/30 shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-400 flex items-center">
                  {githubData.total_forks}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <GitBranch className="w-5 h-5 ml-2" />
                  </motion.div>
                </div>
                <div className="text-sm text-orange-300 font-medium">Total Forks</div>
              </div>
            </div>
          </motion.div>
        </div>

        {githubData.top_languages && githubData.top_languages.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-4"
          >
            <div className="text-sm text-blue-300 font-bold mb-3 flex items-center">
              <Code className="w-4 h-4 mr-2" />
              Top Programming Languages:
            </div>
            <div className="flex flex-wrap gap-2">
              {githubData.top_languages.map((lang, idx) => (
                <motion.span 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="px-3 py-2 bg-gradient-to-r from-blue-600/30 to-cyan-600/30 text-blue-200 text-sm rounded-xl border border-blue-400/30 font-medium shadow-md"
                >
                  💻 {lang}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {githubData.project_types && githubData.project_types.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-4"
          >
            <div className="text-sm text-green-300 font-bold mb-3 flex items-center">
              <FolderOpen className="w-4 h-4 mr-2" />
              Project Categories:
            </div>
            <div className="flex flex-wrap gap-2">
              {githubData.project_types.map((type, idx) => (
                <motion.span 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="px-3 py-2 bg-gradient-to-r from-green-600/30 to-emerald-600/30 text-green-200 text-sm rounded-xl border border-green-400/30 font-medium shadow-md"
                >
                  🎯 {type}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div 
          className="mt-6 pt-4 border-t border-gray-600/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <motion.a
            href={`https://github.com/${githubData.username}`}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, y: -2 }}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600/30 to-violet-600/30 hover:from-purple-600/50 hover:to-violet-600/50 text-purple-300 text-sm rounded-2xl border border-purple-400/30 font-bold transition-all duration-300 shadow-lg hover:shadow-purple-500/25"
          >
            <Github className="w-4 h-4 mr-2" />
            View GitHub Profile
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ExternalLink className="w-4 h-4 ml-2" />
            </motion.div>
          </motion.a>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Features Section Component
const FeaturesSection = () => {
  const features = [
    {
      title: "AI-Powered Resume Analysis",
      description: "Advanced AI algorithms analyze your resume to extract skills, experience, and qualifications with 98% accuracy.",
      icon: <Brain className="w-8 h-8" />,
      color: "from-blue-500 to-blue-600",
      benefits: ["Skill extraction", "Experience mapping", "Qualification assessment"]
    },
    {
      title: "Smart Internship Matching",
      description: "Our intelligent matching system connects you with internships that align perfectly with your profile and career goals.",
      icon: <Target className="w-8 h-8" />,
      color: "from-green-500 to-green-600",
      benefits: ["Personalized matches", "Real-time opportunities", "Industry insights"]
    },
    {
      title: "Portfolio Gap Analysis",
      description: "Identify missing skills and get actionable recommendations to strengthen your candidacy for top internships.",
      icon: <AlertCircle className="w-8 h-8" />,
      color: "from-orange-500 to-orange-600",
      benefits: ["Skill gap detection", "Learning recommendations", "Career roadmap"]
    },
    {
      title: "GitHub Integration",
      description: "Automatically analyze your GitHub profile to showcase your coding projects and technical contributions.",
      icon: <Github className="w-8 h-8" />,
      color: "from-purple-500 to-purple-600",
      benefits: ["Project analysis", "Code quality review", "Contribution insights"]
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mt-12"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Powerful Features for Your Career Success
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Discover how our AI-powered platform can transform your internship search experience
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="bg-white/90 backdrop-blur-sm border border-blue-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300"
          >
            <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg`}>
              {feature.icon}
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-3">{feature.title}</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">{feature.description}</p>

            <div className="space-y-2">
              {feature.benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  {benefit}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default Home;
