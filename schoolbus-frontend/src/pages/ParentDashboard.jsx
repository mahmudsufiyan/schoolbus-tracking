import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { LiveMap } from '../components/maps';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bus, LogOut, Wifi, WifiOff, User, MapPin, Clock, Calendar,
    Bell, Users, Menu, X, Phone, Mail, AlertTriangle, RefreshCw,
    CheckCircle, ChevronRight, GraduationCap, Shield,
    Trash2, Settings, Info, Navigation, Save, KeyRound, Loader2,
} from 'lucide-react';
import apiClient from '../api/axiosConfig';
import ParentAIChat from '../components/ParentAIChat';

const MENU_ITEMS = [
    { id: 'tracking',      label: 'Live Tracking',     icon: MapPin,   badge: null },
    { id: 'children',      label: 'My Children',       icon: Users,    badge: null },
    { id: 'notifications', label: 'Notifications',     icon: Bell,     badge: 'unread' },
    { id: 'history',       label: 'Trip History',      icon: Calendar, badge: null },
    { id: 'contact',       label: 'Emergency Contact', icon: Phone,    badge: null },
    { id: 'profile',       label: 'My Profile',        icon: User,     badge: null },
];

const ParentDashboard = () => {
    const { user, logout, updateUser } = useAuth();
    const { socket, isConnected, on, emit } = useSocket();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeView, setActiveView]   = useState('tracking');

    const [children, setChildren]                 = useState([]);
    const [selectedChildId, setSelectedChildId]   = useState(null);
    const [selectedChild, setSelectedChild]       = useState(null);
    const [busLocation, setBusLocation]           = useState(null);
    const [tripStatus, setTripStatus]             = useState(null);
    const [stops, setStops]                       = useState([]);
    const [driverInfo, setDriverInfo]             = useState(null);

    const [notifications, setNotifications] = useState([]);
    const [notifLoading, setNotifLoading]   = useState(false);

    const [tripHistory, setTripHistory]                 = useState([]);
    const [historyLoading, setHistoryLoading]           = useState(false);
    const [selectedTripId, setSelectedTripId]           = useState(null);
    const [tripDetail, setTripDetail]                   = useState(null);
    const [tripDetailLoading, setTripDetailLoading]     = useState(false);

    const [contacts, setContacts]               = useState(null);
    const [contactsLoading, setContactsLoading] = useState(false);

    const [profile, setProfile]                 = useState(null);
    const [profileLoading, setProfileLoading]   = useState(false);
    const [editingProfile, setEditingProfile]   = useState(false);
    const [profileForm, setProfileForm]         = useState({ full_name: '', phone: '', address: '' });
    const [profileSaving, setProfileSaving]     = useState(false);
    const [pwForm, setPwForm]                   = useState({ current_password: '', new_password: '' });
    const [pwSaving, setPwSaving]               = useState(false);
    const [pwMsg, setPwMsg]                     = useState('');

    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    const [stopBanner, setStopBanner] = useState(null);
    const stopBannerTimerRef = useRef(null);

    const [studentStatus, setStudentStatus] = useState({});

    const unreadCount = notifications.filter(n => !n.read).length;

    const showStopBanner = useCallback((banner) => {
        const myChildNames = (banner.students || [])
            .filter(s =>
                children.some(c =>
                    c.id === s.id ||
                    c.full_name === s.name
                )
            )
            .map(s => s.name);

        const namesText = myChildNames.length > 0
            ? myChildNames.join(', ')
            : (selectedChild?.full_name || banner.childNames || 'your child');

        setStopBanner({
            ...banner,
            childNames: namesText,
        });

        if (stopBannerTimerRef.current) {
            clearTimeout(stopBannerTimerRef.current);
        }

        stopBannerTimerRef.current = setTimeout(() => {
            setStopBanner(null);
            stopBannerTimerRef.current = null;
        }, 60000);
    }, [children, selectedChild]);

    useEffect(() => {
        return () => {
            if (stopBannerTimerRef.current) {
                clearTimeout(stopBannerTimerRef.current);
            }
        };
    }, []);

    const dismissStopBanner = () => {
        if (stopBannerTimerRef.current) {
            clearTimeout(stopBannerTimerRef.current);
            stopBannerTimerRef.current = null;
        }
        setStopBanner(null);
    };

    const fetchChildren = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/parent/children');
            const list = Array.isArray(res.data) ? res.data : [];
            setChildren(list);

            if (list.length > 0) {
                const first = list[0];
                setSelectedChildId(prev => prev ?? first.id);
                setSelectedChild(first);
                setTripStatus(first.trip_status || null);
                if (first.bus_id) {
                    try {
                        const s = await apiClient.get(`/buses/${first.bus_id}/stops`);
                        setStops(Array.isArray(s.data) ? s.data : []);
                    } catch { setStops([]); }
                }
            }
            setError('');
        } catch (err) {
            console.error('fetchChildren', err);
            setError('Failed to load children data.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchNotifications = useCallback(async () => {
        setNotifLoading(true);
        try {
            const res = await apiClient.get('/parent/notifications');
            setNotifications(Array.isArray(res.data) ? res.data : []);
        } catch {
        } finally {
            setNotifLoading(false);
        }
    }, []);

    const markOneRead = async (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        try { await apiClient.patch(`/parent/notifications/${id}/read`); }
        catch { fetchNotifications(); }
    };

    const markAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        try { await apiClient.patch('/parent/notifications/read-all'); }
        catch { fetchNotifications(); }
    };

    const clearNotifications = async () => {
        if (!window.confirm('Clear all notifications?')) return;
        setNotifications([]);
        try { await apiClient.delete('/parent/notifications'); }
        catch { fetchNotifications(); }
    };

    const fetchTripHistory = useCallback(async () => {
        if (!selectedChild?.bus_id) return;
        setHistoryLoading(true);
        try {
            const params = new URLSearchParams({ bus_id: selectedChild.bus_id });
            if (selectedChild.id) params.append('child_id', selectedChild.id);
            const res = await apiClient.get(`/trips/history?${params}`);
            setTripHistory(Array.isArray(res.data) ? res.data : []);
        } catch { setTripHistory([]); }
        finally { setHistoryLoading(false); }
    }, [selectedChild]);

    const openTripDetail = async (tripId) => {
        setSelectedTripId(tripId);
        setTripDetailLoading(true);
        try {
            const res = await apiClient.get(`/trips/${tripId}`);
            setTripDetail(res.data);
        } catch { setTripDetail(null); }
        finally { setTripDetailLoading(false); }
    };

    const fetchDriverInfo = useCallback(async () => {
        if (!selectedChild?.bus_id) { setDriverInfo(null); return; }
        try {
            const res = await apiClient.get(`/buses/${selectedChild.bus_id}`);
            const bus = res.data;
            if (bus?.driver_id || bus?.driver_name) {
                setDriverInfo({
                    id: bus.driver_id,
                    full_name: bus.driver_name || 'Driver',
                    phone: bus.driver_phone || null,
                    bus_number: bus.bus_number,
                });
            } else setDriverInfo(null);
        } catch { setDriverInfo(null); }
    }, [selectedChild]);

    const fetchContacts = useCallback(async () => {
        setContactsLoading(true);
        try {
            const res = await apiClient.get('/parent/contacts');
            setContacts(res.data || null);
        } catch { setContacts(null); }
        finally { setContactsLoading(false); }
    }, []);

    const fetchProfile = useCallback(async () => {
        setProfileLoading(true);
        try {
            const res = await apiClient.get('/parent/profile');
            setProfile(res.data);
            setProfileForm({
                full_name: res.data?.full_name || '',
                phone:     res.data?.phone     || '',
                address:   res.data?.address   || '',
            });
        } catch { setProfile(null); }
        finally { setProfileLoading(false); }
    }, []);

    const saveProfile = async () => {
        setProfileSaving(true);
        try {
            const res = await apiClient.put('/parent/profile', profileForm);
            setProfile(res.data);
            updateUser?.(res.data);
            setEditingProfile(false);
            setError('');
        } catch { setError('Failed to save profile.'); }
        finally { setProfileSaving(false); }
    };

    const changePassword = async (e) => {
        e.preventDefault();
        setPwSaving(true);
        setPwMsg('');
        try {
            await apiClient.post('/parent/change-password', pwForm);
            setPwMsg('✅ Password changed.');
            setPwForm({ current_password: '', new_password: '' });
        } catch (err) {
            setPwMsg(err?.response?.data?.message || '❌ Failed to change password.');
        } finally { setPwSaving(false); }
    };

    useEffect(() => { fetchChildren(); fetchNotifications(); }, [fetchChildren, fetchNotifications]);

    useEffect(() => {
        const child = children.find(c => c.id === selectedChildId);
        setSelectedChild(child || null);
        setTripStatus(child?.trip_status || null);
        setBusLocation(null);

        if (child?.bus_id) {
            apiClient.get(`/buses/${child.bus_id}/stops`)
                .then(r => setStops(Array.isArray(r.data) ? r.data : []))
                .catch(() => setStops([]));
            fetchDriverInfo();
        } else {
            setStops([]);
            setDriverInfo(null);
        }
    }, [selectedChildId, children, fetchDriverInfo]);

    useEffect(() => {
        if (activeView === 'history') fetchTripHistory();
        if (activeView === 'contact') fetchContacts();
        if (activeView === 'profile') fetchProfile();
        if (activeView === 'notifications') fetchNotifications();
    }, [activeView, fetchTripHistory, fetchContacts, fetchProfile, fetchNotifications]);

    useEffect(() => {
        if (!socket || !isConnected || !user?.id) return;
        emit('join-parent-room', user.id);
        const unsubJoined = on('joined-rooms', r => console.log('✅ joined rooms', r));
        const unsubAuth   = on('authenticated',  d => console.log('✅ socket auth', d));
        return () => { unsubJoined?.(); unsubAuth?.(); };
    }, [socket, isConnected, user, emit, on]);

    useEffect(() => {
        if (!socket) return;

        const unsubStarted = on('trip-started', () => {
            setTripStatus('in_progress');
            fetchNotifications();
        });
        const unsubEnded = on('trip-ended', () => {
            setTripStatus('completed');
            setBusLocation(null);
            fetchNotifications();
            if (activeView === 'history') fetchTripHistory();
        });
        const unsubLoc = on('bus-location-updated', (data) => {
            const lat = parseFloat(data.latitude);
            const lng = parseFloat(data.longitude);
            if (isNaN(lat) || isNaN(lng)) return;
            setBusLocation({
                latitude: lat,
                longitude: lng,
                speed: parseFloat(data.speed) || 0,
                timestamp: data.timestamp,
            });
        });
        const unsubScan = on('student-scanned', () => fetchNotifications());

        const unsubApproach = on('stop-approaching', (data) => {
            console.log('📢 Parent heard stop-approaching:', data);
            showStopBanner({
                type: 'approaching',
                stopName: data.stop_name,
                stopId: data.stop_id,
                students: data.students || [],
                busNumber: data.bus_number,
            });
            fetchNotifications();
        });

        const unsubStopArrived = on('stop-arrived', (data) => {
            console.log('📍 Parent heard stop-arrived:', data);
            showStopBanner({
                type: 'arrived',
                stopName: data.stop_name,
                stopId: data.stop_id,
                students: data.students || [],
                busNumber: data.bus_number,
            });
            fetchNotifications();
        });

        const unsubPickedUp = on('student-picked-up', (data) => {
            console.log('🟢 Parent heard student-picked-up:', data);
            setStudentStatus(prev => ({
                ...prev,
                [data.student_id]: {
                    ...(prev[data.student_id] || {}),
                    picked_up_at: new Date().toISOString(),
                    stop_name: data.stop_name,
                },
            }));
            fetchNotifications();
        });

        const unsubDroppedOff = on('student-dropped-off', (data) => {
            console.log('🚏 Parent heard student-dropped-off:', data);
            setStudentStatus(prev => ({
                ...prev,
                [data.student_id]: {
                    ...(prev[data.student_id] || {}),
                    dropped_off_at: new Date().toISOString(),
                    stop_name: data.stop_name,
                    event_id: data.event_id,
                },
            }));
            showStopBanner({
                type: 'dropped_off',
                stopName: data.stop_name,
                stopId: data.stop_id,
                students: [{ id: data.student_id, name: data.student_name }],
                childNames: data.student_name,
                eventId: data.event_id,
                studentId: data.student_id,
            });
            fetchNotifications();
        });

        const unsubConfirmed = on('dropoff-confirmed', (data) => {
            setStudentStatus(prev => ({
                ...prev,
                [data.student_id]: {
                    ...(prev[data.student_id] || {}),
                    confirmed_at: new Date().toISOString(),
                },
            }));
        });

        return () => {
            unsubStarted?.();
            unsubEnded?.();
            unsubLoc?.();
            unsubScan?.();
            unsubApproach?.();
            unsubStopArrived?.();
            unsubPickedUp?.();
            unsubDroppedOff?.();
            unsubConfirmed?.();
        };
    }, [socket, on, fetchNotifications, fetchTripHistory, activeView, showStopBanner]);

    const formatDateTime = (d) => {
        try {
            return new Date(d).toLocaleString('en-US', {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });
        } catch { return '--'; }
    };

    const fmtDuration = (start, end) => {
        if (!start || !end) return '—';
        const mins = Math.round((new Date(end) - new Date(start)) / 60000);
        if (mins < 60) return `${mins} min`;
        return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    };

    const confirmReceipt = async (studentId) => {
        const st = studentStatus[studentId];
        if (!st?.event_id) {
            setError('No drop-off to confirm');
            return;
        }
        try {
            const res = await apiClient.post(`/students/${studentId}/confirm-receipt`, {
                event_id: st.event_id,
            });
            setStudentStatus(prev => ({
                ...prev,
                [studentId]: {
                    ...prev[studentId],
                    confirmed_at: res.data.event.parent_confirmed_at,
                },
            }));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to confirm');
        }
    };

    const renderTracking = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden">
                <div className="h-80 lg:h-[500px]">
                    <LiveMap
                        busId={selectedChild?.bus_id}
                        stops={stops}
                        location={busLocation}
                        center={busLocation
                            ? [busLocation.latitude, busLocation.longitude]
                            : [9.0320, 38.7469]}
                        zoom={14}
                    />
                </div>
                <div className="p-4 border-t flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                            <span className="text-gray-600">Bus</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-gray-600">Stops</span>
                        </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                        tripStatus === 'in_progress' ? 'bg-green-100 text-green-700' :
                        tripStatus === 'completed'   ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                    }`}>
                        {tripStatus === 'in_progress' ? '🟢 On Route' :
                         tripStatus === 'completed'   ? '✅ Completed' :
                         '⏸️ Not Started'}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4">
                    <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-3">
                        <User size={20} className="text-green-600" /> Student
                    </h3>
                    {selectedChild ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
                                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">
                                    {selectedChild.full_name?.charAt(0) || '?'}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-800 truncate">{selectedChild.full_name}</p>
                                    <p className="text-xs text-gray-500">Grade: {selectedChild.grade || 'N/A'}</p>
                                    <p className="text-xs text-gray-500 truncate">{selectedChild.school_name || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-blue-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-gray-500">Bus</p>
                                    <p className="text-sm font-semibold text-blue-600">{selectedChild.bus_number || 'N/A'}</p>
                                </div>
                                <div className="bg-yellow-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-gray-500">Trip</p>
                                    <p className="text-sm font-semibold text-yellow-600">
                                        {tripStatus === 'in_progress' ? 'Active' :
                                         tripStatus === 'completed' ? 'Done' : 'Idle'}
                                    </p>
                                </div>
                            </div>

                            {selectedChild && studentStatus[selectedChild.id] && (
                                <div className={`rounded-xl p-3 border ${
                                    studentStatus[selectedChild.id].confirmed_at
                                        ? 'bg-emerald-50 border-emerald-200'
                                    : studentStatus[selectedChild.id].dropped_off_at
                                        ? 'bg-blue-50 border-blue-200'
                                    : studentStatus[selectedChild.id].picked_up_at
                                        ? 'bg-green-50 border-green-200'
                                        : 'bg-gray-50 border-gray-200'
                                }`}>
                                    <p className="text-xs text-gray-500 mb-1">Child status</p>
                                    <p className="text-sm font-semibold">
                                        {studentStatus[selectedChild.id].confirmed_at
                                            ? `✅ Safely received at ${new Date(studentStatus[selectedChild.id].confirmed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                                        : studentStatus[selectedChild.id].dropped_off_at
                                            ? `🚏 Dropped off — awaiting your confirmation`
                                        : studentStatus[selectedChild.id].picked_up_at
                                            ? `🟢 On the bus — picked up at ${new Date(studentStatus[selectedChild.id].picked_up_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                                            : ''}
                                    </p>
                                </div>
                            )}

                            {selectedChild?.stop_name && (
                                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <MapPin size={12} className="text-emerald-600" /> Pickup / Drop-off Stop
                                    </p>
                                    <p className="text-sm font-semibold text-emerald-700">
                                        {selectedChild.stop_name}
                                    </p>
                                    {selectedChild.stop_order && (
                                        <p className="text-xs text-gray-400">
                                            Stop #{selectedChild.stop_order} on the route
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : <p className="text-gray-400 text-sm">Select a child</p>}
                </div>

                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                        <Navigation size={16} className="text-blue-600" /> Live Location
                    </h3>
                    {busLocation ? (
                        <>
                            <p className="text-xs font-mono text-gray-600">
                                {busLocation.latitude.toFixed(5)}, {busLocation.longitude.toFixed(5)}
                            </p>
                            {busLocation.speed > 0 && (
                                <p className="text-xs text-green-600 mt-1">
                                    🚀 Speed: {(busLocation.speed * 3.6).toFixed(1)} km/h
                                </p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                Live tracking active
                            </div>
                        </>
                    ) : (
                        <p className="text-xs text-gray-400">
                            {tripStatus === 'in_progress' ? 'Waiting for bus location…' : 'Bus not started yet'}
                        </p>
                    )}
                </div>

                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                        <Bell size={16} className="text-green-600" /> Latest Updates
                    </h3>
                    {notifications.length === 0 ? (
                        <p className="text-xs text-gray-400">No updates yet.</p>
                    ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {notifications.slice(0, 3).map(n => (
                                <div key={n.id}
                                     onClick={() => !n.read && markOneRead(n.id)}
                                     className={`p-2 rounded-lg bg-gray-50 border-l-4 text-xs cursor-pointer ${
                                         !n.read ? 'border-green-500' : 'border-gray-300 opacity-70'
                                     }`}>
                                    <p className="font-semibold text-gray-700">{n.title}</p>
                                    <p className="text-gray-500">{n.message}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    <button
                        onClick={() => setActiveView('notifications')}
                        className="w-full mt-2 text-xs text-green-700 hover:text-green-900 font-medium flex items-center justify-center gap-1">
                        View all <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderChildren = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-800">My Children ({children.length})</h3>
                <button onClick={fetchChildren}
                        className="px-3 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm flex items-center gap-1">
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {children.length === 0 ? (
                <div className="bg-white/70 rounded-2xl p-8 text-center">
                    <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-2" />
                    <p className="text-gray-500">No children assigned. Contact admin.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {children.map(child => (
                        <motion.div
                            key={child.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border p-5 cursor-pointer transition-all hover:shadow-xl ${
                                selectedChildId === child.id ? 'border-green-500' : 'border-white/50'
                            }`}
                            onClick={() => { setSelectedChildId(child.id); setActiveView('tracking'); }}>
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xl">
                                    {child.full_name?.charAt(0) || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-800 truncate">{child.full_name}</p>
                                    <p className="text-xs text-gray-500">Grade: {child.grade || 'N/A'}</p>
                                    <p className="text-xs text-gray-500 truncate">{child.school_name || 'N/A'}</p>
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                            🚌 {child.bus_number || 'N/A'}
                                        </span>
                                        {child.stop_name && (
                                            <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                                📍 {child.stop_name}
                                            </span>
                                        )}
                                        <span className={`px-2 py-1 rounded-full ${
                                            child.trip_status === 'in_progress'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {child.trip_status === 'in_progress' ? '🟢 On Route' : '⏸️ Idle'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedChildId(child.id); setActiveView('tracking'); }}
                                className="w-full mt-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-medium">
                                Track This Child →
                            </button>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderNotifications = () => (
        <div className="space-y-4 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-semibold text-gray-800">Notifications</h3>
                    <p className="text-xs text-gray-500">
                        {notifLoading ? 'Loading…' : `${unreadCount} unread of ${notifications.length} total`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchNotifications}
                            className="px-3 py-2 bg-white border rounded-xl text-sm flex items-center gap-1">
                        <RefreshCw size={14} className={notifLoading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button onClick={markAllRead} disabled={unreadCount === 0}
                            className="px-3 py-2 bg-white border rounded-xl text-sm disabled:opacity-50">
                        Mark all read
                    </button>
                    <button onClick={clearNotifications} disabled={notifications.length === 0}
                            className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm disabled:opacity-50 flex items-center gap-1">
                        <Trash2 size={14} /> Clear
                    </button>
                </div>
            </div>

            {notifLoading && notifications.length === 0 ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-green-600" size={36} />
                </div>
            ) : notifications.length === 0 ? (
                <div className="bg-white/70 rounded-2xl p-12 text-center">
                    <Bell className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-500">No notifications yet.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {notifications.map(n => (
                        <div key={n.id}
                             onClick={() => !n.read && markOneRead(n.id)}
                             className={`bg-white/70 rounded-xl p-4 border-l-4 cursor-pointer transition ${
                                 n.type === 'trip-started'        ? 'border-green-500' :
                                 n.type === 'trip-ended'          ? 'border-blue-500' :
                                 n.type === 'stop-approaching'    ? 'border-orange-500' :
                                 n.type === 'stop-arrived'        ? 'border-purple-500' :
                                 n.type === 'student-picked-up'   ? 'border-green-500' :
                                 n.type === 'student-dropped-off' ? 'border-blue-500' :
                                 n.type === 'student-scanned'     ? 'border-yellow-500' :
                                 n.type === 'pickup-time'         ? 'border-purple-500' :
                                 n.type === 'emergency'           ? 'border-red-500' :
                                 'border-yellow-500'
                             } ${!n.read ? 'shadow-md' : 'opacity-70'}`}>
                            <div className="flex justify-between items-start gap-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-800">{n.title}</p>
                                    <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {formatDateTime(n.created_at || n.timestamp)}
                                    </p>
                                </div>
                                {!n.read && <span className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1 flex-shrink-0" />}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderHistory = () => (
        <div className="space-y-4 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-800">Trip History</h3>
                <button onClick={fetchTripHistory} disabled={historyLoading}
                        className="px-3 py-2 bg-green-600 text-white rounded-xl text-sm flex items-center gap-1 disabled:opacity-50">
                    <RefreshCw size={14} className={historyLoading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {historyLoading ? (
                <div className="flex justify-center py-12">
                    <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : tripHistory.length === 0 ? (
                <div className="bg-white/70 rounded-2xl p-12 text-center">
                    <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-500">No trips recorded yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tripHistory.map(trip => (
                        <div key={trip.id}
                             onClick={() => openTripDetail(trip.id)}
                             className="bg-white/70 rounded-xl p-4 shadow-md hover:shadow-lg cursor-pointer transition">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold flex items-center gap-2">
                                        <Bus size={16} className="text-blue-600" />
                                        Bus {trip.bus_number || selectedChild?.bus_number || 'N/A'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {formatDateTime(trip.started_at)}
                                        {trip.ended_at && ` → ${formatDateTime(trip.ended_at)}`}
                                    </p>
                                    <div className="mt-2 flex gap-2 text-xs flex-wrap">
                                        <span className={`px-2 py-0.5 rounded-full ${
                                            trip.ended_at ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {trip.ended_at ? 'Completed' : 'In progress'}
                                        </span>
                                        {trip.ended_at && (
                                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                                ⏱ {fmtDuration(trip.started_at, trip.ended_at)}
                                            </span>
                                        )}
                                        {trip.distance_km && (
                                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                                📏 {trip.distance_km} km
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight className="text-gray-400" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {selectedTripId && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
                        onClick={() => { setSelectedTripId(null); setTripDetail(null); }}>
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-lg">Trip Detail</h4>
                                <button onClick={() => { setSelectedTripId(null); setTripDetail(null); }}>
                                    <X size={20} />
                                </button>
                            </div>
                            {tripDetailLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="animate-spin text-green-600" />
                                </div>
                            ) : tripDetail ? (
                                <div className="space-y-3 text-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-gray-50 p-3 rounded-xl">
                                            <p className="text-xs text-gray-500">Bus</p>
                                            <p className="font-semibold">{tripDetail.bus_number || '—'}</p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-xl">
                                            <p className="text-xs text-gray-500">Duration</p>
                                            <p className="font-semibold">
                                                {fmtDuration(tripDetail.started_at, tripDetail.ended_at)}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-xl">
                                            <p className="text-xs text-gray-500">Started</p>
                                            <p className="font-semibold">{formatDateTime(tripDetail.started_at)}</p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-xl">
                                            <p className="text-xs text-gray-500">Ended</p>
                                            <p className="font-semibold">{formatDateTime(tripDetail.ended_at)}</p>
                                        </div>
                                    </div>
                                    {Array.isArray(tripDetail.stops_visited) && tripDetail.stops_visited.length > 0 && (
                                        <div>
                                            <p className="font-semibold mb-2 mt-2">Stops</p>
                                            <div className="space-y-1">
                                                {tripDetail.stops_visited.map((s, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 p-2 rounded-lg">
                                                        <MapPin size={14} className="text-green-600" />
                                                        <span className="flex-1">{s.name || s.stop_name}</span>
                                                        <span className="text-gray-400">
                                                            {s.arrived_at ? formatDateTime(s.arrived_at) : '—'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : <p className="text-gray-500">Failed to load detail.</p>}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    const renderContact = () => {
        if (contactsLoading) return (
            <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-green-600" size={36} />
            </div>
        );
        if (!contacts) return (
            <div className="bg-white/70 rounded-2xl p-8 text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-2" />
                <p className="text-gray-500">Contacts unavailable.</p>
                <button onClick={fetchContacts} className="mt-3 text-sm text-green-700 underline">Retry</button>
            </div>
        );

        const { driver, school, admin, emergency, support } = contacts;

        return (
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-800">Emergency & Contact</h3>
                    <button onClick={fetchContacts}
                            className="px-3 py-2 bg-white border rounded-xl text-sm flex items-center gap-1">
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>

                <div className="bg-white/70 rounded-2xl shadow p-5">
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <Bus size={18} className="text-blue-600" /> Bus Driver
                    </h4>
                    {(driverInfo || driver) ? (() => {
                        const d = driverInfo || driver;
                        return (
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                                    {d.full_name?.charAt(0) || 'D'}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold">{d.full_name}</p>
                                    <p className="text-xs text-gray-500">Bus: {d.bus_number || 'N/A'}</p>
                                    {d.phone && <p className="text-xs text-gray-500">{d.phone}</p>}
                                </div>
                                {d.phone && (
                                    <a href={`tel:${d.phone}`}
                                       className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm flex items-center gap-1">
                                        <Phone size={14} /> Call
                                    </a>
                                )}
                            </div>
                        );
                    })() : <p className="text-sm text-gray-400">Driver info not available.</p>}
                </div>

                <div className="bg-white/70 rounded-2xl shadow p-5">
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <GraduationCap size={18} className="text-purple-600" /> School
                    </h4>
                    <p className="font-medium">{school?.name || selectedChild?.school_name || 'Not set'}</p>
                    {school?.address && <p className="text-xs text-gray-500 mt-1">{school.address}</p>}
                    {admin && (
                        <div className="mt-3 flex items-center gap-3 bg-purple-50 rounded-xl p-3">
                            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                                {admin.full_name?.charAt(0) || 'A'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{admin.full_name}</p>
                                <p className="text-xs text-gray-500">{admin.role || 'Administrator'}</p>
                            </div>
                            {admin.phone && (
                                <a href={`tel:${admin.phone}`}
                                   className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs flex items-center gap-1">
                                    <Phone size={12} /> Call
                                </a>
                            )}
                        </div>
                    )}
                </div>

                {Array.isArray(emergency) && emergency.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                        <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                            <Shield size={18} /> Emergency
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            {emergency.map((e, i) => (
                                <a key={i} href={`tel:${e.phone}`}
                                   className="px-4 py-3 bg-red-600 text-white rounded-xl text-center font-medium text-sm">
                                    {e.label}
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {support && (
                    <div className="bg-white/70 rounded-2xl shadow p-5">
                        <h4 className="font-semibold flex items-center gap-2 mb-3">
                            <Info size={18} /> Support
                        </h4>
                        <div className="space-y-2 text-sm">
                            {support.email && (
                                <a href={`mailto:${support.email}`} className="flex items-center gap-2 text-gray-600">
                                    <Mail size={16} /> {support.email}
                                </a>
                            )}
                            {support.phone && (
                                <a href={`tel:${support.phone}`} className="flex items-center gap-2 text-gray-600">
                                    <Phone size={16} /> {support.phone}
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderProfile = () => {
        if (profileLoading && !profile) return (
            <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-green-600" size={36} />
            </div>
        );

        const p = profile || user || {};

        return (
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-800">My Profile</h3>
                    <button onClick={fetchProfile}
                            className="px-3 py-2 bg-white border rounded-xl text-sm flex items-center gap-1">
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>

                <div className="bg-white/70 rounded-2xl shadow p-6">
                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-3xl">
                            {p.full_name?.charAt(0) || 'P'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xl font-bold truncate">{p.full_name || 'Parent'}</p>
                            <p className="text-sm text-gray-500 truncate">{p.email}</p>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">
                                {p.role || 'parent'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs text-gray-500">Phone</p>
                            <p className="text-sm font-medium">{p.phone || '—'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs text-gray-500">Children</p>
                            <p className="text-sm font-medium">{children.length} assigned</p>
                        </div>
                        {p.address && (
                            <div className="bg-gray-50 rounded-xl p-4 col-span-2">
                                <p className="text-xs text-gray-500">Address</p>
                                <p className="text-sm font-medium">{p.address}</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setEditingProfile(v => !v)}
                        className="w-full mt-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                        <Settings size={16} /> {editingProfile ? 'Cancel' : 'Edit Profile'}
                    </button>
                </div>

                <AnimatePresence>
                    {editingProfile && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-white/70 rounded-2xl shadow p-5 space-y-3 overflow-hidden">
                            <div>
                                <label className="text-xs text-gray-500">Full Name</label>
                                <input value={profileForm.full_name}
                                       onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })}
                                       className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Phone</label>
                                <input value={profileForm.phone}
                                       onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                                       className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Address</label>
                                <input value={profileForm.address}
                                       onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                                       className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" />
                            </div>
                            <button onClick={saveProfile} disabled={profileSaving}
                                    className="w-full py-2.5 bg-green-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                                {profileSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {profileSaving ? 'Saving…' : 'Save Changes'}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="bg-white/70 rounded-2xl shadow p-5">
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <KeyRound size={18} className="text-yellow-600" /> Change Password
                    </h4>
                    <form onSubmit={changePassword} className="space-y-3">
                        <input type="password" placeholder="Current password" required
                               value={pwForm.current_password}
                               onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })}
                               className="w-full px-3 py-2 border rounded-xl text-sm" />
                        <input type="password" placeholder="New password (min 6 chars)" required minLength={6}
                               value={pwForm.new_password}
                               onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })}
                               className="w-full px-3 py-2 border rounded-xl text-sm" />
                        <button disabled={pwSaving}
                                className="w-full py-2.5 bg-yellow-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                            {pwSaving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                            {pwSaving ? 'Updating…' : 'Update Password'}
                        </button>
                        {pwMsg && <p className="text-xs text-gray-600">{pwMsg}</p>}
                    </form>
                </div>

                <div className="bg-white/70 rounded-2xl shadow p-5">
                    <button onClick={logout}
                            className="w-full py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium flex items-center justify-center gap-2">
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </div>
        );
    };

    const renderActiveView = () => {
        switch (activeView) {
            case 'tracking':      return renderTracking();
            case 'children':      return renderChildren();
            case 'notifications': return renderNotifications();
            case 'history':       return renderHistory();
            case 'contact':       return renderContact();
            case 'profile':       return renderProfile();
            default:              return renderTracking();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-green-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500">Loading…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex">
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="fixed top-4 left-4 z-50 lg:hidden bg-white p-2.5 rounded-xl shadow-lg">
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <aside className={`fixed inset-y-0 left-0 z-40 bg-emerald-900 shadow-2xl transition-all duration-300 ${
                sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'
            } lg:relative lg:translate-x-0 lg:block flex-shrink-0`}>
                <div className="flex flex-col h-full p-4">
                    <div className="flex items-center gap-3 mb-6 px-2 pt-4 lg:pt-0">
                        <div className="bg-green-500 p-2 rounded-xl">
                            <Bus size={22} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-lg">SchoolBus</h1>
                            <p className="text-xs text-green-300">Parent Panel</p>
                        </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">
                                {user?.full_name?.charAt(0) || 'P'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-semibold truncate">{user?.full_name || 'Parent'}</p>
                                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 space-y-1">
                        {MENU_ITEMS.map(item => {
                            const isActive = activeView === item.id;
                            const badgeCount = item.badge === 'unread' ? unreadCount : 0;
                            return (
                                <button key={item.id}
                                        onClick={() => { setActiveView(item.id); setSidebarOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl ${
                                            isActive
                                                ? 'bg-green-600/30 text-white border border-green-500/30'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}>
                                    <item.icon size={18} />
                                    <span className="text-sm flex-1 text-left">{item.label}</span>
                                    {badgeCount > 0 && (
                                        <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs">
                                            {badgeCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    <button onClick={logout}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 mt-4 border-t border-white/10 pt-4">
                        <LogOut size={18} />
                        <span className="text-sm">Logout</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 min-h-screen overflow-hidden">
                <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-xl border-b p-3 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-700 hidden sm:block">
                        {MENU_ITEMS.find(m => m.id === activeView)?.label}
                    </h2>
                    <div className="flex items-center gap-3">
                        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
                            isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                            {isConnected ? 'Connected' : 'Offline'}
                        </div>
                        {['tracking', 'history', 'contact'].includes(activeView) && children.length > 0 && (
                            <select value={selectedChildId || ''}
                                    onChange={(e) => setSelectedChildId(e.target.value)}
                                    className="px-3 py-1.5 bg-white border rounded-xl text-sm">
                                {children.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.full_name} ({c.bus_number || 'N/A'})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </header>

                <div className="p-4 lg:p-6">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex gap-2">
                            <AlertTriangle size={18} />
                            <span>{error}</span>
                            <button onClick={() => setError('')} className="ml-auto"><X size={16} /></button>
                        </div>
                    )}

                    <AnimatePresence>
                        {activeView === 'tracking' && stopBanner && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={`mb-4 px-4 py-4 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3 shadow-lg ${
                                    stopBanner.type === 'arrived'
                                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-2 border-emerald-600'
                                    : stopBanner.type === 'dropped_off'
                                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-2 border-blue-600'
                                    : 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-2 border-yellow-500'
                                }`}>
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center">
                                            <span className="text-xl">
                                                {stopBanner.type === 'arrived' ? '📍' :
                                                 stopBanner.type === 'dropped_off' ? '✅' : '📢'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm sm:text-base">
                                            {stopBanner.type === 'arrived'
                                                ? `Bus at ${stopBanner.stopName}`
                                                : stopBanner.type === 'dropped_off'
                                                    ? `${stopBanner.childNames} dropped off at ${stopBanner.stopName}`
                                                    : `Approaching ${stopBanner.stopName}`}
                                        </p>
                                        <p className="text-xs sm:text-sm opacity-90">
                                            {stopBanner.type === 'arrived'
                                                ? `Please come out for ${stopBanner.childNames}`
                                                : stopBanner.type === 'dropped_off'
                                                    ? 'Please confirm you received them below.'
                                                    : `~2 minutes away — get ready for ${stopBanner.childNames}`}
                                        </p>

                                        {stopBanner.type === 'dropped_off' && stopBanner.studentId && (
                                            <>
                                                {studentStatus[stopBanner.studentId]?.confirmed_at ? (
                                                    <p className="text-xs mt-2 bg-white/20 rounded-lg px-3 py-1.5 inline-block font-medium">
                                                        ✅ Confirmed at {new Date(studentStatus[stopBanner.studentId].confirmed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                ) : (
                                                    <button
                                                        onClick={() => confirmReceipt(stopBanner.studentId)}
                                                        className="mt-2 px-4 py-2 bg-white text-blue-700 font-semibold rounded-lg text-sm hover:bg-blue-50 transition shadow-sm">
                                                        ✅ I received {stopBanner.childNames}
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={dismissStopBanner}
                                    className="flex-shrink-0 self-start sm:self-center p-1.5 rounded-lg hover:bg-white/20 transition"
                                    aria-label="Dismiss">
                                    <X size={18} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {activeView === 'tracking' && !stopBanner && tripStatus === 'in_progress' && (
                        (() => {
                            const myChild = selectedChild;
                            const status = myChild ? studentStatus[myChild.id] : null;

                            if (status?.confirmed_at) {
                                return (
                                    <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2">
                                        <CheckCircle size={18} />
                                        <span>✅ Trip complete — {myChild.full_name} safely received.</span>
                                    </div>
                                );
                            }
                            if (status?.dropped_off_at) {
                                return (
                                    <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl flex items-center gap-2">
                                        <span className="text-lg">🚏</span>
                                        <span>Dropped off — please confirm receipt above.</span>
                                    </div>
                                );
                            }
                            if (status?.picked_up_at) {
                                return (
                                    <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                                        <span>🟢 {myChild.full_name} is on the bus. Live tracking active.</span>
                                    </div>
                                );
                            }
                            return (
                                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-pulse">
                                    <div className="w-2 h-2 bg-green-600 rounded-full animate-ping"></div>
                                    <span>🚌 Bus is on the way! Live tracking active.</span>
                                </div>
                            );
                        })()
                    )}
                    {activeView === 'tracking' && !stopBanner && tripStatus === 'completed' && (
                        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl flex items-center gap-2">
                            <CheckCircle size={18} />
                            <span>✅ Trip completed. Bus has arrived.</span>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        <motion.div key={activeView}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}>
                            {renderActiveView()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* 🆕 AI Chat Widget — already wired up */}
            <ParentAIChat />
        </div>
    );
};

export default ParentDashboard;