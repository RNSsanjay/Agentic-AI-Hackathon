import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Signup from './pages/signup';
import Home from './pages/home';
import Landing from './pages/landing';
import AnalysisHistory from './pages/AnalysisHistory';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';

// Component to handle routing based on auth state
const AppRoutes = () => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <Routes>
            <Route
                path="/"
                element={isAuthenticated ? <Navigate to="/home" /> : <Landing />}
            />
            <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/home" /> : <Login />}
            />
            <Route
                path="/signup"
                element={isAuthenticated ? <Navigate to="/home" /> : <Signup />}
            />
            <Route
                path="/forgot-password"
                element={isAuthenticated ? <Navigate to="/home" /> : <ForgotPassword />}
            />
            <Route
                path="/reset-password"
                element={isAuthenticated ? <Navigate to="/home" /> : <ResetPassword />}
            />
            <Route
                path="/home"
                element={
                    <ProtectedRoute>
                        <Home />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/analysis-history"
                element={
                    <ProtectedRoute>
                        <AnalysisHistory />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/profile"
                element={
                    <ProtectedRoute>
                        <Profile />
                    </ProtectedRoute>
                }
            />
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="App">
                    <AppRoutes />
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
                        theme="dark"
                    />
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;