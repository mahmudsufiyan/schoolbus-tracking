import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Stop icon - Gosa addaa (darban ykn hafan)
const createStopIcon = (isPassed = false) => {
    const color = isPassed ? '#22c55e' : '#3b82f6'; // Green ykn Blue
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
            <text x="12" y="16" font-size="10" text-anchor="middle" fill="white" font-weight="bold">⛔</text>
        </svg>
    `;
    return new L.DivIcon({
        html: svg,
        className: 'custom-stop-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30],
    });
};

const StopMarker = ({ position, label, isPassed = false }) => {
    return (
        <Marker
            position={position}
            icon={createStopIcon(isPassed)}
        >
            <Popup>
                <div className="text-center">
                    <p className={`font-semibold ${isPassed ? 'text-green-600' : 'text-blue-600'}`}>
                        {isPassed ? '✅' : '📍'} {label || 'Buufata'}
                    </p>
                    <p className="text-xs text-gray-500">
                        📍 {position[0]?.toFixed(6)}, {position[1]?.toFixed(6)}
                    </p>
                    {isPassed && <p className="text-xs text-green-500">Darban</p>}
                </div>
            </Popup>
        </Marker>
    );
};

export default StopMarker;