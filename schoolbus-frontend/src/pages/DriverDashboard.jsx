import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bus, LogOut, Wifi, WifiOff, Navigation, MapPin, QrCode, Clock,
    Users, CheckCircle, XCircle, AlertTriangle, Menu, X, RefreshCw,
    Camera, Phone, Shield, Bell,
} from 'lucide-react';
import apiClient from '../api/axiosConfig';

// ============================================================
// HOOK: useGeolocation
// ============================================================
const useGeolocation = () => {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocation not supported');
            setLoading(false);
            setLocation({ latitude: 9.0320, longitude: 38.7469, speed: 0, accuracy: 0 });
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setLocation({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    speed: pos.coords.speed || 0,
                    accuracy: pos.coords.accuracy,
                });
                setError(null);
                setLoading(false);
            },
            (err) => {
                setError(err.message);
                setLoading(false);
                setLocation({ latitude: 9.0320, longitude: 38.7469, speed: 0, accuracy: 0 });
            },
            { enableHighAccuracy: true, maximumAge: 10000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    return { location, error, loading };
};

// ============================================================
// GPSStatus
// ============================================================
const GPSStatus = ({ isActive, location, error, loading }) => {
    if (loading) return <span className="text-sm text-gray-400">⏳ Locating…</span>;
    if (error) return <span className="text-sm text-red-500">❌ GPS error</span>;
    if (!location) return <span className="text-sm text-gray-400">📍 No location</span>;
    return (
        <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-green-500" />
            <span className="text-gray-600 hidden sm:inline">
                {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </span>
            {isActive && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
        </div>
    );
};

// ============================================================
// CameraScanner
// ============================================================
const CameraScanner = ({ onResult, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const scannerRef = useRef(null);
    const lastScanRef = useRef({ text: '', time: 0 });

    useEffect(() => {
        if (!isOpen || disabled) return;

        let scanner = null;
        let isMounted = true;

        const initScanner = async () => {
            try {
                const { Html5Qrcode } = await import('html5-qrcode');

                await new Promise(r => setTimeout(r, 200));
                if (!isMounted) return;

                const container = document.getElementById('qr-camera-view');
                if (!container) return;

                scanner = new Html5Qrcode('qr-camera-view');
                scannerRef.current = scanner;

                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                    },
                    (decodedText) => {
                        const now = Date.now();
                        if (
                            decodedText === lastScanRef.current.text &&
                            now - lastScanRef.current.time < 3000
                        ) {
                            return;
                        }
                        lastScanRef.current = { text: decodedText, time: now };
                        onResult(decodedText);
                    },
                    () => { /* ignore */ }
                );
            } catch (err) {
                console.error('❌ Camera error:', err);
                setIsOpen(false);
                if (isMounted) {
                    onResult('CAMERA_ERROR:' + (err.message || 'Unknown camera error'));
                }
            }
        };

        initScanner();

        return () => {
            isMounted = false;
            if (scannerRef.current) {
                try { scannerRef.current.stop().catch(() => {}); } catch {}
                scannerRef.current = null;
            }
        };
    }, [isOpen, disabled, onResult]);

    if (disabled) {
        return (
            <div className="text-center py-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400">🔒 Start a trip to enable scanning.</p>
            </div>
        );
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition text-sm font-medium flex items-center justify-center gap-2"
            >
                <Camera size={18} />
                📷 Open Camera to Scan
            </button>
        );
    }

    return (
        <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-black">
                <div id="qr-camera-view" className="w-full"></div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-3 right-3 z-10 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700"
                >
                    <X size={16} />
                </button>
            </div>
            <p className="text-xs text-center text-gray-500">
                📸 Point camera at student's QR card
            </p>
        </div>
    );
};

