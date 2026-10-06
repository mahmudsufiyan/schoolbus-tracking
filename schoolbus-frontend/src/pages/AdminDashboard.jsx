import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
    LayoutDashboard, Bus, MapPin, Users, AlertTriangle, Settings, LogOut, Bell, Search,
    Menu, X, ChevronRight, Clock, UserCheck, Activity, Edit, Trash2, Eye, Moon, Sun,
    Plus, FileText, Shield, GraduationCap, Mail, Phone, User, CheckCircle, XCircle,
    RefreshCw, Upload, FileSpreadsheet, Download, PieChart, BarChart3, Car, QrCode,
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend,
    RadialBarChart, RadialBar, ComposedChart,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../api/axiosConfig';
import { QRCodeCanvas } from 'qrcode.react';
import AIAnalysisCard from '../components/AIAnalysisPanel';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

import { createBus, updateBus } from '../api/busApi';
import { createStop, updateStop } from '../api/stopApi';
import { createStudent, updateStudent } from '../api/studentApi';
import { resolveAlert } from '../api/alertApi';

const STAT_COLORS = {
    blue:   'bg-blue-50 dark:bg-blue-900/20',
    green:  'bg-green-50 dark:bg-green-900/20',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20',
    red:    'bg-red-50 dark:bg-red-900/20',
    purple: 'bg-purple-50 dark:bg-purple-900/20',
};

