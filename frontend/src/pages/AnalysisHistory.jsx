import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
    FileText, Clock, Target, AlertCircle, User, Calendar,
    Search, Filter, Download, Trash2, Eye, Github,
    BarChart3, Brain, Sparkles, RefreshCw, ChevronLeft,
    ChevronRight, TrendingUp, Star, Award, CheckCircle
} from 'lucide-react';

const AnalysisHistory = () => {
    const [analyses, setAnalyses] = useState([]);
    const [statistics, setStatistics] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAnalysis, setSelectedAnalysis] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [filterType, setFilterType] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    const analysesPerPage = 10;

    useEffect(() => {
        fetchAnalysisHistory();
        fetchStatistics();
    }, [currentPage, searchTerm, filterType]);

    const fetchAnalysisHistory = async () => {
        try {
            setLoading(true);
            const skip = (currentPage - 1) * analysesPerPage;
            let url = `http://127.0.0.1:8000/api/analysis/history/?limit=${analysesPerPage}&skip=${skip}`;

            if (searchTerm.trim()) {
                url += `&search=${encodeURIComponent(searchTerm.trim())}`;
            }

            if (filterType !== 'all') {
                url += `&filter=${filterType}`;
            }

            const response = await axios.get(url);

            if (response.data.status === 'success') {
                const analyses = response.data.analyses || [];
                const stats = response.data.statistics || {};

                setAnalyses(analyses);
                setStatistics(stats);

                if (analyses.length === 0 && response.data.using_mongodb === false) {
                    console.log('No analyses found - using empty state');
                } else if (analyses.length > 0) {
                    console.log(`Loaded ${analyses.length} analyses`);
                    //   toast.success(`Loaded ${analyses.length} analysis reports`);
                }
            } else {
                console.warn('Analysis history response:', response.data);
                setAnalyses([]);
                setStatistics({});

                if (response.data.status === 'error') {
                    toast.error(response.data.error || 'Failed to fetch analysis history');
                }
            }
        } catch (error) {
            console.error('Error fetching analysis history:', error);
            setAnalyses([]);
            setStatistics({});

            if (error.response?.status === 500 || error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED') {
                toast.error('Unable to connect to server. Please check your connection.');
            } else if (error.response?.status !== 404) {
                toast.error('Failed to load analysis history');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchStatistics = async () => {
        try {
            const response = await axios.get('http://127.0.0.1:8000/api/analysis/statistics/');
            if (response.data.status === 'success') {
                setStatistics(response.data.statistics);
            }
        } catch (error) {
            console.error('Error fetching statistics:', error);
        }
    };

    const fetchAnalysisDetails = async (analysisId) => {
        try {
            setLoading(true);
            const response = await axios.get(`http://127.0.0.1:8000/api/analysis/${analysisId}/`);
            if (response.data.status === 'success') {
                setSelectedAnalysis(response.data.analysis);
                toast.success('Full analysis report loaded successfully');
            } else {
                toast.error('Failed to fetch complete analysis details');
            }
        } catch (error) {
            console.error('Error fetching analysis details:', error);
            toast.error('Failed to load complete analysis report');
        } finally {
            setLoading(false);
        }
    };

    const deleteAnalysis = async (analysisId) => {
        if (!window.confirm('Are you sure you want to delete this analysis? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await axios.delete(`http://127.0.0.1:8000/api/analysis/${analysisId}/delete/`);
            if (response.data.status === 'success') {
                toast.success('Analysis deleted successfully');
                fetchAnalysisHistory();
                fetchStatistics();
            } else {
                toast.error('Failed to delete analysis');
            }
        } catch (error) {
            console.error('Error deleting analysis:', error);
            toast.error('Failed to delete analysis');
        }
    };

    const exportAnalysis = (analysis) => {
        try {
            const exportData = {
                analysisId: analysis.analysis_id,
                exportDate: new Date().toISOString(),
                studentProfile: analysis.student_profile,
                overallScore: analysis.overall_readiness_score,
                internshipRecommendations: analysis.internship_recommendations,
                portfolioGaps: analysis.portfolio_gaps,
                readinessEvaluations: analysis.readiness_evaluations,
                githubAnalysis: analysis.github_analysis,
                agentCommunications: analysis.agent_communications,
                timestamp: analysis.timestamp,
                summary: analysis.analysis_summary
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const exportFileDefaultName = `InternAI_Analysis_Report_${analysis.analysis_id}_${new Date(analysis.timestamp).toISOString().split('T')[0]}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();

            toast.success('Complete analysis report exported successfully!');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export analysis report');
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-amber-600';
        return 'text-red-600';
    };

    const getScoreBadgeColor = (score) => {
        if (score >= 80) return 'bg-green-100 text-green-700 border-green-300';
        if (score >= 60) return 'bg-amber-100 text-amber-700 border-amber-300';
        return 'bg-red-100 text-red-700 border-red-300';
    };

    const filteredAnalyses = analyses.filter(analysis => {
        if (filterType === 'high-score') return analysis.overall_readiness_score >= 80;
        if (filterType === 'medium-score') return analysis.overall_readiness_score >= 60 && analysis.overall_readiness_score < 80;
        if (filterType === 'low-score') return analysis.overall_readiness_score < 60;
        if (filterType === 'github') return analysis.github_username;
        return true;
    });

    const totalPages = Math.ceil(filteredAnalyses.length / analysesPerPage);
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center theme-transition"
                style={{ backgroundColor: 'var(--bg-primary)' }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 border-4 rounded-full"
                    style={{
                        borderColor: 'var(--border-color)',
                        borderTopColor: 'var(--text-accent)'
                    }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden theme-transition"
            style={{ backgroundColor: 'var(--bg-primary)' }}>      {/* Floating animated elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        x: [0, 100, 0],
                        y: [0, -100, 0],
                        rotate: [0, 180, 360]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-20 left-20 w-16 h-16 rounded-full"
                    style={{
                        backgroundColor: 'var(--text-accent)',
                        opacity: 0.1
                    }}
                />
                <motion.div
                    animate={{
                        x: [0, -80, 0],
                        y: [0, 120, 0],
                        scale: [1, 1.2, 1]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute top-40 right-32 w-24 h-24 rounded-lg"
                    style={{
                        backgroundColor: 'var(--text-accent)',
                        opacity: 0.08
                    }}
                />
            </div>

            <div className="container mx-auto px-4 py-8 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-4xl font-bold text-blue-800 mb-2 bg-gradient-to-r from-blue-600 to-purple-800 bg-clip-text text-transparent">
                                Analysis History
                            </h1>
                            <p className="text-blue-600 font-medium">Track your resume analysis journey and improvements</p>
                        </div>
                        <motion.button
                            onClick={() => window.history.back()}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm text-blue-600 border border-blue-200 rounded-xl hover:bg-white hover:shadow-lg transition-all font-medium"
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Back
                        </motion.button>
                    </div>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-6 hover:bg-white hover:shadow-xl transition-all duration-300"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-blue-600 text-sm font-semibold uppercase tracking-wider">Total Analyses</p>
                                    <p className="text-3xl font-bold text-blue-800">{statistics.total_analyses || 0}</p>
                                </div>
                                <BarChart3 className="w-8 h-8 text-blue-600" />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-6 hover:bg-white hover:shadow-xl transition-all duration-300"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-emerald-600 text-sm font-semibold uppercase tracking-wider">Avg. Readiness Score</p>
                                    <p className={`text-3xl font-bold ${getScoreColor(statistics.avg_readiness_score || 0)}`}>
                                        {statistics.avg_readiness_score || 0}%
                                    </p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-green-600" />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-6 hover:bg-white hover:shadow-xl transition-all duration-300"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-purple-600 text-sm font-semibold uppercase tracking-wider">Total Internships Matched</p>
                                    <p className="text-3xl font-bold text-purple-800">{statistics.total_internships_matched || 0}</p>
                                </div>
                                <Target className="w-8 h-8 text-purple-600" />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-6 hover:bg-white hover:shadow-xl transition-all duration-300"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-orange-600 text-sm font-semibold uppercase tracking-wider">GitHub Analyses</p>
                                    <p className="text-3xl font-bold text-orange-800">{statistics.has_github_analyses || 0}</p>
                                </div>
                                <Github className="w-8 h-8 text-orange-600" />
                            </div>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Search and Filter */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-6 mb-8 shadow-lg"
                >
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by student name, skills, or summary..."
                                className="w-full pl-10 pr-4 py-3 bg-white/80 border border-blue-300 rounded-xl text-blue-800 placeholder-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                            />
                        </div>

                        <div className="flex gap-3">
                            <motion.button
                                onClick={() => setShowFilters(!showFilters)}
                                whileHover={{ scale: 1.02, y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                className={`flex items-center px-6 py-3 rounded-xl border-2 transition-all font-medium ${showFilters
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                                    : 'bg-white border-blue-300 text-blue-700 hover:bg-blue-50'
                                    }`}
                            >
                                <Filter className="w-4 h-4 mr-2" />
                                Filters
                            </motion.button>

                            <motion.button
                                onClick={fetchAnalysisHistory}
                                whileHover={{ scale: 1.02, y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex items-center px-6 py-3 bg-white border-2 border-blue-300 text-blue-700 rounded-xl hover:bg-blue-50 transition-all font-medium"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh
                            </motion.button>
                        </div>
                    </div>

                    {/* Filter Options */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-6 pt-6 border-t border-blue-200"
                            >
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        { value: 'all', label: 'All Analyses', icon: BarChart3 },
                                        { value: 'high-score', label: 'High Score (80%+)', icon: Star },
                                        { value: 'medium-score', label: 'Medium Score (60-80%)', icon: Award },
                                        { value: 'low-score', label: 'Low Score (<60%)', icon: AlertCircle },
                                        { value: 'github', label: 'With GitHub', icon: Github }
                                    ].map((filter) => {
                                        const IconComponent = filter.icon;
                                        return (
                                            <motion.button
                                                key={filter.value}
                                                onClick={() => setFilterType(filter.value)}
                                                whileHover={{ scale: 1.02, y: -1 }}
                                                whileTap={{ scale: 0.98 }}
                                                className={`flex items-center px-4 py-2 rounded-xl text-sm transition-all font-medium border-2 ${filterType === filter.value
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                                                    : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50 hover:border-blue-300'
                                                    }`}
                                            >
                                                <IconComponent className="w-4 h-4 mr-2" />
                                                {filter.label}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Analysis List */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-4"
                >
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                            <span className="ml-2 text-blue-400">Loading analysis history...</span>
                        </div>
                    ) : filteredAnalyses.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-blue-400 mb-2">No analyses found</h3>
                            <p className="text-blue-500 mb-4">
                                {searchTerm ? 'Try different search terms or clear your search' : 'Upload your DOCX resume to get started with AI-powered analysis and internship recommendations!'}
                            </p>
                            {!searchTerm && (
                                <motion.button
                                    onClick={() => window.location.href = '/'}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                                >
                                    Upload Resume Now
                                </motion.button>
                            )}
                        </div>
                    ) : (
                        filteredAnalyses.map((analysis, index) => (
                            <AnalysisCard
                                key={analysis.analysis_id}
                                analysis={analysis}
                                index={index}
                                onView={() => fetchAnalysisDetails(analysis.analysis_id)}
                                onDelete={() => deleteAnalysis(analysis.analysis_id)}
                                onExport={() => exportAnalysis(analysis)}
                            />
                        ))
                    )}
                </motion.div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center justify-center space-x-2 mt-8"
                    >
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="flex items-center px-3 py-2 bg-blue-800 border border-blue-700 text-blue-300 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <span className="text-blue-400">
                            Page {currentPage} of {totalPages}
                        </span>

                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="flex items-center px-3 py-2 bg-blue-800 border border-blue-700 text-blue-300 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </div>

            {/* Analysis Details Modal */}
            <AnalysisDetailsModal
                analysis={selectedAnalysis}
                onClose={() => setSelectedAnalysis(null)}
            />
        </div>
    );
};

// Analysis Card Component
const AnalysisCard = ({ analysis, index, onView, onDelete, onExport }) => {
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-amber-600';
        return 'text-red-600';
    };

    const getScoreBadgeColor = (score) => {
        if (score >= 80) return 'bg-green-100 text-green-700 border-green-300';
        if (score >= 60) return 'bg-amber-100 text-amber-700 border-amber-300';
        return 'bg-red-100 text-red-700 border-red-300';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4 }}
            className="bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-6 hover:bg-white hover:shadow-xl hover:shadow-blue-100 transition-all duration-300"
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="flex items-center space-x-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-bold text-blue-800">
                                {analysis.student_profile?.name || 'Anonymous User'}
                            </h3>
                        </div>

                        {analysis.github_analysis?.username && (
                            <div className="flex items-center space-x-2 bg-orange-100 px-3 py-1 rounded-full">
                                <Github className="w-4 h-4 text-orange-600" />
                                <span className="text-sm font-medium text-orange-700">
                                    {analysis.github_analysis.username}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                            <div className={`px-4 py-2 rounded-xl border-2 text-sm font-bold ${getScoreBadgeColor(analysis.overall_readiness_score || 0)}`}>
                                {analysis.overall_readiness_score || 0}% Ready
                            </div>
                        </div>
                        {/* <div className="flex items-center space-x-2 text-purple-600">
                            <Target className="w-4 h-4" />
                            <span className="text-sm font-medium">
                                {analysis.internship_recommendations?.length || 0} matches
                            </span>
                        </div> */}

                        {/* <div className="flex items-center space-x-2 text-orange-600">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">
                                {analysis.portfolio_gaps?.length || 0} gaps
                            </span>
                        </div> */}
                    </div>

                    <div className="flex items-center space-x-4 mb-4">
                        <div className="flex items-center space-x-2 text-blue-600">
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm font-medium">{formatDate(analysis.timestamp)}</span>
                        </div>

                        <div className="text-sm text-blue-600">
                            Level: <span className="text-purple-600 capitalize font-semibold">
                                {analysis.student_profile?.experience_level || 'N/A'}
                            </span>
                        </div>
                    </div>

                    {analysis.student_profile?.skills && analysis.student_profile.skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {analysis.student_profile.skills.slice(0, 5).map((skill, skillIndex) => (
                                <span
                                    key={skillIndex}
                                    className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200 font-medium"
                                >
                                    {skill}
                                </span>
                            ))}
                            {analysis.student_profile.skills.length > 5 && (
                                <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs rounded-full border border-blue-200 font-medium">
                                    +{analysis.student_profile.skills.length - 5} more
                                </span>
                            )}
                        </div>
                    )}

                    {analysis.analysis_summary && (
                        <p className="text-blue-600 text-sm mb-4 font-medium">{analysis.analysis_summary}</p>
                    )}
                </div>

                <div className="flex items-center space-x-3 ml-4">
                    <motion.button
                        onClick={onView}
                        whileHover={{ scale: 1.05, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg font-medium"
                    >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                    </motion.button>
                    <motion.button
                        onClick={onExport}
                        whileHover={{ scale: 1.05, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center px-4 py-2 bg-white border-2 border-blue-300 text-blue-700 rounded-xl hover:bg-blue-50 transition-all font-medium"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </motion.button>

                    <motion.button
                        onClick={onDelete}
                        whileHover={{ scale: 1.05, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center px-3 py-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};

// Analysis Details Modal Component
const AnalysisDetailsModal = ({ analysis, onClose }) => {
    if (!analysis) return null;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-amber-600';
        return 'text-red-600';
    };

    const exportCurrentAnalysis = () => {
        try {
            const exportData = {
                analysisId: analysis.analysis_id,
                exportDate: new Date().toISOString(),
                fullReport: analysis,
                summary: {
                    studentName: analysis.student_profile?.name || 'Anonymous',
                    overallScore: analysis.overall_readiness_score,
                    totalRecommendations: analysis.internship_recommendations?.length || 0,
                    totalGaps: analysis.portfolio_gaps?.length || 0,
                    analysisDate: analysis.timestamp
                }
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const exportFileDefaultName = `InternAI_Complete_Report_${analysis.analysis_id}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();

            toast.success('Complete report exported successfully!');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export complete report');
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Complete Analysis Report</h2>
                                <p className="text-blue-100">
                                    {analysis.student_profile?.name || 'Anonymous User'} • {formatDate(analysis.timestamp)}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-center">
                                    <div className={`text-3xl font-bold ${getScoreColor(analysis.overall_readiness_score || 0)} bg-white px-4 py-2 rounded-xl`}>
                                        {analysis.overall_readiness_score || 0}%
                                    </div>
                                    <div className="text-sm text-blue-100 mt-1">Overall Score</div>
                                </div>
                                <motion.button
                                    onClick={exportCurrentAnalysis}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Export Report
                                </motion.button>
                                <motion.button
                                    onClick={onClose}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all"
                                >
                                    ✕
                                </motion.button>
                            </div>
                        </div>
                    </div>

                    {/* Modal Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                        <div className="space-y-8">
                            {/* Summary Statistics */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-4 text-center">
                                    <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                                    <div className="text-2xl font-bold text-blue-800">{analysis.internship_recommendations?.length || 0}</div>
                                    <div className="text-sm text-blue-600">Recommendations</div>
                                </div>
                                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-4 text-center">
                                    <AlertCircle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                                    <div className="text-2xl font-bold text-orange-800">{analysis.portfolio_gaps?.length || 0}</div>
                                    <div className="text-sm text-orange-600">Portfolio Gaps</div>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-2xl p-4 text-center">
                                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                                    <div className="text-2xl font-bold text-green-800">{analysis.readiness_evaluations?.length || 0}</div>
                                    <div className="text-sm text-green-600">Evaluations</div>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-4 text-center">
                                    <Github className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                                    <div className="text-2xl font-bold text-purple-800">{analysis.github_analysis ? 'Yes' : 'No'}</div>
                                    <div className="text-sm text-purple-600">GitHub Analysis</div>
                                </div>
                            </div>

                            {/* Student Profile Section */}
                            {analysis.student_profile && (
                                <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 border border-blue-200 rounded-2xl p-6">
                                    <h3 className="text-2xl font-bold text-blue-800 mb-6 flex items-center">
                                        <User className="w-6 h-6 mr-3" />
                                        Student Profile
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="text-lg font-semibold text-blue-700 mb-3">Personal Information</h4>
                                            <div className="space-y-2">
                                                <div>
                                                    <span className="text-sm text-gray-600">Name:</span>
                                                    <p className="font-semibold text-lg text-blue-800">{analysis.student_profile.name || 'Not detected'}</p>
                                                </div>
                                                {analysis.student_profile.email && (
                                                    <div>
                                                        <span className="text-sm text-gray-600">Email:</span>
                                                        <p className="text-blue-600">{analysis.student_profile.email}</p>
                                                    </div>
                                                )}
                                                {analysis.student_profile.phone && (
                                                    <div>
                                                        <span className="text-sm text-gray-600">Phone:</span>
                                                        <p className="text-blue-600">{analysis.student_profile.phone}</p>
                                                    </div>
                                                )}
                                                <div>
                                                    <span className="text-sm text-gray-600">Experience Level:</span>
                                                    <p className="font-semibold capitalize text-green-600">
                                                        {analysis.student_profile.experience_level || 'Entry-level'}
                                                        {analysis.student_profile.years_of_experience && ` (${analysis.student_profile.years_of_experience} years)`}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-semibold text-blue-700 mb-3">Skills & Technologies</h4>
                                            {analysis.student_profile.skills && analysis.student_profile.skills.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {analysis.student_profile.skills.map((skill, index) => (
                                                        <motion.span
                                                            key={index}
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ delay: index * 0.05 }}
                                                            className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-sm rounded-full border border-blue-200 font-medium"
                                                        >
                                                            {skill}
                                                        </motion.span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {analysis.student_profile.summary && (
                                        <div className="mt-6">
                                            <h4 className="text-lg font-semibold text-blue-700 mb-3">Professional Summary</h4>
                                            <p className="text-gray-700 bg-white/80 p-4 rounded-xl border border-blue-100 italic">
                                                "{analysis.student_profile.summary}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* GitHub Analysis Section */}
                            {analysis.github_analysis && (
                                <div className="bg-gradient-to-r from-gray-50 via-white to-orange-50 border border-gray-200 rounded-2xl p-6">
                                    <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                                        <Github className="w-6 h-6 mr-3" />
                                        GitHub Analysis
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="text-center bg-white/80 p-4 rounded-xl border border-gray-200">
                                            <p className="text-gray-600 text-sm">Username</p>
                                            <p className="font-bold text-xl text-gray-800">{analysis.github_analysis.username}</p>
                                        </div>
                                        <div className="text-center bg-white/80 p-4 rounded-xl border border-gray-200">
                                            <p className="text-gray-600 text-sm">Public Repositories</p>
                                            <p className="font-bold text-xl text-gray-800">{analysis.github_analysis.public_repos}</p>
                                        </div>
                                        <div className="text-center bg-white/80 p-4 rounded-xl border border-gray-200">
                                            <p className="text-gray-600 text-sm">GitHub Score</p>
                                            <p className="font-bold text-xl text-green-600">{analysis.github_analysis.github_score}/100</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Internship Recommendations */}
                            {analysis.internship_recommendations && analysis.internship_recommendations.length > 0 && (
                                <div className="bg-gradient-to-r from-green-50 via-white to-blue-50 border border-green-200 rounded-2xl p-6">
                                    <h3 className="text-2xl font-bold text-green-800 mb-6 flex items-center">
                                        <Target className="w-6 h-6 mr-3" />
                                        Internship Recommendations ({analysis.internship_recommendations.length})
                                    </h3>
                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {analysis.internship_recommendations.map((internship, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className="bg-white border border-green-200 rounded-xl p-4 hover:shadow-lg transition-all"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-lg text-green-800">{internship.title}</h4>
                                                        <p className="text-green-600 font-medium">{internship.company}</p>
                                                        {internship.location && (
                                                            <p className="text-gray-600 text-sm">{internship.location}</p>
                                                        )}
                                                    </div>
                                                    <span className="bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 px-4 py-2 rounded-full font-bold text-lg border border-emerald-300">
                                                        {(internship.matching_score * 100).toFixed(0)}% match
                                                    </span>
                                                </div>
                                                {internship.justification && (
                                                    <p className="text-gray-700 mb-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                        {internship.justification}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-4 mt-3 text-sm">
                                                    {internship.duration && (
                                                        <span>Duration: <strong>{internship.duration}</strong></span>
                                                    )}
                                                    {internship.stipend && (
                                                        <span>Stipend: <strong>{internship.stipend}</strong></span>
                                                    )}
                                                    {internship.domain && (
                                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                                                            {internship.domain}
                                                        </span>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Portfolio Gaps */}
                            {analysis.portfolio_gaps && analysis.portfolio_gaps.length > 0 && (
                                <div className="bg-gradient-to-r from-red-50 via-white to-orange-50 border border-red-200 rounded-2xl p-6">
                                    <h3 className="text-2xl font-bold text-red-800 mb-6 flex items-center">
                                        <AlertCircle className="w-6 h-6 mr-3" />
                                        Portfolio Gaps ({analysis.portfolio_gaps.length})
                                    </h3>
                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {analysis.portfolio_gaps.map((gap, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className="bg-white border border-red-200 rounded-xl p-4 hover:shadow-lg transition-all"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <h4 className="text-red-700 font-bold text-lg">{gap.title || gap.gap_type}</h4>
                                                    <span className={`text-xs px-3 py-1 rounded-full font-bold border ${gap.priority === 'high' ? 'bg-red-100 text-red-700 border-red-300' :
                                                        gap.priority === 'medium' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                                            'bg-blue-100 text-blue-700 border-blue-300'
                                                        }`}>
                                                        {gap.priority || 'medium'} priority
                                                    </span>
                                                </div>
                                                {gap.description && (
                                                    <p className="text-gray-700 mb-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                        {gap.description}
                                                    </p>
                                                )}
                                                {gap.suggested_action && (
                                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                                        <p className="text-green-700 font-medium text-sm">💡 Suggested Action:</p>
                                                        <p className="text-green-800 text-sm">{gap.suggested_action}</p>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 mt-3 text-sm">
                                                    {gap.estimated_time && (
                                                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                                                            ⏱️ {gap.estimated_time}
                                                        </span>
                                                    )}
                                                    {gap.resources && gap.resources.length > 0 && (
                                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                                                            📚 {gap.resources.length} resources
                                                        </span>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Readiness Evaluations */}
                            {analysis.readiness_evaluations && analysis.readiness_evaluations.length > 0 && (
                                <div className="bg-gradient-to-r from-purple-50 via-white to-indigo-50 border border-purple-200 rounded-2xl p-6">
                                    <h3 className="text-2xl font-bold text-purple-800 mb-6 flex items-center">
                                        <BarChart3 className="w-6 h-6 mr-3" />
                                        Readiness Evaluations
                                    </h3>
                                    <div className="space-y-4">
                                        {analysis.readiness_evaluations.map((evaluation, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className="bg-white border border-purple-200 rounded-xl p-4 hover:shadow-lg transition-all"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <h4 className="font-bold text-lg text-purple-800">{evaluation.internship_title}</h4>
                                                        {evaluation.company && (
                                                            <p className="text-purple-600 font-medium">{evaluation.company}</p>
                                                        )}
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-300 px-4 py-2 rounded-xl">
                                                            <span className="text-purple-800 font-bold text-xl">
                                                                {(evaluation.readiness_score * 100).toFixed(0)}%
                                                            </span>
                                                        </div>
                                                        <span className="text-xs text-gray-600 mt-1 block">Readiness</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Analysis Summary */}
                            {analysis.analysis_summary && (
                                <div className="bg-gradient-to-r from-indigo-50 via-white to-cyan-50 border border-indigo-200 rounded-2xl p-6">
                                    <h3 className="text-2xl font-bold text-indigo-800 mb-4 flex items-center">
                                        <Brain className="w-6 h-6 mr-3" />
                                        AI Analysis Summary
                                    </h3>
                                    <p className="text-gray-700 text-lg leading-relaxed bg-white/80 p-4 rounded-xl border border-indigo-100 italic">
                                        "{analysis.analysis_summary}"
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AnalysisHistory;
