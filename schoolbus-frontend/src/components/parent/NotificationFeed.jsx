import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { timeAgo } from '../../utils/dateFormatter';

const NotificationFeed = ({ busId, studentId }) => {
    const [notifications, setNotifications] = useState([]);
    const { socket, isConnected, on } = useSocket();
    const feedEndRef = useRef(null);

    // Beeksisa haaraa dabaluu
    const addNotification = (title, message, type = 'info') => {
        const newNotif = {
            id: Date.now(),
            title,
            message,
            type, // 'info', 'warning', 'success', 'emergency'
            timestamp: new Date().toISOString(),
            read: false,
        };
        setNotifications((prev) => [newNotif, ...prev].slice(0, 50)); // 50 qofa qabata
    };

    // Socket irraa beeksisa fudhachuu
    useEffect(() => {
        if (!socket || !isConnected) return;

        // 1. Yeroo buufata darbu
        const handleStopPassed = (data) => {
            if (data.busId === busId) {
                const stopsAway = data.stopsAway || '?';
                if (stopsAway === 1) {
                    addNotification(
                        '🔴 1 Buufata hafa!',
                        `Otobiisiin buufata ${data.stopName} darbee jira. Qophaa'aa!`,
                        'warning'
                    );
                } else if (stopsAway === 2) {
                    addNotification(
                        '🟡 2 Buufata hafa',
                        `Otobiisiin buufata ${data.stopName} darbee jira. ${stopsAway} buufata hafa.`,
                        'info'
                    );
                } else if (stopsAway === 3) {
                    addNotification(
                        '🟢 3 Buufata hafa',
                        `Otobiisiin buufata ${data.stopName} darbee jira. ${stopsAway} buufata hafa.`,
                        'info'
                    );
                } else if (stopsAway === 0) {
                    addNotification(
                        '🏁 Otobiisiin Geesse!',
                        `Barataan keessan buufata ${data.stopName} irratti gadii bu'uu qaba.`,
                        'success'
                    );
                }
            }
        };

        // 2. Barataan ol ba'uu (Boarded)
        const handleStudentBoarded = (data) => {
            if (data.studentId === studentId) {
                addNotification(
                    '✅ Barataan ol bae!',
                    `Barataan keessan otobiisii ${busId} ol ba'ee jira.`,
                    'success'
                );
            }
        };

        // 3. Emergency Alert (Balaa)
        const handleEmergency = (data) => {
            if (data.busId === busId) {
                addNotification(
                    '🚨 FAXIMA! Balaan qabate!',
                    `Otobiisiin ${busId} balaan qabate. Polisii karaa irra jira.`,
                    'emergency'
                );
            }
        };

        // Socket event qabachuu
        const unsubscribeStop = on('stop-passed', handleStopPassed);
        const unsubscribeBoarded = on('student-boarded', handleStudentBoarded);
        const unsubscribeEmergency = on('emergency-panic', handleEmergency);

        // Fakkeenyaaf notifications jalqabaa dabaluu
        if (notifications.length === 0) {
            addNotification(
                '👋 Tole!',
                'Beeksisa haaraan asitti mulata. Yeroo otobiisiin buufata darbu beeksisa argatta.',
                'info'
            );
        }

        return () => {
            if (unsubscribeStop) unsubscribeStop();
            if (unsubscribeBoarded) unsubscribeBoarded();
            if (unsubscribeEmergency) unsubscribeEmergency();
        };
    }, [socket, isConnected, busId, studentId, on]);

    // Yeroo notifications jijjiiramu, feed xumura (bottom) geessuu
    useEffect(() => {
        if (feedEndRef.current) {
            feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [notifications]);

    // Icon types
    const getIcon = (type) => {
        switch (type) {
            case 'success':
                return '✅';
            case 'warning':
                return '⚠️';
            case 'emergency':
                return '🚨';
            default:
                return 'ℹ️';
        }
    };

    const getBorderColor = (type) => {
        switch (type) {
            case 'success':
                return 'border-green-500';
            case 'warning':
                return 'border-yellow-500';
            case 'emergency':
                return 'border-red-500 animate-pulse';
            default:
                return 'border-blue-500';
        }
    };

    const getBgColor = (type) => {
        switch (type) {
            case 'success':
                return 'bg-green-50';
            case 'warning':
                return 'bg-yellow-50';
            case 'emergency':
                return 'bg-red-50';
            default:
                return 'bg-blue-50';
        }
    };

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-700">📢 Beeksisa</h3>
                <span className="text-xs text-gray-500">
                    {notifications.filter(n => !n.read).length} haaraa
                </span>
            </div>

            {/* Feed List */}
            <div className="h-72 overflow-y-auto space-y-2 pr-2">
                {notifications.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                        <p className="text-4xl">📭</p>
                        <p className="text-sm">Beeksisa hin jiru</p>
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <div
                            key={notif.id}
                            className={`p-3 rounded-lg border-l-4 ${getBorderColor(notif.type)} ${getBgColor(notif.type)} transition-all hover:shadow-md`}
                            onClick={() => {
                                // Mark as read
                                setNotifications((prev) =>
                                    prev.map((n) =>
                                        n.id === notif.id ? { ...n, read: true } : n
                                    )
                                );
                            }}
                        >
                            <div className="flex items-start gap-2">
                                <span className="text-lg">{getIcon(notif.type)}</span>
                                <div className="flex-1">
                                    <p className={`font-semibold text-sm ${notif.type === 'emergency' ? 'text-red-600' : 'text-gray-800'}`}>
                                        {notif.title}
                                    </p>
                                    <p className="text-sm text-gray-600">{notif.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {timeAgo(notif.timestamp)}
                                        {!notif.read && <span className="ml-2 text-blue-500 text-xs">● Haaraa</span>}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={feedEndRef} />
            </div>

            {/* Connection Status */}
            <div className={`text-xs text-center ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                {isConnected ? '🔗 Yeroo sanatti walqabateera' : '❌ Walqabsiisa dhabe'}
            </div>
        </div>
    );
};

export default NotificationFeed;