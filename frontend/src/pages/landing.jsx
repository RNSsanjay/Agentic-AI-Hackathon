import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Shield, Zap, Users, Brain, Target, BookOpen, Upload, Search, CheckCircle, Sparkles, Github, FileText, TrendingUp, Award, Clock, Star, Bot, Network, Cpu, Eye } from 'lucide-react';

const Landing = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % 6);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const agentWorkflow = [
    {
      id: 1,
      name: "Student Profile Analyzer",
      icon: <Brain className="w-6 h-6" />,
      description: "Extracts skills, education, and experience from your resume",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600"
    },
    {
      id: 2,
      name: "Internship Matcher",
      icon: <Target className="w-6 h-6" />,
      description: "Matches your profile with the best internship opportunities",
      color: "from-indigo-500 to-indigo-600",
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-600"
    },
    {
      id: 3,
      name: "Portfolio Gap Detector",
      icon: <Search className="w-6 h-6" />,
      description: "Identifies missing skills and portfolio gaps",
      color: "from-cyan-500 to-cyan-600",
      bgColor: "bg-cyan-50",
      textColor: "text-cyan-600"
    },
    {
      id: 4,
      name: "RAG Requirement Aligner",
      icon: <Network className="w-6 h-6" />,
      description: "Retrieves real industry requirements and expectations",
      color: "from-sky-500 to-sky-600",
      bgColor: "bg-sky-50",
      textColor: "text-sky-600"
    },
    {
      id: 5,
      name: "Readiness Evaluator",
      icon: <TrendingUp className="w-6 h-6" />,
      description: "Calculates your internship readiness score",
      color: "from-blue-600 to-indigo-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700"
    },
    {
      id: 6,
      name: "GitHub Analyzer",
      icon: <Github className="w-6 h-6" />,
      description: "Analyzes your GitHub profile and project quality",
      color: "from-slate-500 to-slate-600",
      bgColor: "bg-slate-50",
      textColor: "text-slate-600"
    }
  ];

  const features = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: "AI-Powered Matching",
      description: "Our advanced AI analyzes your skills, interests, and career goals to recommend the perfect internship opportunities.",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Portfolio Alignment",
      description: "Get personalized recommendations to optimize your portfolio and increase your chances of landing your dream internship.",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: "Skill Gap Analysis",
      description: "Identify missing skills and get curated learning paths to make yourself more competitive in the job market.",
      color: "text-cyan-600",
      bgColor: "bg-cyan-50"
    }
  ];

  const stats = [
    { value: "25,000+", label: "Career Transformations", icon: <Brain className="w-6 h-6" /> },
    { value: "1,200+", label: "Enterprise Partners", icon: <Award className="w-6 h-6" /> },
    { value: "98%", label: "Match Accuracy", icon: <TrendingUp className="w-6 h-6" /> },
    { value: "24/7", label: "Smart AI Support", icon: <Bot className="w-6 h-6" /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 overflow-hidden">
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
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 p-6 bg-white/80 backdrop-blur-md border-b border-blue-100">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-2"
          >
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center"
              >
                <Brain className="w-6 h-6 text-white" />
              </motion.div>
              <div className="absolute inset-0 bg-blue-400/20 rounded-xl blur-md animate-pulse" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              InternAI
            </span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-x-4"
          >
            <Link
              to="/login"
              className="px-6 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors relative group"
            >
              Login
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full" />
            </Link>
            <Link
              to="/signup"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-500/25 font-medium"
            >
              Get Started Free
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-16">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Powered by Advanced AI Agents
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold mb-8 text-gray-900"
          >
            Find Your Perfect
            <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              Internship Match
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed"
          >
            Our AI-powered platform analyzes your resume, matches you with perfect internships,
            and provides personalized recommendations to boost your career success.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16"
          >
            <Link
              to="/signup"
              className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-500/25"
            >
              <Upload className="w-5 h-5 mr-2 group-hover:animate-bounce" />
              Start Your Analysis
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center px-8 py-4 border-2 border-blue-200 text-blue-600 rounded-xl text-lg font-semibold hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <Eye className="w-5 h-5 mr-2" />
              See Demo
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="text-center"
              >
                <div className="text-blue-600 mb-2 flex justify-center">
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-gray-600 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* AI Agent Workflow */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 bg-white rounded-3xl mx-6 shadow-xl border border-blue-100">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Bot className="w-4 h-4 mr-2" />
            Meet Our AI Agents
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            How Our AI Agents Work For You
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Watch our 6 specialized AI agents analyze your profile and find the perfect internship matches
          </p>
        </motion.div>

        {/* Agent Workflow Animation */}
        <div className="relative">
          {/* Connection Lines */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-indigo-200 to-cyan-200 transform -translate-y-1/2 hidden lg:block" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {agentWorkflow.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className={`relative p-6 rounded-2xl border-2 transition-all duration-500 hover:scale-105 ${currentStep === index
                  ? `${agent.bgColor} border-${agent.textColor.replace('text-', '')}/30 shadow-lg`
                  : 'bg-white border-gray-200 hover:border-blue-200'
                  }`}
              >
                {/* Agent Avatar */}
                <div className="relative mb-4">
                  <motion.div
                    animate={currentStep === index ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={`w-16 h-16 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center text-white mx-auto shadow-lg`}
                  >
                    {agent.icon}
                  </motion.div>
                  {currentStep === index && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
                    >
                      <CheckCircle className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                  <div className="absolute -inset-2 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Agent Info */}
                <div className="text-center">
                  <h3 className={`text-lg font-bold mb-2 ${currentStep === index ? agent.textColor : 'text-gray-900'}`}>
                    {agent.name}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {agent.description}
                  </p>
                </div>

                {/* Progress Indicator */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <motion.div
                      className={`h-1 bg-gradient-to-r ${agent.color} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: currentStep >= index ? '100%' : '0%' }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {/* Step Number */}
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-white border-2 border-blue-200 rounded-full flex items-center justify-center text-sm font-bold text-blue-600 shadow-sm">
                  {agent.id}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Real-time Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 text-center"
          >
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full border border-blue-200">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-3"
              />
              <span className="text-blue-700 font-medium">
                Currently analyzing: {agentWorkflow[currentStep]?.name}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-bold text-center mb-16 text-gray-900"
        >
          Why Choose InternAI?
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className={`group p-8 ${feature.bgColor} border border-blue-100 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-2`}
            >
              <div className={`${feature.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-16 text-white relative overflow-hidden"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-20 h-20 border border-white rounded-full" />
            <div className="absolute top-20 right-20 w-32 h-32 border border-white rounded-full" />
            <div className="absolute bottom-10 left-20 w-16 h-16 border border-white rounded-full" />
          </div>

          <div className="relative z-10">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block mb-6"
            >
              <Sparkles className="w-16 h-16 text-blue-200" />
            </motion.div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Launch Your Career?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
              Join thousands of students who have already discovered their perfect internship matches with our AI-powered platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-xl text-lg font-semibold hover:bg-blue-50 transition-all transform hover:scale-105 shadow-lg"
              >
                <Upload className="w-5 h-5 mr-2" />
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center px-8 py-4 border-2 border-white/30 text-white rounded-xl text-lg font-semibold hover:border-white hover:bg-white/10 transition-all"
              >
                <Eye className="w-5 h-5 mr-2" />
                Watch Demo
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 bg-white border-t border-blue-100 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  InternAI
                </span>
              </div>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Empowering students with AI-driven internship matching and career guidance.
              </p>
              <div className="flex space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-200 transition-colors cursor-pointer">
                  <Github className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-200 transition-colors cursor-pointer">
                  <Star className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-600">
                <li><Link to="/features" className="hover:text-blue-600 transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link></li>
                <li><Link to="/security" className="hover:text-blue-600 transition-colors">Security</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Support</h4>
              <ul className="space-y-2 text-gray-600">
                <li><Link to="/help" className="hover:text-blue-600 transition-colors">Help Center</Link></li>
                <li><Link to="/contact" className="hover:text-blue-600 transition-colors">Contact Us</Link></li>
                <li><Link to="/status" className="hover:text-blue-600 transition-colors">Status</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-blue-100 mt-8 pt-8 text-center text-gray-600">
            <p>&copy; 2024 InternAI. All rights reserved. Powered by Advanced AI Technology.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;