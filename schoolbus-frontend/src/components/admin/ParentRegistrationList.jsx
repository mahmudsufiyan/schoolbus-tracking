import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    User, Mail, Phone, Home, Calendar, Users, Briefcase,
    PhoneCall, UserCheck, GraduationCap, School, BookOpen,
    CheckCircle, XCircle, Clock, Eye, Search, Filter
} from 'lucide-react';
import { Card, Button, Spinner, Modal, Input } from '../common';
import apiClient from '../../api/axiosConfig';

const ParentRegistrationList = ({ onAction }) => {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [filter, setFilter] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });

    // Fetch registrations
    const fetchRegistrations = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/admin/parent-registrations/all', {
                params: { status: filter, search: searchTerm }
            });
            setRegistrations(response.data || []);
            updateStats(response.data);
        } catch (error) {
            console.error('Error fetching registrations:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStats = (data) => {
        setStats({
            total: data.length,
            pending: data.filter(r => r.status === 'pending').length,
            approved: data.filter(r => r.status === 'approved').length,
            rejected: data.filter(r => r.status === 'rejected').length,
        });
    };

    useEffect(() => {
        fetchRegistrations();
    }, [filter, searchTerm]);

    // Handle approval
    const handleApprove = async (id) => {
        if (!window.confirm('Approve this parent registration?')) return;

        try {
            await apiClient.put(`/admin/parent-registrations/${id}/approve`);
            await fetchRegistrations();
            if (onAction) onAction('approved');
        } catch (error) {
            console.error('Error approving:', error);
            alert('Failed to approve. Please try again.');
        }
    };

    // Handle rejection
    const handleReject = async (id) => {
        if (!rejectReason.trim()) {
            alert('Please enter a reason for rejection');
            return;
        }

        try {
            await apiClient.put(`/admin/parent-registrations/${id}/reject`, {
                reason: rejectReason
            });
            setShowRejectModal(false);
            setRejectReason('');
            await fetchRegistrations();
            if (onAction) onAction('rejected');
        } catch (error) {
            console.error('Error rejecting:', error);
            alert('Failed to reject. Please try again.');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
        const icons = {
            pending: <Clock size={14} />,
            approved: <CheckCircle size={14} />,
            rejected: <XCircle size={14} />,
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${badges[status]}`}>
                {icons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Spinner size="lg" color="blue" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
                </div>
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.approved}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Approved</p>
                </div>
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Rejected</p>
                </div>
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or student..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white"
                    />
                </div>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white min-w-[130px]"
                >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="all">All</option>
                </select>
            </div>

            {/* Registrations List */}
            <div className="space-y-4 max-h-[600px] overflow-y-auto p-2">
                {registrations.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                        <UserCheck size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p>No registrations found</p>
                    </div>
                ) : (
                    registrations.map((reg, index) => (
                        <motion.div
                            key={reg.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-white/50 dark:border-slate-700/50 hover:shadow-xl transition-all"
                        >
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                {/* Left: User Info */}
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                                        {reg.full_name?.charAt(0) || 'P'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="font-semibold text-gray-800 dark:text-white">{reg.full_name}</h4>
                                            {getStatusBadge(reg.status)}
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                                            <span className="flex items-center gap-1"><Mail size={14} /> {reg.email}</span>
                                            <span className="flex items-center gap-1"><Phone size={14} /> {reg.phone}</span>
                                            <span className="flex items-center gap-1"><UserCheck size={14} /> {reg.relationship_to_student}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            <span className="flex items-center gap-1"><GraduationCap size={14} /> Student: {reg.student_name}</span>
                                            <span className="flex items-center gap-1"><School size={14} /> Grade: {reg.student_grade}</span>
                                            <span className="flex items-center gap-1 text-xs text-gray-400">
                                                <Clock size={12} /> {new Date(reg.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedRegistration(reg);
                                            setShowDetailModal(true);
                                        }}
                                    >
                                        <Eye size={16} className="mr-1" /> View
                                    </Button>
                                    {reg.status === 'pending' && (
                                        <>
                                            <Button
                                                variant="success"
                                                size="sm"
                                                onClick={() => handleApprove(reg.id)}
                                            >
                                                <CheckCircle size={16} className="mr-1" /> Approve
                                            </Button>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedRegistration(reg);
                                                    setShowRejectModal(true);
                                                }}
                                            >
                                                <XCircle size={16} className="mr-1" /> Reject
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Detail Modal */}
            <Modal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                title="Parent Registration Details"
                size="lg"
            >
                {selectedRegistration && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                    <User size={16} /> Personal Information
                                </h4>
                                <div className="space-y-1 text-sm">
                                    <p><span className="text-gray-500">Name:</span> {selectedRegistration.full_name}</p>
                                    <p><span className="text-gray-500">Email:</span> {selectedRegistration.email}</p>
                                    <p><span className="text-gray-500">Phone:</span> {selectedRegistration.phone}</p>
                                    <p><span className="text-gray-500">Address:</span> {selectedRegistration.address || 'N/A'}</p>
                                    <p><span className="text-gray-500">DOB:</span> {selectedRegistration.date_of_birth ? new Date(selectedRegistration.date_of_birth).toLocaleDateString() : 'N/A'}</p>
                                    <p><span className="text-gray-500">Gender:</span> {selectedRegistration.gender || 'N/A'}</p>
                                    <p><span className="text-gray-500">Occupation:</span> {selectedRegistration.occupation || 'N/A'}</p>
                                    <p><span className="text-gray-500">Emergency Contact:</span> {selectedRegistration.emergency_contact || 'N/A'}</p>
                                    <p><span className="text-gray-500">Relationship:</span> {selectedRegistration.relationship_to_student || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                    <GraduationCap size={16} /> Student Information
                                </h4>
                                <div className="space-y-1 text-sm">
                                    <p><span className="text-gray-500">Student Name:</span> {selectedRegistration.student_name}</p>
                                    <p><span className="text-gray-500">Student ID:</span> {selectedRegistration.student_id_number || 'N/A'}</p>
                                    <p><span className="text-gray-500">Grade:</span> {selectedRegistration.student_grade}</p>
                                    <p><span className="text-gray-500">School:</span> {selectedRegistration.student_school}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4">
                            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                <Clock size={16} /> Registration Status
                            </h4>
                            <div className="space-y-1 text-sm">
                                <p><span className="text-gray-500">Status:</span> {getStatusBadge(selectedRegistration.status)}</p>
                                <p><span className="text-gray-500">Submitted:</span> {new Date(selectedRegistration.created_at).toLocaleString()}</p>
                                {selectedRegistration.approved_at && (
                                    <p><span className="text-gray-500">Processed:</span> {new Date(selectedRegistration.approved_at).toLocaleString()}</p>
                                )}
                                {selectedRegistration.rejected_reason && (
                                    <p><span className="text-gray-500">Rejection Reason:</span> <span className="text-red-600">{selectedRegistration.rejected_reason}</span></p>
                                )}
                                {selectedRegistration.admin_notes && (
                                    <p><span className="text-gray-500">Admin Notes:</span> {selectedRegistration.admin_notes}</p>
                                )}
                            </div>
                        </div>

                        {selectedRegistration.status === 'pending' && (
                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="success"
                                    onClick={() => {
                                        handleApprove(selectedRegistration.id);
                                        setShowDetailModal(false);
                                    }}
                                >
                                    <CheckCircle size={16} className="mr-1" /> Approve
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={() => {
                                        setShowDetailModal(false);
                                        setShowRejectModal(true);
                                    }}
                                >
                                    <XCircle size={16} className="mr-1" /> Reject
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Reject Modal */}
            <Modal
                isOpen={showRejectModal}
                onClose={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                }}
                title="Reject Parent Registration"
                size="md"
            >
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">
                        Please provide a reason for rejecting <span className="font-semibold text-gray-800 dark:text-white">{selectedRegistration?.full_name}</span>'s registration:
                    </p>
                    <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Enter rejection reason..."
                        className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white min-h-[100px]"
                    />
                    <div className="flex gap-2 justify-end">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setShowRejectModal(false);
                                setRejectReason('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => handleReject(selectedRegistration?.id)}
                            disabled={!rejectReason.trim()}
                        >
                            <XCircle size={16} className="mr-1" /> Reject
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ParentRegistrationList;