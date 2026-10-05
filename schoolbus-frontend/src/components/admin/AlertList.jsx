import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { Button, Card } from '../common';
import { timeAgo } from '../../utils/dateFormatter';

const AlertList = () => {
    const [alerts, setAlerts] = useState([]);
    const { socket, isConnected, on } = useSocket();
    const { user } = useAuth();
    const isPolice = user?.role === 'police';

    // Yeroo ammaa jalqabaaf alerts tokko tokko
    useEffect(() => {
        // Fakkeenyaaf alerts jalqabaa
        if (alerts.length === 0) {
            // Booda backend irraa argachuu dandeenya
            setAlerts([
                // Simulated data
            ]);
        }
    }, []);

    // Socket irraa emergency fudhachuu
    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleEmergency = (data) => {
            const newAlert = {
                id: Date.now(),
                ...data,
                timestamp: new Date().toISOString(),
                resolved: false,
            };
            setAlerts((prev) => [newAlert, ...prev].slice(0, 20));
        };

        const unsubscribe = on('emergency-panic', handleEmergency);

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [socket, isConnected, on]);

    const resolveAlert = (alertId) => {
        setAlerts((prev) =>
            prev.map((alert) =>
                alert.id === alertId ? { ...alert, resolved: true } : alert
            )
        );
        // Backend tif erguu - booda
        if (socket && isConnected) {
            socket.emit('resolve-emergency', { alertId, adminId: user?.id });
        }
    };

    const activeAlerts = alerts.filter((a) => !a.resolved);
    const resolvedAlerts = alerts.filter((a) => a.resolved);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-700">🚨 Balaa (Emergency)</h3>
                <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                    {activeAlerts.length} Active
                </span>
            </div>

            {/* Connection Status */}
            {!isConnected && (
                <div className="bg-yellow-50 border border-yellow-400 p-2 rounded text-sm text-yellow-700">
                    ⚠️ Walqabsiisa dhabe. Balaan yeroo sanatti hin dhufu.
                </div>
            )}

            {/* Active Alerts */}
            {activeAlerts.length === 0 ? (
                <Card>
                    <p className="text-gray-400 text-sm text-center py-4">
                        ✅ Balaan hin jiru. Nagaan!
                    </p>
                </Card>
            ) : (
                activeAlerts.map((alert) => (
                    <Card
                        key={alert.id}
                        className="border-l-4 border-red-500 hover:shadow-lg transition"
                        bodyClassName="p-4"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-red-600 flex items-center gap-2">
                                    <span className="animate-pulse">🚨</span>
                                    FAXIMA!
                                </p>
                                <p className="text-sm text-gray-700">
                                    Bus: <span className="font-semibold">{alert.busId}</span>
                                    <br />
                                    GPS: {alert.latitude?.toFixed(6)}, {alert.longitude?.toFixed(6)}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {timeAgo(alert.timestamp)}
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                {isPolice ? (
                                    <Button
                                        variant="success"
                                        size="sm"
                                        onClick={() => resolveAlert(alert.id)}
                                    >
                                        ✅ Fudhachuu
                                    </Button>
                                ) : (
                                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                                        ⏳ Eegaa
                                    </span>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        window.open(
                                            `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`,
                                            '_blank'
                                        );
                                    }}
                                >
                                    📍 Kaartaa
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))
            )}

            {/* Resolved Alerts (History) */}
            {resolvedAlerts.length > 0 && (
                <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-500 mb-2">
                        📋 Furmaa (Resolved): {resolvedAlerts.length}
                    </h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                        {resolvedAlerts.map((alert) => (
                            <div
                                key={alert.id}
                                className="bg-gray-50 p-2 rounded flex justify-between items-center text-sm"
                            >
                                <span className="text-gray-500">
                                    🚨 {alert.busId} - {timeAgo(alert.timestamp)}
                                </span>
                                <span className="text-green-500 text-xs">✅ Resolved</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AlertList;