// ============================================================
// ScanResultPopup
// ============================================================
const ScanResultPopup = ({ result, onClose }) => {
    useEffect(() => {
        if (!result) return;
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [result, onClose]);

    if (!result) return null;

    const isSuccess = result.verified;
    const isAlready = result.already_scanned;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-md w-full rounded-3xl shadow-2xl overflow-hidden bg-white"
            >
                <div className={`py-6 px-6 text-center ${
                    isSuccess
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : 'bg-gradient-to-r from-red-500 to-rose-500'
                }`}>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full"
                    >
                        {isSuccess ? (
                            <CheckCircle size={48} className="text-white" />
                        ) : (
                            <XCircle size={48} className="text-white" />
                        )}
                    </motion.div>

                    <h2 className="text-2xl font-bold text-white mt-4">
                        {isSuccess
                            ? (isAlready ? '✅ Already On Board' : '✅ Verified — Enter')
                            : '❌ Not Assigned to This Bus'}
                    </h2>
                </div>

                <div className="p-6">
                    {result.student && (
                        <div className="flex items-center gap-4 mb-4 p-4 bg-gray-50 rounded-2xl">
                            {result.student.profile_image ? (
                                <img
                                    src={result.student.profile_image}
                                    alt={result.student.full_name}
                                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
                                />
                            ) : (
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${
                                    isSuccess ? 'bg-green-500' : 'bg-red-500'
                                }`}>
                                    {result.student.full_name?.charAt(0) || '?'}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="font-bold text-gray-800 text-lg truncate">
                                    {result.student.full_name}
                                </p>
                                <p className="text-sm text-gray-500">
                                    Grade {result.student.grade || 'N/A'}
                                </p>
                                {result.student.school_name && (
                                    <p className="text-xs text-gray-400 truncate">
                                        {result.student.school_name}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className={`p-4 rounded-xl text-sm font-medium ${
                        isSuccess ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}>
                        {result.message}
                    </div>

                    {!isSuccess && result.student?.assigned_bus && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-800">
                            <strong>Their assigned bus:</strong> {result.student.assigned_bus}
                        </div>
                    )}

                    {isSuccess && result.total_on_board !== undefined && (
                        <div className="mt-3 text-center text-sm text-gray-500">
                            👥 Total on board: <strong>{result.total_on_board}</strong>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// ============================================================
// BoardedStudentsList
// ============================================================
const BoardedStudentsList = ({ students, totalAssigned, onBoardCount = 0, onClear }) => {
    if (students.length === 0 && onBoardCount === 0) return null;

    return (
        <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                    <Users size={18} className="text-green-600" />
                    Boarded Students
                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                        {students.length}
                    </span>
                </h4>
                {students.length > 0 && (
                    <button
                        onClick={onClear}
                        className="text-xs text-gray-500 hover:text-red-600"
                    >
                        Clear List
                    </button>
                )}
            </div>

            {students.length > 0 && (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                    {[...students].reverse().map((s) => (
                        <div
                            key={s.id}
                            className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200"
                        >
                            {s.profile_image ? (
                                <img
                                    src={s.profile_image}
                                    alt={s.full_name}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-green-400 flex-shrink-0"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                    {s.full_name?.charAt(0) || '?'}
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 truncate">
                                    {s.full_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                    Grade {s.grade || 'N/A'}
                                    {s.school_name && ` • ${s.school_name}`}
                                </p>
                                <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                                    <Clock size={10} />
                                    {new Date(s.scanned_at).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            </div>

                            <CheckCircle size={22} className="text-green-600 flex-shrink-0" />
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-3 p-3 bg-gray-50 rounded-xl flex items-center justify-between text-sm">
                <span className="text-gray-600">
                    🚌 On the bus: <strong className="text-green-700">{onBoardCount}</strong>
                </span>
                {totalAssigned > 0 && (
                    <span className="text-gray-400 text-xs">
                        of {totalAssigned} assigned
                    </span>
                )}
            </div>
        </div>
    );
};

// ============================================================
// PanicButton
// ============================================================
const PanicButton = ({ busId, location, disabled }) => {
    const [sending, setSending] = useState(false);

    const triggerPanic = async () => {
        if (!busId) {
            alert('No bus assigned. Please contact admin.');
            return;
        }
        if (!window.confirm('🚨 Are you sure you want to trigger an emergency alert?')) return;
        setSending(true);
        try {
            await apiClient.post('/alerts', {
                bus_id: busId,
                latitude: location?.latitude || 0,
                longitude: location?.longitude || 0,
                message: '🚨 Emergency alert from driver!',
            });
            alert('✅ Emergency alert sent! Police have been notified.');
        } catch (err) {
            console.error(err);
            alert('❌ Failed to send alert. Please try again.');
        } finally {
            setSending(false);
        }
    };

    return (
        <button
            onClick={triggerPanic}
            disabled={disabled || sending}
            className="w-full py-8 bg-gradient-to-r from-red-600 to-rose-600 text-white text-2xl font-bold rounded-2xl shadow-lg hover:shadow-red-500/30 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3"
        >
            <AlertTriangle size={32} />
            {sending ? 'Sending…' : '🚨 EMERGENCY'}
        </button>
    );
};

// ============================================================
// LiveMap
// ============================================================
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LiveMap = ({ busId, stops, location, center, zoom }) => {
    const mapRef = useRef(null);

    useEffect(() => {
        if (mapRef.current) {
            setTimeout(() => {
                mapRef.current?.invalidateSize();
                if (location) {
                    mapRef.current?.setView([location.latitude, location.longitude], zoom);
                }
            }, 100);
        }
    }, [location, zoom]);

    const busIcon = L.divIcon({
        html: `<div style="background:#2563eb;border-radius:50%;padding:6px;border:2px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M5 18h14v-1H5v1zm0-2h14v-1H5v1zm0-2h14v-1H5v1zm4 4h6v-1H9v1z"/><path d="M17 5H7c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 10H7V7h10v8z"/></svg></div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });

    const stopIcon = L.divIcon({
        html: `<div style="background:#22c55e;border-radius:50%;padding:4px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2);"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="10"/></svg></div>`,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
    });

    const centerPos = location ? [location.latitude, location.longitude] : center;
    const safeStops = Array.isArray(stops) ? stops.filter(s => s?.latitude && s?.longitude) : [];

    return (
        <MapContainer
            ref={mapRef}
            center={centerPos}
            zoom={zoom}
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {location && (
                <Marker position={[location.latitude, location.longitude]} icon={busIcon}>
                    <Popup>
                        <strong>Your Bus</strong><br />
                        {busId ? `Bus #${busId}` : 'No bus assigned'}
                        <br />
                        Speed: {location.speed?.toFixed(1) || 0} km/h
                    </Popup>
                </Marker>
            )}
            {safeStops.map((stop) => (
                <Marker key={stop.id} position={[stop.latitude, stop.longitude]} icon={stopIcon}>
                    <Popup>
                        <strong>{stop.stop_name}</strong><br />
                        Stop #{stop.stop_order}
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

// ============================================================
// MAIN: DriverDashboard
// ============================================================
const DriverDashboard = () => {
    const { user, logout } = useAuth();
    const { socket, isConnected, emit, on } = useSocket();
    const { location, error: gpsError, loading: gpsLoading } = useGeolocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);

    // Data states
    const [driverProfile, setDriverProfile] = useState(null);
    const [assignedBus, setAssignedBus] = useState(null);
    const [stops, setStops] = useState([]);
    const [tripStops, setTripStops] = useState([]);
    const [students, setStudents] = useState([]);
    const [scannedStudents, setScannedStudents] = useState([]);
    const [tripStatus, setTripStatus] = useState('idle');
    const [currentTrip, setCurrentTrip] = useState(null);
    const [stats, setStats] = useState({
        totalStops: 0, totalStudents: 0, tripsToday: 0, onTimeRate: 98,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeView, setActiveView] = useState('dashboard');
    const [scanResult, setScanResult] = useState(null);
    const [pickupSent, setPickupSent] = useState(false);

    // 🆕 Two-stage per-stop states
    const [approachedStops, setApproachedStops] = useState([]);
    const [arrivedStops, setArrivedStops] = useState([]);

    // 🆕 Layer 2 — student events
    const [studentEvents, setStudentEvents] = useState({});
    const [eventBusy, setEventBusy] = useState(null);

    // 🆕 Real driver trip history
    const [driverTripHistory, setDriverTripHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const locationIntervalRef = useRef(null);
    const tripStatusRef = useRef(tripStatus);

    useEffect(() => { tripStatusRef.current = tripStatus; }, [tripStatus]);

    const mockStops = [
        { id: 1, stop_name: 'Megenagna', stop_order: 1, latitude: 9.0320, longitude: 38.7469 },
        { id: 2, stop_name: 'Bole', stop_order: 2, latitude: 9.0050, longitude: 38.7520 },
        { id: 3, stop_name: 'CMC', stop_order: 3, latitude: 9.0180, longitude: 38.7650 },
        { id: 4, stop_name: 'Sarbet', stop_order: 4, latitude: 9.0450, longitude: 38.7300 },
    ];

    // ============================================================
    // 🆕 LIVE ON-BUS COUNT
    // ============================================================
    const onBoardCount = students.filter(s => {
        const ev = studentEvents[s.id] || {};
        return !!ev.picked_up_at && !ev.dropped_off_at;
    }).length;

    // ============================================================
    // DATA FETCHING
    // ============================================================
    const fetchDriverData = async () => {
        setLoading(true);
        try {
            const profileRes = await apiClient.get('/drivers/me');
            setDriverProfile(profileRes.data);
            const busId = profileRes.data.bus_id;

            if (busId) {
                const busRes = await apiClient.get(`/buses/${busId}`);
                setAssignedBus(busRes.data);

                let stopsData;
                try {
                    const stopsRes = await apiClient.get(`/buses/${busId}/stops`);
                    stopsData = stopsRes.data;
                } catch {
                    stopsData = mockStops;
                }
                setStops(stopsData || []);
                setStats(prev => ({ ...prev, totalStops: stopsData?.length || 0 }));

                try {
                    const studentsRes = await apiClient.get(`/students?bus_id=${busId}`);
                    setStudents(studentsRes.data || []);
                    setStats(prev => ({ ...prev, totalStudents: studentsRes.data?.length || 0 }));
                } catch {
                    setStats(prev => ({ ...prev, totalStudents: 0 }));
                }
            } else {
                setStops(mockStops);
                setStats(prev => ({ ...prev, totalStops: mockStops.length }));
            }

            try {
                const tripsRes = await apiClient.get('/trips/today');
                setStats(prev => ({ ...prev, tripsToday: tripsRes.data?.count || 0 }));
            } catch {}

            try {
                const activeTripRes = await apiClient.get('/trips/active');
                if (activeTripRes.data) {
                    setCurrentTrip(activeTripRes.data);
                    setTripStatus('active');
                    startLocationTracking();
                    loadTripStops(activeTripRes.data.id);
                }
            } catch {}

            setError('');
        } catch (err) {
            console.error('Failed to fetch driver data:', err);
            setStops(mockStops);
            setError('Backend not available. Using demo data.');
        } finally {
            setLoading(false);
        }
    };

    const loadTripStops = async (tripId) => {
        if (!tripId) return;
        try {
            const res = await apiClient.get(`/trips/${tripId}/stops`);
            const data = Array.isArray(res.data) ? res.data : [];
            setTripStops(data);

            // Derive arrived/approached from the server
            setApproachedStops(data.filter(s => s.approached).map(s => s.id));
            setArrivedStops(data.filter(s => s.arrived).map(s => s.id));
        } catch {
            setTripStops([]);
        }
    };

    // ============================================================
    // TRIP MANAGEMENT
    // ============================================================
    const startTrip = async () => {
        if (tripStatus === 'active') return;
        if (!assignedBus?.id) {
            setError('No bus assigned. Please contact admin.');
            return;
        }
        try {
            const res = await apiClient.post('/trips', { bus_id: assignedBus.id });
            setCurrentTrip(res.data);
            setTripStatus('active');
            setPickupSent(false);
            setTripStops([]);
            setApproachedStops([]);
            setArrivedStops([]);
            startLocationTracking();
            loadTripStops(res.data.id);
            setError('');
            setNotifications(prev => [{
                id: Date.now(),
                type: 'trip-started',
                title: '🚀 Trip Started',
                message: 'Your trip is now active. Parents have been notified.',
                timestamp: new Date(),
                read: false,
            }, ...prev]);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to start trip.');
        }
    };

    const endTrip = async () => {
        if (tripStatus !== 'active' || !currentTrip) return;
        try {
            await apiClient.put(`/trips/${currentTrip.id}/end`);
            setTripStatus('completed');
            setCurrentTrip(null);
            setPickupSent(false);
            setTripStops([]);
            setApproachedStops([]);
            setArrivedStops([]);
            stopLocationTracking();
            setNotifications(prev => [{
                id: Date.now(),
                type: 'trip-ended',
                title: '✅ Trip Completed',
                message: 'Trip ended. Parents have been notified.',
                timestamp: new Date(),
                read: false,
            }, ...prev]);
            setTimeout(() => setTripStatus('idle'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to end trip.');
        }
    };

    // ============================================================
    // PICKUP NOTIFICATION (broadcast)
    // ============================================================
    const notifyPickup = async () => {
        if (!currentTrip?.id) {
            setError('No active trip');
            return;
        }
        if (pickupSent && !window.confirm('Pickup notification already sent this trip. Send again?')) {
            return;
        }
        if (!window.confirm('Notify all parents to come pick up their children?')) return;

        try {
            await apiClient.post(`/trips/${currentTrip.id}/notify-pickup`);
            setPickupSent(true);
            setNotifications(prev => [{
                id: Date.now(),
                type: 'pickup-time',
                title: '🚸 Pickup Notification Sent',
                message: 'All parents on this bus have been notified.',
                timestamp: new Date(),
                read: false,
            }, ...prev]);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to notify parents');
        }
    };

    // ============================================================
    // 🆕 MARK STOP STAGE — 'approaching' or 'arrived'
    // ============================================================
    const markStopStage = async (stopId, stopName, stage) => {
        if (tripStatus !== 'active' || !currentTrip?.id) {
            setError('No active trip.');
            return;
        }
        const list = stage === 'approaching' ? approachedStops : arrivedStops;
        if (list.includes(stopId)) return;

        const label = stage === 'approaching' ? 'Approaching' : 'Arrived at';
        if (!window.confirm(`${label} "${stopName}"? Parents at this stop will be notified.`)) return;

        try {
            const res = await apiClient.post(`/trips/${currentTrip.id}/arrive-stop`, {
                stop_id: stopId,
                stage,
            });

            if (stage === 'approaching') {
                setApproachedStops(prev => [...prev, stopId]);
            } else {
                setArrivedStops(prev => [...prev, stopId]);
            }

            loadTripStops(currentTrip.id);

            setNotifications(prev => [{
                id: Date.now(),
                type: stage === 'approaching' ? 'stop-approaching' : 'stop-arrived',
                title: stage === 'approaching' ? '📢 Approaching sent' : '📍 Arrived sent',
                message: `Parents at "${stopName}" notified (${res.data.notified || 0}).`,
                timestamp: new Date(),
                read: false,
            }, ...prev]);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to notify.');
        }
    };

    // ============================================================
    // LOCATION TRACKING
    // ============================================================
    const startLocationTracking = () => {
        if (locationIntervalRef.current) return;
        locationIntervalRef.current = setInterval(() => {
            if (location && isConnected && tripStatusRef.current === 'active') {
                apiClient.post(`/buses/${assignedBus?.id}/location`, {
                    bus_id: assignedBus?.id,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    speed: location.speed || 0,
                }).catch(() => {});
            }
        }, 5000);
    };

    const stopLocationTracking = () => {
        if (locationIntervalRef.current) {
            clearInterval(locationIntervalRef.current);
            locationIntervalRef.current = null;
        }
    };

    // ============================================================
    // QR SCAN HANDLER
    // ============================================================
    const handleScanResult = async (qrData) => {
        if (!qrData || !assignedBus?.id) return;

        if (String(qrData).startsWith('CAMERA_ERROR:')) {
            setScanResult({
                verified: false,
                message: '❌ Camera error: ' + String(qrData).replace('CAMERA_ERROR:', ''),
            });
            return;
        }

        try {
            console.log('📷 QR detected:', qrData);

            const res = await apiClient.post('/students/scan', {
                qr_token: qrData,
                scan_type: 'board',
            });

            const data = res.data;

            setScanResult({
                verified: data.verified,
                already_scanned: data.already_scanned,
                message: data.message,
                student: data.student,
                total_on_board: data.total_on_board ?? (scannedStudents.length + 1),
            });

            if (data.verified && data.student) {
                setScannedStudents(prev => {
                    if (prev.some(s => s.id === data.student.id)) return prev;
                    return [
                        ...prev,
                        {
                            id: data.student.id,
                            full_name: data.student.full_name,
                            grade: data.student.grade,
                            school_name: data.student.school_name,
                            profile_image: data.student.profile_image,
                            assigned_bus: data.student.assigned_bus,
                            scanned_at: new Date().toISOString(),
                        },
                    ];
                });
            }
        } catch (err) {
            const errData = err.response?.data;
            setScanResult({
                verified: false,
                message: errData?.message || '❌ Scan failed. Please try again.',
                student: errData?.student,
            });
        }
    };

    const closeScanResult = () => setScanResult(null);

    const clearScannedList = () => {
        if (window.confirm('Clear the boarded students list? (Database records remain.)')) {
            setScannedStudents([]);
        }
    };

    // ============================================================
    // 🆕 PICKUP / DROPOFF ACTIONS
    // ============================================================
    const studentsAtStop = (stopId) =>
        students.filter(s => Number(s.stop_id) === Number(stopId));

    const markStudentPickup = async (student) => {
        if (!currentTrip?.id) {
            setError('No active trip.');
            return;
        }
        if (studentEvents[student.id]?.picked_up_at) return;
        if (!window.confirm(`Mark ${student.full_name} as PICKED UP?`)) return;

        setEventBusy(student.id);
        try {
            const res = await apiClient.post(`/students/${student.id}/pickup`, {
                trip_id: currentTrip.id,
                stop_id: student.stop_id,
            });
            setStudentEvents(prev => ({
                ...prev,
                [student.id]: {
                    ...(prev[student.id] || {}),
                    picked_up_at: res.data.event.created_at,
                    event_id: res.data.event.id,
                },
            }));
            setNotifications(prev => [{
                id: Date.now(),
                type: 'student-picked-up',
                title: `✅ ${student.full_name} picked up`,
                message: 'Parents have been notified.',
                timestamp: new Date(),
                read: false,
            }, ...prev]);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to mark pickup');
        } finally {
            setEventBusy(null);
        }
    };

    const markStudentDropoff = async (student) => {
        if (!currentTrip?.id) {
            setError('No active trip.');
            return;
        }
        if (studentEvents[student.id]?.dropped_off_at) return;
        if (!window.confirm(`Mark ${student.full_name} as DROPPED OFF?`)) return;

        setEventBusy(student.id);
        try {
            const res = await apiClient.post(`/students/${student.id}/dropoff`, {
                trip_id: currentTrip.id,
                stop_id: student.stop_id,
            });
            setStudentEvents(prev => ({
                ...prev,
                [student.id]: {
                    ...(prev[student.id] || {}),
                    dropped_off_at: res.data.event.created_at,
                    event_id: res.data.event.id,
                },
            }));
            setNotifications(prev => [{
                id: Date.now(),
                type: 'student-dropped-off',
                title: `🚏 ${student.full_name} dropped off`,
                message: 'Awaiting parent confirmation.',
                timestamp: new Date(),
                read: false,
            }, ...prev]);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to mark drop-off');
        } finally {
            setEventBusy(null);
        }
    };

    // ============================================================
    // 🆕 FETCH REAL DRIVER TRIP HISTORY
    // ============================================================
    const fetchDriverHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await apiClient.get('/trips/my-history?limit=30');
            setDriverTripHistory(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to fetch driver history:', err);
            setDriverTripHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    // ============================================================
    // EFFECTS
    // ============================================================
    useEffect(() => {
        fetchDriverData();
        return () => stopLocationTracking();
    }, []);

    // 🆕 Load history when the driver opens the History tab
    useEffect(() => {
        if (activeView === 'history') {
            fetchDriverHistory();
        }
    }, [activeView]);

    useEffect(() => {
        if (!socket || !isConnected) return;

        if (assignedBus?.id) {
            emit('join-bus-room', assignedBus.id);
            console.log(`🚌 Emitted join-bus-room for bus-${assignedBus.id}`);
        }

        const unsubTripUpdate = on('trip-updated', (data) => {
            if (data.bus_id === assignedBus?.id) fetchDriverData();
        });

        const unsubStudentUpdate = on('student-updated', (data) => {
            if (data.bus_id === assignedBus?.id) {
                setNotifications(prev => [{
                    id: Date.now(),
                    type: 'student-update',
                    title: '👤 Student Update',
                    message: `Student #${data.student_id} updated.`,
                    timestamp: new Date(),
                    read: false,
                }, ...prev]);
            }
        });

        const unsubAlertUpdate = on('alert-updated', (data) => {
            if (data.bus_id === assignedBus?.id) {
                setNotifications(prev => [{
                    id: Date.now(),
                    type: 'alert-update',
                    title: '👮 Police Responding',
                    message: data.message || 'Help is on the way!',
                    timestamp: new Date(),
                    read: false,
                }, ...prev]);
            }
        });

        const unsubAuth = on('authenticated', (data) => {
            console.log('✅ Socket authenticated:', data);
        });

        const unsubAssigned = on('driver-assigned', () => {
            socket.emit('refresh-driver-bus');
            fetchDriverData();
        });

        const unsubRefreshed = on('driver-bus-refreshed', ({ bus_id }) => {
            console.log('🔄 Driver bus refreshed:', bus_id);
        });

        const unsubConfirmed = on('dropoff-confirmed', (data) => {
            console.log('✅ Parent confirmed:', data);
            setStudentEvents(prev => ({
                ...prev,
                [data.student_id]: {
                    ...(prev[data.student_id] || {}),
                    confirmed_at: data.confirmed_at || new Date().toISOString(),
                },
            }));
            setNotifications(prev => [{
                id: Date.now(),
                type: 'dropoff-confirmed',
                title: `✅ Parent confirmed receipt`,
                message: `${data.student_name} — received at ${data.time || 'just now'}`,
                timestamp: new Date(),
                read: false,
            }, ...prev]);
        });

        return () => {
            unsubTripUpdate?.();
            unsubStudentUpdate?.();
            unsubAlertUpdate?.();
            unsubAuth?.();
            unsubAssigned?.();
            unsubRefreshed?.();
            unsubConfirmed?.();
        };
    }, [socket, isConnected, assignedBus, emit, on]);

    // ============================================================
    // NAVIGATION
    // ============================================================
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Navigation },
        { id: 'route', label: 'My Route', icon: MapPin },
        { id: 'scan', label: 'Scan Students', icon: QrCode },
        { id: 'history', label: 'Trip History', icon: Clock },
    ];

    // ============================================================
    // RENDER CONTENT
    // ============================================================
    const renderContent = () => {
        switch (activeView) {
            case 'dashboard':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden">
                            <div className="h-96 lg:h-[500px]">
                                <LiveMap
                                    busId={assignedBus?.id}
                                    stops={stops}
                                    location={location}
                                    center={location ? [location.latitude, location.longitude] : [9.0320, 38.7469]}
                                    zoom={13}
                                />
                            </div>
                            <div className="p-4 border-t border-gray-100/50 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                                        <span className="text-gray-600">Your Bus</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                        <span className="text-gray-600">Stops</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={startTrip}
                                        disabled={tripStatus === 'active' || !assignedBus}
                                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/30 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 text-sm font-medium"
                                    >
                                        🚀 Start Trip
                                    </button>
                                    <button
                                        onClick={notifyPickup}
                                        disabled={tripStatus !== 'active'}
                                        className={`px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-1 ${
                                            pickupSent
                                                ? 'bg-gradient-to-r from-gray-500 to-gray-600'
                                                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg hover:shadow-purple-500/30'
                                        }`}
                                    >
                                        🚸 Notify Pickup {pickupSent && '✓'}
                                    </button>
                                    <button
                                        onClick={endTrip}
                                        disabled={tripStatus !== 'active'}
                                        className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:shadow-lg hover:shadow-red-500/30 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 text-sm font-medium"
                                    >
                                        ⏹️ End Trip
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                                        <Camera size={20} className="text-blue-600" />
                                        Scan Student QR
                                    </h3>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                        tripStatus === 'active'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {tripStatus === 'active' ? '● Ready' : '○ Inactive'}
                                    </span>
                                </div>

                                <CameraScanner
                                    onResult={handleScanResult}
                                    disabled={tripStatus !== 'active'}
                                />

                                <BoardedStudentsList
                                    students={scannedStudents}
                                    totalAssigned={stats.totalStudents}
                                    onBoardCount={onBoardCount}
                                    onClear={clearScannedList}
                                />
                            </div>

                            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4">
                                <PanicButton
                                    busId={assignedBus?.id}
                                    location={location}
                                    disabled={tripStatus !== 'active'}
                                />
                            </div>

                            {notifications.length > 0 && (
                                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4">
                                    <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                                        <Bell size={16} className="text-blue-600" />
                                        Notifications
                                    </h3>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {notifications.slice(0, 5).map((n) => (
                                            <div
                                                key={n.id}
                                                className={`p-2 rounded-lg text-xs border-l-4 ${
                                                    n.type === 'trip-started' ? 'bg-green-50 border-green-500' :
                                                    n.type === 'trip-ended' ? 'bg-blue-50 border-blue-500' :
                                                    n.type === 'pickup-time' ? 'bg-purple-50 border-purple-500' :
                                                    n.type === 'stop-approaching' ? 'bg-orange-50 border-orange-500' :
                                                    n.type === 'stop-arrived' ? 'bg-emerald-50 border-emerald-500' :
                                                    n.type === 'alert-update' ? 'bg-red-50 border-red-500' :
                                                    'bg-yellow-50 border-yellow-500'
                                                }`}
                                            >
                                                <p className="font-semibold">{n.title}</p>
                                                <p className="text-gray-600">{n.message}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4">
                                <h3 className="text-sm font-semibold text-gray-600 mb-2">📊 Quick Stats</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-bold text-blue-600">{stops.length}</p>
                                        <p className="text-xs text-gray-500">Stops</p>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-bold text-green-600">{onBoardCount}/{stats.totalStudents}</p>
                                        <p className="text-xs text-gray-500">On Board</p>
                                    </div>
                                    <div className="bg-yellow-50 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-bold text-yellow-600">{stats.tripsToday}</p>
                                        <p className="text-xs text-gray-500">Trips Today</p>
                                    </div>
                                    <div className="bg-purple-50 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-bold text-purple-600">{stats.onTimeRate}%</p>
                                        <p className="text-xs text-gray-500">On Time</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'route': {
                const displayStops = tripStatus === 'active' && tripStops.length > 0 ? tripStops : stops;
                return (
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-gray-800">🗺️ My Route</h3>
                            {tripStatus === 'active' && (
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                    ● Trip Active
                                </span>
                            )}
                        </div>

                        <div className="space-y-3">
                            {displayStops.length === 0 ? (
                                <p className="text-gray-400">No stops assigned to your bus.</p>
                            ) : (
                                displayStops.map((stop, index) => {
                                    const isApproached = approachedStops.includes(stop.id) || stop.approached;
                                    const isArrived = arrivedStops.includes(stop.id) || stop.arrived;
                                    return (
                                        <div
                                            key={stop.id}
                                            className={`flex flex-col gap-3 p-3 rounded-xl border transition ${
                                                isArrived
                                                    ? 'bg-green-50 border-green-200'
                                                    : isApproached
                                                    ? 'bg-yellow-50 border-yellow-200'
                                                    : 'bg-gray-50 border-gray-100'
                                            }`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                                                    isArrived ? 'bg-green-500 text-white' :
                                                    isApproached ? 'bg-yellow-500 text-white' :
                                                    'bg-blue-100 text-blue-600'
                                                }`}>
                                                    {isArrived ? '✓' : index + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-800">{stop.stop_name}</p>
                                                    <p className="text-xs text-gray-400">
                                                        {stop.latitude}, {stop.longitude}
                                                    </p>
                                                    {isArrived && stop.last_update && (
                                                        <p className="text-xs text-green-600 mt-0.5">
                                                            ✅ Arrived at {new Date(stop.last_update).toLocaleTimeString()}
                                                        </p>
                                                    )}
                                                    {!isArrived && isApproached && stop.last_update && (
                                                        <p className="text-xs text-yellow-600 mt-0.5">
                                                            📢 Approaching since {new Date(stop.last_update).toLocaleTimeString()}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => markStopStage(stop.id, stop.stop_name, 'approaching')}
                                                        disabled={tripStatus !== 'active' || isApproached}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                                            isApproached
                                                                ? 'bg-yellow-100 text-yellow-700 cursor-default'
                                                                : tripStatus === 'active'
                                                                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                                                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        {isApproached ? '✓ Approaching' : '📢 Approaching'}
                                                    </button>

                                                    <button
                                                        onClick={() => markStopStage(stop.id, stop.stop_name, 'arrived')}
                                                        disabled={tripStatus !== 'active' || isArrived}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                                            isArrived
                                                                ? 'bg-green-100 text-green-700 cursor-default'
                                                                : tripStatus === 'active'
                                                                ? 'bg-green-600 text-white hover:bg-green-700'
                                                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        {isArrived ? '✓ Arrived' : '📍 Arrived'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* 🆕 Students at this stop — only when arrived */}
                                            {isArrived && (
                                                <div className="w-full pt-3 border-t border-gray-200/70">
                                                    <p className="text-xs text-gray-500 mb-2 font-medium">
                                                        Students at this stop:
                                                    </p>
                                                    {studentsAtStop(stop.id).length === 0 ? (
                                                        <p className="text-xs text-gray-400 italic">No students</p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {studentsAtStop(stop.id).map(student => {
                                                                const ev = studentEvents[student.id] || {};
                                                                const picked = !!ev.picked_up_at;
                                                                const dropped = !!ev.dropped_off_at;
                                                                const confirmed = !!ev.confirmed_at;
                                                                return (
                                                                    <div key={student.id} className="flex flex-wrap items-center gap-2 p-2 bg-white rounded-lg border border-gray-100">
                                                                        <span className="font-medium text-sm text-gray-800 flex-1 min-w-[120px]">
                                                                            {student.full_name}
                                                                        </span>

                                                                        {picked && (
                                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                                                                ✅ Picked up
                                                                            </span>
                                                                        )}
                                                                        {dropped && !confirmed && (
                                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                                                                                ⏳ Awaiting parent
                                                                            </span>
                                                                        )}
                                                                        {dropped && confirmed && (
                                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                                                                ✅ Parent confirmed
                                                                            </span>
                                                                        )}

                                                                        {!picked && (
                                                                            <button
                                                                                disabled={eventBusy === student.id || tripStatus !== 'active'}
                                                                                onClick={() => markStudentPickup(student)}
                                                                                className="px-2.5 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50">
                                                                                ✅ Pick up
                                                                            </button>
                                                                        )}
                                                                        {picked && !dropped && (
                                                                            <button
                                                                                disabled={eventBusy === student.id || tripStatus !== 'active'}
                                                                                onClick={() => markStudentDropoff(student)}
                                                                                className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                                                                                🚏 Drop off
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {tripStatus !== 'active' && (
                            <p className="text-xs text-yellow-600 text-center mt-4">
                                ⚠️ Start a trip to enable stop notifications.
                            </p>
                        )}
                    </div>
                );
            }

            case 'scan':
                return (
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">📷 Scan Students</h3>
                        <div className="max-w-md mx-auto space-y-4">
                            <CameraScanner
                                onResult={handleScanResult}
                                disabled={tripStatus !== 'active'}
                            />

                            <BoardedStudentsList
                                students={scannedStudents}
                                totalAssigned={stats.totalStudents}
                                onBoardCount={onBoardCount}
                                onClear={clearScannedList}
                            />

                            {tripStatus !== 'active' && (
                                <p className="text-yellow-600 text-sm text-center">
                                    ⚠️ Start a trip to enable scanning.
                                </p>
                            )}
                        </div>
                    </div>
                );

            case 'history':
                return (
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-gray-800">📋 Trip History</h3>
                            <button
                                onClick={fetchDriverHistory}
                                disabled={historyLoading}
                                className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm flex items-center gap-1 hover:bg-blue-700 disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={historyLoading ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                        </div>

                        {historyLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : driverTripHistory.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <Clock size={48} className="mx-auto text-gray-300 mb-2" />
                                <p>No trips recorded yet.</p>
                                <p className="text-xs mt-1">Start a trip to see it here.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                                {driverTripHistory.map((trip) => {
                                    const mins = trip.duration_seconds
                                        ? Math.round(trip.duration_seconds / 60)
                                        : null;
                                    const durationText = mins == null
                                        ? '—'
                                        : mins < 60
                                            ? `${mins} min`
                                            : `${Math.floor(mins / 60)}h ${mins % 60}m`;
                                    const isCompleted = trip.status === 'completed' || trip.ended_at;

                                    return (
                                        <div
                                            key={trip.id}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-gray-800 flex items-center gap-2">
                                                    <Bus size={16} className="text-blue-600" />
                                                    Trip #{trip.id}
                                                    {trip.bus_number && (
                                                        <span className="text-xs text-gray-500">
                                                            • Bus {trip.bus_number}
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {trip.started_at
                                                        ? new Date(trip.started_at).toLocaleString('en-US', {
                                                            month: 'short', day: 'numeric',
                                                            hour: '2-digit', minute: '2-digit',
                                                        })
                                                        : '—'}
                                                    {trip.ended_at && (
                                                        <> → {new Date(trip.ended_at).toLocaleTimeString('en-US', {
                                                            hour: '2-digit', minute: '2-digit',
                                                        })}</>
                                                    )}
                                                </p>
                                                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                                                    <span className={`px-2 py-0.5 rounded-full ${
                                                        isCompleted
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {isCompleted ? '✅ Completed' : '🟢 In progress'}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                                        ⏱ {durationText}
                                                    </span>
                                                    {trip.stops_visited > 0 && (
                                                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                                            📍 {trip.stops_visited} stops
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500">Loading driver data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/50 flex">
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="fixed top-4 left-4 z-50 lg:hidden bg-white/80 backdrop-blur-xl p-2.5 rounded-xl shadow-lg border border-white/50"
            >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <aside className={`fixed inset-y-0 left-0 z-40 bg-gradient-to-b from-slate-900 to-slate-800 shadow-2xl transition-all duration-300 ${
                sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'
            } lg:relative lg:translate-x-0 lg:block flex-shrink-0`}>
                <div className="flex flex-col h-full p-4">
                    <div className="flex items-center gap-3 mb-6 px-2 pt-4 lg:pt-0">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-2 rounded-xl">
                            <Bus size={22} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-lg">SchoolBus</h1>
                            <p className="text-xs text-blue-300/70">Driver Panel</p>
                        </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                                {driverProfile?.full_name?.charAt(0) || 'D'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-semibold truncate">{driverProfile?.full_name || 'Driver'}</p>
                                <p className="text-xs text-gray-400 truncate">{driverProfile?.email}</p>
                                <span className="text-xs text-green-400">🟢 Online</span>
                            </div>
                        </div>
                        {assignedBus && (
                            <div className="mt-2 text-xs text-gray-400">
                                🚌 Bus: <span className="text-white font-medium">{assignedBus.bus_number}</span>
                            </div>
                        )}
                    </div>

                    <nav className="flex-1 space-y-1">
                        <div className="text-xs text-gray-500 uppercase tracking-wider px-2 mb-2">Main</div>
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveView(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                                    activeView === item.id
                                        ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-white border border-blue-500/20'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <item.icon size={18} />
                                <span className="text-sm font-medium">{item.label}</span>
                            </button>
                        ))}
                    </nav>

                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all duration-300 mt-4 border-t border-white/10 pt-4"
                    >
                        <LogOut size={18} />
                        <span className="text-sm font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 min-h-screen overflow-hidden">
                <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-xl border-b border-white/50 shadow-sm">
                    <div className="px-4 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold text-gray-700 hidden sm:block">
                                🚌 Driver Dashboard
                            </h2>
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                    tripStatus === 'active' ? 'bg-green-100 text-green-700' :
                                    tripStatus === 'completed' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-500'
                                }`}>
                                    {tripStatus === 'active' ? '🟢 Active' :
                                     tripStatus === 'completed' ? '✅ Completed' :
                                     '⏸️ Idle'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <GPSStatus
                                isActive={tripStatus === 'active'}
                                location={location}
                                error={gpsError}
                                loading={gpsLoading}
                            />

                            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                                isConnected ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
                            }`}>
                                {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                                {isConnected ? 'Connected' : 'Offline'}
                            </div>

                            <button
                                onClick={logout}
                                className="p-2 rounded-xl hover:bg-gray-100/70 transition text-gray-600 lg:hidden"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                <div className="p-4 lg:p-6">
                    {error && (
                        <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl flex items-center gap-2">
                            <AlertTriangle size={18} />
                            <span>{error}</span>
                            <button onClick={() => setError('')} className="ml-auto text-yellow-500 hover:text-yellow-700">
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {tripStatus === 'active' && (
                        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-pulse">
                            <div className="w-2 h-2 bg-green-600 rounded-full animate-ping"></div>
                            <span>🚀 Trip in progress. GPS tracking is active. Parents have been notified.</span>
                            <span className="ml-auto text-xs">{new Date().toLocaleTimeString()}</span>
                        </div>
                    )}

                    {tripStatus === 'completed' && (
                        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl flex items-center gap-2">
                            <CheckCircle size={18} />
                            <span>✅ Trip completed successfully!</span>
                        </div>
                    )}

                    {renderContent()}
                </div>
            </main>

            <AnimatePresence>
                {scanResult && (
                    <ScanResultPopup result={scanResult} onClose={closeScanResult} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default DriverDashboard;