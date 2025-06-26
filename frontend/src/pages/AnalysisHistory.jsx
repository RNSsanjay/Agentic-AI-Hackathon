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

            const response = await axios.get(url);

            if (response.data.status === 'success') {
                setAnalyses(response.data.analyses);
                setStatistics(response.data.statistics);
            } else {
                toast.error('Failed to fetch analysis history');
            }
        } catch (error) {
            console.error('Error fetching analysis history:', error);
            toast.error('Failed to load analysis history');
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
            const response = await axios.get(`http://127.0.0.1:8000/api/analysis/${analysisId}/`);
            if (response.data.status === 'success') {
                setSelectedAnalysis(response.data.analysis);
            } else {
                toast.error('Failed to fetch analysis details');
            }
        } catch (error) {
            console.error('Error fetching analysis details:', error);
            toast.error('Failed to load analysis details');
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
        const dataStr = JSON.stringify(analysis, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `analysis_${analysis.analysis_id}_${new Date(analysis.timestamp).toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click(); toast.success('Analysis exported successfully');
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

    const totalPages = Math.ceil(filteredAnalyses.length / analysesPerPage); return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 relative overflow-hidden">
            {/* Floating animated elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        x: [0, 100, 0],
                        y: [0, -100, 0],
                        rotate: [0, 180, 360]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-20 left-20 w-16 h-16 bg-blue-200/20 rounded-full"
                />
                <motion.div
                    animate={{
                        x: [0, -80, 0],
                        y: [0, 120, 0],
                        scale: [1, 1.2, 1]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute top-40 right-32 w-24 h-24 bg-blue-300/15 rounded-lg"
                />
            </div>

            <div className="container mx-auto px-4 py-8 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-800 mb-2 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                                Analysis History
                            </h1>
                            <p className="text-gray-600 font-medium">Track your resume analysis journey and improvements</p>
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
                    </div>                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-6 hover:bg-white hover:shadow-xl transition-all duration-300"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Total Analyses</p>
                                    <p className="text-3xl font-bold text-gray-800">{statistics.total_analyses || 0}</p>
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
                                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Avg. Readiness Score</p>
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
                                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Total Internships Matched</p>
                                    <p className="text-3xl font-bold text-gray-800">{statistics.total_internships_matched || 0}</p>
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
                                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wider">GitHub Analyses</p>
                                    <p className="text-3xl font-bold text-gray-800">{statistics.has_github_analyses || 0}</p>
                                </div>
                                <Github className="w-8 h-8 text-orange-600" />
                            </div>
                        </motion.div>
                    </div>
                </motion.div>                {/* Search and Filter */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-6 mb-8 shadow-lg"
                >
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by student name, skills, or summary..."
                                className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                            />
                        </div>

                        <div className="flex gap-3">
                            <motion.button
                                onClick={() => setShowFilters(!showFilters)}
                                whileHover={{ scale: 1.02, y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                className={`flex items-center px-6 py-3 rounded-xl border-2 transition-all font-medium ${showFilters
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <Filter className="w-4 h-4 mr-2" />
                                Filters
                            </motion.button>

                            <motion.button
                                onClick={fetchAnalysisHistory}
                                whileHover={{ scale: 1.02, y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex items-center px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh
                            </motion.button>
                        </div>
                    </div>                    {/* Filter Options */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-6 pt-6 border-t border-gray-200"
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
                                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
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
                            <span className="ml-2 text-gray-400">Loading analysis history...</span>
                        </div>
                    ) : filteredAnalyses.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-400 mb-2">No analyses found</h3>
                            <p className="text-gray-500">
                                {searchTerm ? 'Try different search terms' : 'Start by analyzing your first resume!'}
                            </p>
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
                            className="flex items-center px-3 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <span className="text-gray-400">
                            Page {currentPage} of {totalPages}
                        </span>

                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="flex items-center px-3 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    }; const getScoreColor = (score) => {
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
                            <h3 className="text-lg font-bold text-gray-800">{analysis.student_name}</h3>
                        </div>

                        {analysis.github_username && (
                            <div className="flex items-center space-x-2 bg-orange-100 px-3 py-1 rounded-full">
                                <Github className="w-4 h-4 text-orange-600" />
                                <span className="text-sm font-medium text-orange-700">{analysis.github_username}</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                            <div className={`px-4 py-2 rounded-xl border-2 text-sm font-bold ${getScoreBadgeColor(analysis.overall_readiness_score)}`}>
                                {analysis.overall_readiness_score}% Ready
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 text-gray-600">
                            <Target className="w-4 h-4" />
                            <span className="text-sm font-medium">{analysis.total_internships_matched} matches</span>
                        </div>

                        <div className="flex items-center space-x-2 text-gray-600">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">{analysis.total_gaps_detected} gaps</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4 mb-4">
                        <div className="flex items-center space-x-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm font-medium">{formatDate(analysis.timestamp)}</span>
                        </div>

                        <div className="text-sm text-gray-600">
                            Level: <span className="text-blue-600 capitalize font-semibold">{analysis.experience_level}</span>
                        </div>
                    </div>

                    {analysis.primary_skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {analysis.primary_skills.slice(0, 5).map((skill, skillIndex) => (
                                <span
                                    key={skillIndex}
                                    className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full border border-blue-200 font-medium"
                                >
                                    {skill}
                                </span>
                            ))}
                            {analysis.primary_skills.length > 5 && (
                                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full border border-gray-200">
                                    +{analysis.primary_skills.length - 5} more
                                </span>
                            )}
                        </div>
                    )}

                    {analysis.analysis_summary && (
                        <p className="text-gray-600 text-sm mb-4 font-medium">{analysis.analysis_summary}</p>
                    )}
                </div>                <div className="flex items-center space-x-3 ml-4">
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
                        className="flex items-center px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
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
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >                <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white border border-blue-200 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                    <div className="p-6 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-800">Analysis Details</h2>
                            <motion.button
                                onClick={onClose}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="text-gray-500 hover:text-gray-700 transition-colors text-xl"
                            >
                                ✕
                            </motion.button>
                        </div>
                        <p className="text-gray-600 mt-1 font-medium">
                            Analysis from {formatDate(analysis.timestamp)}
                        </p>
                    </div>

                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                        {/* Student Profile Section */}
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Student Profile</h3>
                            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <p className="text-gray-600 text-sm font-semibold">Name</p>
                                        <p className="text-gray-800 font-medium">{analysis.student_profile?.name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600 text-sm font-semibold">Experience Level</p>
                                        <p className="text-gray-800 capitalize font-medium">{analysis.student_profile?.experience_level || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600 text-sm font-semibold">Email</p>
                                        <p className="text-gray-800 font-medium">{analysis.student_profile?.email || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600 text-sm font-semibold">Overall Readiness</p>
                                        <p className="text-blue-600 font-bold text-lg">{analysis.overall_readiness_score}%</p>
                                    </div>
                                </div>

                                {analysis.student_profile?.skills && (
                                    <div className="mb-4">
                                        <p className="text-gray-400 text-sm mb-2">Skills</p>
                                        <div className="flex flex-wrap gap-2">
                                            {analysis.student_profile.skills.map((skill, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 bg-blue-900/30 text-blue-400 text-sm rounded border border-blue-500/30"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {analysis.github_analysis && (
                                    <div>
                                        <p className="text-gray-400 text-sm mb-2">GitHub Analysis</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-500">Username</p>
                                                <p className="text-white">{analysis.github_analysis.username}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Public Repos</p>
                                                <p className="text-white">{analysis.github_analysis.public_repos}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">GitHub Score</p>
                                                <p className="text-white">{analysis.github_analysis.github_score}/100</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Internship Recommendations */}
                        {analysis.internship_recommendations && analysis.internship_recommendations.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-xl font-semibold text-white mb-4">
                                    Internship Recommendations ({analysis.internship_recommendations.length})
                                </h3>
                                <div className="space-y-4">
                                    {analysis.internship_recommendations.slice(0, 3).map((internship, index) => (
                                        <div key={index} className="bg-gray-800/50 rounded-lg p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="font-semibold text-white">{internship.title}</h4>
                                                <span className="text-green-400 text-sm font-medium">
                                                    {(internship.matching_score * 100).toFixed(0)}% match
                                                </span>
                                            </div>
                                            <p className="text-gray-400 text-sm mb-2">{internship.company} • {internship.location}</p>
                                            {internship.justification && (
                                                <p className="text-gray-300 text-sm">{internship.justification}</p>
                                            )}
                                        </div>
                                    ))}
                                    {analysis.internship_recommendations.length > 3 && (
                                        <p className="text-gray-400 text-sm">
                                            +{analysis.internship_recommendations.length - 3} more recommendations available
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Portfolio Gaps */}
                        {analysis.portfolio_gaps && analysis.portfolio_gaps.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-xl font-semibold text-white mb-4">
                                    Portfolio Gaps ({analysis.portfolio_gaps.length})
                                </h3>
                                <div className="space-y-3">
                                    {analysis.portfolio_gaps.slice(0, 5).map((gap, index) => (
                                        <div key={index} className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                                            <div className="flex items-start justify-between">
                                                <h4 className="text-red-400 font-medium">{gap.title}</h4>
                                                <span className={`text-xs px-2 py-1 rounded ${gap.priority === 'high' ? 'bg-red-900/50 text-red-400' :
                                                    gap.priority === 'medium' ? 'bg-yellow-900/50 text-yellow-400' :
                                                        'bg-gray-800 text-gray-400'
                                                    }`}>
                                                    {gap.priority}
                                                </span>
                                            </div>
                                            {gap.description && (
                                                <p className="text-gray-300 text-sm mt-1">{gap.description}</p>
                                            )}
                                        </div>
                                    ))}
                                    {analysis.portfolio_gaps.length > 5 && (
                                        <p className="text-gray-400 text-sm">
                                            +{analysis.portfolio_gaps.length - 5} more gaps identified
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Readiness Evaluations */}
                        {analysis.readiness_evaluations && analysis.readiness_evaluations.length > 0 && (
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-4">Readiness Evaluations</h3>
                                <div className="space-y-4">
                                    {analysis.readiness_evaluations.map((evaluation, index) => (
                                        <div key={index} className="bg-gray-800/50 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-semibold text-white">{evaluation.internship_title}</h4>
                                                <span className="text-blue-400 font-semibold">
                                                    {(evaluation.readiness_score * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            {evaluation.company && (
                                                <p className="text-gray-400 text-sm">{evaluation.company}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AnalysisHistory;
