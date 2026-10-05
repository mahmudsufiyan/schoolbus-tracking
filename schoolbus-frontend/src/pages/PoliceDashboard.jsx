import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import  AIAnalysisPanel from '../components/AIAnalysisPanel';
import {
    Bus, LogOut, Wifi, WifiOff, AlertTriangle, MapPin, Clock,
    Users, Shield, Menu, X, CheckCircle, Activity, RefreshCw,
    Phone, Navigation, Radio, CheckCheck, Send, Bell,
} from 'lucide-react';
import apiClient from '../api/axiosConfig';

// Leaflet
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ============================================================
// TOAST
// ============================================================
const Toast = ({ toast }) => (
    <AnimatePresence>
        {toast.show && (
            <motion.div
                initial={{ opacity: 0, y: -40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                className={`fixed top-4 right-4 z-[200] px-5 py-3 rounded-2xl shadow-2xl text-white font-medium flex items-center gap-2 ${
                    toast.type === 'success' ? 'bg-gradient-to-r from-green-600 to-emerald-600' :
                    toast.type === 'error'   ? 'bg-gradient-to-r from-red-600 to-rose-600' :
                    'bg-gradient-to-r from-blue-600 to-indigo-600'
                }`}>
                {toast.type === 'success' && <CheckCircle size={18} />}
                {toast.type === 'error' && <AlertTriangle size={18} />}
                {toast.message}
            </motion.div>
        )}
    </AnimatePresence>
);

// ============================================================
// MAP
// ============================================================
const PoliceMap = ({ alerts = [], buses = [], myLocation = null, center = [9.0320, 38.7469], zoom = 13 }) => {
    const mapRef = useRef(null);

    useEffect(() => {
        if (mapRef.current) {
            const t = setTimeout(() => mapRef.current.invalidateSize(), 100);
            return () => clearTimeout(t);
        }
    }, [alerts, buses, myLocation]);

    const validAlerts = alerts.filter(a =>
        a.latitude != null && a.longitude != null &&
        !isNaN(Number(a.latitude)) && !isNaN(Number(a.longitude)) &&
        Number(a.latitude) !== 0 && Number(a.longitude) !== 0
    );
    const validBuses = buses.filter(b =>
        b.latitude != null && b.longitude != null &&
        !isNaN(Number(b.latitude)) && !isNaN(Number(b.longitude))
    );

    const alertIcon = L.divIcon({
        html: `<div style="background:#dc2626;border-radius:50%;width:34px;height:34px;border:3px solid white;box-shadow:0 0 20px rgba(220,38,38,0.7);display:flex;align-items:center;justify-content:center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L1 21h22L12 2zm0 3.5L20 19H4L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
            </svg></div>`,
        className: '',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
    });

    const busIcon = L.divIcon({
        html: `<div style="background:#2563eb;border-radius:50%;width:28px;height:28px;border:2px solid white;display:flex;align-items:center;justify-content:center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM18 11H6V6h12v5z"/>
            </svg></div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
    });

    const meIcon = L.divIcon({
        html: `<div style="background:#16a34a;border-radius:50%;width:22px;height:22px;border:3px solid white;box-shadow:0 0 0 6px rgba(22,163,74,0.25);"></div>`,
        className: '',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
    });

    return (
        <div className="w-full h-full relative" style={{ minHeight: '500px' }}>
            <MapContainer
                ref={mapRef}
                center={center}
                zoom={zoom}
                style={{ height: '100%', width: '100%', minHeight: '500px' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {validBuses.map(bus => (
                    <Marker key={`bus-${bus.id}`} position={[Number(bus.latitude), Number(bus.longitude)]} icon={busIcon}>
                        <Popup>
                            <div className="text-sm">
                                <p className="font-bold">{bus.bus_number || `Bus #${bus.id}`}</p>
                                <p>Driver: {bus.driver_name || '—'}</p>
                                <p>Status: {bus.status || 'active'}</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {validAlerts.map(alert => (
                    <Marker key={`alert-${alert.id}`} position={[Number(alert.latitude), Number(alert.longitude)]} icon={alertIcon}>
                        <Popup>
                            <div className="text-sm">
                                <p className="font-bold text-red-700">🚨 EMERGENCY</p>
                                <p><strong>Bus:</strong> {alert.bus_number || alert.bus_id}</p>
                                {alert.driver_name && <p><strong>Driver:</strong> {alert.driver_name}</p>}
                                <p className="text-xs">{alert.message}</p>
                                <p className="text-xs text-gray-500">{new Date(alert.created_at).toLocaleString()}</p>
                                <a
                                    href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                                    target="_blank" rel="noreferrer"
                                    className="text-blue-600 text-xs underline mt-1 inline-block">
                                    Open in Google Maps →
                                </a>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {myLocation && (
                    <Marker position={[myLocation.latitude, myLocation.longitude]} icon={meIcon}>
                        <Popup><div className="text-sm">📍 Your location</div></Popup>
                    </Marker>
                )}
            </MapContainer>

            <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200 dark:border-slate-700 z-[1000]">
                <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-600"></div>
                        <span className="text-gray-700 dark:text-gray-300">Alert</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                        <span className="text-gray-700 dark:text-gray-300">Bus</span>
                    </div>
                    {myLocation && (
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-green-600"></div>
                            <span className="text-gray-700 dark:text-gray-300">You</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================================
// ALERT CARD (with actions + AI analysis)
// ============================================================
const AlertCard = ({ alert, onAcknowledge, onRespond, onResolve, busy }) => {
    const status = alert.status || 'active';
    const statusColor =
        status === 'acknowledged' ? 'bg-yellow-100 text-yellow-700' :
        status === 'responding'   ? 'bg-blue-100 text-blue-700' :
        status === 'resolved'     ? 'bg-green-100 text-green-700' :
        'bg-red-100 text-red-700';

    return (
        <div className={`rounded-xl p-4 border-2 ${
            status === 'resolved' ? 'border-green-200 bg-green-50/60' :
            status === 'responding' ? 'border-blue-300 bg-blue-50/80' :
            status === 'acknowledged' ? 'border-yellow-300 bg-yellow-50/80' :
            'border-red-300 bg-red-50/80 animate-pulse'
        }`}>
            {/* 🆕 AI Analysis Card — first child */}
            <div className="mb-3">
                <AIAnalysisPanel
                    aiAnalysis={alert.ai_analysis}
                    aiStatus={alert.ai_status}
                />
            </div>

            <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-800 text-sm">
                            🚨 Bus #{alert.bus_number || alert.bus_id || '—'}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor}`}>
                            {status}
                        </span>
                    </div>
                    <p className="text-xs text-gray-700 mt-1">{alert.message || 'Emergency alert'}</p>
                    {alert.driver_name && (
                        <p className="text-xs text-gray-500">Driver: {alert.driver_name}</p>
                    )}
                    {alert.latitude != null && alert.longitude != null && (
                        <p className="text-xs text-gray-500 font-mono">
                            📍 {Number(alert.latitude).toFixed(5)}, {Number(alert.longitude).toFixed(5)}
                        </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(alert.created_at).toLocaleString()}
                    </p>
                    {alert.responded_by_name && (
                        <p className="text-xs text-blue-700 mt-1">
                            👮 Responding: {alert.responded_by_name}
                        </p>
                    )}
                </div>
            </div>

            {status !== 'resolved' && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {status === 'active' && (
                        <button
                            onClick={() => onAcknowledge(alert.id)}
                            disabled={busy}
                            className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-medium hover:bg-yellow-600 transition disabled:opacity-50 flex items-center gap-1">
                            <CheckCheck size={12} /> Acknowledge
                        </button>
                    )}
                    {(status === 'active' || status === 'acknowledged') && (
                        <button
                            onClick={() => onRespond(alert.id)}
                            disabled={busy}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1">
                            <Navigation size={12} /> Respond
                        </button>
                    )}
                    {(status === 'acknowledged' || status === 'responding') && (
                        <button
                            onClick={() => onResolve(alert.id)}
                            disabled={busy}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-1">
                            <CheckCircle size={12} /> Resolve
                        </button>
                    )}
                    {alert.latitude != null && alert.longitude != null && (
                        <a
                            href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                            target="_blank" rel="noreferrer"
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition flex items-center gap-1">
                            <MapPin size={12} /> Navigate
                        </a>
                    )}
                </div>
            )}
        </div>
    );
};

// ============================================================
// MAIN
// ============================================================
const PoliceDashboard = () => {
    const { user, logout } = useAuth();
    const { socket, on, emit, isConnected } = useSocket();

    const isPolice = user?.role === 'police';

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeView, setActiveView] = useState('alerts');

    const [alerts, setAlerts] = useState([]);
    const [buses, setBuses] = useState([]);
    const [myLocation, setMyLocation] = useState(null);
    const [unitStatus, setUnitStatus] = useState('available');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busyAction, setBusyAction] = useState(false);

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = useCallback((message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    }, []);

    // ------------------------------------------------------------
    // Fetch
    // ------------------------------------------------------------
    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setRefreshing(true);
        try {
            const [alertsRes, busesRes] = await Promise.all([
                apiClient.get('/alerts').catch(() => ({ data: [] })),
                apiClient.get('/buses').catch(() => ({ data: [] })),
            ]);
            const a = Array.isArray(alertsRes.data) ? alertsRes.data : [];
            const b = Array.isArray(busesRes.data) ? busesRes.data : [];
            setAlerts(a);
            setBuses(b);
        } catch (e) {
            console.error('Police fetch failed', e);
            showToast('Failed to load data', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [showToast]);

    useEffect(() => {
        if (isPolice) fetchData();
    }, [isPolice, fetchData]);

    // ------------------------------------------------------------
    // Join police room + status broadcast
    // ------------------------------------------------------------
    useEffect(() => {
        if (!socket || !isConnected || !user || !isPolice) return;

        emit('join-police-room', {
            userId: user.id,
            station: user.station || null,
        });
        console.log('👮 police joined room');

        const beat = setInterval(() => {
            emit('police-status', {
                unitId: user.id,
                officer_name: user.full_name,
                status: unitStatus,
                station: user.station || null,
                timestamp: new Date().toISOString(),
            });
        }, 30000);

        return () => clearInterval(beat);
    }, [socket, isConnected, user, isPolice, emit, unitStatus]);

    // ------------------------------------------------------------
    // Socket listeners — includes AI analysis
    // ------------------------------------------------------------
    useEffect(() => {
        if (!socket || !isPolice) return;

        const unsubNew = on('emergency-alert', (payload) => {
            console.log('🚨 police got emergency-alert', payload);
            setAlerts(prev => {
                if (prev.some(a => a.id === payload.id)) return prev;
                return [payload, ...prev];
            });
            showToast(`🚨 New emergency on bus ${payload.bus_number || payload.bus_id}`, 'error');
            try {
                const audio = new Audio('/alert.mp3');
                audio.volume = 0.5;
                audio.play().catch(() => {});
            } catch {}
        });

        const unsubResolved = on('alert-resolved', (payload) => {
            console.log('✅ police got alert-resolved', payload);
            setAlerts(prev => prev.map(a =>
                a.id === payload.id ? { ...a, ...payload, status: 'resolved' } : a
            ));
        });

        const unsubAck = on('alert-acknowledged', (payload) => {
            setAlerts(prev => prev.map(a =>
                a.id === payload.id ? { ...a, ...payload, status: 'acknowledged' } : a
            ));
        });

        const unsubResponding = on('alert-responding', (payload) => {
            setAlerts(prev => prev.map(a =>
                a.id === payload.id ? { ...a, ...payload, status: 'responding' } : a
            ));
        });

        // 🆕 AI analysis ready
        const unsubAI = on('ai-analysis-ready', (payload) => {
            console.log('🤖 police got ai-analysis-ready', payload);
            setAlerts(prev => prev.map(a =>
                a.id === payload.alert_id
                    ? { ...a, ai_analysis: payload.analysis, ai_status: 'ready' }
                    : a
            ));
            showToast('🤖 AI analysis ready', 'success');
        });

        return () => {
            unsubNew?.();
            unsubResolved?.();
            unsubAck?.();
            unsubResponding?.();
            unsubAI?.();
        };
    }, [socket, on, isPolice, showToast]);

    // ------------------------------------------------------------
    // Own GPS location
    // ------------------------------------------------------------
    useEffect(() => {
        if (!navigator.geolocation || !isPolice) return;
        const watch = navigator.geolocation.watchPosition(
            (pos) => {
                const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                setMyLocation(loc);
                if (socket && isConnected) {
                    emit('police-location', {
                        unitId: user.id,
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                        timestamp: new Date().toISOString(),
                    });
                }
            },
            (err) => console.warn('geolocation error', err),
            { enableHighAccuracy: true, maximumAge: 10000 }
        );
        return () => navigator.geolocation.clearWatch(watch);
    }, [socket, isConnected, user, isPolice, emit]);

    // ------------------------------------------------------------
    // Actions
    // ------------------------------------------------------------
    const updateLocalStatus = (id, status) => {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    };

    const handleAcknowledge = async (id) => {
        if (busyAction) return;
        setBusyAction(true);
        const prev = alerts;
        updateLocalStatus(id, 'acknowledged');
        try {
            await apiClient.put(`/alerts/${id}/acknowledge`);
            emit('police-acknowledge', {
                alertId: id,
                unitId: user.id,
                officer_name: user.full_name,
            });
            showToast('Alert acknowledged', 'success');
        } catch (e) {
            console.warn('acknowledge endpoint failed, local-only:', e?.response?.status);
            try {
                await apiClient.put(`/alerts/${id}/respond`);
                emit('police-acknowledge', { alertId: id, unitId: user.id });
                showToast('Alert acknowledged (via respond)', 'success');
            } catch {
                setAlerts(prev);
                showToast('Failed to acknowledge', 'error');
            }
        } finally {
            setBusyAction(false);
        }
    };

    const handleRespond = async (id) => {
        if (busyAction) return;
        setBusyAction(true);
        const prev = alerts;
        updateLocalStatus(id, 'responding');
        setUnitStatus('busy');
        try {
            await apiClient.put(`/alerts/${id}/respond`, {
                unit_id: user.id,
                officer_name: user.full_name,
            });
            emit('police-responding', {
                alertId: id,
                unitId: user.id,
                officer_name: user.full_name,
                eta_minutes: 5,
            });
            showToast('Responding to alert', 'success');
        } catch (e) {
            console.warn('respond endpoint failed:', e?.response?.status);
            setAlerts(prev);
            showToast('Failed to respond', 'error');
        } finally {
            setBusyAction(false);
        }
    };

    const handleResolve = async (id) => {
        if (busyAction) return;
        const outcome = window.prompt('Outcome / notes (optional):', 'Handled by police unit');
        if (outcome === null) return;
        setBusyAction(true);
        const prev = alerts;
        updateLocalStatus(id, 'resolved');
        try {
            await apiClient.put(`/alerts/${id}/resolve`, { outcome });
            emit('police-resolved', {
                alertId: id,
                unitId: user.id,
                officer_name: user.full_name,
                outcome,
            });
            showToast('Alert resolved', 'success');
        } catch (e) {
            console.warn('resolve endpoint failed:', e?.response?.status);
            setAlerts(prev);
            showToast('Failed to resolve', 'error');
        } finally {
            setBusyAction(false);
            setUnitStatus('available');
        }
    };

    // ------------------------------------------------------------
    // Derived stats
    // ------------------------------------------------------------
    const activeAlerts = alerts.filter(a => a.status === 'active' || a.status === 'new' || !a.status);
    const acknowledged = alerts.filter(a => a.status === 'acknowledged');
    const responding   = alerts.filter(a => a.status === 'responding');
    const resolvedToday = alerts.filter(a => {
        if (a.status !== 'resolved') return false;
        const d = a.resolved_at || a.updated_at || a.created_at;
        return d && new Date(d).toDateString() === new Date().toDateString();
    }).length;
    const busesOnRoad = buses.filter(b => b.status === 'active').length;

    // ------------------------------------------------------------
    // Render views
    // ------------------------------------------------------------
    const renderAlerts = () => (
        <div className="space-y-4">
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/50 dark:border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                        <AlertTriangle className="text-red-600" size={20} />
                        Active Alerts ({activeAlerts.length})
                    </h3>
                    <button
                        onClick={() => fetchData()}
                        disabled={refreshing}
                        className="p-2 rounded-lg hover:bg-gray-100/50 dark:hover:bg-slate-700/50 transition">
                        <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : activeAlerts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="mx-auto h-12 w-12 text-green-400 mb-2" />
                        <p className="font-medium">All Clear</p>
                        <p className="text-sm">No active alerts</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                        {activeAlerts.map(alert => (
                            <AlertCard
                                key={alert.id}
                                alert={alert}
                                onAcknowledge={handleAcknowledge}
                                onRespond={handleRespond}
                                onResolve={handleResolve}
                                busy={busyAction}
                            />
                        ))}
                    </div>
                )}
            </div>

            {(acknowledged.length > 0 || responding.length > 0) && (
                <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/50 dark:border-slate-700/50">
                    <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <Radio className="text-blue-600" size={18} />
                        In Progress ({acknowledged.length + responding.length})
                    </h3>
                    <div className="space-y-3">
                        {[...acknowledged, ...responding].map(alert => (
                            <AlertCard
                                key={alert.id}
                                alert={alert}
                                onAcknowledge={handleAcknowledge}
                                onRespond={handleRespond}
                                onResolve={handleResolve}
                                busy={busyAction}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderMap = () => (
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 dark:border-slate-700/50 overflow-hidden">
            <div className="h-[550px] w-full">
                <PoliceMap
                    alerts={alerts.filter(a => a.status !== 'resolved')}
                    buses={buses}
                    myLocation={myLocation}
                />
            </div>
        </div>
    );

    const renderHistory = () => {
        const resolved = alerts.filter(a => a.status === 'resolved');
        return (
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50 dark:border-slate-700/50">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                    📋 Incident History ({resolved.length})
                </h3>
                {resolved.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No resolved incidents yet</p>
                ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {resolved.slice(0, 30).map(alert => (
                            <div key={alert.id} className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-3 border border-gray-100 dark:border-slate-700">
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-gray-800 dark:text-white text-sm">
                                            Bus #{alert.bus_number || alert.bus_id || 'Unknown'}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{alert.message}</p>
                                        {alert.responded_by_name && (
                                            <p className="text-xs text-blue-600">👮 {alert.responded_by_name}</p>
                                        )}
                                        <p className="text-xs text-gray-400">
                                            {new Date(alert.resolved_at || alert.updated_at || alert.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        resolved
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderAnalytics = () => {
        const total = alerts.length;
        const resolved = alerts.filter(a => a.status === 'resolved').length;
        const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatBox label="Total Alerts" value={total} color="blue" />
                    <StatBox label="Resolved" value={resolved} color="green" />
                    <StatBox label="Resolution Rate" value={`${rate}%`} color="purple" />
                    <StatBox label="Buses on Road" value={busesOnRoad} color="orange" />
                </div>

                <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50 dark:border-slate-700/50">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <Activity size={18} className="text-blue-600" /> Breakdown
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <MiniStat label="Active" value={activeAlerts.length} tone="red" />
                        <MiniStat label="Acknowledged" value={acknowledged.length} tone="yellow" />
                        <MiniStat label="Responding" value={responding.length} tone="blue" />
                        <MiniStat label="Resolved today" value={resolvedToday} tone="green" />
                    </div>
                </div>
            </div>
        );
    };

    const navItems = [
        { id: 'alerts', label: `Live Alerts`, icon: AlertTriangle, badge: activeAlerts.length },
        { id: 'map', label: 'Incident Map', icon: MapPin },
        { id: 'history', label: 'History', icon: Clock },
        { id: 'analytics', label: 'Analytics', icon: Activity },
    ];

    const renderContent = () => {
        switch (activeView) {
            case 'alerts': return renderAlerts();
            case 'map': return renderMap();
            case 'history': return renderHistory();
            case 'analytics': return renderAnalytics();
            default: return renderAlerts();
        }
    };

    if (!isPolice) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-md text-center shadow-xl">
                    <Shield className="mx-auto text-red-500 mb-3" size={48} />
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Access Denied</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        This dashboard is only for police officers.
                    </p>
                    <button onClick={logout} className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700">
                        Logout
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50/30 to-orange-50/50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex transition-colors duration-300">
            <Toast toast={toast} />

            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="fixed top-4 left-4 z-50 lg:hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-2.5 rounded-xl shadow-lg border border-white/50 dark:border-slate-700/50">
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <aside className={`fixed inset-y-0 left-0 z-40 bg-gradient-to-b from-red-900 to-rose-900 shadow-2xl transition-all duration-300 ${
                sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'
            } lg:relative lg:translate-x-0 lg:block flex-shrink-0`}>
                <div className="flex flex-col h-full p-4">
                    <div className="flex items-center gap-3 mb-6 px-2 pt-4 lg:pt-0">
                        <div className="bg-gradient-to-r from-red-500 to-rose-500 p-2 rounded-xl">
                            <Shield size={22} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-lg">SchoolBus</h1>
                            <p className="text-xs text-red-300/70">Police Panel</p>
                        </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-500 to-rose-500 flex items-center justify-center text-white font-bold text-lg">
                                {user?.full_name?.charAt(0) || 'P'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-semibold truncate">{user?.full_name || 'Police'}</p>
                                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                                <span className={`text-xs ${unitStatus === 'available' ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {unitStatus === 'available' ? '🟢 Available' : '🟡 Busy'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 space-y-1">
                        <div className="text-xs text-gray-500 uppercase tracking-wider px-2 mb-2">Main</div>
                        {navItems.map(item => {
                            const Icon = item.icon;
                            const isActive = activeView === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => { setActiveView(item.id); setSidebarOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                                        isActive
                                            ? 'bg-gradient-to-r from-red-600/20 to-rose-600/20 text-white border border-red-500/20'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}>
                                    <Icon size={18} />
                                    <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                                    {item.badge > 0 && (
                                        <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                                            {item.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all duration-300 mt-4 border-t border-white/10 pt-4">
                        <LogOut size={18} />
                        <span className="text-sm font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 min-h-screen overflow-hidden">
                <header className="sticky top-0 z-30 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-b border-white/50 dark:border-slate-700/50 shadow-sm">
                    <div className="px-4 py-3 flex items-center justify-between gap-4">
                        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 hidden sm:block">
                            👮‍♂️ Police Dashboard
                        </h2>
                        <div className="flex items-center gap-3">
                            <div className="hidden md:flex items-center gap-3">
                                <div className="flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
                                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span>
                                    {activeAlerts.length} Active
                                </div>
                                <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                                    <Radio size={12} />
                                    {responding.length} Responding
                                </div>
                                <div className="flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                                    <CheckCircle size={12} />
                                    {resolvedToday} Today
                                </div>
                            </div>

                            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                                isConnected ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800'
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800'
                            }`}>
                                {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                                {isConnected ? 'Connected' : 'Offline'}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-4 lg:p-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <StatCard label="Active Alerts" value={activeAlerts.length} icon={AlertTriangle} tone="red" />
                        <StatCard label="Responding" value={responding.length} icon={Radio} tone="blue" />
                        <StatCard label="Resolved Today" value={resolvedToday} icon={CheckCircle} tone="green" />
                        <StatCard label="Buses on Road" value={busesOnRoad} icon={Bus} tone="purple" />
                    </motion.div>

                    <motion.div
                        key={activeView}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}>
                        {renderContent()}
                    </motion.div>
                </div>
            </main>
        </div>
    );
};

// ============================================================
// Small presentational helpers
// ============================================================
const StatCard = ({ label, value, icon: Icon, tone }) => {
    const tones = {
        red:    { bg: 'bg-red-50 dark:bg-red-900/20',       fg: 'text-red-600 dark:text-red-400' },
        blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',     fg: 'text-blue-600 dark:text-blue-400' },
        green:  { bg: 'bg-green-50 dark:bg-green-900/20',   fg: 'text-green-600 dark:text-green-400' },
        purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', fg: 'text-purple-600 dark:text-purple-400' },
        yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', fg: 'text-yellow-600 dark:text-yellow-400' },
    };
    const t = tones[tone] || tones.blue;
    return (
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/50 dark:border-slate-700/50 hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
                </div>
                <div className={`p-3 rounded-xl ${t.bg}`}>
                    <Icon className={`w-5 h-5 ${t.fg}`} />
                </div>
            </div>
        </div>
    );
};

const STATBOX_STYLES = {
    blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',       fg: 'text-blue-600 dark:text-blue-400' },
    green:  { bg: 'bg-green-50 dark:bg-green-900/20',     fg: 'text-green-600 dark:text-green-400' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20',   fg: 'text-purple-600 dark:text-purple-400' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-900/20',   fg: 'text-orange-600 dark:text-orange-400' },
    red:    { bg: 'bg-red-50 dark:bg-red-900/20',         fg: 'text-red-600 dark:text-red-400' },
    yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20',   fg: 'text-yellow-600 dark:text-yellow-400' },
};

const StatBox = ({ label, value, color = 'blue' }) => {
    const s = STATBOX_STYLES[color] || STATBOX_STYLES.blue;
    return (
        <div className={`${s.bg} rounded-xl p-4`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`text-3xl font-bold ${s.fg}`}>{value}</p>
        </div>
    );
};

const MiniStat = ({ label, value, tone = 'blue' }) => {
    const s = STATBOX_STYLES[tone] || STATBOX_STYLES.blue;
    return (
        <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${s.fg}`}>{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        </div>
    );
};

export default PoliceDashboard;