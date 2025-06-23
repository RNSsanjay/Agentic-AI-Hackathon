import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import {
  FileText,
  Users,
  Settings,
  BarChart3,
  Plus,
  Calendar,
  Clock,
  TrendingUp
} from 'lucide-react';

const Home = () => {
  const { user } = useAuth();

  const menuItems = [
    {
      title: 'Document Processor',
      description: 'Upload and process your documents with AI',
      icon: <FileText className="w-8 h-8" />,
      link: '/documents',
      color: 'from-purple-600 to-blue-600'
    },
    {
      title: 'Analytics',
      description: 'View detailed analytics and reports',
      icon: <BarChart3 className="w-8 h-8" />,
      link: '/analytics',
      color: 'from-green-600 to-teal-600'
    },
    {
      title: 'Team Management',
      description: 'Manage your team and collaborations',
      icon: <Users className="w-8 h-8" />,
      link: '/team',
      color: 'from-orange-600 to-red-600'
    },
    {
      title: 'Settings',
      description: 'Customize your preferences',
      icon: <Settings className="w-8 h-8" />,
      link: '/settings',
      color: 'from-gray-600 to-gray-700'
    }
  ];

  const recentActivity = [
    { title: 'Document uploaded', time: '2 hours ago' },
    { title: 'Team member added', time: '5 hours ago' },
    { title: 'Report generated', time: '1 day ago' },
    { title: 'Settings updated', time: '2 days ago' }
  ];

  const stats = [
    { label: 'Documents Processed', value: '124', change: '+12%' },
    { label: 'Team Members', value: '8', change: '+2' },
    { label: 'Storage Used', value: '2.4GB', change: '+0.5GB' },
    { label: 'Active Projects', value: '6', change: '+1' }
  ]; return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >          <h2 className="text-4xl font-bold mb-2">
            Welcome back, {user?.first_name || 'User'}! 👋
          </h2>
          <p className="text-gray-400 text-lg">
            Here's what's happening with your projects today.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-purple-500/50 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">{stat.label}</h3>
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold">{stat.value}</p>
                <span className="text-green-400 text-sm">{stat.change}</span>
              </div>
            </div>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Menu */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Quick Actions</h3>
                <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all">
                  <Plus className="w-4 h-4" />
                  <span>New Project</span>
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {menuItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="group"
                  >
                    <Link
                      to={item.link}
                      className="block p-6 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl hover:border-purple-500/50 transition-all"
                    >
                      <div className={`inline-flex p-3 bg-gradient-to-r ${item.color} rounded-lg mb-4 group-hover:scale-110 transition-transform`}>
                        <div className="text-white">
                          {item.icon}
                        </div>
                      </div>
                      <h4 className="text-xl font-semibold mb-2">{item.title}</h4>
                      <p className="text-gray-400">{item.description}</p>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-purple-400" />
                Recent Activity
              </h3>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg">
                    <div className="w-2 h-2 bg-purple-400 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-gray-400">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Calendar Widget */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-400" />
                Upcoming
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <p className="text-sm font-medium">Team Meeting</p>
                  <p className="text-xs text-gray-400">Tomorrow, 2:00 PM</p>
                </div>
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <p className="text-sm font-medium">Project Deadline</p>
                  <p className="text-xs text-gray-400">Friday, 5:00 PM</p>
                </div>
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <p className="text-sm font-medium">Review Session</p>
                  <p className="text-xs text-gray-400">Next Monday, 10:00 AM</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;