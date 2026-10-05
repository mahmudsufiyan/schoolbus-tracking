import React from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';

const GPSStatus = ({ onLocationUpdate }) => {
    const { location, error, loading } = useGeolocation();

    // Yeroo location jijjiiramu, onLocationUpdate waama
    React.useEffect(() => {
        if (location && onLocationUpdate) {
            onLocationUpdate(location);
        }
    }, [location, onLocationUpdate]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 px-3 py-2 rounded-lg">
                <div className="animate-spin h-4 w-4 border-2 border-yellow-600 border-t-transparent rounded-full"></div>
                <span className="text-sm">⏳ GPS argachaa...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <span className="text-xl">❌</span>
                <span className="text-sm">GPS: {error}</span>
            </div>
        );
    }

    if (location) {
        return (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                <span className="text-xl">📍</span>
                <span className="text-sm font-mono">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </span>
                <span className="text-xs text-green-500 ml-2 animate-pulse">● Live</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
            <span>⚠️</span>
            <span className="text-sm">GPS hin argamne</span>
        </div>
    );
};

export default GPSStatus;