import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Monitor, Palette, Sparkles, GripVertical, X, Settings } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const DraggableThemeSwitcher = () => {
    const { theme, toggleTheme, setTheme: changeTheme, isDark } = useTheme();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [glowPulse, setGlowPulse] = useState(0.5);
    const [energy, setEnergy] = useState(100);
    const constraintsRef = useRef(null);

    const themes = [
        {
            id: 'light',
            icon: Sun,
            label: 'Light Mode',
            description: 'Clean & bright',
            color: '#fbbf24',
            bgColor: '#fef3c7',
            gradient: 'from-amber-400 via-yellow-400 to-orange-400',
            shadow: 'shadow-amber-500/20',
            energy: 100
        },
        {
            id: 'dark',
            icon: Moon,
            label: 'Dark Mode',
            description: 'Easy on eyes',
            color: '#6366f1',
            bgColor: '#312e81',
            gradient: 'from-indigo-500 via-purple-500 to-blue-600',
            shadow: 'shadow-indigo-500/20',
            energy: 95
        },
        {
            id: 'system',
            icon: Monitor,
            label: 'Auto Mode',
            description: 'Follows system',
            color: '#10b981',
            bgColor: '#064e3b',
            gradient: 'from-emerald-400 via-teal-400 to-cyan-400',
            shadow: 'shadow-emerald-500/20',
            energy: 90
        }
    ];    // Pulsing glow effect
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isDragging) {
                setGlowPulse(prev => 0.3 + Math.sin(Date.now() * 0.002) * 0.2);
            }
        }, 50);
        return () => clearInterval(interval);
    }, [isDragging]);

    // Load saved position from localStorage
    useEffect(() => {
        const savedPosition = localStorage.getItem('theme-switcher-position');
        if (savedPosition) {
            try {
                setPosition(JSON.parse(savedPosition));
            } catch (e) {
                console.warn('Failed to parse saved position');
            }
        }
    }, []);

    // Save position to localStorage
    useEffect(() => {
        localStorage.setItem('theme-switcher-position', JSON.stringify(position));
    }, [position]);

    // Handle theme change with smooth animation
    const handleThemeChange = (newTheme) => {
        if (newTheme !== theme) {
            const selectedTheme = themes.find(t => t.id === newTheme);
            changeTheme(newTheme);
            setEnergy(selectedTheme.energy);

            // Add satisfying feedback
            setGlowPulse(1);
            setTimeout(() => setGlowPulse(0.5), 400);

            // Auto-collapse after selection
            setTimeout(() => setIsExpanded(false), 800);
        }
    };

    const currentTheme = themes.find(t => t.id === theme) || themes[0];

    return (
        <>
            {/* Dragging constraints */}
            <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-40" />

            <motion.div
                className="fixed z-50 select-none"
                style={{
                    right: `calc(2rem + ${position.x}px)`,
                    bottom: `calc(2rem + ${position.y}px)`,
                }}
                drag
                dragConstraints={constraintsRef}
                dragElastic={0.2}
                dragMomentum={false}
                onDragStart={() => {
                    setIsDragging(true);
                    setIsExpanded(false);
                }}
                onDragEnd={(_, info) => {
                    setIsDragging(false);
                    setPosition(prev => ({
                        x: prev.x + info.offset.x,
                        y: prev.y + info.offset.y
                    }));
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                    scale: isDragging ? 1.05 : 1,
                    opacity: 1,
                    rotate: isDragging ? 3 : 0
                }}
                transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                    opacity: { duration: 0.3 }
                }}
            >
                {/* Main Theme Switcher Container */}
                <motion.div
                    className={`
                        relative pointer-events-auto cursor-pointer
                        ${isMinimized ? 'w-12 h-12' : isExpanded ? 'w-80 h-24' : 'w-16 h-16'}
                        rounded-2xl backdrop-blur-xl border-2 overflow-hidden
                        transition-all duration-500 ease-out
                    `}
                    onClick={() => !isExpanded && !isDragging && !isMinimized && setIsExpanded(true)}
                    style={{
                        background: isDark
                            ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))'
                            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9))',
                        borderColor: currentTheme.color,
                        boxShadow: `
                            0 0 ${15 + glowPulse * 25}px ${currentTheme.color}40,
                            0 8px 32px -8px ${isDark ? '#00000060' : '#00000020'},
                            inset 0 1px 0 ${isDark ? '#ffffff20' : '#ffffff60'}
                        `,
                    }}
                    whileHover={{
                        scale: isExpanded ? 1 : 1.05,
                        y: isExpanded ? 0 : -2
                    }}
                    whileTap={{ scale: 0.95 }}
                >
                    {/* Drag Handle */}
                    {(isExpanded || isMinimized) && (
                        <motion.div
                            className="absolute -top-1 left-1/2 transform -translate-x-1/2 
                                     w-8 h-3 rounded-b-lg cursor-grab active:cursor-grabbing
                                     flex items-center justify-center"
                            style={{
                                background: isDark
                                    ? 'linear-gradient(to bottom, #374151, #4b5563)'
                                    : 'linear-gradient(to bottom, #e5e7eb, #d1d5db)',
                            }}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.1 }}
                        >
                            <GripVertical className="w-3 h-3 text-gray-400" />
                        </motion.div>
                    )}

                    {/* Central Theme Icon */}
                    <motion.div
                        className={`
                            absolute top-1/2 transform -translate-y-1/2
                            ${isMinimized ? 'w-8 h-8 left-1/2 -translate-x-1/2' :
                                isExpanded ? 'w-12 h-12 left-6' : 'w-10 h-10 left-1/2 -translate-x-1/2'}
                            rounded-xl flex items-center justify-center
                            transition-all duration-500
                        `}
                        style={{
                            background: `linear-gradient(135deg, ${currentTheme.color}, ${currentTheme.color}dd)`,
                            boxShadow: `0 4px 20px ${currentTheme.color}40`,
                        }}
                        animate={{
                            rotate: isDragging ? 360 : 0,
                            scale: isDragging ? 0.9 : 1
                        }}
                        transition={{
                            rotate: { duration: isDragging ? 2 : 0.3, repeat: isDragging ? Infinity : 0 },
                            scale: { duration: 0.2 }
                        }}
                    >
                        <currentTheme.icon
                            className={`${isMinimized ? 'w-4 h-4' : 'w-6 h-6'} text-white drop-shadow-lg`}
                        />

                        {/* Sparkle effect */}
                        <motion.div
                            className="absolute inset-0 rounded-xl"
                            animate={{
                                opacity: [0, 0.6, 0],
                                scale: [0.8, 1.2, 0.8]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <Sparkles className="w-full h-full text-white opacity-40" />
                        </motion.div>
                    </motion.div>                    {/* Theme Options Panel */}
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9, x: 20 }}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 
                                         flex items-center space-x-3"
                            >
                                {/* Theme Buttons Grid */}
                                <div className="grid grid-cols-3 gap-2">
                                    {themes.map((themeOption, index) => {
                                        const IconComponent = themeOption.icon;
                                        const isSelected = theme === themeOption.id;

                                        return (
                                            <motion.button
                                                key={themeOption.id}
                                                initial={{ opacity: 0, scale: 0.3, y: 20 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.3, y: 20 }}
                                                transition={{
                                                    delay: index * 0.1,
                                                    type: "spring",
                                                    stiffness: 300,
                                                    damping: 20
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleThemeChange(themeOption.id);
                                                }}
                                                className={`
                                                    relative w-16 h-14 rounded-xl transition-all duration-300
                                                    flex flex-col items-center justify-center group
                                                    border-2 overflow-hidden
                                                    ${isSelected ? 'scale-105' : 'hover:scale-110'}
                                                `}
                                                style={{
                                                    background: isSelected
                                                        ? `linear-gradient(135deg, ${themeOption.color}, ${themeOption.color}dd)`
                                                        : isDark
                                                            ? 'linear-gradient(135deg, #1f2937, #374151)'
                                                            : 'linear-gradient(135deg, #f9fafb, #f3f4f6)',
                                                    borderColor: isSelected ? themeOption.color : (isDark ? '#4b5563' : '#d1d5db'),
                                                    color: isSelected ? 'white' : (isDark ? '#9ca3af' : '#6b7280'),
                                                    boxShadow: isSelected
                                                        ? `0 8px 25px ${themeOption.color}40, 0 0 0 1px ${themeOption.color}60`
                                                        : isDark
                                                            ? '0 4px 6px -1px rgba(0, 0, 0, 0.4)'
                                                            : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                }}
                                                whileHover={{
                                                    y: -2,
                                                    boxShadow: isSelected
                                                        ? `0 12px 35px ${themeOption.color}50, 0 0 0 1px ${themeOption.color}80`
                                                        : isDark
                                                            ? '0 8px 25px rgba(0, 0, 0, 0.5)'
                                                            : '0 8px 25px rgba(0, 0, 0, 0.15)'
                                                }}
                                                whileTap={{ scale: 0.95, y: 0 }}
                                                title={`${themeOption.label} - ${themeOption.description}`}
                                            >
                                                {/* Background Pattern */}
                                                <div className="absolute inset-0 opacity-10">
                                                    <div
                                                        className={`w-full h-full bg-gradient-to-br ${themeOption.gradient}`}
                                                    />
                                                </div>

                                                {/* Icon */}
                                                <IconComponent className="w-5 h-5 mb-1 relative z-10" />

                                                {/* Label */}
                                                <span className="text-xs font-medium relative z-10 leading-none">
                                                    {themeOption.label.split(' ')[0]}
                                                </span>

                                                {/* Selection Ring */}
                                                {isSelected && (
                                                    <motion.div
                                                        className="absolute inset-0 rounded-xl border-2 border-white/50"
                                                        animate={{
                                                            scale: [1, 1.05, 1],
                                                            opacity: [0.5, 1, 0.5]
                                                        }}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                    />
                                                )}

                                                {/* Hover Glow */}
                                                <motion.div
                                                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20"
                                                    style={{
                                                        background: `radial-gradient(circle at center, ${themeOption.color}, transparent 70%)`
                                                    }}
                                                    transition={{ duration: 0.2 }}
                                                />
                                            </motion.button>
                                        );
                                    })}
                                </div>

                                {/* Control Buttons */}
                                <div className="flex flex-col space-y-2 ml-2 pl-2 border-l"
                                    style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>

                                    {/* Minimize Button */}
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.3 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsExpanded(false);
                                            setIsMinimized(true);
                                        }}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center
                                                 transition-all duration-200 group"
                                        style={{
                                            background: isDark
                                                ? 'linear-gradient(135deg, #374151, #4b5563)'
                                                : 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                                            color: isDark ? '#9ca3af' : '#6b7280'
                                        }}
                                        whileHover={{
                                            scale: 1.1,
                                            background: isDark
                                                ? 'linear-gradient(135deg, #4b5563, #6b7280)'
                                                : 'linear-gradient(135deg, #e5e7eb, #d1d5db)'
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        title="Minimize"
                                    >
                                        <motion.div
                                            className="w-3 h-0.5 rounded-full bg-current"
                                            whileHover={{ scaleX: 1.2 }}
                                        />
                                    </motion.button>

                                    {/* Close Button */}
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.4 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsExpanded(false);
                                        }}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center
                                                 transition-all duration-200"
                                        style={{
                                            background: isDark
                                                ? 'linear-gradient(135deg, #374151, #4b5563)'
                                                : 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                                            color: isDark ? '#9ca3af' : '#6b7280'
                                        }}
                                        whileHover={{
                                            scale: 1.1,
                                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                            color: 'white'
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        title="Close"
                                    >
                                        <X className="w-4 h-4" />
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>                    {/* Energy/Progress Bar */}
                    <motion.div
                        className="absolute bottom-1 left-2 right-2 h-1 rounded-full overflow-hidden"
                        style={{
                            backgroundColor: isDark ? '#374151' : '#e5e7eb',
                            opacity: isMinimized ? 0 : 1
                        }}
                        animate={{ opacity: isMinimized ? 0 : 1 }}
                    >
                        <motion.div
                            className="h-full rounded-full"
                            style={{
                                background: `linear-gradient(90deg, ${currentTheme.color}, ${currentTheme.color}dd)`,
                            }}
                            initial={{ width: 0 }}
                            animate={{
                                width: `${energy}%`,
                                opacity: [0.7, 1, 0.7]
                            }}
                            transition={{
                                width: { duration: 1, ease: "easeOut" },
                                opacity: { duration: 2, repeat: Infinity }
                            }}
                        />
                    </motion.div>

                    {/* Floating Particles Effect */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-1 h-1 rounded-full"
                                style={{
                                    backgroundColor: currentTheme.color,
                                    left: `${20 + i * 12}%`,
                                    top: `${20 + (i % 3) * 25}%`,
                                }}
                                animate={{
                                    y: [0, -10, 0],
                                    x: [0, 5, 0],
                                    opacity: [0.2, 0.8, 0.2],
                                    scale: [0.5, 1, 0.5]
                                }}
                                transition={{
                                    duration: 3 + i * 0.5,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: i * 0.3
                                }}
                            />
                        ))}
                    </div>
                </motion.div>

                {/* Minimized State - Quick Actions */}
                <AnimatePresence>
                    {isMinimized && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute -top-2 -left-2 flex space-x-1"
                        >
                            <motion.button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTheme();
                                }}
                                className="w-6 h-6 rounded-full flex items-center justify-center 
                                         backdrop-blur-lg border shadow-lg"
                                style={{
                                    background: isDark
                                        ? 'rgba(17, 23, 42, 0.9)'
                                        : 'rgba(255, 255, 255, 0.9)',
                                    borderColor: currentTheme.color,
                                    color: currentTheme.color
                                }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Toggle theme"
                            >
                                <Palette className="w-3 h-3" />
                            </motion.button>

                            <motion.button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMinimized(false);
                                    setIsExpanded(true);
                                }}
                                className="w-6 h-6 rounded-full flex items-center justify-center 
                                         backdrop-blur-lg border shadow-lg"
                                style={{
                                    background: isDark
                                        ? 'rgba(17, 23, 42, 0.9)'
                                        : 'rgba(255, 255, 255, 0.9)',
                                    borderColor: currentTheme.color,
                                    color: currentTheme.color
                                }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Expand"
                            >
                                <Settings className="w-3 h-3" />
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Status Display */}
                <AnimatePresence>
                    {!isDragging && !isMinimized && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: isExpanded ? 0.9 : 0.7, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="mt-4 text-center space-y-1 pointer-events-none"
                        >
                            {/* Theme Label */}
                            <motion.div
                                className="text-xs font-semibold tracking-wider"
                                style={{ color: currentTheme.color }}
                                animate={{
                                    opacity: [0.7, 1, 0.7]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity
                                }}
                            >
                                {currentTheme.label.toUpperCase()}
                            </motion.div>

                            {/* Status Indicator */}
                            <div className="flex items-center justify-center space-x-2 text-xs"
                                style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                                <motion.div
                                    className="w-2 h-2 rounded-full bg-green-400"
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        opacity: [0.5, 1, 0.5]
                                    }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                                <span className="font-mono">
                                    {energy}% | {isDragging ? 'MOVING' : 'ACTIVE'}
                                </span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>                {/* Background Gradient Effect */}
                <motion.div
                    className="fixed inset-0 pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at ${50 + position.x / 10}% ${50 + position.y / 10}%, ${currentTheme.color}08, transparent 50%)`,
                        zIndex: -1
                    }}
                    animate={{
                        opacity: isDragging ? 0.3 : 0
                    }} />
            </motion.div>
        </>
    );
};

export default DraggableThemeSwitcher;
