import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email) {
            toast.error('Please enter your email address');
            return;
        }

        setIsLoading(true);

        try {
            const response = await axios.post('http://127.0.0.1:8000/api/auth/forgot-password/', {
                email: email.trim()
            }, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            });

            setEmailSent(true);
            toast.success(response.data.message || 'Reset link sent successfully!');
        } catch (error) {
            console.error('Forgot password error:', error);

            if (error.code === 'ECONNABORTED') {
                toast.error('Request timeout. Please check your connection.');
            } else if (error.response) {
                const errorMessage = error.response.data?.error ||
                    error.response.data?.message ||
                    `Request failed (${error.response.status})`;
                toast.error(errorMessage);
            } else if (error.request) {
                toast.error('Cannot connect to server. Please check your connection.');
            } else {
                toast.error('An unexpected error occurred. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center overflow-hidden">
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />

            {/* Floating Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute top-20 left-10 w-20 h-20 bg-blue-200/30 rounded-full blur-xl"
                    animate={{
                        y: [0, -20, 0],
                        x: [0, 10, 0],
                    }}
                    transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute top-40 right-20 w-32 h-32 bg-indigo-200/20 rounded-full blur-2xl"
                    animate={{
                        y: [0, 30, 0],
                        x: [0, -15, 0],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute bottom-20 left-1/4 w-24 h-24 bg-cyan-200/25 rounded-full blur-xl"
                    animate={{
                        y: [0, -25, 0],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </div>

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Back Button */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-8"
                >
                    <Link
                        to="/login"
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors font-medium"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Login
                    </Link>
                </motion.div>

                {/* Forgot Password Form */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-md border border-blue-100 rounded-2xl p-8 shadow-xl"
                >
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2 text-gray-900">
                            {emailSent ? 'Check Your Email' : 'Forgot Password?'}
                        </h1>
                        <p className="text-gray-600">
                            {emailSent
                                ? 'We\'ve sent a password reset link to your email address'
                                : 'Enter your email address and we\'ll send you a reset link'
                            }
                        </p>
                    </div>

                    {!emailSent ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-5 h-5" />
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 transition-all"
                                        placeholder="Enter your email address"
                                        required
                                    />
                                </div>
                            </div>

                            <motion.button
                                type="submit"
                                disabled={isLoading}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/25 flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <div className="flex items-center">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                                        />
                                        Sending...
                                    </div>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5 mr-2" />
                                        Send Reset Link
                                    </>
                                )}
                            </motion.button>
                        </form>
                    ) : (
                        <div className="text-center space-y-4">
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-green-800 text-sm">
                                    If an account with this email exists, you'll receive reset instructions shortly.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <p className="text-gray-600 text-sm">Didn't receive the email?</p>
                                <button
                                    onClick={() => {
                                        setEmailSent(false);
                                        setEmail('');
                                    }}
                                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                                >
                                    Try again
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 text-center">
                        <p className="text-gray-600">
                            Remember your password?{' '}
                            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ForgotPassword;
