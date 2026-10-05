import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';

const StopTimeline = ({ busId, studentId, stops = [] }) => {
    const [passedStops, setPassedStops] = useState([]);
    const [currentStop, setCurrentStop] = useState(null);
    const { socket, isConnected, on } = useSocket();

    // Yoo stops hin kennamne, fakkeenyaaf
    const defaultStops = stops.length > 0 ? stops : [
        { id: 1, name: 'Buufata 1', order: 1 },
        { id: 2, name: 'Buufata 2', order: 2 },
        { id: 3, name: 'Buufata 3', order: 3 },
        { id: 4, name: 'Buufata 4', order: 4 },
    ];

    // Socket irraa beeksisa fudhachuu
    useEffect(() => {
        if (!socket || !isConnected) return;

        // Yeroo buufata darbu
        const handleStopPassed = (data) => {
            if (data.busId === busId) {
                setPassedStops((prev) => {
                    if (!prev.includes(data.stopId)) {
                        return [...prev, data.stopId];
                    }
                    return prev;
                });
                setCurrentStop(data.stopId);
            }
        };

        // Yeroo herrega buufataa (3 hafa, 2 hafa...)
        const handleStopCount = (data) => {
            if (data.busId === busId && data.studentId === studentId) {
                // Feed itti dabala - booda NotificationFeed wajjin walqabata
                // Kun feed keessatti mul'ata
            }
        };

        // Socket event qabachuu
        const unsubscribe = on('stop-passed', handleStopPassed);
        const unsubscribeCount = on('stop-count', handleStopCount);

        return () => {
            if (unsubscribe) unsubscribe();
            if (unsubscribeCount) unsubscribeCount();
        };
    }, [socket, isConnected, busId, studentId, on]);

    // Herrega buufataa (3 hafa, 2 hafa...)
    const getStopStatus = (stop) => {
        if (passedStops.includes(stop.id)) {
            return 'passed'; // Darban (Green)
        }
        if (currentStop === stop.id) {
            return 'current'; // Amma irra jira (Yellow)
        }
        return 'pending'; // Hafaa (Grey)
    };

    // Maqa haala isaatti
    const getStopColor = (status) => {
        switch (status) {
            case 'passed':
                return 'bg-green-500 border-green-600';
            case 'current':
                return 'bg-yellow-400 border-yellow-500 animate-pulse';
            default:
                return 'bg-gray-300 border-gray-400';
        }
    };

    const getTextColor = (status) => {
        switch (status) {
            case 'passed':
                return 'text-green-600';
            case 'current':
                return 'text-yellow-600';
            default:
                return 'text-gray-500';
        }
    };

    return (
        <div className="w-full">
            {/* Timeline Horizontal */}
            <div className="flex items-center justify-between gap-2">
                {defaultStops.map((stop, index) => {
                    const status = getStopStatus(stop);
                    const isLast = index === defaultStops.length - 1;

                    return (
                        <React.Fragment key={stop.id}>
                            {/* Stop Circle */}
                            <div className="flex flex-col items-center flex-1">
                                <div
                                    className={`w-10 h-10 rounded-full border-2 ${getStopColor(status)} flex items-center justify-center text-white font-bold text-sm transition-all duration-500`}
                                >
                                    {stop.order}
                                </div>
                                <span className={`text-xs mt-1 text-center font-medium ${getTextColor(status)}`}>
                                    {stop.name}
                                </span>
                                {status === 'passed' && (
                                    <span className="text-xs text-green-500">✅</span>
                                )}
                                {status === 'current' && (
                                    <span className="text-xs text-yellow-500 animate-pulse">📍</span>
                                )}
                            </div>

                            {/* Line between stops */}
                            {!isLast && (
                                <div className={`flex-1 h-1 ${passedStops.includes(stop.id) ? 'bg-green-500' : 'bg-gray-300'} transition-colors duration-500`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Info herregaa */}
            <div className="mt-4 bg-blue-50 p-3 rounded-lg text-center">
                {passedStops.length === 0 && (
                    <p className="text-sm text-blue-600">🚏 Imalli hin jalqabne. Eegaa...</p>
                )}
                {passedStops.length > 0 && passedStops.length < defaultStops.length && (
                    <p className="text-sm text-blue-600">
                        ✅ Buufata {passedStops.length} darban. {' '}
                        <span className="font-bold text-yellow-600">
                            {defaultStops.length - passedStops.length} buufata hafa!
                        </span>
                    </p>
                )}
                {passedStops.length === defaultStops.length && (
                    <p className="text-sm text-green-600 font-bold">
                        🏁 Imalli xumurame! Barataan geesse.
                    </p>
                )}
            </div>
        </div>
    );
};

export default StopTimeline;