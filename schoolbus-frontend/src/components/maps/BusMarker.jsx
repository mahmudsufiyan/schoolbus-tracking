import React, { useEffect, useRef } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import busIconUrl from 'leaflet/dist/images/marker-icon.png';
import busIconShadow from 'leaflet/dist/images/marker-shadow.png';

// Bus icon - Kan otobiisii agarsiisu
const createBusIcon = (isMoving = false) => {
    return new L.Icon({
        iconUrl: busIconUrl,
        shadowUrl: busIconShadow,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        className: isMoving ? 'bus-icon-moving' : 'bus-icon',
    });
};

const BusMarker = ({ position, busId }) => {
    const markerRef = useRef(null);
    const map = useMap();

    useEffect(() => {
        if (markerRef.current) {
            // Yeroo position jijjiiramu, marker jijjiiruu
            const marker = markerRef.current;
            marker.setLatLng(position);
        }
    }, [position]);

    return (
        <Marker
            ref={markerRef}
            position={position}
            icon={createBusIcon(true)}
            eventHandlers={{
                click: () => {
                    map.flyTo(position, 15);
                },
            }}
        >
            <Popup>
                <div className="text-center">
                    <p className="font-bold text-blue-600">🚌 Bus {busId || '--'}</p>
                    <p className="text-xs text-gray-500">
                        📍 {position[0]?.toFixed(6)}, {position[1]?.toFixed(6)}
                    </p>
                    <p className="text-xs text-green-500 animate-pulse">● Yeroo sanatti</p>
                </div>
            </Popup>
        </Marker>
    );
};

export default BusMarker;