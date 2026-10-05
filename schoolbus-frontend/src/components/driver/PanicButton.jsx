import React, { useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { Button, Modal } from '../common';

const PanicButton = ({ busId, location }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const { socket, isConnected } = useSocket();
    const { user } = useAuth();

    const handlePanic = () => {
        setIsModalOpen(true);
    };

    const confirmPanic = async () => {
        setLoading(true);
        setSent(false);

        try {
            const panicData = {
                busId,
                driverId: user?.id,
                latitude: location?.latitude || 0,
                longitude: location?.longitude || 0,
                timestamp: new Date().toISOString(),
                message: `🚨 FAXIMA! Otobiisii ${busId} balaan qabate!`,
            };

            // Socket fayyadamuun polisii fi admin tif erguu
            if (socket && isConnected) {
                socket.emit('emergency-panic', panicData);
                setSent(true);
                // Yeroo 5 sekondii booda modal cufuu
                setTimeout(() => {
                    setIsModalOpen(false);
                    setSent(false);
                    setLoading(false);
                }, 5000);
            } else {
                alert('❌ Socket walqabsiisa hin jiru. Internet keessan mirkaneeffadhu.');
                setLoading(false);
            }
        } catch (error) {
            console.error('Panic error:', error);
            alert('❌ Balaa erguu hin dandaame. Yeroo booda yaali.');
            setLoading(false);
        }
    };

    return (
        <>
            {/* Baantuu Diimaa */}
            <button
                onClick={handlePanic}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6 px-4 rounded-xl text-2xl transition transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-3"
            >
                <span className="animate-pulse">🚨</span>
                PANIC (Press)
                <span className="animate-pulse">🚨</span>
            </button>

            <p className="text-xs text-gray-500 text-center mt-1">
                Yeroo balaan qabatu (dokkoo, caccabuu, balaa qaamaa) tuqi!
            </p>

            {/* Modal Mirkaneessuu */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => !loading && setIsModalOpen(false)}
                title="🚨 Balaa Mirkaneeffachuu"
                size="md"
                actions={[
                    {
                        label: sent ? '✅ Balaan Ergame!' : loading ? '⏳ Ergaa...' : '✅ Eeyyee, Balaa Ergi!',
                        onClick: confirmPanic,
                        variant: sent ? 'success' : 'danger',
                    },
                    {
                        label: '❌ Haqa (Cancel)',
                        onClick: () => setIsModalOpen(false),
                        variant: 'secondary',
                    },
                ]}
            >
                <div className="space-y-4">
                    <div className="bg-red-50 border-2 border-red-500 p-4 rounded-lg">
                        <p className="text-red-700 font-bold text-lg">
                            🚨 Sanyii! Balaan qabate!
                        </p>
                        <p className="text-gray-700 text-sm">
                            Otobiisii: <span className="font-bold">{busId}</span>
                            <br />
                            Daraartuu: <span className="font-bold">{user?.full_name || user?.name}</span>
                            <br />
                            GPS: {location?.latitude?.toFixed(6) || '--'}, {location?.longitude?.toFixed(6) || '--'}
                        </p>
                    </div>

                    {sent && (
                        <div className="bg-green-100 border border-green-400 text-green-700 p-3 rounded-lg">
                            ✅ Balaan polisii fi admin tif ergame! Gargaarsi karaa irra jira.
                        </div>
                    )}

                    <p className="text-sm text-gray-500">
                        Baantuu "Eeyyee" tuquun polisii fi admin tif beeksisa yeroo sanatti ergita.
                    </p>
                </div>
            </Modal>
        </>
    );
};

export default PanicButton;