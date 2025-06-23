import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Home, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const Navbar = () => {
    const navigate = useNavigate();
    const { isAuthenticated, logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Logged out successfully');
            navigate('/');
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Error during logout');
        }
    };

    return (
        <nav className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 backdrop-blur-xl border-b border-purple-500/20 sticky top-0 z-50 shadow-lg shadow-purple-500/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link 
                            to="/" 
                            className="flex items-center space-x-2 group"
                        >
                            <div className="relative">
                                <Sparkles className="w-8 h-8 text-purple-400 group-hover:text-purple-300 transition-all duration-300 group-hover:rotate-12" />
                                <div className="absolute inset-0 bg-purple-400/20 rounded-full blur-md group-hover:blur-lg transition-all duration-300"></div>
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent group-hover:from-purple-200 group-hover:to-white transition-all duration-300">
                                Intern AI
                            </span>
                        </Link>
                    </div>

                    {/* Navigation Links */}
                    <div className="flex items-center space-x-2">
                        {isAuthenticated ? (
                            <>
                                <Link
                                    to="/home"
                                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm border border-transparent hover:border-purple-500/30"
                                >
                                    <Home className="w-4 h-4 mr-2" />
                                    Home
                                </Link>
                                <Link
                                    to="/profile"
                                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm border border-transparent hover:border-purple-500/30"
                                >
                                    <User className="w-4 h-4 mr-2" />
                                    Profile
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-500/20 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm border border-transparent hover:border-red-500/30 group"
                                >
                                    <LogOut className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-200" />
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="px-6 py-2 text-sm text-gray-300 hover:text-white transition-all duration-200 rounded-xl hover:bg-white/5 border border-transparent hover:border-purple-500/30"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/signup"
                                    className="px-6 py-2 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 hover:scale-105 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 border border-purple-500/20"
                                >
                                    Sign Up
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;