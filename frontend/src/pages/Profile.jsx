import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ChangePassword from '../components/ChangePassword';
import { useAuth } from '../contexts/AuthContext';
import {
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Edit3,
    Save,
    X,
    Camera,
    Github,
    Linkedin,
    Globe,
    Award,
    BookOpen,
    Briefcase,
    Star,
    Settings,
    Shield,
    Bell,
    Eye,
    EyeOff,
    Check,
    AlertCircle,
    Upload,
    Download,
    Trash2
} from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';

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

const Profile = () => {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('profile');
    const [profileData, setProfileData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        location: '',
        bio: '',
        linkedin: '',
        github: '',
        website: '',
        skills: [],
        experience_level: '',
        education: [],
        preferences: []
    });
    const [editedData, setEditedData] = useState({});
    const [profileStats, setProfileStats] = useState({
        analyses_completed: 0,
        internships_applied: 0,
        profile_views: 0,
        skill_score: 0
    });

    useEffect(() => {
        fetchProfileData();
    }, []);

    const fetchProfileData = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://127.0.0.1:8000/api/profile/', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.data.status === 'success') {
                setProfileData(response.data.profile);
                setProfileStats(response.data.stats || {});
                setEditedData(response.data.profile);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            // Set default data from user context if API fails
            if (user) {
                const defaultData = {
                    first_name: user.first_name || '',
                    last_name: user.last_name || '',
                    email: user.email || '',
                    phone: '',
                    location: '',
                    bio: '',
                    linkedin: '',
                    github: '',
                    website: '',
                    skills: [],
                    experience_level: 'Entry Level',
                    education: [],
                    preferences: []
                };
                setProfileData(defaultData);
                setEditedData(defaultData);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setEditedData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSkillAdd = (skill) => {
        if (skill && !editedData.skills?.includes(skill)) {
            setEditedData(prev => ({
                ...prev,
                skills: [...(prev.skills || []), skill]
            }));
        }
    };

    const handleSkillRemove = (skillToRemove) => {
        setEditedData(prev => ({
            ...prev,
            skills: prev.skills?.filter(skill => skill !== skillToRemove) || []
        }));
    };

    const handleSaveProfile = async () => {
        try {
            const response = await axios.put('http://127.0.0.1:8000/api/profile/', editedData, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.status === 'success') {
                setProfileData(editedData);
                setIsEditing(false);
                toast.success('Profile updated successfully!');

                // Update user context if basic info changed
                if (editedData.first_name !== user.first_name || editedData.last_name !== user.last_name) {
                    updateUser({
                        ...user,
                        first_name: editedData.first_name,
                        last_name: editedData.last_name
                    });
                }
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile. Please try again.');
        }
    };

    const handleCancelEdit = () => {
        setEditedData(profileData);
        setIsEditing(false);
    };

    const handleAvatarUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size should be less than 5MB');
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const response = await axios.post('http://127.0.0.1:8000/api/profile/avatar/', formData, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.status === 'success') {
                setProfileData(prev => ({
                    ...prev,
                    avatar: response.data.avatar_url
                }));
                toast.success('Profile picture updated successfully!');
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            toast.error('Failed to upload profile picture');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
                <Navbar />
                <div className="flex items-center justify-center min-h-screen">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center"
                    >
                        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4 animate-spin" />
                        <h2 className="text-xl font-semibold text-blue-600 mb-2">Loading Profile</h2>
                        <p className="text-gray-600">Fetching your information...</p>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 relative overflow-hidden">
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
                    className="absolute top-40 right-32 w-24 h-24 bg-blue-300/20 rounded-lg"
                />
            </div>

            <Navbar />

            <motion.div
                className="max-w-6xl mx-auto px-6 py-8 relative z-10"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Header Section */}
                <motion.div variants={itemVariants} className="mb-8">
                    <div className="bg-white/90 backdrop-blur-sm border border-blue-200 rounded-2xl p-8 shadow-xl">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                            {/* Avatar Section */}
                            <div className="relative">
                                <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                    {profileData.avatar ? (
                                        <img
                                            src={profileData.avatar}
                                            alt="Profile"
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        `${profileData.first_name?.[0] || 'U'}${profileData.last_name?.[0] || ''}`
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
                                    <Camera className="w-5 h-5 text-white" />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>

                            {/* Profile Info */}
                            <div className="flex-1 text-center md:text-left">
                                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                                    <h1 className="text-3xl font-bold text-gray-800">
                                        {profileData.first_name} {profileData.last_name}
                                    </h1>
                                    <motion.button
                                        onClick={() => setIsEditing(!isEditing)}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
                                    >
                                        {isEditing ? <X className="w-4 h-4 mr-2" /> : <Edit3 className="w-4 h-4 mr-2" />}
                                        {isEditing ? 'Cancel' : 'Edit Profile'}
                                    </motion.button>
                                </div>

                                <p className="text-gray-600 mb-4">{profileData.bio || 'No bio added yet'}</p>

                                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                    {profileData.email && (
                                        <div className="flex items-center">
                                            <Mail className="w-4 h-4 mr-2 text-blue-600" />
                                            {profileData.email}
                                        </div>
                                    )}
                                    {profileData.phone && (
                                        <div className="flex items-center">
                                            <Phone className="w-4 h-4 mr-2 text-green-600" />
                                            {profileData.phone}
                                        </div>
                                    )}
                                    {profileData.location && (
                                        <div className="flex items-center">
                                            <MapPin className="w-4 h-4 mr-2 text-red-600" />
                                            {profileData.location}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Cards */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'Analyses Completed', value: profileStats.analyses_completed || 0, icon: <Star className="w-5 h-5" />, color: 'text-yellow-600' },
                        { label: 'Internships Applied', value: profileStats.internships_applied || 0, icon: <Briefcase className="w-5 h-5" />, color: 'text-blue-600' },
                        { label: 'Profile Views', value: profileStats.profile_views || 0, icon: <Eye className="w-5 h-5" />, color: 'text-green-600' },
                        { label: 'Skill Score', value: `${profileStats.skill_score || 0}%`, icon: <Award className="w-5 h-5" />, color: 'text-purple-600' }
                    ].map((stat, index) => (
                        <motion.div
                            key={index}
                            whileHover={{ scale: 1.02, y: -4 }}
                            className="bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-6 hover:bg-white hover:shadow-xl transition-all duration-300"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">{stat.label}</h3>
                                <div className={stat.color}>
                                    {stat.icon}
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Tab Navigation */}
                <motion.div variants={itemVariants} className="mb-8">
                    <div className="bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-2">
                        <div className="flex space-x-2">
                            {[
                                { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
                                { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
                                { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> }
                            ].map((tab) => (
                                <motion.button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all ${activeTab === tab.id
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                                        }`}
                                >
                                    {tab.icon}
                                    <span className="ml-2">{tab.label}</span>
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    {activeTab === 'profile' && (
                        <ProfileTabContent
                            isEditing={isEditing}
                            profileData={profileData}
                            editedData={editedData}
                            handleInputChange={handleInputChange}
                            handleSkillAdd={handleSkillAdd}
                            handleSkillRemove={handleSkillRemove}
                            handleSaveProfile={handleSaveProfile}
                            handleCancelEdit={handleCancelEdit}
                        />
                    )}
                    {activeTab === 'settings' && <SettingsTabContent />}
                    {activeTab === 'security' && <SecurityTabContent />}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

// Profile Tab Content Component
const ProfileTabContent = ({
    isEditing,
    profileData,
    editedData,
    handleInputChange,
    handleSkillAdd,
    handleSkillRemove,
    handleSaveProfile,
    handleCancelEdit
}) => {
    const [newSkill, setNewSkill] = useState('');

    const handleAddSkill = () => {
        if (newSkill.trim()) {
            handleSkillAdd(newSkill.trim());
            setNewSkill('');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            {/* Personal Information */}
            <div className="bg-white/90 backdrop-blur-sm border border-blue-200 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <User className="w-5 h-5 mr-2 text-blue-600" />
                    Personal Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedData.first_name || ''}
                                onChange={(e) => handleInputChange('first_name', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        ) : (
                            <p className="text-gray-800 font-medium py-3">{profileData.first_name || 'Not set'}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedData.last_name || ''}
                                onChange={(e) => handleInputChange('last_name', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        ) : (
                            <p className="text-gray-800 font-medium py-3">{profileData.last_name || 'Not set'}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                        <p className="text-gray-800 font-medium py-3">{profileData.email}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                        {isEditing ? (
                            <input
                                type="tel"
                                value={editedData.phone || ''}
                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        ) : (
                            <p className="text-gray-800 font-medium py-3">{profileData.phone || 'Not set'}</p>
                        )}
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedData.location || ''}
                                onChange={(e) => handleInputChange('location', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        ) : (
                            <p className="text-gray-800 font-medium py-3">{profileData.location || 'Not set'}</p>
                        )}
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Bio</label>
                        {isEditing ? (
                            <textarea
                                value={editedData.bio || ''}
                                onChange={(e) => handleInputChange('bio', e.target.value)}
                                rows="4"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Tell us about yourself..."
                            />
                        ) : (
                            <p className="text-gray-800 font-medium py-3">{profileData.bio || 'No bio added yet'}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Social Links */}
            <div className="bg-white/90 backdrop-blur-sm border border-blue-200 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <Globe className="w-5 h-5 mr-2 text-blue-600" />
                    Social Links
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <Github className="w-4 h-4 mr-2" />
                            GitHub
                        </label>
                        {isEditing ? (
                            <input
                                type="url"
                                value={editedData.github || ''}
                                onChange={(e) => handleInputChange('github', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="https://github.com/username"
                            />
                        ) : (
                            <p className="text-gray-800 font-medium py-3">{profileData.github || 'Not set'}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <Linkedin className="w-4 h-4 mr-2" />
                            LinkedIn
                        </label>
                        {isEditing ? (
                            <input
                                type="url"
                                value={editedData.linkedin || ''}
                                onChange={(e) => handleInputChange('linkedin', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="https://linkedin.com/in/username"
                            />
                        ) : (
                            <p className="text-gray-800 font-medium py-3">{profileData.linkedin || 'Not set'}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <Globe className="w-4 h-4 mr-2" />
                            Website
                        </label>
                        {isEditing ? (
                            <input
                                type="url"
                                value={editedData.website || ''}
                                onChange={(e) => handleInputChange('website', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="https://yourwebsite.com"
                            />
                        ) : (
                            <p className="text-gray-800 font-medium py-3">{profileData.website || 'Not set'}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Skills */}
            <div className="bg-white/90 backdrop-blur-sm border border-blue-200 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <Award className="w-5 h-5 mr-2 text-blue-600" />
                    Skills
                </h3>

                {isEditing && (
                    <div className="mb-4 flex gap-2">
                        <input
                            type="text"
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Add a skill..."
                        />
                        <motion.button
                            onClick={handleAddSkill}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            Add
                        </motion.button>
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    {(isEditing ? editedData.skills : profileData.skills)?.map((skill, index) => (
                        <motion.span
                            key={index}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`px-3 py-1 rounded-full text-sm ${isEditing
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-blue-50 text-blue-600'
                                } flex items-center`}
                        >
                            {skill}
                            {isEditing && (
                                <motion.button
                                    onClick={() => handleSkillRemove(skill)}
                                    whileHover={{ scale: 1.1 }}
                                    className="ml-2 text-blue-500 hover:text-blue-700"
                                >
                                    <X className="w-3 h-3" />
                                </motion.button>
                            )}
                        </motion.span>
                    ))}
                    {(!profileData.skills || profileData.skills.length === 0) && !isEditing && (
                        <p className="text-gray-500 italic">No skills added yet</p>
                    )}
                </div>
            </div>

            {/* Save/Cancel Buttons */}
            {isEditing && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 justify-end"
                >
                    <motion.button
                        onClick={handleCancelEdit}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </motion.button>
                    <motion.button
                        onClick={handleSaveProfile}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg flex items-center"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                    </motion.button>
                </motion.div>
            )}
        </motion.div>
    );
};

// Settings Tab Content Component
const SettingsTabContent = () => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-white/90 backdrop-blur-sm border border-blue-200 rounded-2xl p-6"
    >
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <Settings className="w-5 h-5 mr-2 text-blue-600" />
            Settings
        </h3>
        <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                <div>
                    <h4 className="font-semibold text-gray-800">Email Notifications</h4>
                    <p className="text-sm text-gray-600">Receive emails about new internships and updates</p>
                </div>
                <div className="w-12 h-6 bg-blue-600 rounded-full p-1 cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full transform translate-x-6 transition-transform"></div>
                </div>
            </div>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                <div>
                    <h4 className="font-semibold text-gray-800">Profile Visibility</h4>
                    <p className="text-sm text-gray-600">Make your profile visible to recruiters</p>
                </div>
                <div className="w-12 h-6 bg-gray-300 rounded-full p-1 cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full transition-transform"></div>
                </div>
            </div>
        </div>
    </motion.div>
);

// Security Tab Content Component
const SecurityTabContent = () => {
    const [showChangePassword, setShowChangePassword] = useState(false);

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/90 backdrop-blur-sm border border-blue-200 rounded-2xl p-6"
            >
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-blue-600" />
                    Security
                </h3>
                <div className="space-y-6">
                    <div className="p-4 border border-gray-200 rounded-xl">
                        <h4 className="font-semibold text-gray-800 mb-2">Change Password</h4>
                        <p className="text-sm text-gray-600 mb-4">Update your password to keep your account secure</p>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowChangePassword(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center"
                        >
                            <Shield className="w-4 h-4 mr-2" />
                            Change Password
                        </motion.button>
                    </div>
                    <div className="p-4 border border-green-200 rounded-xl bg-green-50">
                        <h4 className="font-semibold text-green-800 mb-2">Account Security</h4>
                        <p className="text-sm text-green-600 mb-4">Your account is secured with the latest encryption standards</p>
                        <div className="flex items-center text-green-700 text-sm">
                            <Check className="w-4 h-4 mr-2" />
                            Two-factor authentication ready
                        </div>
                    </div>
                    <div className="p-4 border border-red-200 rounded-xl bg-red-50">
                        <h4 className="font-semibold text-red-800 mb-2">Delete Account</h4>
                        <p className="text-sm text-red-600 mb-4">Permanently delete your account and all associated data</p>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Account
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {/* Change Password Modal */}
            <AnimatePresence>
                {showChangePassword && (
                    <ChangePassword onClose={() => setShowChangePassword(false)} />
                )}
            </AnimatePresence>
        </>
    );
};

export default Profile;
