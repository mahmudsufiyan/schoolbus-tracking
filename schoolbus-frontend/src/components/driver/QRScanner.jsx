import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { scanStudentQR } from '../../api/studentApi';
import { useSocket } from '../../context/SocketContext';
import { Button, Modal, Spinner } from '../common';

const QRScanner = ({ busId, onScanSuccess }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { socket, isConnected } = useSocket();
    const html5QrCodeRef = useRef(null);

    const handleScan = async (decodedText) => {
        if (decodedText && !loading) {
            setLoading(true);
            setError('');
            setSuccess('');

            try {
                let studentId, otpToken;
                try {
                    const data = JSON.parse(decodedText);
                    studentId = data.studentId || data.id;
                    otpToken = data.token || data.otp;
                } catch {
                    const parts = decodedText.split('|');
                    studentId = parts[0];
                    otpToken = parts[1];
                }

                if (!studentId || !otpToken) {
                    setError('QR code dogoggora!');
                    setLoading(false);
                    return;
                }

                const response = await scanStudentQR(studentId, otpToken);
                
                if (response.success) {
                    setSuccess(`✅ ${response.message || 'Barataan mirkaneeffame!'}`);
                    if (onScanSuccess) {
                        onScanSuccess({ studentId, studentName: response.studentName });
                    }
                    if (socket && isConnected) {
                        socket.emit('student-boarded', { studentId, busId, timestamp: new Date() });
                    }
                    // Scanner dhaabuu
                    if (html5QrCodeRef.current) {
                        await html5QrCodeRef.current.stop();
                        html5QrCodeRef.current = null;
                    }
                    // 2 sec booda modal cufuu
                    setTimeout(() => {
                        setIsScanning(false);
                        setSuccess('');
                    }, 2000);
                } else {
                    setError(response.message || 'QR koodiin dogoggora ykn yeroo darbee (expired)');
                }
            } catch (err) {
                setError('Scan godhuun hin dandaame: ' + err.message);
            }
            setLoading(false);
        }
    };

    const startScanner = async () => {
        setIsScanning(true);
        setError('');
        setSuccess('');

        try {
            html5QrCodeRef.current = new Html5Qrcode('qr-reader-container');
            
            await html5QrCodeRef.current.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                handleScan,
                (error) => {
                    // Yeroo tokko tokko dogoggora xiqqoo ta'u, isa hin ilaalu
                    if (error && error.name !== 'NotFoundException') {
                        console.warn('QR Scan warning:', error);
                    }
                }
            );
        } catch (err) {
            console.error('Scanner start error:', err);
            setError('Kaameraan hin banne. Addaan mirkaneeffadhu.');
            setIsScanning(false);
        }
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current) {
            try {
                await html5QrCodeRef.current.stop();
            } catch (e) {
                console.warn('Stop scanner error:', e);
            }
            html5QrCodeRef.current = null;
        }
        setIsScanning(false);
        setError('');
        setSuccess('');
    };

    // Yeroo component ba'u scanner dhaabuu
    useEffect(() => {
        return () => {
            if (html5QrCodeRef.current) {
                html5QrCodeRef.current.stop().catch(() => {});
                html5QrCodeRef.current = null;
            }
        };
    }, []);

    return (
        <div className="space-y-3">
            {!isScanning && (
                <Button
                    onClick={startScanner}
                    variant="primary"
                    size="lg"
                    fullWidth
                >
                    📷 QR Xaxxabuu (Scan)
                </Button>
            )}

            <Modal
                isOpen={isScanning}
                onClose={stopScanner}
                title="📸 QR Koodii Xaxxabi"
                size="md"
            >
                <div className="space-y-4">
                    {/* QR Reader Container - Html5Qrcode fayyadama */}
                    <div 
                        id="qr-reader-container" 
                        className="bg-gray-900 rounded-lg overflow-hidden w-full max-h-80"
                    ></div>

                    {loading && <Spinner size="md" color="blue" />}

                    {success && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                            {success}
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            ❌ {error}
                        </div>
                    )}

                    <p className="text-xs text-gray-500 text-center">
                        QR koodichi barataa morma isaatti fannifame (badge) ta'uu qaba.
                    </p>

                    <Button
                        onClick={stopScanner}
                        variant="secondary"
                        fullWidth
                    >
                        ✕ Cufuu
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default QRScanner;