const ROLE_COLORS = {
    admin:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    parent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    driver: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    police: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const getRoleColor = (role) =>
    ROLE_COLORS[role] || 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-400';

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const { socket, on, isConnected } = useSocket();

    const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
        return window.innerWidth >= 1024; // open on desktop, closed on mobile
    }
    return true;
});
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showNotification, setShowNotification] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('adminDarkMode') === 'true';
        }
        return false;
    });
    const [currentTime, setCurrentTime] = useState('');
    const [greeting, setGreeting] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showInactiveUsers, setShowInactiveUsers] = useState(false);   // 👈 ADD THIS

    const [buses, setBuses] = useState([]);
    const [stops, setStops] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [students, setStudents] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [grades, setGrades] = useState([]);
    const [users, setUsers] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectUserModal, setShowRejectUserModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [rejectUserReason, setRejectUserReason] = useState('');

    const [showUserDetailModal, setShowUserDetailModal] = useState(false);
    const [selectedUserForDetail, setSelectedUserForDetail] = useState(null);

    const [showQRModal, setShowQRModal] = useState(false);
    const [qrStudent, setQrStudent] = useState(null);
    const [qrLoading, setQrLoading] = useState(false);

    const [showBusModal, setShowBusModal] = useState(false);
    const [showStopModal, setShowStopModal] = useState(false);
    const [showDriverModal, setShowDriverModal] = useState(false);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const [showImportDriverModal, setShowImportDriverModal] = useState(false);
    const [showImportStudentModal, setShowImportStudentModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importPreview, setImportPreview] = useState([]);
    const [importHeaders, setImportHeaders] = useState([]);
    const [importLoading, setImportLoading] = useState(false);
    const [importError, setImportError] = useState('');
    const [importSuccess, setImportSuccess] = useState('');

    const [reportType, setReportType] = useState('overview');
    const [dateRange, setDateRange] = useState('week');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [unconfirmedDropoffs, setUnconfirmedDropoffs] = useState([]);

    const [stats, setStats] = useState({
        totalBuses: 0, totalDrivers: 0, activeTrips: 0, emergencies: 0,
        pendingApprovals: 0, totalStudents: 0, totalSchools: 0,
    });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    };

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            const hour = now.getHours();
            if (hour < 12) setGreeting('Good Morning 🌅');
            else if (hour < 17) setGreeting('Good Afternoon ☀️');
            else setGreeting('Good Evening 🌙');
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        localStorage.setItem('adminDarkMode', String(darkMode));
        if (darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [darkMode]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [busesRes, stopsRes, driversRes, studentsRes, alertsRes, usersRes, pendingUsersRes, regRes] =
                await Promise.all([
                    apiClient.get('/buses').catch(() => ({ data: [] })),
                    apiClient.get('/stops').catch(() => ({ data: [] })),
                    apiClient.get('/drivers').catch(() => ({ data: [] })),
                    apiClient.get('/students').catch(() => ({ data: [] })),
                    apiClient.get('/alerts').catch(() => ({ data: [] })),
                    apiClient.get('/admin/users/all').catch(() => ({ data: [] })),
                    apiClient.get('/admin/users/pending').catch(() => ({ data: [] })),
                    apiClient.get('/admin/parent-registrations/all').catch(() => ({ data: [] })),
                ]);

            setBuses(busesRes.data || []);
            setStops(stopsRes.data || []);
            setDrivers(driversRes.data || []);
            setStudents(studentsRes.data || []);
            setAlerts(alertsRes.data || []);
            setUsers(usersRes.data || []);
            setPendingUsers(pendingUsersRes.data || []);
            setRegistrations(regRes.data || []);

            const gradeMap = {};
            (studentsRes.data || []).forEach(s => {
                if (s.grade) gradeMap[s.grade] = (gradeMap[s.grade] || 0) + 1;
            });
            setGrades(Object.entries(gradeMap).map(([grade, count]) => ({ grade, student_count: count })));

            const pendingCount = pendingUsersRes.data?.length || 0;
            const activeAlerts = alertsRes.data?.filter(a => a.status === 'active').length || 0;
            const activeBuses = busesRes.data?.filter(b => b.status === 'active').length || 0;
            const uniqueSchools = new Set((studentsRes.data || []).map(s => s.school_name).filter(Boolean)).size;

            setStats({
                totalBuses: busesRes.data?.length || 0,
                // ✅ Only count ACTIVE drivers (excludes deactivated ones)
                totalDrivers: (driversRes.data || []).filter(d => d.is_active !== false).length,
                activeTrips: activeBuses,
                emergencies: activeAlerts,
                pendingApprovals: pendingCount,
                totalStudents: studentsRes.data?.length || 0,
                totalSchools: uniqueSchools,
            });

            showToast('Data refreshed successfully', 'success');
        } catch (error) {
            console.error('❌ Error fetching data:', error);
            showToast('Failed to load data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchUnconfirmedDropoffs = async () => {
        try {
            const res = await apiClient.get('/students/admin/unconfirmed-dropoffs');
            setUnconfirmedDropoffs(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to fetch unconfirmed dropoffs:', err);
        }
    };

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        if (!socket || !isConnected) return;
        const unsubNew = on('emergency-alert', (data) => {
            showToast(`🚨 Emergency on bus ${data.bus_id}!`, 'error');
            fetchData();
        });
        const unsubResolved = on('alert-resolved', () => fetchData());
        const unsubDropped = on('student-dropped-off', () => setTimeout(fetchUnconfirmedDropoffs, 1000));
        const unsubConfirmed = on('dropoff-confirmed', () => fetchUnconfirmedDropoffs());
        const unsubAI = on('ai-analysis-ready', (data) => {
            setAlerts(prev => prev.map(a =>
                a.id === data.alert_id ? { ...a, ai_analysis: data.analysis, ai_status: 'ready' } : a
            ));
            showToast('🤖 AI analysis ready', 'success');
        });
        return () => {
            unsubNew?.(); unsubResolved?.(); unsubDropped?.();
            unsubConfirmed?.(); unsubAI?.();
        };
    }, [socket, isConnected, on]);

    useEffect(() => {
        fetchUnconfirmedDropoffs();
        const interval = setInterval(fetchUnconfirmedDropoffs, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleApproveUser = async (userItem) => {
        const userId = typeof userItem === 'object' ? userItem.id : userItem;
        const registrationId = typeof userItem === 'object' ? userItem.registration_id : null;
        const isParent = typeof userItem === 'object' && userItem.role === 'parent';
        try {
            if (isParent && registrationId) {
                await apiClient.put(`/admin/parent-registrations/${registrationId}/approve`);
                showToast('Parent approved and student created', 'success');
            } else {
                await apiClient.put(`/admin/users/${userId}/approve`);
                showToast('User approved successfully', 'success');
            }
            await fetchData();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to approve user', 'error');
        }
    };

    const handleRejectUser = async (userItem) => {
        const userId = typeof userItem === 'object' ? userItem.id : userItem;
        const registrationId = typeof userItem === 'object' ? userItem.registration_id : null;
        const isParent = typeof userItem === 'object' && userItem.role === 'parent';
        if (!rejectUserReason.trim()) {
            showToast('Please enter a reason for rejection', 'error');
            return;
        }
        try {
            if (isParent && registrationId) {
                await apiClient.put(`/admin/parent-registrations/${registrationId}/reject`, { reason: rejectUserReason });
            } else {
                await apiClient.put(`/admin/users/${userId}/reject`, { reason: rejectUserReason });
            }
            setShowRejectUserModal(false);
            setRejectUserReason('');
            showToast('User rejected successfully', 'success');
            await fetchData();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to reject user', 'error');
        }
    };

    const handleApproveRegistration = async (id) => {
        try {
            await apiClient.put(`/admin/parent-registrations/${id}/approve`);
            showToast('Registration approved successfully', 'success');
            await fetchData();
        } catch (error) {
            showToast('Failed to approve registration', 'error');
        }
    };

    const handleRejectRegistration = async (id) => {
        if (!rejectReason.trim()) {
            showToast('Please enter a reason for rejection', 'error');
            return;
        }
        try {
            await apiClient.put(`/admin/parent-registrations/${id}/reject`, { reason: rejectReason });
            setShowRejectModal(false);
            setRejectReason('');
            showToast('Registration rejected', 'success');
            await fetchData();
        } catch (error) {
            showToast('Failed to reject registration', 'error');
        }
    };

    const openQRModal = async (student) => {
        setQrLoading(true);
        try {
            const res = await apiClient.get(`/students/${student.id}/qr`);
            setQrStudent(res.data);
            setShowQRModal(true);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to load QR', 'error');
        } finally {
            setQrLoading(false);
        }
    };

    const regenerateQR = async () => {
        if (!qrStudent) return;
        if (!window.confirm('Generate a new QR? The old one will stop working.')) return;
        setQrLoading(true);
        try {
            const res = await apiClient.post(`/students/${qrStudent.id}/regenerate-qr`);
            setQrStudent(res.data.student);
            showToast('New QR generated', 'success');
            await fetchData();
        } catch (err) {
            showToast('Failed to regenerate', 'error');
        } finally {
            setQrLoading(false);
        }
    };

    const downloadQR = () => {
        const canvas = document.querySelector('#qr-canvas-container canvas');
        if (!canvas) return;
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = `qr-student-${qrStudent.id}-${qrStudent.full_name.replace(/\s+/g, '_')}.png`;
        link.click();
    };

    const printQR = () => {
        const canvas = document.querySelector('#qr-canvas-container canvas');
        if (!canvas) return;
        const url = canvas.toDataURL('image/png');
        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>QR - ${qrStudent.full_name}</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
                h2 { margin-bottom: 10px; }
                p { color: #666; margin: 5px 0; }
                img { margin: 20px 0; border: 2px solid #eee; padding: 10px; }
            </style></head>
            <body>
                <h2>${qrStudent.full_name}</h2>
                <p>Grade: ${qrStudent.grade || 'N/A'}</p>
                <p>School: ${qrStudent.school_name || 'N/A'}</p>
                <img src="${url}" width="400" height="400" />
                <p style="font-size:12px;color:#999">SchoolBus ID Card</p>
            </body></html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 300);
    };

    const handleAddBus = () => {
        setEditingItem(null);
        setFormData({ bus_number: '', plate_number: '', capacity: 40, driver_id: '' });
        setFormError('');
        setShowBusModal(true);
    };

    const handleEditBus = (bus) => {
        setEditingItem(bus);
        setFormData({
            bus_number: bus.bus_number || '',
            plate_number: bus.plate_number || '',
            capacity: bus.capacity || 40,
            driver_id: bus.driver_id || '',
        });
        setFormError('');
        setShowBusModal(true);
    };

    const handleDeleteBus = async (id) => {
        if (!window.confirm('Delete this bus?')) return;
        try {
            await apiClient.delete(`/buses/${id}`);
            showToast('Bus deleted successfully', 'success');
            await fetchData();
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Failed to delete bus';
            showToast(msg, 'error');
        }
    };

    const handleAssignDriver = async (busId, driverId) => {
        try {
            await apiClient.put(`/buses/${busId}/assign-driver`, { driver_id: driverId || null });
            showToast(driverId ? 'Driver assigned' : 'Driver unassigned', 'success');
            await fetchData();
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to assign driver';
            showToast(msg, 'error');
        }
    };

    const handleSubmitBus = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');
        try {
            const payload = {
                bus_number: formData.bus_number,
                plate_number: formData.plate_number,
                capacity: formData.capacity ? parseInt(formData.capacity) : 40,
                driver_id: formData.driver_id ? parseInt(formData.driver_id) : null,
            };
            if (editingItem) {
                await apiClient.put(`/buses/${editingItem.id}`, payload);
                showToast('Bus updated successfully', 'success');
            } else {
                await createBus(payload);
                showToast('Bus created successfully', 'success');
            }
            setShowBusModal(false);
            await fetchData();
        } catch (error) {
            setFormError(error.response?.data?.message || 'Failed to save bus');
        } finally {
            setFormLoading(false);
        }
    };

    const handleAddStop = () => {
        setEditingItem(null);
        setFormData({ stop_name: '', stop_order: 1, latitude: '', longitude: '', bus_id: '' });
        setFormError('');
        setShowStopModal(true);
    };

    const handleEditStop = (stop) => {
        setEditingItem(stop);
        setFormData({
            stop_name: stop.stop_name || '',
            stop_order: stop.stop_order || 1,
            latitude: stop.latitude || '',
            longitude: stop.longitude || '',
            bus_id: stop.bus_id || '',
        });
        setFormError('');
        setShowStopModal(true);
    };

    const handleDeleteStop = async (id) => {
        if (!window.confirm('Delete this stop?')) return;
        try {
            await apiClient.delete(`/stops/${id}`);
            showToast('Stop deleted successfully', 'success');
            await fetchData();
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Failed to delete stop';
            showToast(msg, 'error');
        }
    };

    const handleSubmitStop = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');
        try {
            const payload = {
                ...formData,
                latitude: parseFloat(formData.latitude),
                longitude: parseFloat(formData.longitude),
                stop_order: parseInt(formData.stop_order),
            };
            if (editingItem) {
                await updateStop(editingItem.id, payload);
                showToast('Stop updated successfully', 'success');
            } else {
                await createStop(payload);
                showToast('Stop created successfully', 'success');
            }
            setShowStopModal(false);
            await fetchData();
        } catch (error) {
            setFormError(error.response?.data?.message || 'Failed to save stop');
        } finally {
            setFormLoading(false);
        }
    };

    const handleAddDriver = () => {
        setEditingItem(null);
        setFormData({ full_name: '', email: '', password: '123456', phone: '', role: 'driver' });
        setFormError('');
        setShowDriverModal(true);
    };

    const handleEditDriver = (driver) => {
        setEditingItem(driver);
        setFormData({
            full_name: driver.full_name || '',
            email: driver.email || '',
            phone: driver.phone || '',
            role: 'driver',
        });
        setFormError('');
        setShowDriverModal(true);
    };

    // ✅ Backend soft-deletes (deactivates) the driver — see driverRoutes.js
    const handleDeleteDriver = async (id) => {
        if (!window.confirm('Deactivate this driver? They will be unassigned from any bus.')) return;
        try {
            await apiClient.delete(`/drivers/${id}`);
            showToast('Driver deactivated successfully', 'success');
            await fetchData();
        } catch (error) {
            console.error('Deactivate driver error:', error);
            const msg = error.response?.data?.message || error.message || 'Failed to deactivate driver';
            showToast(msg, 'error');
        }
    };

    const handleSubmitDriver = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');
        try {
            if (editingItem) {
                await apiClient.put(`/drivers/${editingItem.id}`, {
                    full_name: formData.full_name,
                    email: formData.email,
                    phone: formData.phone,
                });
                showToast('Driver updated successfully', 'success');
            } else {
                await apiClient.post('/auth/register', {
                    full_name: formData.full_name,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    role: 'driver'
                });
                showToast('Driver created successfully', 'success');
            }
            setShowDriverModal(false);
            await fetchData();
        } catch (error) {
            setFormError(error.response?.data?.message || 'Failed to save driver');
        } finally {
            setFormLoading(false);
        }
    };

    const handleAddStudent = () => {
        setEditingItem(null);
        setFormData({
            full_name: '', grade: '', school_name: '', bus_id: '',
            stop_id: '', parent_id: '', student_id_number: '',
        });
        setFormError('');
        setShowStudentModal(true);
    };

    const handleEditStudent = (student) => {
        setEditingItem(student);
        setFormData({
            full_name: student.full_name || '',
            grade: student.grade || '',
            school_name: student.school_name || '',
            bus_id: student.bus_id || '',
            stop_id: student.stop_id || '',
            parent_id: student.parent_id || '',
            student_id_number: student.student_id_number || '',
        });
        setFormError('');
        setShowStudentModal(true);
    };

    const handleDeleteStudent = async (id) => {
        if (!window.confirm('Delete this student?')) return;
        try {
            await apiClient.delete(`/students/${id}`);
            showToast('Student deleted successfully', 'success');
            await fetchData();
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Failed to delete student';
            showToast(msg, 'error');
        }
    };

    const handleSubmitStudent = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');
        try {
            const payload = {
                ...formData,
                grade: formData.grade || null,
                school_name: formData.school_name || null,
                bus_id: formData.bus_id || null,
                stop_id: formData.stop_id || null,
                parent_id: formData.parent_id || null,
                student_id_number: formData.student_id_number || null,
            };
            if (editingItem) {
                await updateStudent(editingItem.id, payload);
                showToast('Student updated successfully', 'success');
            } else {
                await createStudent(payload);
                showToast('Student created successfully', 'success');
            }
            setShowStudentModal(false);
            await fetchData();
        } catch (error) {
            setFormError(error.response?.data?.message || 'Failed to save student');
        } finally {
            setFormLoading(false);
        }
    };

    const handleResolveAlert = async (id) => {
        if (!window.confirm('Resolve this alert?')) return;
        try {
            await apiClient.put(`/alerts/${id}/resolve`);
            showToast('Alert resolved successfully', 'success');
            await fetchData();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to resolve alert', 'error');
        }
    };

    // ============================================================
    // IMPORT FUNCTIONS
    // ============================================================
    const parseCSV = (text) => {
        const lines = text.split(/\r\n|\n/);
        const result = [];
        const headers = [];

        const headerLine = lines[0];
        const headerValues = [];
        let currentHeader = '';
        let inQuotes = false;
        for (let i = 0; i < headerLine.length; i++) {
            const char = headerLine[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                headerValues.push(currentHeader.trim());
                currentHeader = '';
            } else currentHeader += char;
        }
        headerValues.push(currentHeader.trim());
        headers.push(...headerValues);

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const values = [];
            let current = '';
            let inQuotesRow = false;
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') inQuotesRow = !inQuotesRow;
                else if (char === ',' && !inQuotesRow) {
                    values.push(current.trim());
                    current = '';
                } else current += char;
            }
            values.push(current.trim());
            const row = {};
            headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
            result.push(row);
        }
        return { headers, data: result };
    };

    const handleImportFileChange = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            setImportError('Please upload a CSV or Excel file.');
            return;
        }

        setImportFile(file);
        setImportError('');
        setImportSuccess('');

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target.result;
                const { headers, data } = parseCSV(text);
                setImportHeaders(headers);
                setImportPreview(data.slice(0, 5));
                if (data.length === 0) setImportError('File appears to be empty.');
                else if (type === 'driver' && !(headers.some(h => h.toLowerCase() === 'full_name') && headers.some(h => h.toLowerCase() === 'email'))) {
                    setImportError('CSV must contain "full_name" and "email" columns for drivers.');
                } else if (type === 'student' && !headers.some(h => h.toLowerCase() === 'full_name')) {
                    setImportError('CSV must contain "full_name" column for students.');
                } else {
                    showToast(`Preview loaded: ${data.length} rows`, 'success');
                }
            } catch (err) {
                setImportError('Failed to parse file. Please ensure it\'s a valid CSV.');
            }
        };
        reader.readAsText(file);
    };

    const handleImportDrivers = async () => {
        if (!importFile) { setImportError('Please select a file first.'); return; }

        setImportLoading(true);
        setImportError('');
        setImportSuccess('');

        try {
            const text = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsText(importFile);
            });

            const { headers, data } = parseCSV(text);
            const required = ['full_name', 'email'];
            const missing = required.filter(col => !headers.some(h => h.toLowerCase() === col));
            if (missing.length > 0) {
                setImportError(`Missing required columns: ${missing.join(', ')}`);
                setImportLoading(false);
                return;
            }

            const nameCol = headers.find(h => h.toLowerCase() === 'full_name');
            const emailCol = headers.find(h => h.toLowerCase() === 'email');
            const phoneCol = headers.find(h => h.toLowerCase() === 'phone');
            const licenseCol = headers.find(h => h.toLowerCase() === 'license_number' || h.toLowerCase() === 'license');
            const expCol = headers.find(h => h.toLowerCase() === 'experience' || h.toLowerCase() === 'years_experience');

            const drivers = data.map(row => ({
                full_name: row[nameCol] || '',
                email: row[emailCol] || '',
                phone: row[phoneCol] || '',
                license_number: row[licenseCol] || '',
                experience: row[expCol] || '',
                password: '123456',
                role: 'driver',
            })).filter(d => d.full_name && d.email);

            if (drivers.length === 0) {
                setImportError('No valid driver records found. Ensure "full_name" and "email" are populated.');
                setImportLoading(false);
                return;
            }

            const response = await apiClient.post('/admin/import/drivers', { drivers });
            setImportSuccess(`✅ ${response.data?.count || drivers.length} drivers imported successfully!`);
            setImportFile(null);
            setImportPreview([]);
            setImportHeaders([]);
            document.getElementById('driverImportInput').value = '';
            await fetchData();
            showToast(`${response.data?.count || drivers.length} drivers imported`, 'success');
        } catch (error) {
            console.error('Import error:', error);
            setImportError(error.response?.data?.message || 'Failed to import drivers. Please try again.');
        } finally {
            setImportLoading(false);
        }
    };

    const handleImportStudents = async () => {
        if (!importFile) { setImportError('Please select a file first.'); return; }

        setImportLoading(true);
        setImportError('');
        setImportSuccess('');

        try {
            const text = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsText(importFile);
            });

            const { headers, data } = parseCSV(text);
            const required = ['full_name'];
            const missing = required.filter(col => !headers.some(h => h.toLowerCase() === col));
            if (missing.length > 0) {
                setImportError(`Missing required columns: ${missing.join(', ')}`);
                setImportLoading(false);
                return;
            }

            const nameCol = headers.find(h => h.toLowerCase() === 'full_name');
            const gradeCol = headers.find(h => h.toLowerCase() === 'grade');
            const schoolCol = headers.find(h => h.toLowerCase() === 'school_name' || h.toLowerCase() === 'school');
            const idCol = headers.find(h => h.toLowerCase() === 'student_id_number' || h.toLowerCase() === 'student_id');
            const parentEmailCol = headers.find(h =>
                h.toLowerCase() === 'parent_email' || h.toLowerCase() === 'parent email'
            );
            const busCol = headers.find(h => h.toLowerCase() === 'bus_number' || h.toLowerCase() === 'bus');

            const students = data.map(row => ({
                full_name: row[nameCol] || '',
                grade: row[gradeCol] || '',
                school_name: row[schoolCol] || '',
                student_id_number: row[idCol] || '',
                parent_email: parentEmailCol ? (row[parentEmailCol] || '') : '',
                bus_number: row[busCol] || '',
            })).filter(s => s.full_name);

            if (students.length === 0) {
                setImportError('No valid student records found. Ensure "full_name" is populated.');
                setImportLoading(false);
                return;
            }

            const response = await apiClient.post('/admin/import/students', { students });
            const result = response.data || {};
            const count = result.count || 0;
            const errCount = result.errors?.length || 0;
            const warnCount = result.warnings?.length || 0;

            let msg = `✅ ${count} students imported successfully!`;
            if (errCount > 0) msg += ` (${errCount} failed)`;
            if (warnCount > 0) msg += ` (${warnCount} imported without parent link)`;

            setImportSuccess(msg);

            if (errCount > 0 && result.errors?.[0]?.error) {
                setImportError(`First error: ${result.errors[0].error}`);
            } else if (warnCount > 0 && result.warnings?.[0]?.warning) {
                setImportError(`Note: ${result.warnings[0].warning} (${result.warnings[0].parent_email})`);
            }

            setImportFile(null);
            setImportPreview([]);
            setImportHeaders([]);
            document.getElementById('studentImportInput').value = '';
            await fetchData();
            showToast(`${count} students imported`, 'success');
        } catch (error) {
            console.error('Import error:', error);
            setImportError(error.response?.data?.message || 'Failed to import students. Please try again.');
        } finally {
            setImportLoading(false);
        }
    };

    // ============================================================
    // EXPORT HELPERS
    // ============================================================
    const exportToCSV = (data, filename, headers) => {
        if (!data || data.length === 0) {
            showToast('No data to export', 'error');
            return;
        }
        const headerKeys = headers || Object.keys(data[0]);
        const headerRow = headerKeys.join(',');
        const rows = data.map(item => {
            return headerKeys.map(key => {
                let value = item[key] ?? '';
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',');
        });
        const csv = [headerRow, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        showToast('Export successful', 'success');
    };

    const exportToPDF = async (data, headers, title, filename) => {
        if (!data || data.length === 0) {
            showToast('No data to export', 'error');
            return;
        }
        try {
            const [{ jsPDF }, autoTableModule] = await Promise.all([
                import('jspdf'),
                import('jspdf-autotable'),
            ]);
            const autoTable = autoTableModule.default || autoTableModule.autoTable || autoTableModule;

            const doc = new jsPDF('landscape', 'pt', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            doc.setFontSize(18);
            doc.text(title || 'Report', pageWidth / 2, 40, { align: 'center' });
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 60, { align: 'center' });
            const tableHeaders = headers || Object.keys(data[0]);
            const tableRows = data.map(item => tableHeaders.map(key => item[key] ?? ''));

            if (typeof autoTable === 'function') {
                autoTable(doc, {
                    head: [tableHeaders],
                    body: tableRows,
                    startY: 80,
                    styles: { fontSize: 8, cellPadding: 4 },
                    headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
                    alternateRowStyles: { fillColor: [240, 248, 255] },
                    margin: { left: 30, right: 30 },
                    pageBreak: 'auto',
                });
            } else if (typeof doc.autoTable === 'function') {
                doc.autoTable({
                    head: [tableHeaders],
                    body: tableRows,
                    startY: 80,
                    styles: { fontSize: 8, cellPadding: 4 },
                });
            } else {
                throw new Error('jspdf-autotable not available');
            }

            doc.save(`${filename}.pdf`);
            showToast('PDF export successful', 'success');
        } catch (error) {
            console.error('PDF export error:', error);
            showToast('Failed to export PDF', 'error');
        }
    };

    const buildReportData = (type) => {
        switch (type) {
            case 'registrations':
                return registrations.map(r => ({
                    'Full Name': r.full_name,
                    'Email': r.email,
                    'Phone': r.phone,
                    'Student': r.student_name,
                    'Grade': r.student_grade,
                    'School': r.student_school,
                    'Status': r.status,
                    'Submitted': r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
                }));
            case 'students':
                return students.map(s => ({
                    'Student Name': s.full_name,
                    'Grade': s.grade || 'N/A',
                    'School': s.school_name || 'N/A',
                    'Parent': s.parent_name || 'N/A',
                    'Bus': s.bus_number || '--',
                    'Status': s.is_active ? 'Active' : 'Inactive',
                }));
            case 'buses':
                return buses.map(b => ({
                    'Bus ID': b.id,
                    'Bus Number': b.bus_number,
                    'Plate': b.plate_number,
                    'Driver': b.driver_name || '--',
                    'Capacity': b.capacity || 40,
                    'Status': b.status || 'inactive',
                }));
            case 'users':
                return users.map(u => ({
                    'Name': u.full_name,
                    'Email': u.email,
                    'Role': u.role,
                    'Phone': u.phone || '--',
                    'Status': u.is_approved ? 'Approved' : 'Pending',
                    'Active': u.is_active ? 'Active' : 'Inactive',
                }));
            default:
                return [
                    { Metric: 'Total Buses', Value: stats.totalBuses },
                    { Metric: 'Active Buses', Value: stats.activeTrips },
                    { Metric: 'Total Drivers', Value: stats.totalDrivers },
                    { Metric: 'Total Students', Value: stats.totalStudents },
                    { Metric: 'Active Alerts', Value: stats.emergencies },
                    { Metric: 'Pending Approvals', Value: stats.pendingApprovals },
                    { Metric: 'Schools', Value: stats.totalSchools },
                ];
        }
    };

    const handleExport = async (format, explicitType) => {
        const type = explicitType || reportType;
        setIsExporting(true);
        try {
            const data = buildReportData(type);
            const filename = `SchoolBus_${type}_${new Date().toISOString().slice(0, 10)}`;

            if (format === 'pdf') {
                const headers = type === 'overview' ? ['Metric', 'Value'] : Object.keys(data[0] || {});
                const title = type === 'overview' ? 'System Overview Report' : `${type.charAt(0).toUpperCase() + type.slice(1)} Report`;
                await exportToPDF(data, headers, title, filename);
            } else {
                const headers = type === 'overview' ? ['Metric', 'Value'] : Object.keys(data[0] || {});
                exportToCSV(data, filename, headers);
            }
        } finally {
            setIsExporting(false);
        }
    };

    // ============================================================
    // MENU ITEMS
    // ============================================================
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'approvals', label: `Approvals (${stats.pendingApprovals})`, icon: Shield },
        { id: 'users', label: `Users (${users.length})`, icon: Users },
        { id: 'students', label: `Students (${stats.totalStudents})`, icon: GraduationCap },
        { id: 'buses', label: `Buses (${stats.totalBuses})`, icon: Bus },
        { id: 'stops', label: `Stops (${stops.length})`, icon: MapPin },
        { id: 'drivers', label: `Drivers (${stats.totalDrivers})`, icon: Users },
        { id: 'alerts', label: `Alerts (${stats.emergencies})`, icon: AlertTriangle },
        { id: 'reports', label: 'Reports', icon: FileText },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return renderDashboard();
            case 'approvals': return renderApprovals();
            case 'users': return renderUsers();
            case 'students': return renderStudents();
            case 'buses': return renderBuses();
            case 'stops': return renderStops();
            case 'drivers': return renderDrivers();
            case 'alerts': return renderAlerts();
            case 'reports': return renderReports();
            case 'settings': return renderSettings();
            default: return renderDashboard();
        }
    };

    const renderDashboard = () => {
        const chartData = [
            { day: 'Mon', trips: stats.activeTrips || 0, students: stats.totalStudents || 0, alerts: stats.emergencies || 0 },
            { day: 'Tue', trips: stats.activeTrips || 0, students: stats.totalStudents || 0, alerts: stats.emergencies || 0 },
            { day: 'Wed', trips: stats.activeTrips || 0, students: stats.totalStudents || 0, alerts: stats.emergencies || 0 },
            { day: 'Thu', trips: stats.activeTrips || 0, students: stats.totalStudents || 0, alerts: stats.emergencies || 0 },
            { day: 'Fri', trips: stats.activeTrips || 0, students: stats.totalStudents || 0, alerts: stats.emergencies || 0 },
            { day: 'Sat', trips: Math.floor(stats.activeTrips * 0.7) || 0, students: Math.floor(stats.totalStudents * 0.6) || 0, alerts: Math.floor(stats.emergencies * 0.5) || 0 },
            { day: 'Sun', trips: Math.floor(stats.activeTrips * 0.4) || 0, students: Math.floor(stats.totalStudents * 0.3) || 0, alerts: 0 },
        ];

        const performanceData = [
            { name: 'Active', value: stats.totalBuses > 0 ? Math.round((stats.activeTrips / stats.totalBuses) * 100) : 0 },
            { name: 'Inactive', value: stats.totalBuses > 0 ? Math.round(((stats.totalBuses - stats.activeTrips) / stats.totalBuses) * 100) : 0 },
        ];

        return (
            <div className="space-y-6 animate-fadeInUp">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 text-white shadow-2xl shadow-blue-500/20">
                    <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
                    <div className="absolute bottom-0 left-32 h-48 w-48 rounded-full bg-white/5 blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                            <div>
                                <p className="text-sm font-medium text-blue-200">{greeting}</p>
                                <h2 className="text-3xl font-bold md:text-4xl">Welcome back, {user?.full_name || 'Admin'} 👋</h2>
                                <p className="mt-1 text-blue-100">Here's what's happening with your fleet today</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2 rounded-2xl bg-white/20 px-4 py-2 backdrop-blur-sm">
                                    <Clock className="h-4 w-4 text-blue-200" />
                                    <span className="font-mono text-lg">{currentTime}</span>
                                </div>
                                <div className="flex items-center gap-2 rounded-2xl bg-white/20 px-4 py-2 backdrop-blur-sm">
                                    <span className={`h-2 w-2 rounded-full ${isConnected ? 'animate-pulse bg-green-400' : 'bg-red-400'}`}></span>
                                    <span className="text-sm">{isConnected ? 'Connected' : 'Offline'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <StatCard title="Total Buses" value={stats.totalBuses} subtitle={`${stats.activeTrips} active`} icon={<Bus className="h-6 w-6 text-blue-600 dark:text-blue-400" />} color="blue" />
                    <StatCard title="Drivers" value={stats.totalDrivers} subtitle="Active drivers" icon={<Users className="h-6 w-6 text-green-600 dark:text-green-400" />} color="green" />
                    <StatCard title="Active Trips" value={stats.activeTrips} subtitle="Buses on road" icon={<Activity className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />} color="yellow" />
                    <StatCard title="Emergencies" value={stats.emergencies} subtitle="Active alerts" icon={<AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />} color="red" />
                    <StatCard title="Pending Approvals" value={stats.pendingApprovals} subtitle="Awaiting action" icon={<Shield className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />} color="yellow" />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 rounded-2xl border border-white/50 bg-white/70 p-6 shadow-lg backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/70">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h3 className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200">
                                    <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    Weekly Activity Overview
                                </h3>
                                <p className="text-xs text-gray-400 dark:text-gray-500">Real-time data from your fleet</p>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={280}>
                            <ComposedChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                                <YAxis stroke="#94a3b8" fontSize={12} />
                                <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
                                <Legend />
                                <Bar dataKey="trips" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="students" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Line type="monotone" dataKey="alerts" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-2xl border border-white/50 bg-white/70 p-6 shadow-lg backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/70">
                            <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200">
                                <PieChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                Bus Status
                            </h3>
                            <ResponsiveContainer width="100%" height={140}>
                                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={performanceData} startAngle={180} endAngle={0}>
                                    <RadialBar minAngle={15} background dataKey="value">
                                        {performanceData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#94a3b8'][index % 2]} />
                                        ))}
                                    </RadialBar>
                                    <Tooltip />
                                    <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
                                </RadialBarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="rounded-2xl border border-white/50 bg-white/70 p-6 shadow-lg backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/70">
                            <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200">
                                <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                                Latest Activity
                            </h3>
                            <div className="max-h-[160px] space-y-3 overflow-y-auto pr-1">
                                {alerts.slice(0, 3).map((alert) => (
                                    <div key={alert.id} className="flex items-start gap-3 rounded-xl p-2 transition hover:bg-gray-50/70 dark:hover:bg-slate-700/30">
                                        <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
                                            <span className="text-lg">🚨</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">Bus {alert.bus_id}</p>
                                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{alert.message || 'Emergency alert'}</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(alert.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                                {alerts.length === 0 && <div className="text-center text-gray-400 py-4">No recent activity</div>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <QuickActionButton onClick={() => setActiveTab('buses')} icon={<Plus className="mx-auto h-8 w-8 text-blue-500" />} label="Add Bus" />
                    <QuickActionButton onClick={() => setActiveTab('stops')} icon={<MapPin className="mx-auto h-8 w-8 text-green-500" />} label="Add Stop" />
                    <QuickActionButton onClick={() => setActiveTab('users')} icon={<Users className="mx-auto h-8 w-8 text-purple-500" />} label="View Users" />
                    <QuickActionButton onClick={() => setActiveTab('reports')} icon={<FileText className="mx-auto h-8 w-8 text-purple-500" />} label="View Reports" />
                </div>
            </div>
        );
    };

    const renderApprovals = () => {
        const filteredUsers = pendingUsers.filter(u => {
            if (filterStatus === 'all') return true;
            return u.role === filterStatus;
        });

        const pendingCount = pendingUsers.length;
        const parentCount = pendingUsers.filter(u => u.role === 'parent').length;
        const driverCount = pendingUsers.filter(u => u.role === 'driver').length;
        const policeCount = pendingUsers.filter(u => u.role === 'police').length;

        if (pendingCount === 0) {
            return (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                <Shield size={24} className="text-yellow-500" />
                                Pending Approvals
                            </h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500">No pending users – all accounts are approved.</p>
                        </div>
                        <button onClick={fetchData} className="px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-1 text-sm">
                            <RefreshCw size={16} /> Refresh
                        </button>
                    </div>
                    <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                        <UserCheck size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p>All clear! No pending approvals.</p>
                    </div>
                </motion.div>
            );
        }

        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                            <Shield size={24} className="text-yellow-500" />
                            Pending Approvals
                        </h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            {pendingCount} pending • {parentCount} parents • {driverCount} drivers • {policeCount} police
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white text-sm">
                            <option value="all">All</option>
                            <option value="parent">Parents</option>
                            <option value="driver">Drivers</option>
                            <option value="police">Police</option>
                        </select>
                        <button onClick={fetchData} className="px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-1 text-sm">
                            <RefreshCw size={16} /> Refresh
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingCount}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Pending</p>
                    </div>
                    <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{parentCount}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Parents</p>
                    </div>
                    <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{driverCount + policeCount}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Drivers & Police</p>
                    </div>
                </div>

                <div className="space-y-4 max-h-[600px] overflow-y-auto p-2">
                    {filteredUsers.map((userItem, index) => {
                        const roleColors = {
                            parent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                            driver: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                            police: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                        };
                        const roleIcons = {
                            parent: <UserCheck size={14} />,
                            driver: <Bus size={14} />,
                            police: <Shield size={14} />,
                        };

                        return (
                            <motion.div key={userItem.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-white/50 dark:border-slate-700/50 hover:shadow-xl transition-all">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                                            {userItem.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="font-semibold text-gray-800 dark:text-white">{userItem.full_name}</h4>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${roleColors[userItem.role]}`}>
                                                    {roleIcons[userItem.role]} {userItem.role.charAt(0).toUpperCase() + userItem.role.slice(1)}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1"><Mail size={14} /> {userItem.email}</span>
                                                <span className="flex items-center gap-1"><Phone size={14} /> {userItem.phone || '--'}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                                    <Clock size={12} /> Registered: {new Date(userItem.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {userItem.role === 'parent' && userItem.student_name && (
                                                <div className="mt-2 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 inline-flex items-center gap-2">
                                                    <GraduationCap size={12} />
                                                    <span><strong>{userItem.student_name}</strong>
                                                        {userItem.student_grade ? ` • Grade ${userItem.student_grade}` : ''}
                                                        {userItem.student_school ? ` • ${userItem.student_school}` : ''}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setSelectedUserForDetail(userItem); setShowUserDetailModal(true); }}
                                            className="px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-1 text-sm">
                                            <Eye size={16} /> View
                                        </button>
                                        <button
                                            onClick={() => handleApproveUser(userItem)}
                                            className="px-3 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center gap-1 text-sm">
                                            <CheckCircle size={16} /> Approve
                                        </button>
                                        <button
                                            onClick={() => { setSelectedUser(userItem); setShowRejectUserModal(true); }}
                                            className="px-3 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition flex items-center gap-1 text-sm">
                                            <XCircle size={16} /> Reject
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                <AnimatePresence>
                    {showRejectUserModal && selectedUser && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 m-4">
                                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Reject User</h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    Please provide a reason for rejecting <span className="font-semibold">{selectedUser.full_name}</span>'s registration:
                                </p>
                                <textarea value={rejectUserReason} onChange={(e) => setRejectUserReason(e.target.value)}
                                    placeholder="Enter rejection reason..."
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white min-h-[100px]" />
                                <div className="flex gap-2 mt-4 justify-end">
                                    <button onClick={() => { setShowRejectUserModal(false); setRejectUserReason(''); }}
                                        className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-slate-600 transition">
                                        Cancel
                                    </button>
                                    <button onClick={() => handleRejectUser(selectedUser)}
                                        disabled={!rejectUserReason.trim()}
                                        className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2">
                                        <XCircle size={16} /> Reject
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    };

    const renderUsers = () => {
    const filteredUsers = users.filter(u => {
        // ✅ Hide deactivated users by default unless toggle is on
        if (!showInactiveUsers && u.is_active === false) return false;

        const matchesSearch = !searchTerm ||
            u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.phone?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                            <Users size={24} className="text-purple-500" />
                            All Users
                        </h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            {users.length} total users •
                            {users.filter(u => u.role === 'parent').length} parents •
                            {users.filter(u => u.role === 'driver').length} drivers •
                            {users.filter(u => u.role === 'police').length} police •
                            {users.filter(u => u.role === 'admin').length} admins
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
    {/* 🆕 Toggle to show inactive users */}
    <button
        onClick={() => setShowInactiveUsers(v => !v)}
        className={`px-3 py-2 rounded-xl transition flex items-center gap-1 text-sm border ${
            showInactiveUsers
                ? 'bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                : 'bg-white border-gray-200 text-gray-700 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
        }`}
        title={showInactiveUsers ? 'Hide deactivated users' : 'Show deactivated users'}
    >
        {showInactiveUsers ? <Eye size={16} /> : <Eye size={16} className="opacity-50" />}
        {showInactiveUsers ? 'Hide Inactive' : 'Show Inactive'}
    </button>

    <button onClick={() => handleExport('csv', 'users')} className="px-3 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center gap-1 text-sm">
        <Download size={16} /> Export
    </button>
    <button onClick={fetchData} className="px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-1 text-sm">
        <RefreshCw size={16} /> Refresh
    </button>
</div>
                </div>

                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search by name, email, role, or phone..."
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto p-2">
                    {filteredUsers.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-gray-400 dark:text-gray-500">
                            <Users size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                            <p>No users found</p>
                        </div>
                    ) : (
                        filteredUsers.map((userItem, index) => (
                            <motion.div key={userItem.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/50 dark:border-slate-700/50 hover:shadow-lg transition-all hover:scale-[1.02]">
                                <div className="flex items-start gap-3">
                                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-blue-500 flex-shrink-0 bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                                        {userItem.profile_image ? (
                                            <img src={userItem.profile_image} alt={userItem.full_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-white text-2xl font-bold">{userItem.full_name?.charAt(0) || 'U'}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold text-gray-800 dark:text-white truncate">{userItem.full_name}</p>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(userItem.role)}`}>
                                                {userItem.role}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{userItem.email}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Phone: {userItem.phone || '--'}</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
    <span className={`text-xs px-2 py-0.5 rounded-full ${userItem.is_approved ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
        {userItem.is_approved ? '✅ Approved' : '⏳ Pending'}
    </span>
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
        userItem.is_active
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    }`}>
        {userItem.is_active ? 'Active' : '⛔ Deactivated'}
    </span>
</div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => { setSelectedUserForDetail(userItem); setShowUserDetailModal(true); }}
                                            className="p-1.5 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition">
                                            <Eye size={15} />
                                        </button>
                                    </div>
                                </div>

                                {userItem.role === 'parent' && (
                                    <div className="mt-3 text-xs bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                                        <p><span className="text-gray-500">Relationship:</span> {userItem.relationship_to_student || 'N/A'}</p>
                                        <p><span className="text-gray-500">Student:</span> {userItem.student_name || 'N/A'}</p>
                                        <p><span className="text-gray-500">School:</span> {userItem.student_school || 'N/A'}</p>
                                    </div>
                                )}
                                {userItem.role === 'police' && (
                                    <div className="mt-3 text-xs bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                                        <p><span className="text-gray-500">Badge:</span> {userItem.badge_number || 'N/A'}</p>
                                        <p><span className="text-gray-500">Station:</span> {userItem.station || 'N/A'}</p>
                                    </div>
                                )}
                                {userItem.role === 'driver' && (
                                    <div className="mt-3 text-xs bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2">
                                        <p><span className="text-gray-500">License:</span> {userItem.license_number || 'N/A'}</p>
                                        <p><span className="text-gray-500">Experience:</span> {userItem.experience || 'N/A'} years</p>
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>
            </motion.div>
        );
    };

    const renderUserDetailModal = () => {
        if (!selectedUserForDetail) return null;
        const u = selectedUserForDetail;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <User size={24} className="text-blue-600" />
                            User Details
                        </h3>
                        <button onClick={() => { setShowUserDetailModal(false); setSelectedUserForDetail(null); }}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-center">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-500 bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                                {u.profile_image ? (
                                    <img src={u.profile_image} alt={u.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-white text-3xl font-bold">{u.full_name?.charAt(0) || 'U'}</span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <DetailItem label="Full Name" value={u.full_name} />
                            <DetailItem label="Email" value={u.email} />
                            <DetailItem label="Phone" value={u.phone || '--'} />
                            <DetailItem label="Role" value={u.role} />
                            <DetailItem label="Status" value={u.is_approved ? 'Approved' : 'Pending'} />
                            <DetailItem label="Active" value={u.is_active ? 'Active' : 'Inactive'} />
                            <DetailItem label="Registered" value={new Date(u.created_at).toLocaleString()} />
                        </div>

                        {u.role === 'parent' && (
                            <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                    <GraduationCap size={18} className="text-blue-600" /> Parent / Student Details
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <DetailItem label="Relationship to Student" value={u.relationship_to_student || '--'} />
                                    <DetailItem label="Student Name" value={u.student_name || u.pending_student_name || '--'} />
                                    <DetailItem label="Student Grade" value={u.student_grade || u.pending_student_grade || '--'} />
                                    <DetailItem label="Student School" value={u.student_school || u.pending_student_school || '--'} />
                                    <DetailItem label="Student ID" value={u.student_id_number || u.pending_student_id_number || '--'} />
                                    <DetailItem label="Address" value={u.address || '--'} />
                                    <DetailItem label="Date of Birth" value={u.date_of_birth ? new Date(u.date_of_birth).toLocaleDateString() : '--'} />
                                    <DetailItem label="Gender" value={u.gender || '--'} />
                                    <DetailItem label="Occupation" value={u.occupation || '--'} />
                                    <DetailItem label="Emergency Contact" value={u.emergency_contact || '--'} />
                                </div>
                            </div>
                        )}

                        {u.role === 'police' && (
                            <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                    <Shield size={18} className="text-red-600" /> Police Details
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <DetailItem label="Badge Number" value={u.badge_number || '--'} />
                                    <DetailItem label="Police Station" value={u.station || '--'} />
                                </div>
                            </div>
                        )}

                        {u.role === 'driver' && (
                            <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                    <Car size={18} className="text-yellow-600" /> Driver Details
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <DetailItem label="License Number" value={u.license_number || '--'} />
                                    <DetailItem label="Years of Experience" value={u.experience || '--'} />
                                </div>
                            </div>
                        )}

                        {u.profile_image && (
                            <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                                <DetailItem label="Profile Image" value={<img src={u.profile_image} alt="Profile" className="max-h-48 rounded-lg border" />} />
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button onClick={() => { setShowUserDetailModal(false); setSelectedUserForDetail(null); }}
                            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
                            Close
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    };

    const DetailItem = ({ label, value }) => (
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white break-all">{value || '—'}</p>
        </div>
    );

    const renderStudents = () => {
        const filteredStudents = students.filter(s => {
            const matchesSearch = !searchTerm ||
                s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.student_id_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.parent_name?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        });

        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                            <GraduationCap size={24} className="text-purple-500" />
                            Students
                        </h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{students.length} students • {grades.length} grades • {stats.totalSchools} schools</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={handleAddStudent} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all hover:scale-105 text-sm font-medium flex items-center gap-2">
                            <Plus size={16} /> Add
                        </button>
                        <button onClick={() => setShowImportStudentModal(true)} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all hover:scale-105 text-sm font-medium flex items-center gap-2">
                            <Upload size={16} /> Import
                        </button>
                        <button onClick={() => { setReportType('students'); setActiveTab('reports'); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all hover:scale-105 text-sm font-medium flex items-center gap-2">
                            <FileText size={16} /> Reports
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{students.length}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Students</p>
                    </div>
                    <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalSchools}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Schools</p>
                    </div>
                    <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{grades.length}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Grades</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search by name, ID, or parent..."
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white" />
                    </div>
                    <select className="px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white min-w-[140px]">
                        <option value="">All Grades</option>
                        {grades.map(g => (
                            <option key={g.grade} value={g.grade}>Grade {g.grade} ({g.student_count})</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto p-2">
                    {filteredStudents.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-gray-400 dark:text-gray-500">
                            <Users size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                            <p>No students found</p>
                        </div>
                    ) : (
                        filteredStudents.map((student, index) => (
                            <motion.div key={student.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/50 dark:border-slate-700/50 hover:shadow-lg transition-all hover:scale-[1.02]">
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                        {student.full_name?.charAt(0) || 'S'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-800 dark:text-white truncate">{student.full_name}</p>
                                        <div className="flex flex-wrap gap-1 text-xs text-gray-500 dark:text-gray-400">
                                            <span className="flex items-center gap-1"><GraduationCap size={12} /> Gr: {student.grade || 'N/A'}</span>
                                            <span className="flex items-center gap-1"><Bus size={12} /> {student.bus_number || '--'}</span>
                                            <span className="flex items-center gap-1"><User size={12} /> {student.parent_name || '--'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => openQRModal(student)}
                                            title="Show QR"
                                            className="p-1.5 text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30 rounded-lg transition"
                                        >
                                            <QrCode size={15} />
                                        </button>
                                        <button onClick={() => handleEditStudent(student)} className="p-1.5 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition">
                                            <Edit size={15} />
                                        </button>
                                        <button onClick={() => handleDeleteStudent(student.id)} className="p-1.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                <AnimatePresence>
                    {showStudentModal && renderStudentModal()}
                </AnimatePresence>
                <AnimatePresence>
                    {showImportStudentModal && renderImportStudentModal()}
                </AnimatePresence>
            </motion.div>
        );
    };

    const renderStudentModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 m-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {editingItem ? 'Edit Student' : 'Add New Student'}
                    </h3>
                    <button onClick={() => setShowStudentModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmitStudent} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                        <input type="text" required value={formData.full_name || ''}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grade</label>
                            <input type="text" value={formData.grade || ''}
                                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">School</label>
                            <input type="text" value={formData.school_name || ''}
                                onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student ID</label>
                            <input type="text" value={formData.student_id_number || ''}
                                onChange={(e) => setFormData({ ...formData, student_id_number: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parent ID</label>
                            <input type="text" value={formData.parent_id || ''}
                                onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                                placeholder="User ID of parent"
                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bus</label>
                            <select value={formData.bus_id || ''}
                                onChange={(e) => setFormData({ ...formData, bus_id: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white">
                                <option value="">Select Bus</option>
                                {buses.map(b => (
                                    <option key={b.id} value={b.id}>{b.bus_number} - {b.plate_number}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stop</label>
                            <select value={formData.stop_id || ''}
                                onChange={(e) => setFormData({ ...formData, stop_id: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white">
                                <option value="">Select Stop</option>
                                {stops.map(s => (
                                    <option key={s.id} value={s.id}>{s.stop_name} (Bus: {s.bus_number || 'N/A'})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {formError && <p className="text-red-500 text-sm">{formError}</p>}
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setShowStudentModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-slate-600 transition">Cancel</button>
                        <button type="submit" disabled={formLoading} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
                            {formLoading ? 'Saving...' : (editingItem ? 'Update' : 'Add')}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );

    const renderBuses = () => {
        const filteredBuses = buses.filter(b => {
            return !searchTerm ||
                b.bus_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.driver_name?.toLowerCase().includes(searchTerm.toLowerCase());
        });

        return (
            <div className="animate-fadeInUp rounded-2xl border border-white/50 bg-white/70 p-6 shadow-lg backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/70">
                <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <div>
                        <h3 className="flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-white">
                            <Bus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            All Buses ({buses.length})
                        </h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Manage your fleet</p>
                    </div>
                    <div className="flex w-full gap-3 sm:w-auto">
                        <div className="relative flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Search buses..." value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-white/50 py-2 pl-10 pr-4 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white sm:w-48" />
                        </div>
                        <button onClick={handleAddBus} className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30">
                            <Plus size={16} /> Add New
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-slate-700 dark:text-gray-400">
                                <th className="pb-3">ID</th><th className="pb-3">Number</th><th className="pb-3">Plate</th><th className="pb-3">Driver</th><th className="pb-3">Capacity</th><th className="pb-3">Status</th><th className="pb-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBuses.length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-8 text-gray-400">No buses found. Click "Add New" to create one.</td></tr>
                            ) : (
                                filteredBuses.map((bus) => (
                                    <tr key={bus.id} className="border-b border-gray-100 transition hover:bg-blue-50/30 dark:border-slate-700/50 dark:hover:bg-blue-900/10">
                                        <td className="py-3 text-sm font-medium text-gray-800 dark:text-gray-200">{bus.id}</td>
                                        <td className="py-3 text-sm text-gray-600 dark:text-gray-400">{bus.bus_number}</td>
                                        <td className="py-3 text-sm text-gray-600 dark:text-gray-400">{bus.plate_number}</td>
                                        <td className="py-3 text-sm">
                                            <select value={bus.driver_id || ''}
                                                onChange={(e) => handleAssignDriver(bus.id, e.target.value || null)}
                                                className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 px-2 py-1 text-xs text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 min-w-[150px]">
                                                <option value="">— Unassigned —</option>
                                                {drivers
                                                    .filter(d => d.is_active !== false)
                                                    .filter(d => !d.bus_id || d.bus_id === bus.id)
                                                    .map(d => (
                                                        <option key={d.id} value={d.id}>{d.full_name}</option>
                                                    ))}
                                            </select>
                                        </td>
                                        <td className="py-3 text-sm text-gray-600 dark:text-gray-400">{bus.capacity || 40}</td>
                                        <td className="py-3">
                                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${bus.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                bus.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                {bus.status || 'inactive'}
                                            </span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleEditBus(bus)} className="rounded-lg p-1.5 text-yellow-600 transition hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900/30"><Edit size={16} /></button>
                                                <button onClick={() => handleDeleteBus(bus.id)} className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <AnimatePresence>
                    {showBusModal && renderBusModal()}
                </AnimatePresence>
            </div>
        );
    };

    const renderBusModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 m-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {editingItem ? 'Edit Bus' : 'Add New Bus'}
                    </h3>
                    <button onClick={() => setShowBusModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmitBus} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bus Number *</label>
                            <input type="text" required value={formData.bus_number || ''}
                                onChange={(e) => setFormData({ ...formData, bus_number: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white" placeholder="BUS-001" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plate Number *</label>
                            <input type="text" required value={formData.plate_number || ''}
                                onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white" placeholder="AA-1234" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacity</label>
                        <input type="number" value={formData.capacity || 40}
                            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Driver (optional)</label>
                        <select value={formData.driver_id || ''}
                            onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white">
                            <option value="">— Unassigned —</option>
                            {drivers
                                .filter(d => d.is_active !== false)
                                .filter(d => !d.bus_id || d.bus_id === editingItem?.id)
                                .map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.full_name}{d.bus_number && d.bus_id !== editingItem?.id ? ` (bus ${d.bus_number})` : ''}
                                    </option>
                                ))}
                        </select>
                    </div>
                    {formError && <p className="text-red-500 text-sm">{formError}</p>}
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setShowBusModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-slate-600 transition">Cancel</button>
                        <button type="submit" disabled={formLoading} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
                            {formLoading ? 'Saving...' : (editingItem ? 'Update' : 'Add')}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );

    const renderStops = () => {
        const filteredStops = stops.filter(s => {
            return !searchTerm ||
                s.stop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.bus_number?.toLowerCase().includes(searchTerm.toLowerCase());
        });

        return (
            <div className="animate-fadeInUp rounded-2xl border border-white/50 bg-white/70 p-6 shadow-lg backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/70">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h3 className="flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-white">
                            <MapPin className="h-6 w-6 text-green-600 dark:text-green-400" />
                            Stops ({stops.length})
                        </h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Manage bus stops</p>
                    </div>
                    <button onClick={handleAddStop} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-medium text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-green-500/30">
                        <Plus size={16} /> Add New
                    </button>
                </div>
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search stops..." value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white/50 py-2 pl-10 pr-4 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white" />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredStops.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-gray-400">No stops found. Click "Add New" to create one.</div>
                    ) : (
                        filteredStops.map((stop) => (
                            <div key={stop.id} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/70 p-4 transition hover:shadow-md dark:border-slate-700 dark:bg-slate-700/30">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">{stop.stop_order}</div>
                                <div>
                                    <p className="font-medium text-gray-800 dark:text-gray-200">{stop.stop_name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{stop.latitude}, {stop.longitude}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">Bus: {stop.bus_number || '--'}</p>
                                </div>
                                <div className="ml-auto flex gap-1">
                                    <button onClick={() => handleEditStop(stop)} className="p-1.5 text-yellow-600 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900/30 rounded-lg transition"><Edit size={15} /></button>
                                    <button onClick={() => handleDeleteStop(stop.id)} className="p-1.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition"><Trash2 size={15} /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <AnimatePresence>
                    {showStopModal && renderStopModal()}
                </AnimatePresence>
            </div>
        );
    };

    const renderStopModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 m-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {editingItem ? 'Edit Stop' : 'Add New Stop'}
                    </h3>
                    <button onClick={() => setShowStopModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmitStop} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stop Name *</label>
                        <input type="text" required value={formData.stop_name || ''}
                            onChange={(e) => setFormData({ ...formData, stop_name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order</label>
                            <input type="number" value={formData.stop_order || 1}
                                onChange={(e) => setFormData({ ...formData, stop_order: parseInt(e.target.value) || 1 })}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bus</label>
                            <select value={formData.bus_id || ''}
                                onChange={(e) => setFormData({ ...formData, bus_id: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white">
                                <option value="">Select Bus</option>
                                {buses.map(b => (
                                    <option key={b.id} value={b.id}>{b.bus_number} - {b.plate_number}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Latitude *</label>
                            <input type="number" step="any" required value={formData.latitude || ''}
                                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Longitude *</label>
                            <input type="number" step="any" required value={formData.longitude || ''}
                                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white" />
                        </div>
                    </div>
                    {formError && <p className="text-red-500 text-sm">{formError}</p>}
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setShowStopModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-slate-600 transition">Cancel</button>
                        <button type="submit" disabled={formLoading} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
                            {formLoading ? 'Saving...' : (editingItem ? 'Update' : 'Add')}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );

    // ============================================================
    // DRIVERS — filters out deactivated drivers
    // ============================================================
    const renderDrivers = () => {
        const filteredDrivers = drivers.filter(d => {
            // ✅ Hide deactivated drivers
            if (d.is_active === false) return false;
            return !searchTerm ||
                d.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.phone?.toLowerCase().includes(searchTerm.toLowerCase());
        });

        return (
            <div className="animate-fadeInUp rounded-2xl border border-white/50 bg-white/70 p-6 shadow-lg backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/70">
                <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-white">
                            <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            Drivers ({filteredDrivers.length})
                        </h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Manage your drivers</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={handleAddDriver} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30">
                            <Plus size={16} /> Add
                        </button>
                        <button onClick={() => setShowImportDriverModal(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-medium text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/30">
                            <Upload size={16} /> Import
                        </button>
                    </div>
                </div>
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search drivers..." value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white/50 py-2 pl-10 pr-4 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredDrivers.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-gray-400">No drivers found. Click "Add" to create one.</div>
                    ) : (
                        filteredDrivers.map((driver) => (
                            <div key={driver.id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 transition hover:shadow-md dark:border-slate-700 dark:bg-slate-700/30">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-gray-200">{driver.full_name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{driver.email}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Phone: {driver.phone || '--'}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Status: {driver.is_active ? 'Active' : 'Inactive'}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEditDriver(driver)} className="p-1.5 text-yellow-600 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900/30 rounded-lg transition"><Edit size={15} /></button>
                                        <button onClick={() => handleDeleteDriver(driver.id)} className="p-1.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition"><Trash2 size={15} /></button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <AnimatePresence>
                    {showDriverModal && renderDriverModal()}
                </AnimatePresence>
                <AnimatePresence>
                    {showImportDriverModal && renderImportDriverModal()}
                </AnimatePresence>
            </div>
        );
    };

    const renderDriverModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 m-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {editingItem ? 'Edit Driver' : 'Add New Driver'}
                    </h3>
                    <button onClick={() => setShowDriverModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmitDriver} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                        <input type="text" required value={formData.full_name || ''}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                        <input type="email" required value={formData.email || ''}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white" />
                    </div>
                    {!editingItem && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password (default: 123456)</label>
                            <input type="text" value={formData.password || '123456'}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white" />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                        <input type="text" value={formData.phone || ''}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-800 dark:text-white" />
                    </div>
                    {formError && <p className="text-red-500 text-sm">{formError}</p>}
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setShowDriverModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-slate-600 transition">Cancel</button>
                        <button type="submit" disabled={formLoading} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
                            {formLoading ? 'Saving...' : (editingItem ? 'Update' : 'Add')}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );

    const renderImportDriverModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <FileSpreadsheet size={24} className="text-emerald-600" />
                        Import Drivers
                    </h3>
                    <button onClick={() => { setShowImportDriverModal(false); setImportFile(null); setImportPreview([]); setImportHeaders([]); setImportError(''); setImportSuccess(''); }}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-300">
                        <p className="font-medium">📋 CSV Format Instructions</p>
                        <p className="mt-1">Your CSV file should include the following columns:</p>
                        <div className="mt-2 font-mono text-xs bg-white/50 dark:bg-slate-700/50 p-3 rounded-lg">
                            <span className="text-blue-600 dark:text-blue-400">full_name</span>, <span className="text-blue-600 dark:text-blue-400">email</span>, phone, license_number, experience
                        </div>
                        <p className="mt-1 text-xs text-gray-500">* <span className="font-semibold">full_name</span> and <span className="font-semibold">email</span> are required.</p>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-6 text-center hover:border-emerald-500 transition">
                        <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Drop your CSV file here or click to browse</p>
                        <input id="driverImportInput" type="file" accept=".csv,.xlsx,.xls"
                            onChange={(e) => handleImportFileChange(e, 'driver')} className="hidden" />
                        <button onClick={() => document.getElementById('driverImportInput').click()}
                            className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition text-sm">
                            Choose File
                        </button>
                        {importFile && (
                            <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                                ✅ {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                            </p>
                        )}
                    </div>

                    {importError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                            <XCircle size={18} /> {importError}
                        </div>
                    )}

                    {importSuccess && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
                            <CheckCircle size={18} /> {importSuccess}
                        </div>
                    )}

                    {importPreview.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Preview (first {importPreview.length} rows):
                            </p>
                            <div className="overflow-x-auto max-h-48 overflow-y-auto border rounded-xl">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-gray-100 dark:bg-slate-700">
                                        <tr>
                                            {importHeaders.map((h, i) => (
                                                <th key={i} className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {importPreview.map((row, i) => (
                                            <tr key={i} className="border-t border-gray-100 dark:border-slate-700/50">
                                                {importHeaders.map((h, j) => (
                                                    <td key={j} className="px-3 py-1.5 text-gray-600 dark:text-gray-400">{row[h] || '—'}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 justify-end pt-3 border-t border-gray-200 dark:border-slate-700">
                        <button onClick={() => { setShowImportDriverModal(false); setImportFile(null); setImportPreview([]); setImportHeaders([]); setImportError(''); setImportSuccess(''); }}
                            className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-slate-600 transition">
                            Cancel
                        </button>
                        <button onClick={handleImportDrivers} disabled={!importFile || importLoading}
                            className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2">
                            {importLoading ? 'Importing...' : 'Import Drivers'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );

    const renderImportStudentModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <FileSpreadsheet size={24} className="text-emerald-600" />
                        Import Students
                    </h3>
                    <button onClick={() => { setShowImportStudentModal(false); setImportFile(null); setImportPreview([]); setImportHeaders([]); setImportError(''); setImportSuccess(''); }}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-300">
                        <p className="font-medium">📋 CSV Format Instructions</p>
                        <p className="mt-1">Your CSV file should include the following columns:</p>
                        <div className="mt-2 font-mono text-xs bg-white/50 dark:bg-slate-700/50 p-3 rounded-lg">
                            <span className="text-blue-600 dark:text-blue-400">full_name</span>, grade, school_name, student_id_number, <span className="text-emerald-600 dark:text-emerald-400 font-semibold">parent_email</span>, bus_number
                        </div>
                        <p className="mt-1 text-xs text-gray-500">* <span className="font-semibold">full_name</span> is required.</p>
                        <p className="mt-1 text-xs text-gray-500">* <span className="font-semibold">parent_email</span> must match an approved parent account.</p>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-6 text-center hover:border-emerald-500 transition">
                        <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Drop your CSV file here or click to browse</p>
                        <input id="studentImportInput" type="file" accept=".csv,.xlsx,.xls"
                            onChange={(e) => handleImportFileChange(e, 'student')} className="hidden" />
                        <button onClick={() => document.getElementById('studentImportInput').click()}
                            className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition text-sm">
                            Choose File
                        </button>
                        {importFile && (
                            <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                                ✅ {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                            </p>
                        )}
                    </div>

                    {importError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                            <XCircle size={18} /> {importError}
                        </div>
                    )}

                    {importSuccess && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
                            <CheckCircle size={18} /> {importSuccess}
                        </div>
                    )}

                    {importPreview.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Preview (first {importPreview.length} rows):
                            </p>
                            <div className="overflow-x-auto max-h-48 overflow-y-auto border rounded-xl">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-gray-100 dark:bg-slate-700">
                                        <tr>
                                            {importHeaders.map((h, i) => (
                                                <th key={i} className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {importPreview.map((row, i) => (
                                            <tr key={i} className="border-t border-gray-100 dark:border-slate-700/50">
                                                {importHeaders.map((h, j) => (
                                                    <td key={j} className="px-3 py-1.5 text-gray-600 dark:text-gray-400">{row[h] || '—'}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 justify-end pt-3 border-t border-gray-200 dark:border-slate-700">
                        <button onClick={() => { setShowImportStudentModal(false); setImportFile(null); setImportPreview([]); setImportHeaders([]); setImportError(''); setImportSuccess(''); }}
                            className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-slate-600 transition">
                            Cancel
                        </button>
                        <button onClick={handleImportStudents} disabled={!importFile || importLoading}
                            className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2">
                            {importLoading ? 'Importing...' : 'Import Students'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );

    const renderAlerts = () => {
        const activeAlerts = alerts.filter(a => a.status === 'active');
        const resolvedAlerts = alerts.filter(a => a.status === 'resolved');

        const alertIcon = L.divIcon({
            html: `<div style="background:#dc2626;border-radius:50%;padding:8px;border:3px solid white;box-shadow:0 4px 12px rgba(220,38,38,0.6);display:flex;align-items:center;justify-content:center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2L1 21h22L12 2zm0 3.5L20 19H4L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
                </svg></div>`,
            className: '', iconSize: [40, 40], iconAnchor: [20, 20],
        });

        const resolvedIcon = L.divIcon({
            html: `<div style="background:#16a34a;border-radius:50%;padding:6px;border:2px solid white;display:flex;align-items:center;justify-content:center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg></div>`,
            className: '', iconSize: [28, 28], iconAnchor: [14, 14],
        });

        const alertPins = activeAlerts.filter(a => a.latitude && a.longitude && (a.latitude !== 0 || a.longitude !== 0));
        const resolvedPins = resolvedAlerts.filter(a => a.latitude && a.longitude && (a.latitude !== 0 || a.longitude !== 0));
        const mapCenter = alertPins[0]
            ? [Number(alertPins[0].latitude), Number(alertPins[0].longitude)]
            : [9.0320, 38.7469];

        return (
            <div className="space-y-6">
                {unconfirmedDropoffs.length > 0 && (
                    <div className="rounded-2xl border-2 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-yellow-800 dark:text-yellow-300">
                                <AlertTriangle className="h-5 w-5" />
                                Unconfirmed Drop-offs ({unconfirmedDropoffs.length})
                            </h3>
                            <button
                                onClick={fetchUnconfirmedDropoffs}
                                className="px-3 py-1 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition text-sm">
                                Refresh
                            </button>
                        </div>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-3">
                            Parents have not confirmed receipt of these students within 2 minutes.
                        </p>
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {unconfirmedDropoffs.map(d => (
                                <div key={d.event_id} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-yellow-200 dark:border-yellow-800 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">
                                            {d.student_name || `Student #${d.student_id}`}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Bus {d.bus_number || '—'} • Stop {d.stop_name || '—'}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            Dropped off {Math.floor((d.seconds_ago || 0) / 60)} min ago
                                        </p>
                                    </div>
                                    <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold flex-shrink-0">
                                        ⚠️ Unconfirmed
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="rounded-2xl border border-white/50 bg-white/70 p-6 shadow-lg backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/70">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-white">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                                Emergency Alerts
                            </h3>
                            <p className="text-xs text-gray-400">
                                {activeAlerts.length} active • {resolvedAlerts.length} resolved
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {activeAlerts.length > 0 && (
                                <span className="animate-pulse rounded-full bg-red-500 px-3 py-1 text-sm font-medium text-white">
                                    {activeAlerts.length} Active
                                </span>
                            )}
                            <button onClick={fetchData} className="px-3 py-1 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-1 text-sm">
                                <RefreshCw size={14} /> Refresh
                            </button>
                        </div>
                    </div>

                    {activeAlerts.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 dark:text-gray-500">
                            <AlertTriangle className="mx-auto mb-2 h-12 w-12 text-gray-300 dark:text-gray-600" />
                            <p>No active alerts. All safe!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeAlerts.map((alert) => (
                                <div key={alert.id} className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="w-full sm:w-auto sm:max-w-md">
                                        <AIAnalysisCard
                                            aiAnalysis={alert.ai_analysis}
                                            aiStatus={alert.ai_status}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="flex items-center gap-2 font-bold text-red-700 dark:text-red-400">
                                            <span className="h-2 w-2 animate-ping rounded-full bg-red-600"></span>
                                            EMERGENCY!
                                        </p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                            <strong>Bus:</strong> {alert.bus_number || alert.bus_id}
                                            {alert.driver_name && ` • Driver: ${alert.driver_name}`}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            📍 {alert.latitude?.toFixed?.(5) ?? alert.latitude}, {alert.longitude?.toFixed?.(5) ?? alert.longitude}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{alert.message}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                            {new Date(alert.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex w-full gap-2 sm:w-auto">
                                        <button onClick={() => { const el = document.getElementById('alerts-map'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                                            className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:flex-initial">
                                            📍 Locate
                                        </button>
                                        <button onClick={() => handleResolveAlert(alert.id)}
                                            className="flex-1 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 sm:flex-initial">
                                            ✅ Resolve
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div id="alerts-map" className="rounded-2xl border border-white/50 bg-white/70 p-4 shadow-lg backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/70">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-red-600" />
                        Emergency Locations ({alertPins.length} active, {resolvedPins.length} resolved)
                    </h4>

                    {alertPins.length === 0 && resolvedPins.length === 0 ? (
                        <div className="rounded-xl bg-gray-50 dark:bg-slate-700/30 py-16 text-center text-gray-400">
                            <MapPin className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                            <p>No alerts with GPS coordinates yet.</p>
                        </div>
                    ) : (
                        <div className="rounded-xl overflow-hidden" style={{ height: 480 }}>
                            <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                {alertPins.map((a) => (
                                    <Marker key={`active-${a.id}`} position={[Number(a.latitude), Number(a.longitude)]} icon={alertIcon}>
                                        <Popup>
                                            <div style={{ minWidth: 200 }}>
                                                <strong style={{ color: '#dc2626' }}>🚨 EMERGENCY</strong><br />
                                                <strong>Bus:</strong> {a.bus_number || a.bus_id}<br />
                                                {a.driver_name && (<><strong>Driver:</strong> {a.driver_name}<br /></>)}
                                                <small>{a.message}</small><br />
                                                <small style={{ color: '#666' }}>{new Date(a.created_at).toLocaleString()}</small><br />
                                                <a href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: 12 }}>
                                                    Open in Google Maps →
                                                </a>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}
                                {resolvedPins.map((a) => (
                                    <Marker key={`resolved-${a.id}`} position={[Number(a.latitude), Number(a.longitude)]} icon={resolvedIcon}>
                                        <Popup>
                                            <strong style={{ color: '#16a34a' }}>✅ Resolved</strong><br />
                                            <strong>Bus:</strong> {a.bus_number || a.bus_id}<br />
                                            <small>{new Date(a.resolved_at || a.created_at).toLocaleString()}</small>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2 text-center">🔴 Active emergency • 🟢 Resolved</p>
                </div>

                {resolvedAlerts.length > 0 && (
                    <div className="rounded-2xl border border-white/50 bg-white/70 p-6 shadow-lg backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/70">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">✅ Recent Resolved Alerts</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {resolvedAlerts.slice(0, 10).map((a) => (
                                <div key={a.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl text-sm dark:bg-green-900/20 dark:border-green-800">
                                    <div>
                                        <p className="font-medium">Bus {a.bus_number || a.bus_id}</p>
                                        <p className="text-xs text-gray-500">📍 {a.latitude?.toFixed?.(5)}, {a.longitude?.toFixed?.(5)}</p>
                                        <p className="text-xs text-gray-500">{new Date(a.resolved_at || a.created_at).toLocaleString()}</p>
                                    </div>
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Resolved</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderReports = () => {
        const totalRegistrations = registrations.length;
        const totalApproved = registrations.filter(r => r.status === 'approved').length;
        const totalRejected = registrations.filter(r => r.status === 'rejected').length;
        const totalPending = registrations.filter(r => r.status === 'pending').length;
        const totalStudents = students.length;
        const totalBuses = buses.length;
        // ✅ Only count active drivers
        const totalDrivers = drivers.filter(d => d.is_active !== false).length;
        const activeAlerts = alerts.filter(a => a.status === 'active').length;
        const approvalRate = totalRegistrations > 0 ? Math.round((totalApproved / totalRegistrations) * 100) : 0;
        const busUtilization = totalBuses > 0 ? Math.round((stats.activeTrips / totalBuses) * 100) : 0;

        const getRangeBounds = () => {
            const now = new Date();
            const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
            const endOfDay   = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };

            switch (dateRange) {
                case 'today': {
                    return { from: startOfDay(now), to: endOfDay(now) };
                }
                case 'week': {
                    const from = new Date(now); from.setDate(now.getDate() - 6);
                    return { from: startOfDay(from), to: endOfDay(now) };
                }
                case 'month': {
                    const from = new Date(now.getFullYear(), now.getMonth(), 1);
                    return { from: startOfDay(from), to: endOfDay(now) };
                }
                case 'custom': {
                    const from = startDate ? startOfDay(new Date(startDate)) : null;
                    const to   = endDate   ? endOfDay(new Date(endDate))     : null;
                    return { from, to };
                }
                default:
                    return { from: null, to: null };
            }
        };

        const inRange = (dateStr) => {
            const { from, to } = getRangeBounds();
            if (!from && !to) return true;
            if (!dateStr) return true;
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return true;
            if (from && d < from) return false;
            if (to && d > to) return false;
            return true;
        };

        const fRegistrations = registrations.filter(r => inRange(r.created_at));
        const fStudents      = students.filter(s => inRange(s.created_at));
        const fBuses         = buses.filter(b => inRange(b.created_at));
        const fUsers         = users.filter(u => inRange(u.created_at));
        const fAlerts        = alerts.filter(a => inRange(a.created_at));

        const reportTypes = [
            { id: 'overview',      label: '📊 Overview' },
            { id: 'registrations', label: '📋 Registrations' },
            { id: 'students',      label: '🎓 Students' },
            { id: 'buses',         label: '🚌 Buses' },
            { id: 'users',         label: '👥 Users' },
        ];

        const dateRanges = [
            { id: 'today',  label: 'Today' },
            { id: 'week',   label: 'This Week' },
            { id: 'month',  label: 'This Month' },
            { id: 'custom', label: 'Custom' },
        ];

        const overviewChartData = [
            { name: 'Pending',  value: totalPending,  color: '#f59e0b' },
            { name: 'Approved', value: totalApproved, color: '#10b981' },
            { name: 'Rejected', value: totalRejected, color: '#ef4444' },
        ].filter(d => d.value > 0);

        const busStatusData = [
            { name: 'Active',      value: fBuses.filter(b => b.status === 'active').length,      color: '#22c55e' },
            { name: 'Inactive',    value: fBuses.filter(b => b.status === 'inactive').length,    color: '#ef4444' },
            { name: 'Maintenance', value: fBuses.filter(b => b.status === 'maintenance').length, color: '#f59e0b' },
        ].filter(d => d.value > 0);

        const getReportData = () => {
            switch (reportType) {
                case 'overview':
                    return [
                        { label: 'Total Registrations', value: totalRegistrations, icon: '📋', color: 'from-blue-500 to-indigo-600' },
                        { label: 'Approved',            value: totalApproved,      icon: '✅', color: 'from-green-500 to-emerald-600' },
                        { label: 'Pending',             value: totalPending,       icon: '⏳', color: 'from-yellow-500 to-amber-600' },
                        { label: 'Rejected',            value: totalRejected,      icon: '❌', color: 'from-red-500 to-rose-600' },
                        { label: 'Students',            value: totalStudents,      icon: '🎓', color: 'from-purple-500 to-pink-600' },
                        { label: 'Buses',               value: totalBuses,         icon: '🚌', color: 'from-cyan-500 to-blue-600' },
                        { label: 'Drivers',             value: totalDrivers,       icon: '👤', color: 'from-teal-500 to-cyan-600' },
                        { label: 'Active Alerts',       value: activeAlerts,       icon: '🚨', color: 'from-red-500 to-orange-600' },
                    ];
                case 'registrations':
                    return fRegistrations.map(r => ({
                        id: r.id,
                        name: r.full_name,
                        email: r.email,
                        phone: r.phone,
                        student: r.student_name,
                        grade: r.student_grade,
                        school: r.student_school,
                        status: r.status,
                        date: r.created_at ? new Date(r.created_at).toLocaleDateString() : '—',
                    }));
                case 'students':
                    return fStudents.map(s => ({
                        id: s.id,
                        name: s.full_name,
                        grade: s.grade || 'N/A',
                        school: s.school_name || 'N/A',
                        parent: s.parent_name || 'N/A',
                        bus: s.bus_number || '--',
                        status: s.is_active ? 'Active' : 'Inactive',
                    }));
                case 'buses':
                    return fBuses.map(b => ({
                        id: b.id,
                        number: b.bus_number,
                        plate: b.plate_number,
                        driver: b.driver_name || '--',
                        capacity: b.capacity || 40,
                        status: b.status || 'inactive',
                    }));
                case 'users':
                    return fUsers.map(u => ({
                        id: u.id,
                        name: u.full_name,
                        email: u.email,
                        role: u.role,
                        phone: u.phone || '--',
                        approved: u.is_approved ? 'Yes' : 'No',
                        active: u.is_active ? 'Active' : 'Inactive',
                    }));
                default:
                    return [];
            }
        };

        const reportData = getReportData();

        const EmptyState = ({ label }) => (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-2" />
                <p>No {label} found for the selected period.</p>
            </div>
        );

        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                            <FileText size={24} className="text-blue-600 dark:text-blue-400" />
                            Reports & Analytics
                        </h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            Comprehensive reports and insights • Filter: {
                                dateRanges.find(d => d.id === dateRange)?.label || 'All time'
                            }
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleExport('pdf', reportType)}
                            disabled={isExporting}
                            className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:shadow-lg hover:shadow-red-500/30 transition-all hover:scale-105 text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                            <FileText size={16} /> {isExporting ? 'Exporting...' : 'PDF'}
                        </button>
                        <button
                            onClick={() => handleExport('csv', reportType)}
                            disabled={isExporting}
                            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/30 transition-all hover:scale-105 text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                            <Download size={16} /> {isExporting ? 'Exporting...' : 'CSV'}
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <div className="flex bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-1.5 border border-white/50 dark:border-slate-700/50">
                        {reportTypes.map((type) => (
                            <button key={type.id} onClick={() => setReportType(type.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    reportType === type.id
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-slate-700/50'
                                }`}>
                                {type.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-1.5 border border-white/50 dark:border-slate-700/50">
                        {dateRanges.map((range) => (
                            <button key={range.id} onClick={() => setDateRange(range.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    dateRange === range.id
                                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-slate-700/50'
                                }`}>
                                {range.label}
                            </button>
                        ))}
                    </div>
                </div>

                {dateRange === 'custom' && (
                    <div className="flex flex-wrap gap-3 items-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-white/50 dark:border-slate-700/50">
                        <label className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                            From:
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-white/70 dark:bg-slate-800/70 text-gray-800 dark:text-white text-sm"
                            />
                        </label>
                        <label className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                            To:
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-white/70 dark:bg-slate-800/70 text-gray-800 dark:text-white text-sm"
                            />
                        </label>
                        {(startDate || endDate) && (
                            <button
                                onClick={() => { setStartDate(''); setEndDate(''); }}
                                className="px-3 py-1.5 text-xs text-gray-500 hover:text-red-600 underline">
                                Clear
                            </button>
                        )}
                    </div>
                )}

                {reportType === 'overview' && (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                            {reportData.map((item, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group rounded-2xl border border-white/50 bg-white/70 p-5 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-800/70">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{item.value}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <span>{item.icon}</span> {item.label}
                                            </p>
                                        </div>
                                        <div className={`h-10 w-10 rounded-xl bg-gradient-to-r ${item.color} opacity-20 group-hover:opacity-40 transition`}></div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="rounded-2xl border border-white/50 bg-white/70 p-6 shadow-lg backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/70">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                                    <PieChart size={18} className="text-blue-600 dark:text-blue-400" /> Registration Status
                                </h4>
                                {overviewChartData.length === 0 ? (
                                    <EmptyState label="registration data" />
                                ) : (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <RePieChart>
                                            <Pie data={overviewChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                                                {overviewChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
                                            <Legend iconType="circle" />
                                        </RePieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                            <div className="rounded-2xl border border-white/50 bg-white/70 p-6 shadow-lg backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/70">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                                    <PieChart size={18} className="text-blue-600 dark:text-blue-400" /> Bus Status
                                </h4>
                                {busStatusData.length === 0 ? (
                                    <EmptyState label="bus data" />
                                ) : (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <RePieChart>
                                            <Pie data={busStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                                                {busStatusData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
                                            <Legend iconType="circle" />
                                        </RePieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="rounded-2xl border border-white/50 bg-gradient-to-r from-blue-600 to-indigo-600 p-6 shadow-lg text-white">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-blue-200">Approval Rate</p>
                                        <p className="text-4xl font-bold mt-1">{approvalRate}%</p>
                                        <p className="text-sm text-blue-200 mt-1">{totalApproved} out of {totalRegistrations} approved</p>
                                    </div>
                                    <div className="text-5xl opacity-50">📈</div>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-white/50 bg-gradient-to-r from-emerald-600 to-teal-600 p-6 shadow-lg text-white">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-emerald-200">Bus Utilization</p>
                                        <p className="text-4xl font-bold mt-1">{busUtilization}%</p>
                                        <p className="text-sm text-emerald-200 mt-1">{stats.activeTrips} out of {totalBuses} buses active</p>
                                    </div>
                                    <div className="text-5xl opacity-50">🚌</div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {reportType !== 'overview' && (
                    <div className="rounded-2xl border border-white/50 bg-white/70 p-6 shadow-lg backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/70">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold text-gray-700 dark:text-gray-200">
                                {reportType === 'registrations' && '📋 Registration Report'}
                                {reportType === 'students'      && '🎓 Student Report'}
                                {reportType === 'buses'         && '🚌 Bus Report'}
                                {reportType === 'users'         && '👥 User Report'}
                            </h4>
                            <span className="text-xs text-gray-400 dark:text-gray-500">{reportData.length} records</span>
                        </div>

                        {reportData.length === 0 ? (
                            <EmptyState label={reportType} />
                        ) : (
                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-gray-50 dark:bg-slate-700/50">
                                        <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {reportType === 'registrations' && (
                                                <><th className="px-3 py-2">#</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Student</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Date</th></>
                                            )}
                                            {reportType === 'students' && (
                                                <><th className="px-3 py-2">#</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Grade</th><th className="px-3 py-2">School</th><th className="px-3 py-2">Parent</th><th className="px-3 py-2">Bus</th><th className="px-3 py-2">Status</th></>
                                            )}
                                            {reportType === 'buses' && (
                                                <><th className="px-3 py-2">ID</th><th className="px-3 py-2">Number</th><th className="px-3 py-2">Plate</th><th className="px-3 py-2">Driver</th><th className="px-3 py-2">Capacity</th><th className="px-3 py-2">Status</th></>
                                            )}
                                            {reportType === 'users' && (
                                                <><th className="px-3 py-2">ID</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Approved</th><th className="px-3 py-2">Active</th></>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.map((item, index) => (
                                            <tr key={index} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition">
                                                {reportType === 'registrations' && (
                                                    <><td className="px-3 py-2 text-gray-500 dark:text-gray-400">{index + 1}</td><td className="px-3 py-2 font-medium text-gray-800 dark:text-white">{item.name}</td><td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.email}</td><td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.student}</td><td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : item.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>{item.status}</span></td><td className="px-3 py-2 text-gray-500 dark:text-gray-400">{item.date}</td></>
                                                )}
                                                {reportType === 'students' && (
                                                    <><td className="px-3 py-2 text-gray-500 dark:text-gray-400">{index + 1}</td><td className="px-3 py-2 font-medium text-gray-800 dark:text-white">{item.name}</td><td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.grade}</td><td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.school}</td><td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.parent}</td><td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.bus}</td><td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400'}`}>{item.status}</span></td></>
                                                )}
                                                {reportType === 'buses' && (
                                                    <><td className="px-3 py-2 text-gray-500 dark:text-gray-400">{item.id}</td><td className="px-3 py-2 font-medium text-gray-800 dark:text-white">{item.number}</td><td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.plate}</td><td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.driver}</td><td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.capacity}</td><td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : item.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{item.status}</span></td></>
                                                )}
                                                {reportType === 'users' && (
                                                    <><td className="px-3 py-2 text-gray-500 dark:text-gray-400">{item.id}</td><td className="px-3 py-2 font-medium text-gray-800 dark:text-white">{item.name}</td><td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.email}</td><td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.role === 'admin' ? 'bg-purple-100 text-purple-700' : item.role === 'parent' ? 'bg-blue-100 text-blue-700' : item.role === 'driver' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{item.role}</span></td><td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.approved === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.approved}</span></td><td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.active === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{item.active}</span></td></>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
        );
    };

    const renderSettings = () => (
        <div className="animate-fadeInUp rounded-2xl border border-white/50 bg-white/70 p-6 shadow-lg backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/70">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-white">
                        <Settings className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                        Settings
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Configure your system</p>
                </div>
                <button onClick={() => showToast('Settings saved successfully', 'success')} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
                    Save Changes
                </button>
            </div>
            <div className="max-w-2xl space-y-4">
                <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-slate-700 dark:bg-slate-700/30 sm:flex-row sm:items-center">
                    <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">Push Notifications</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Receive real-time alerts</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" className="peer sr-only" defaultChecked />
                        <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full dark:bg-slate-600"></div>
                    </label>
                </div>
                <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-slate-700 dark:bg-slate-700/30 sm:flex-row sm:items-center">
                    <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">GPS Tracking</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Track bus locations in real-time</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" className="peer sr-only" defaultChecked />
                        <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full dark:bg-slate-600"></div>
                    </label>
                </div>
                <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-slate-700 dark:bg-slate-700/30 sm:flex-row sm:items-center">
                    <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">Dark Mode</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Toggle dark/light theme</p>
                    </div>
                    <button onClick={() => setDarkMode(!darkMode)} className="rounded-xl bg-gray-200 px-4 py-2 transition hover:scale-105 dark:bg-slate-600">
                        {darkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />}
                    </button>
                </div>
                <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-slate-700 dark:bg-slate-700/30 sm:flex-row sm:items-center">
                    <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">System Status</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Current system health</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${isConnected ? 'animate-pulse bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{isConnected ? 'Online' : 'Offline'}</span>
                    </div>
                </div>
                <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-slate-700 dark:bg-slate-700/30 sm:flex-row sm:items-center">
                    <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">Data Refresh</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manually refresh all data</p>
                    </div>
                    <button onClick={fetchData} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 flex items-center gap-2">
                        <RefreshCw size={16} /> Refresh Now
                    </button>
                </div>
            </div>
        </div>
    );

    const StatCard = ({ title, value, subtitle, icon, color }) => (
        <div className="group rounded-2xl border border-white/50 bg-white/70 p-5 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-800/70">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                    <p className="mt-1 text-3xl font-bold text-gray-800 dark:text-white">{value}</p>
                    <p className="mt-2 text-xs text-green-600 dark:text-green-400">{subtitle}</p>
                </div>
                <div className={`rounded-2xl p-4 ${STAT_COLORS[color] || STAT_COLORS.blue}`}>
                    {icon}
                </div>
            </div>
        </div>
    );

    const QuickActionButton = ({ onClick, icon, label }) => (
        <button onClick={onClick}
            className="group rounded-2xl border border-white/50 bg-white/60 p-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 dark:border-slate-700/50 dark:bg-slate-800/60">
            <div className="transition-transform group-hover:scale-110">{icon}</div>
            <p className="mt-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400">{label}</p>
        </button>
    );

    return (
        <div className={`${darkMode ? 'dark' : ''}`}>
            <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 transition-colors duration-300 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900">
                <AnimatePresence>
                    {toast.show && (
                        <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
                            className={`fixed top-4 right-4 z-[100] px-6 py-4 rounded-2xl shadow-2xl text-white font-medium flex items-center gap-3 ${toast.type === 'success' ? 'bg-gradient-to-r from-green-600 to-emerald-600' :
                                toast.type === 'error' ? 'bg-gradient-to-r from-red-600 to-rose-600' :
                                'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
                            {toast.type === 'success' ? <CheckCircle size={20} /> :
                                toast.type === 'error' ? <XCircle size={20} /> : null}
                            {toast.message}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 🆕 Mobile backdrop — closes sidebar when tapped */}
{sidebarOpen && (
    <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={() => setSidebarOpen(false)}
    />
)}

{/* Sidebar */}
<aside className={`fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-slate-900 to-slate-800 shadow-2xl transition-transform duration-300 ease-in-out dark:from-slate-950 dark:to-slate-900 ${
    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
} lg:translate-x-0 lg:relative w-64 flex-shrink-0`}>
                    <div className="flex h-full flex-col p-4">
                        <div className="mb-8 flex items-center gap-3 px-2">
    <div className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 p-2.5 shadow-lg shadow-blue-500/25">
        <Bus className="h-6 w-6 text-white" />
    </div>
    <div className="flex-1">
        <h1 className="text-lg font-bold text-white">SchoolBus</h1>
        <p className="text-xs text-blue-300/70">Admin Panel v2.0</p>
    </div>
    {/* 🆕 Close button — mobile only */}
    <button
        onClick={() => setSidebarOpen(false)}
        className="lg:hidden rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-white/10 transition"
        aria-label="Close menu"
    >
        <X size={18} />
    </button>
</div>

                        <nav className="flex-1 space-y-1">
                            {menuItems.map((item) => (
                                <button key={item.id} onClick={() => {
    setActiveTab(item.id);
    if (window.innerWidth < 1024) setSidebarOpen(false);
}}
                                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300 ${activeTab === item.id
                                        ? 'border border-blue-500/20 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-white shadow-lg shadow-blue-500/10'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <item.icon size={20} />
                                    <span className="text-sm font-medium">{item.label}</span>
                                    {activeTab === item.id && <ChevronRight className="ml-auto h-4 w-4 text-blue-400" />}
                                </button>
                            ))}
                        </nav>

                        <div className="mt-4 border-t border-white/10 pt-4">
                            <div className="flex items-center gap-3 rounded-xl bg-white/5 px-2 py-2 transition hover:bg-white/10">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-sm font-bold text-white">
                                    {user?.full_name?.charAt(0) || 'A'}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-white">{user?.full_name || 'Admin'}</p>
                                    <p className="truncate text-xs text-gray-400">{user?.email}</p>
                                </div>
                                <button onClick={logout} className="rounded-lg p-1.5 text-gray-400 transition hover:text-red-400 hover:bg-red-500/10">
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>

                <main className="min-h-screen flex-1 overflow-hidden">
                   <header className="sticky top-0 z-40 border-b border-white/50 bg-white/60 shadow-sm backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/60">
    <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5">
        {/* LEFT — hamburger + title */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
                onClick={() => setSidebarOpen(v => !v)}
                className="lg:hidden rounded-xl p-2 text-gray-700 transition hover:bg-gray-100/70 dark:text-gray-300 dark:hover:bg-slate-700/70 flex-shrink-0"
                aria-label="Toggle menu"
            >
                {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <h2 className="hidden sm:block text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200 truncate">
                {menuItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
            </h2>
            <span className="sm:hidden text-base font-semibold text-gray-700 dark:text-gray-200 truncate">
                {menuItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
            </span>
        </div>

        {/* RIGHT — dark toggle, search, bell, connection */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            {/* 🆕 Dark mode toggle — always visible */}
            <button
                onClick={() => setDarkMode(v => !v)}
                className="rounded-xl p-2 text-gray-600 transition hover:bg-gray-100/70 dark:text-gray-400 dark:hover:bg-slate-700/70 flex-shrink-0"
                aria-label="Toggle dark mode"
                title={darkMode ? 'Light mode' : 'Dark mode'}
            >
                {darkMode
                    ? <Sun className="h-5 w-5 text-yellow-500" />
                    : <Moon className="h-5 w-5" />
                }
            </button>

            {/* Search — desktop only */}
            <div className="hidden md:flex items-center rounded-xl border border-gray-200/50 bg-white/50 px-3 py-2 dark:border-slate-700/50 dark:bg-slate-800/50">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-32 bg-transparent px-2 text-sm text-gray-700 outline-none focus:outline-none dark:text-gray-200 lg:w-48"
                />
            </div>

            {/* Notification bell */}
            <div className="relative flex-shrink-0">
                <button
                    onClick={() => setShowNotification(!showNotification)}
                    className="relative rounded-xl p-2 text-gray-600 transition hover:bg-gray-100/70 dark:text-gray-400 dark:hover:bg-slate-700/70"
                    aria-label="Notifications"
                >
                    <Bell size={20} />
                    <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500 dark:border-slate-800"></span>
                </button>

                <AnimatePresence>
                    {showNotification && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute right-0 mt-2 w-72 sm:w-80 overflow-hidden rounded-2xl border border-gray-100/50 bg-white shadow-2xl dark:border-slate-700/50 dark:bg-slate-800"
                        >
                            <div className="border-b border-gray-100 p-3 dark:border-slate-700">
                                <p className="font-semibold text-gray-700 dark:text-gray-200">Notifications</p>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {pendingUsers.length > 0 && (
                                    <div className="border-b border-gray-50 p-3 transition hover:bg-gray-50/70 dark:border-slate-700/50 dark:hover:bg-slate-700/50">
                                        <p className="text-sm text-gray-800 dark:text-gray-200">📋 {pendingUsers.length} new user(s) pending approval</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Just now</p>
                                    </div>
                                )}
                                {alerts.filter(a => a.status === 'active').length > 0 && (
                                    <div className="border-b border-gray-50 p-3 transition hover:bg-gray-50/70 dark:border-slate-700/50 dark:hover:bg-slate-700/50">
                                        <p className="text-sm text-gray-800 dark:text-gray-200">🚨 {alerts.filter(a => a.status === 'active').length} active emergency alert(s)</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">15 min ago</p>
                                    </div>
                                )}
                                {unconfirmedDropoffs.length > 0 && (
                                    <div className="border-b border-gray-50 p-3 transition hover:bg-gray-50/70 dark:border-slate-700/50 dark:hover:bg-slate-700/50">
                                        <p className="text-sm text-yellow-700 dark:text-yellow-400">⚠️ {unconfirmedDropoffs.length} unconfirmed drop-off(s)</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Check the Alerts tab</p>
                                    </div>
                                )}
                                {pendingUsers.length === 0 && alerts.filter(a => a.status === 'active').length === 0 && unconfirmedDropoffs.length === 0 && (
                                    <div className="p-4 text-center text-gray-400 dark:text-gray-500 text-sm">
                                        No new notifications
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Connection status — tablet+ only */}
            <div
                className={`hidden sm:flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium flex-shrink-0 ${
                    isConnected
                        ? 'border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}
            >
                <span className={`h-2 w-2 rounded-full ${isConnected ? 'animate-pulse bg-green-500' : 'bg-red-500'}`}></span>
                {isConnected ? 'Connected' : 'Offline'}
            </div>
        </div>
    </div>
</header>

                    <div className="p-4 lg:p-6">
                        {loading ? (
                            <div className="flex h-64 items-center justify-center">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                                    <p className="text-gray-500 dark:text-gray-400">Loading data from database...</p>
                                </div>
                            </div>
                        ) : (
                            renderContent()
                        )}
                    </div>
                </main>
            </div>

            <AnimatePresence>
                {showUserDetailModal && renderUserDetailModal()}
            </AnimatePresence>

            <AnimatePresence>
                {showQRModal && qrStudent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <QrCode className="text-green-600" />
                                    Student QR Code
                                </h3>
                                <button onClick={() => { setShowQRModal(false); setQrStudent(null); }} className="text-gray-500 hover:text-gray-700">
                                    <X size={22} />
                                </button>
                            </div>

                            <div className="text-center">
                                <p className="font-semibold text-gray-800 dark:text-white">{qrStudent.full_name}</p>
                                <p className="text-xs text-gray-500">
                                    Grade {qrStudent.grade || 'N/A'} • {qrStudent.school_name || 'N/A'}
                                </p>

                                <div id="qr-canvas-container" className="inline-block p-4 bg-white rounded-2xl mt-4 border-2 border-gray-100">
                                    <QRCodeCanvas value={qrStudent.qr_token} size={260} level="H" includeMargin={false} />
                                </div>

                                <p className="text-xs text-gray-400 mt-3">
                                    Token expires: {qrStudent.qr_token_expires
                                        ? new Date(qrStudent.qr_token_expires).toLocaleDateString()
                                        : '—'}
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mt-6">
                                <button onClick={downloadQR} className="py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                                    ⬇️ Download
                                </button>
                                <button onClick={printQR} className="py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700">
                                    🖨️ Print
                                </button>
                                <button onClick={regenerateQR} disabled={qrLoading} className="py-2 bg-yellow-600 text-white rounded-xl text-sm font-medium hover:bg-yellow-700 disabled:opacity-50">
                                    {qrLoading ? '...' : '🔄 New'}
                                </button>
                            </div>

                            <p className="text-xs text-gray-400 text-center mt-3">
                                ⚠️ Print and give this card to the student. New QR invalidates the old one.
                            </p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;