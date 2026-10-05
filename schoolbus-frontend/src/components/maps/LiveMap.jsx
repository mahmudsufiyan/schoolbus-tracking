import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const busIcon = L.divIcon({
    html: `<div style="background:#2563eb;border-radius:50%;padding:6px;border:2px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M5 18h14v-1H5v1zm0-2h14v-1H5v1zm0-2h14v-1H5v1zm4 4h6v-1H9v1z"/><path d="M17 5H7c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 10H7V7h10v8z"/></svg></div>`,
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

// Component to handle map updates safely
const MapController = ({ location }) => {
    const map = useMap();
    useEffect(() => {
        if (!map || !location) return;
        try {
            map.setView([location.latitude, location.longitude], 15);
        } catch (err) {
            console.warn('Map setView error:', err);
        }
    }, [map, location]);
    return null;
};

const LiveMap = ({ busId, stops = [], location, center = [9.0320, 38.7469], zoom = 13 }) => {
    const mapRef = useRef(null);
    const [mapReady, setMapReady] = useState(false);

    // Set map ready after mount
    useEffect(() => {
        const timer = setTimeout(() => {
            if (mapRef.current) {
                try {
                    mapRef.current.invalidateSize();
                } catch (err) {
                    console.warn('invalidateSize error:', err);
                }
            }
            setMapReady(true);
        }, 200);
        return () => clearTimeout(timer);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (mapRef.current) {
                try {
                    mapRef.current.remove();
                } catch (err) {
                    // Silently ignore cleanup errors
                }
                mapRef.current = null;
            }
        };
    }, []);

    const centerPos = location && location.latitude && location.longitude
        ? [location.latitude, location.longitude]
        : center;

    const safeStops = Array.isArray(stops) ? stops.filter(s => s?.latitude && s?.longitude) : [];

    return (
        <MapContainer
            ref={mapRef}
            center={centerPos}
            zoom={zoom}
            style={{ height: '100%', width: '100%', minHeight: '300px' }}
            whenReady={() => setMapReady(true)}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapReady && <MapController location={location} />}

            {location && location.latitude && location.longitude && (
                <Marker position={[location.latitude, location.longitude]} icon={busIcon}>
                    <Popup>
                        <strong>Bus {busId || ''}</strong><br />
                        Speed: {location.speed?.toFixed?.(1) || 0} km/h
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

export default LiveMap;