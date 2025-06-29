import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Briefcase, Search, Heart, Building, MapPin, DollarSign, Timer,
    ExternalLink, Calendar, RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';

const AVAILABLE_DOMAINS = [
    'Web Development', 'Data Science', 'Mobile Development', 'Backend Development',
    'Frontend Development', 'Artificial Intelligence', 'Machine Learning', 'Cloud Computing',
    'Cybersecurity', 'DevOps', 'Game Development', 'Blockchain', 'IoT (Internet of Things)',
    'UI/UX Design', 'Quality Assurance', 'Database Administration', 'Network Engineering',
    'Product Management', 'Digital Marketing', 'Financial Technology'
];

const InternshipsSection = ({ internships, loading }) => {
    const [filteredInternships, setFilteredInternships] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('All');
    const [selectedDomain, setSelectedDomain] = useState('All');
    const [showSaved, setShowSaved] = useState(false);
    const [savedInternships, setSavedInternships] = useState(new Set());

    useEffect(() => {
        if (internships) {
            let filtered = internships;

            // Search filter
            if (searchTerm) {
                filtered = filtered.filter(internship =>
                    internship.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    internship.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    internship.description?.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            // Type filter
            if (selectedType !== 'All') {
                filtered = filtered.filter(internship =>
                    internship.type === selectedType ||
                    (selectedType === 'Remote' && internship.location?.toLowerCase().includes('remote'))
                );
            }

            // Domain filter
            if (selectedDomain !== 'All') {
                filtered = filtered.filter(internship =>
                    internship.domain === selectedDomain ||
                    internship.title?.toLowerCase().includes(selectedDomain.toLowerCase())
                );
            }

            // Show only saved filter
            if (showSaved) {
                filtered = filtered.filter(internship => savedInternships.has(internship.id));
            }

            setFilteredInternships(filtered);
        }
    }, [internships, searchTerm, selectedType, selectedDomain, showSaved, savedInternships]);

    const toggleSaveInternship = (internshipId) => {
        const newSaved = new Set(savedInternships);
        if (newSaved.has(internshipId)) {
            newSaved.delete(internshipId);
            toast.success('Internship removed from saved list');
        } else {
            newSaved.add(internshipId);
            toast.success('Internship saved!');
        }
        setSavedInternships(newSaved);
    }; const openInternshipLink = (internship) => {
        // Try multiple possible URL fields from the internship object
        const url = internship.url || internship.link || internship.application_url;

        if (url && url !== 'N/A' && url !== 'Not specified' && url.trim() !== '') {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            toast.info('No direct link available for this internship');
        }
    };

    const types = ['All', 'Remote', 'On-site', 'Hybrid'];
    const domains = ['All', ...AVAILABLE_DOMAINS];

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12 mb-8"
            >
                <div className="text-center">
                    <div className="inline-flex items-center px-6 py-3 bg-blue-100 rounded-full">
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin text-blue-600" />
                        <span className="text-blue-600 font-medium">Loading internships...</span>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12 mb-8"
        >
            {/* Header */}
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-4 flex items-center justify-center">
                    <Briefcase className="w-8 h-8 mr-3 text-blue-600" />
                    Available Internships
                    <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="ml-3 bg-blue-600 text-white text-sm px-3 py-1 rounded-full"
                    >
                        {filteredInternships.length}
                    </motion.span>
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                    Discover exciting internship opportunities that match your skills and interests
                </p>
            </div>

            {/* Filters */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-8 bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-6"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search internships..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Type Filter */}
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        {types.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>

                    {/* Domain Filter */}
                    <select
                        value={selectedDomain}
                        onChange={(e) => setSelectedDomain(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        {domains.map(domain => (
                            <option key={domain} value={domain}>{domain}</option>
                        ))}
                    </select>

                    {/* Saved Filter */}
                    <button
                        onClick={() => setShowSaved(!showSaved)}
                        className={`flex items-center justify-center px-4 py-2 rounded-xl font-medium transition-all ${showSaved
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <Heart className={`w-4 h-4 mr-2 ${showSaved ? 'fill-current' : ''}`} />
                        Saved ({savedInternships.size})
                    </button>
                </div>
            </motion.div>

            {/* Internships Grid */}
            {filteredInternships.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredInternships.map((internship, index) => (
                        <InternshipCard
                            key={internship.id || index}
                            internship={internship}
                            index={index}
                            savedInternships={savedInternships}
                            toggleSaveInternship={toggleSaveInternship}
                            openInternshipLink={openInternshipLink}
                        />
                    ))}
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                >
                    <div className="mb-4">
                        <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">No internships found</h3>
                        <p className="text-gray-500">
                            {showSaved
                                ? "You haven't saved any internships yet"
                                : "Try adjusting your search criteria or filters"
                            }
                        </p>
                    </div>
                    {(searchTerm || selectedType !== 'All' || selectedDomain !== 'All' || showSaved) && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedType('All');
                                setSelectedDomain('All');
                                setShowSaved(false);
                            }}
                            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            Clear Filters
                        </button>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
};

const InternshipCard = ({ internship, index, savedInternships, toggleSaveInternship, openInternshipLink }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="bg-white/90 backdrop-blur-sm border border-blue-200 rounded-2xl p-6 hover:shadow-xl hover:shadow-blue-100 transition-all duration-300 relative"
        >
            {/* Save Button */}
            <button
                onClick={() => toggleSaveInternship(internship.id)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
                <Heart
                    className={`w-5 h-5 transition-colors ${savedInternships.has(internship.id)
                        ? 'text-red-500 fill-current'
                        : 'text-gray-400 hover:text-red-500'
                        }`}
                />
            </button>

            {/* Company & Source */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                    <Building className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="font-semibold text-gray-800">{internship.company || 'Company Name'}</span>
                </div>
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-medium">
                    {internship.source || 'Unknown'}
                </span>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2 pr-8">
                {internship.title || 'Internship Title'}
            </h3>

            {/* Location & Type */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="text-sm">{internship.location || 'Location not specified'}</span>
                </div>
                {internship.type && (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${internship.type === 'Remote' ? 'bg-green-100 text-green-600' :
                        internship.type === 'Hybrid' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-gray-100 text-gray-600'
                        }`}>
                        {internship.type}
                    </span>
                )}
            </div>

            {/* Description */}
            <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {internship.description || 'No description available'}
            </p>

            {/* Skills */}
            {internship.requirements && internship.requirements.length > 0 && (
                <div className="mb-4">
                    <div className="text-xs text-gray-500 mb-2 font-medium">Required Skills:</div>
                    <div className="flex flex-wrap gap-1">
                        {internship.requirements.slice(0, 3).map((skill, idx) => (
                            <span
                                key={idx}
                                className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full"
                            >
                                {skill}
                            </span>
                        ))}
                        {internship.requirements.length > 3 && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                                +{internship.requirements.length - 3} more
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Stipend & Duration */}
            <div className="flex items-center justify-between mb-4 text-sm">
                <div className="flex items-center text-gray-600">
                    <DollarSign className="w-4 h-4 mr-1" />
                    <span>{internship.stipend || 'Not specified'}</span>
                </div>
                <div className="flex items-center text-gray-600">
                    <Timer className="w-4 h-4 mr-1" />
                    <span>{internship.duration || 'Not specified'}</span>
                </div>
            </div>            {/* Action Buttons */}
            <div className="space-y-3">
                {/* View Details Button */}
                <motion.button
                    onClick={() => openInternshipLink(internship)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-white border-2 border-blue-200 text-blue-600 py-2 px-4 rounded-xl font-medium hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 flex items-center justify-center group"
                >
                    <span>View Details</span>
                    <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                </motion.button>

                {/* Apply Button */}
                <motion.button
                    onClick={() => openInternshipLink(internship)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 flex items-center justify-center group"
                >
                    <span>Apply Now</span>
                    <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </motion.button>
            </div>

            {/* Deadline */}
            {internship.application_deadline && (
                <div className="mt-2 text-xs text-gray-500 text-center flex items-center justify-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    Deadline: {new Date(internship.application_deadline).toLocaleDateString()}
                </div>
            )}
        </motion.div>
    );
};

export default InternshipsSection;
