import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
    Bus, User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight,
    Home, Calendar, Users, Briefcase, PhoneCall, UserCheck,
    GraduationCap, School, BookOpen, Upload, Shield, BadgeCheck
} from 'lucide-react';

const Register = () => {
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: 'parent', // parent, police (driver removed)
        address: '',
        date_of_birth: '',
        gender: '',
        occupation: '',
        emergency_contact: '',
        relationship_to_student: '',
        student_name: '',
        student_grade: '',
        student_school: '',
        student_id_number: '',
        badge_number: '',
        station: '',
    });

    const [profileImage, setProfileImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    // ============================================================
    // IMAGE COMPRESSION – resizes to max 800px, JPEG quality 0.7
    // ============================================================
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    const maxSize = 800;
                    if (width > height) {
                        if (width > maxSize) {
                            height = Math.round((height * maxSize) / width);
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width = Math.round((width * maxSize) / height);
                            height = maxSize;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl);
                };
                img.onerror = reject;
                img.src = event.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError('Image is too large (max 5MB). Please choose a smaller image.');
            e.target.value = '';
            return;
        }

        try {
            const compressedBase64 = await compressImage(file);
            setProfileImage(file);
            setImagePreview(compressedBase64);
            setError('');
        } catch (err) {
            console.error('Image compression error:', err);
            setError('Failed to process image. Please try another file.');
        }
    };

    // Step 1 validation
    const validateStep1 = () => {
        if (!formData.full_name) {
            setError('Full name is required');
            return false;
        }
        if (!formData.email || !formData.email.includes('@')) {
            setError('Valid email is required');
            return false;
        }
        if (!formData.phone || formData.phone.length < 10) {
            setError('Valid phone number is required (min 10 digits)');
            return false;
        }
        if (!formData.password || formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return false;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return false;
        }

        // Role-specific validation
        if (formData.role === 'parent' && !formData.relationship_to_student) {
            setError('Relationship to student is required for parents');
            return false;
        }
        if (formData.role === 'police' && !formData.badge_number) {
            setError('Badge number is required for police');
            return false;
        }
        if (formData.role === 'police' && !formData.station) {
            setError('Police station is required');
            return false;
        }

        // Police: image is required (badge/ID)
        if (formData.role === 'police' && !imagePreview) {
            setError('Please upload a badge/ID photo (required for police)');
            return false;
        }

        return true;
    };

    // Step 2 validation – only for parents (student info)
    const validateStep2 = () => {
        if (formData.role === 'parent') {
            if (!formData.student_name) {
                setError('Student name is required');
                return false;
            }
            if (!formData.student_grade) {
                setError('Student grade is required');
                return false;
            }
            if (!formData.student_school) {
                setError('Student school is required');
                return false;
            }
        }
        return true;
    };

    const handleNext = () => {
        if (currentStep === 1 && validateStep1()) {
            setCurrentStep(2);
        }
    };

    const handleBack = () => {
        setCurrentStep(1);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (!validateStep2()) {
            setLoading(false);
            return;
        }

        try {
            let imageBase64 = null;
            if (imagePreview && imagePreview.startsWith('data:image')) {
                imageBase64 = imagePreview;
            } else if (profileImage) {
                imageBase64 = await compressImage(profileImage);
            }

            const payload = {
                ...formData,
                profile_image: imageBase64,
            };

            const result = await register(payload);

            if (result.success) {
                setSuccess('✅ Registration successful! Your account is pending admin approval.');
                // Reset form
                setFormData({
                    full_name: '',
                    email: '',
                    phone: '',
                    password: '',
                    confirmPassword: '',
                    role: 'parent',
                    address: '',
                    date_of_birth: '',
                    gender: '',
                    occupation: '',
                    emergency_contact: '',
                    relationship_to_student: '',
                    student_name: '',
                    student_grade: '',
                    student_school: '',
                    student_id_number: '',
                    badge_number: '',
                    station: '',
                });
                setImagePreview(null);
                setProfileImage(null);
                setCurrentStep(1);
                setTimeout(() => {
                    navigate('/login');
                }, 5000);
            } else {
                setError(result.message || 'Registration failed. Please try again.');
            }
        } catch (err) {
            if (err.response && err.response.status === 413) {
                setError('Image too large even after compression. Please try a smaller image.');
            } else {
                setError('An error occurred. Please try again.');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getStep2Title = () => {
        switch (formData.role) {
            case 'parent': return 'Student Information';
            case 'police': return 'Police Verification';
            default: return 'Additional Information';
        }
    };

    const getStep2Icon = () => {
        switch (formData.role) {
            case 'parent': return <GraduationCap size={18} />;
            case 'police': return <Shield size={18} />;
            default: return <UserCheck size={18} />;
        }
    };

    const getImageLabel = () => {
        switch (formData.role) {
            case 'police': return 'Upload Badge / ID Photo *';
            default: return 'Profile Photo (Optional)';
        }
    };

    const getImageHelper = () => {
        switch (formData.role) {
            case 'police': return 'This photo will be used as your identity verification.';
            default: return 'Upload a profile photo (optional).';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/50 flex items-center justify-center p-4 py-10">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-3xl relative"
            >
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 pt-16">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <Link to="/" className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg shadow-green-500/25 mb-3 hover:scale-105 transition-transform">
                            <Bus size={32} className="text-white" />
                        </Link>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                            Create Account
                        </h1>
                        <p className="text-sm text-gray-500">Join SchoolBus Shield</p>
                    </div>

                    {/* Role Badge */}
                    <div className="flex justify-center mb-4">
                        <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                            formData.role === 'parent' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                            {formData.role === 'parent' && '👨‍👩‍👧 Parent'}
                            {formData.role === 'police' && '👮‍♂️ Police'}
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-8 flex items-center gap-4">
                        <div className={`flex-1 h-2 rounded-full ${currentStep >= 1 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                        <div className={`flex-1 h-2 rounded-full ${currentStep >= 2 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                        <span className="text-xs text-gray-400">Step {currentStep}/2</span>
                    </div>

                    {/* Error / Success Messages */}
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

                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2"
                        >
                            <span className="text-lg">✅</span>
                            {success}
                            <p className="text-sm ml-auto text-green-600">Redirecting to login...</p>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* ========================================== */}
                        {/* STEP 1: Personal Information */}
                        {/* ========================================== */}
                        {currentStep === 1 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-4"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                                        <div className="relative">
                                            <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                name="full_name"
                                                value={formData.full_name}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition outline-none"
                                                placeholder="John Doe"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                                        <div className="relative">
                                            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition outline-none"
                                                placeholder="email@example.com"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone *</label>
                                        <div className="relative">
                                            <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition outline-none"
                                                placeholder="0911-123456"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Role *</label>
                                        <div className="relative">
                                            <Users size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <select
                                                name="role"
                                                value={formData.role}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition outline-none"
                                            >
                                                <option value="parent">👨‍👩‍👧 Parent</option>
                                                <option value="police">👮‍♂️ Police</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                                        <div className="relative">
                                            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-12 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition outline-none"
                                                placeholder="•••••••• (min 6 chars)"
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
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password *</label>
                                        <div className="relative">
                                            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-12 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition outline-none"
                                                placeholder="••••••••"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                                            >
                                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Image Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        {getImageLabel()}
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <label className="flex-1 cursor-pointer">
                                            <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 transition bg-white/50">
                                                <Upload size={20} className="text-gray-400" />
                                                <span className="text-sm text-gray-600">Choose image</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageChange}
                                                    className="hidden"
                                                    required={formData.role === 'police'}
                                                />
                                            </div>
                                        </label>
                                        {imagePreview && (
                                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{getImageHelper()}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Image will be compressed automatically (max 800px).</p>
                                </div>

                                {/* ========== PARENT FIELDS ========== */}
                                {formData.role === 'parent' && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Relationship to Student *</label>
                                                <div className="relative">
                                                    <UserCheck size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <select
                                                        name="relationship_to_student"
                                                        value={formData.relationship_to_student}
                                                        onChange={handleChange}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition outline-none"
                                                        required
                                                    >
                                                        <option value="">Select Relationship</option>
                                                        <option value="Father">Father</option>
                                                        <option value="Mother">Mother</option>
                                                        <option value="Guardian">Guardian</option>
                                                        <option value="Grandparent">Grandparent</option>
                                                        <option value="Aunt">Aunt</option>
                                                        <option value="Uncle">Uncle</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                                                <div className="relative">
                                                    <Home size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        name="address"
                                                        value={formData.address}
                                                        onChange={handleChange}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition outline-none"
                                                        placeholder="Full Address"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                                                <div className="relative">
                                                    <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="date"
                                                        name="date_of_birth"
                                                        value={formData.date_of_birth}
                                                        onChange={handleChange}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
                                                <div className="relative">
                                                    <Users size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <select
                                                        name="gender"
                                                        value={formData.gender}
                                                        onChange={handleChange}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition outline-none"
                                                    >
                                                        <option value="">Select Gender</option>
                                                        <option value="male">Male</option>
                                                        <option value="female">Female</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Occupation</label>
                                                <div className="relative">
                                                    <Briefcase size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        name="occupation"
                                                        value={formData.occupation}
                                                        onChange={handleChange}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition outline-none"
                                                        placeholder="Your Occupation"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Emergency Contact</label>
                                                <div className="relative">
                                                    <PhoneCall size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="tel"
                                                        name="emergency_contact"
                                                        value={formData.emergency_contact}
                                                        onChange={handleChange}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition outline-none"
                                                        placeholder="Emergency Contact Number"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* ========== POLICE FIELDS ========== */}
                                {formData.role === 'police' && (
                                    <div className="border-t border-gray-200 pt-4 mt-2">
                                        <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <Shield size={18} className="text-red-600" />
                                            Police Details
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Badge Number *</label>
                                                <div className="relative">
                                                    <BadgeCheck size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        name="badge_number"
                                                        value={formData.badge_number}
                                                        onChange={handleChange}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition outline-none"
                                                        placeholder="Badge #"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Police Station *</label>
                                                <div className="relative">
                                                    <Home size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        name="station"
                                                        value={formData.station}
                                                        onChange={handleChange}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition outline-none"
                                                        placeholder="Station Name"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">Please upload a clear badge or ID photo above (required).</p>
                                    </div>
                                )}

                                {/* Next Step Button */}
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all hover:scale-105 flex items-center gap-2"
                                    >
                                        Next Step <ArrowRight size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ========================================== */}
                        {/* STEP 2: Additional Information */}
                        {/* ========================================== */}
                        {currentStep === 2 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-4"
                            >
                                <div className={`rounded-xl p-4 mb-4 ${
                                    formData.role === 'parent' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' :
                                    'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                                }`}>
                                    <p className="text-sm flex items-center gap-2">
                                        {getStep2Icon()}
                                        {getStep2Title()} - Please provide additional details
                                    </p>
                                </div>

                                {/* Parent: Student Information */}
                                {formData.role === 'parent' && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Student Name *</label>
                                                <div className="relative">
                                                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        name="student_name"
                                                        value={formData.student_name}
                                                        onChange={handleChange}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition outline-none"
                                                        placeholder="Student Full Name"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Student ID Number</label>
                                                <div className="relative">
                                                    <BookOpen size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        name="student_id_number"
                                                        value={formData.student_id_number}
                                                        onChange={handleChange}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition outline-none"
                                                        placeholder="Student ID (if available)"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Grade *</label>
                                                <div className="relative">
                                                    <GraduationCap size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <select
                                                        name="student_grade"
                                                        value={formData.student_grade}
                                                        onChange={handleChange}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition outline-none"
                                                        required
                                                    >
                                                        <option value="">Select Grade</option>
                                                        <option value="1">Grade 1</option>
                                                        <option value="2">Grade 2</option>
                                                        <option value="3">Grade 3</option>
                                                        <option value="4">Grade 4</option>
                                                        <option value="5">Grade 5</option>
                                                        <option value="6">Grade 6</option>
                                                        <option value="7">Grade 7</option>
                                                        <option value="8">Grade 8</option>
                                                        <option value="9">Grade 9</option>
                                                        <option value="10">Grade 10</option>
                                                        <option value="11">Grade 11</option>
                                                        <option value="12">Grade 12</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">School *</label>
                                                <div className="relative">
                                                    <School size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        name="student_school"
                                                        value={formData.student_school}
                                                        onChange={handleChange}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition outline-none"
                                                        placeholder="School Name"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Police: Verification */}
                                {formData.role === 'police' && (
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <p className="text-sm text-gray-600">
                                            Your police badge photo and details will be verified by the admin.
                                            Please ensure your uploaded photo is clear and readable.
                                        </p>
                                    </div>
                                )}

                                {/* Navigation Buttons */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        className="px-6 py-2.5 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-slate-600 transition hover:scale-105"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/30 transition-all hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Submitting...
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                Submit Registration <ArrowRight size={18} />
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;