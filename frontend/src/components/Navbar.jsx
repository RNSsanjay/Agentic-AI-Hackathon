import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {    
  LogOut, User, Home, Sparkles, History, Bell, 
  Settings, Moon, Sun, Search, Menu, X, BarChart3,
  FileText, Target, Github, ChevronDown, Brain
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, logout, user } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [notifications, setNotifications] = useState([
        { id: 1, message: "New AI analysis completed", time: "2 min ago", unread: true },
        { id: 2, message: "5 new internship matches found", time: "1 hour ago", unread: true },
        { id: 3, message: "Portfolio gap analysis ready", time: "3 hours ago", unread: false }
    ]);

    const unreadCount = notifications.filter(n => n.unread).length;

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Logged out successfully');
            setShowUserMenu(false);
            navigate('/');
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Error during logout');
        }
    };

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
        // In a real app, you'd save this to localStorage and apply to the document
        toast.info(`${isDarkMode ? 'Light' : 'Dark'} mode ${isDarkMode ? 'enabled' : 'disabled'}`);
    };

    const navigationItems = [
        { 
            path: '/home', 
            label: 'Dashboard', 
            icon: Home,
            description: 'AI-powered internship matching'
        },
        { 
            path: '/analysis-history', 
            label: 'History', 
            icon: History,
            description: 'View past analyses'
        },
        { 
            path: '/profile', 
            label: 'Profile', 
            icon: User,
            description: 'Manage your account'
        }
    ];

    const isActiveRoute = (path) => location.pathname === path;

    return (
        <nav className="bg-white/95 backdrop-blur-xl border-b border-blue-200 sticky top-0 z-50 shadow-lg shadow-blue-100/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <motion.div 
                        className="flex items-center"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Link
                            to="/"
                            className="flex items-center space-x-3 group"
                        >
                            <motion.div 
                                className="relative"
                                animate={{ 
                                    rotate: [0, 5, -5, 0],
                                    scale: [1, 1.05, 1]
                                }}
                                transition={{ 
                                    duration: 3, 
                                    repeat: Infinity,
                                    repeatType: "reverse"
                                }}
                            >
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                                    <Brain className="w-6 h-6 text-white" />
                                </div>
                                <motion.div
                                    className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                            </motion.div>
                            <div>
                                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                                    InternAI
                                </span>
                                <motion.div 
                                    className="text-xs text-blue-500 font-medium"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    AI-Powered Internship Matching
                                </motion.div>
                            </div>
                        </Link>
                    </motion.div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-1">
                        {isAuthenticated ? (
                            <>
                                {/* Navigation Items */}
                                {navigationItems.map((item) => (
                                    <motion.div
                                        key={item.path}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <Link
                                            to={item.path}
                                            className={`flex items-center px-4 py-2 text-sm rounded-xl transition-all duration-200 font-medium relative group ${
                                                isActiveRoute(item.path)
                                                    ? 'text-blue-600 bg-blue-100 shadow-md'
                                                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                                            }`}
                                        >
                                            <item.icon className="w-4 h-4 mr-2" />
                                            {item.label}
                                            {isActiveRoute(item.path) && (
                                                <motion.div
                                                    layoutId="activeTab"
                                                    className="absolute inset-0 bg-blue-100 rounded-xl -z-10"
                                                    initial={false}
                                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                />
                                            )}
                                            {/* Tooltip */}
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                                {item.description}
                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                ))}

                                

                                

                                {/* User Menu */}
                                <div className="relative">
                                    <motion.button
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 font-medium"
                                    >
                                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                            {user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                                        </div>
                                        <span className="hidden lg:block">{user?.first_name || 'User'}</span>
                                        <ChevronDown className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                                    </motion.button>

                                    <AnimatePresence>
                                        {showUserMenu && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                transition={{ duration: 0.2 }}
                                                className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20"
                                            >
                                                <Link
                                                    to="/profile"
                                                    onClick={() => setShowUserMenu(false)}
                                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                >
                                                    <User className="w-4 h-4 mr-3" />
                                                    My Profile
                                                </Link>
                                                
                                                <hr className="my-2" />
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <LogOut className="w-4 h-4 mr-3" />
                                                    Logout
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </>
                        ) : (
                            <>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Link
                                        to="/login"
                                        className="px-6 py-2 text-sm text-gray-700 hover:text-blue-600 transition-all duration-200 rounded-xl hover:bg-blue-50 font-medium"
                                    >
                                        Login
                                    </Link>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Link
                                        to="/signup"
                                        className="px-6 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                                    >
                                        Sign Up
                                    </Link>
                                </motion.div>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <motion.button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </motion.button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="md:hidden border-t border-blue-200 py-4 space-y-2"
                        >
                            {isAuthenticated ? (
                                <>
                                    {navigationItems.map((item) => (
                                        <motion.div
                                            key={item.path}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 }}
                                        >
                                            <Link
                                                to={item.path}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={`flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-200 font-medium ${
                                                    isActiveRoute(item.path)
                                                        ? 'text-blue-600 bg-blue-100'
                                                        : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                                                }`}
                                            >
                                                <item.icon className="w-5 h-5 mr-3" />
                                                <div>
                                                    <div>{item.label}</div>
                                                    <div className="text-xs text-gray-500">{item.description}</div>
                                                </div>
                                            </Link>
                                        </motion.div>
                                    ))}
                                    <hr className="my-2" />
                                    <motion.button
                                        onClick={handleLogout}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 font-medium"
                                    >
                                        <LogOut className="w-5 h-5 mr-3" />
                                        Logout
                                    </motion.button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="block px-4 py-3 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 font-medium"
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        to="/signup"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="block px-4 py-3 text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg font-medium"
                                    >
                                        Sign Up
                                    </Link>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </nav>
    );
};

export default Navbar;