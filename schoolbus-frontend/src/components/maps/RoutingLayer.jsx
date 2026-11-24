import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMap, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, X, RefreshCw, Clock, MapPin, CornerDownRight, Minus, Maximize2 } from 'lucide-react';

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

const destinationIcon = L.divIcon({
    html: `<div style="background:#ef4444;border-radius:50%;padding:6px;border:2px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

const RoutingLayer = ({ location, stops = [], stopsToRoute, autoShow = false }) => {
    const map = useMap();
    const [showPanel, setShowPanel] = useState(autoShow);
    const [isMinimized, setIsMinimized] = useState(false); // 🆕 State to track minimize
    const [portalTarget, setPortalTarget] = useState(null);

    const [selectedStopId, setSelectedStopId] = useState(null);
    const [route, setRoute] = useState(null); 
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const lastFetchRef = useRef(0);
    const abortRef = useRef(null);

    const availableStops = (stopsToRoute || stops || []).filter(
        s => s?.latitude != null && s?.longitude != null
    );

    useEffect(() => {
        if (!map) return;
        const mapContainer = map.getContainer();
        let parent = mapContainer.parentElement;
        while (parent && getComputedStyle(parent).position === 'static') {
            parent = parent.parentElement;
            if (!parent || parent === document.body) break;
        }
        setPortalTarget(parent || mapContainer.parentElement || document.body);
    }, [map]);

    useEffect(() => {
        if (selectedStopId != null) return;
        if (availableStops.length === 0) return;
        const next = availableStops.find(s => !s.arrived) || availableStops[0];
        setSelectedStopId(next.id);
    }, [availableStops, selectedStopId]);

    const selectedStop = availableStops.find(s => s.id === selectedStopId) || null;

    const fetchRoute = useCallback(async (force = false) => {
        if (!location || !selectedStop) return;
        const now = Date.now();
        if (!force && now - lastFetchRef.current < 10000) return;
        lastFetchRef.current = now;

        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError('');
        try {
            const url = `${OSRM_URL}/${location.longitude},${location.latitude};${selectedStop.longitude},${selectedStop.latitude}?overview=full&geometries=geojson&steps=true`;
            const res = await fetch(url, { signal: controller.signal });
            if (!res.ok) throw new Error(`OSRM ${res.status}`);
            const data = await res.json();

            if (!data.routes || data.routes.length === 0) throw new Error('No route found');
            const r = data.routes[0];
            const geometry = r.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

            setRoute({
                geometry,
                steps: (r.legs?.[0]?.steps || []).map(s => ({
                    instruction: buildInstruction(s),
                    distance: s.distance,
                    duration: s.duration,
                })),
                distance: r.distance,
                duration: r.duration,
            });
            
            if (geometry && geometry.length > 0) {
                const bounds = L.latLngBounds(geometry);
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            }
            
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('Route fetch failed:', err);
            setError('Could not compute route.');
            setRoute(null);
        } finally {
            setLoading(false);
        }
    }, [location, selectedStop, map]);

    useEffect(() => {
        if (!showPanel || !location || !selectedStop) return;
        if (route) {
            const [lastLat, lastLng] = route.geometry[0] || [];
            const dLat = Math.abs((lastLat || 0) - location.latitude);
            const dLng = Math.abs((lastLng || 0) - location.longitude);
            if (dLat < 0.001 && dLng < 0.001) return;
        }
        fetchRoute();
    }, [showPanel, selectedStopId, location?.latitude, location?.longitude, fetchRoute]);

    useEffect(() => () => { abortRef.current?.abort(); }, []);

    const fmtDistance = (m) => m == null ? '—' : (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
    const fmtDuration = (s) => s == null ? '—' : (Math.round(s / 60) < 60 ? `${Math.round(s / 60)} min` : `${Math.floor(Math.round(s / 60) / 60)}h ${Math.round(s / 60) % 60}m`);

    if (!portalTarget) return null;

    const ui = (
        <>
            {!showPanel && (
                <button
                    onClick={() => { setShowPanel(true); setIsMinimized(false); }}
                    className="absolute bottom-6 right-4 z-[1000] bg-blue-600 shadow-xl rounded-full px-4 py-3 flex items-center gap-2 text-sm font-bold text-white hover:bg-blue-700 pointer-events-auto transition-transform hover:scale-105"
                >
                    <Navigation size={18} />
                    <span className="hidden sm:inline">Directions</span>
                </button>
            )}

            {showPanel && (
                <div 
                    className={`absolute bottom-4 right-4 z-[1000] w-[300px] max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden pointer-events-auto flex flex-col transition-all duration-300 ${
                        isMinimized ? 'h-auto' : 'max-h-[45vh]'
                    }`}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <Navigation size={18} />
                            <span className="font-semibold text-sm">Directions</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* 🆕 Minimize / Maximize Button */}
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="p-1.5 rounded-lg hover:bg-white/20"
                                title={isMinimized ? "Expand" : "Minimize"}
                            >
                                {isMinimized ? <Maximize2 size={16} /> : <Minus size={16} />}
                            </button>
                            
                            <button
                                onClick={() => fetchRoute(true)}
                                disabled={loading || isMinimized}
                                className={`p-1.5 rounded-lg hover:bg-white/20 ${isMinimized ? 'hidden' : ''}`}
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            </button>
                            {/* 🆕 Close X Button */}
                            <button
                                onClick={() => { setShowPanel(false); setRoute(null); setIsMinimized(false); }}
                                className="p-1.5 rounded-lg hover:bg-white/20"
                                title="Close and remove route"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Body (Hidden when minimized) */}
                    {!isMinimized && (
                        <>
                            <div className="p-3 border-b border-gray-100 flex-shrink-0 bg-gray-50">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                                    Destination
                                </label>
                                <select
                                    value={selectedStopId || ''}
                                    onChange={e => { setSelectedStopId(Number(e.target.value)); setRoute(null); }}
                                    className="w-full mt-1 px-2 py-1.5 border rounded-lg text-sm bg-white font-medium"
                                >
                                    {availableStops.length === 0 && <option value="">No stops available</option>}
                                    {availableStops.map(s => (
                                        <option key={s.id} value={s.id}>{s.stop_name} {s.arrived ? '✓' : ''}</option>
                                    ))}
                                </select>
                            </div>

                            {route && (
                                <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between text-sm flex-shrink-0">
                                    <span className="flex items-center gap-1 font-semibold text-blue-700">
                                        <Clock size={14} /> {fmtDuration(route.duration)}
                                    </span>
                                    <span className="text-blue-600 font-medium">{fmtDistance(route.distance)}</span>
                                </div>
                            )}

                            <div className="overflow-y-auto custom-scrollbar flex-1">
                                {loading && !route && (
                                    <div className="p-6 text-center text-gray-400 text-sm">
                                        <RefreshCw className="animate-spin mx-auto mb-2 text-blue-500" size={20} />
                                        Calculating…
                                    </div>
                                )}

                                {error && <div className="p-3 text-xs text-red-600 bg-red-50">{error}</div>}

                                {!loading && !route && !error && (
                                    <div className="p-6 text-center text-gray-400 text-sm flex flex-col items-center">
                                        <MapPin className="mb-2 text-gray-300" size={24} />
                                        {!location ? (
                                            <>
                                                <p className="text-gray-500 font-medium">Waiting for bus location…</p>
                                                <p className="text-xs text-gray-400 mt-1">Trip must be active</p>
                                            </>
                                        ) : (
                                            <p>Select a destination to see directions.</p>
                                        )}
                                    </div>
                                )}

                                {route?.steps?.length > 0 && (
                                    <ul className="divide-y divide-gray-100">
                                        {route.steps.map((step, i) => (
                                            <li key={i} className="px-3 py-2 flex items-start gap-2 text-xs hover:bg-gray-50">
                                                <CornerDownRight size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-gray-700 leading-snug">{step.instruction}</p>
                                                    <p className="text-gray-400 mt-0.5 text-[10px]">
                                                        {fmtDistance(step.distance)}
                                                        {step.duration > 0 && ` · ${fmtDuration(step.duration)}`}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );

    return (
        <>
            {createPortal(ui, portalTarget)}
            
            {/* Blue Line shows as long as showPanel is true (even when minimized) */}
            {showPanel && route && (
                <Polyline
                    positions={route.geometry}
                    pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.85 }}
                />
            )}
            
            {showPanel && selectedStop && (
                <Marker
                    position={[selectedStop.latitude, selectedStop.longitude]}
                    icon={destinationIcon}
                >
                    <Popup>
                        <strong>{selectedStop.stop_name}</strong><br />
                        Destination
                    </Popup>
                </Marker>
            )}
        </>
    );
};

function buildInstruction(step) {
    const m = step.maneuver || {};
    const type = m.type;
    const modifier = m.modifier;
    const name = step.name || 'the road';

    const MODIFIER = {
        left: 'left', right: 'right',
        'slight left': 'slightly left', 'slight right': 'slightly right',
        'sharp left': 'sharply left', 'sharp right': 'sharply right',
        straight: 'straight', uturn: 'U-turn',
    };
    const mod = MODIFIER[modifier] || '';

    switch (type) {
        case 'depart': return `Start on ${name}`;
        case 'arrive': return `Arrive at destination`;
        case 'turn': return `Turn ${mod} onto ${name}`;
        case 'new name': return `Continue onto ${name}`;
        case 'merge': return `Merge ${mod} onto ${name}`;
        case 'on ramp': return `Take ramp ${mod} onto ${name}`;
        case 'off ramp': return `Take exit onto ${name}`;
        case 'fork': return `Keep ${mod} at fork onto ${name}`;
        case 'roundabout': return `Enter roundabout and exit onto ${name}`;
        case 'rotary': return `Take rotary ${mod} onto ${name}`;
        case 'continue': return `Continue ${mod} on ${name}`;
        case 'end of road': return `At end of road, turn ${mod} onto ${name}`;
        default: return `${type ? type + ' ' : ''}${mod} ${name}`.trim() || 'Continue';
    }
}

export default RoutingLayer;