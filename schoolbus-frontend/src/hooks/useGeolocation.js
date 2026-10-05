import { useState, useEffect } from 'react';

export const useGeolocation = () => {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Browser GPS qabaa?
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            setLoading(false);
            return;
        }

        // GPS argachuu jalqabuu
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLocation({ latitude, longitude });
                setLoading(false);
                setError(null);
            },
            (err) => {
                setError(err.message);
                setLoading(false);
                console.error('GPS Error:', err);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );

        // Yeroo component ba'u, GPS dhaabuu (stop)
        return () => {
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, []); // Yeroo tokko qofa hojjeta

    return { location, error, loading };
};