import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Bus, Mail, Lock, ArrowRight, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(email, password);
        
        if (result.success) {
            const userRole = result.user?.role || 'parent';
            navigate(`/${userRole}`, { replace: true });
        } else {
            setError(result.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative"
            >

                {/* Brand Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 pt-16">
                    {/* Logo – clickable to home */}
                    <Link to="/" className="block text-center mb-8 group">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25 mb-4 group-hover:scale-105 transition-transform">
                            <Bus size={32} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent group-hover:opacity-80 transition">
                            SchoolBus Shield
                        </h1>
                        <p className="text-sm text-gray-500 mt-1 group-hover:text-gray-600 transition">
                            Sub-City Student Commute Tracker
                        </p>
                    </Link>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2"
                        >
                            <span className="text-lg">❌</span>
                            {error}
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
                                    placeholder="superadmin@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-12 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing In...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Sign In <ArrowRight size={18} />
                                </span>
                            )}
                        </motion.button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-blue-600 font-semibold hover:underline">
                                Register here
                            </Link>
                        </p>
                        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                            <span className="w-20 h-px bg-gray-200"></span>
                            <span>or</span>
                            <span className="w-20 h-px bg-gray-200"></span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            Demo: superadmin@example.com / password123
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;