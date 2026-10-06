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
    const containerId = 'qr-reader-container';

    // ============================================================
    // Handle a successful decode
    // ============================================================
    const handleScan = async (decodedText) => {
        if (!decodedText || loading) return;

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

                // Stop scanner
                if (html5QrCodeRef.current) {
                    try { await html5QrCodeRef.current.stop(); } catch {}
                    html5QrCodeRef.current = null;
                }
                setTimeout(() => {
                    setIsScanning(false);
                    setSuccess('');
                }, 2000);
            } else {
                setError(response.message || 'QR koodiin dogoggora ykn yeroo darbee');
            }
        } catch (err) {
            setError('Scan godhuun hin dandaame: ' + err.message);
        }
        setLoading(false);
    };

    // ============================================================
    // Start scanner — with mobile-safe settings
    // ============================================================
    const startScanner = async () => {
        setError('');
        setSuccess('');

        // 1. Check HTTPS (required for camera on mobile)
        if (
            typeof window !== 'undefined' &&
            location.protocol !== 'https:' &&
            location.hostname !== 'localhost'
        ) {
            setError('Kaameraan HTTPS qofa irratti hojjeta. Vercel URL fayyadami.');
            return;
        }

        // 2. Check browser support
        if (!navigator.mediaDevices?.getUserMedia) {
            setError('Browser kun kaameraa hin deggeru.');
            return;
        }

        // 3. Ask permission explicitly (some browsers need this first)
        try {
            await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (permErr) {
            console.warn('Permission error:', permErr);
            setError('Kaameraaf hayyama hin kennine. Settings keessaa eeyyami.');
            return;
        }

        setIsScanning(true);

        // Wait for the modal + container to be in the DOM
        setTimeout(async () => {
            try {
                const container = document.getElementById(containerId);
                if (!container) {
                    setError('Scanner container hin argamne.');
                    setIsScanning(false);
                    return;
                }

                html5QrCodeRef.current = new Html5Qrcode(containerId, {
                    verbose: false,
                    formatsToSupport: undefined,
                });

                const config = {
                    fps: 10,
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                        const size = Math.floor(minEdge * 0.7);
                        return { width: size, height: size };
                    },
                    aspectRatio: 1.0,
                    disableFlip: false,
                };

                // Try back camera first, fall back to any camera
                try {
                    await html5QrCodeRef.current.start(
                        { facingMode: { ideal: 'environment' } },
                        config,
                        handleScan,
                        () => {} // ignore per-frame decode warnings
                    );
                } catch (err1) {
                    console.warn('Back camera failed, trying any camera:', err1);
                    const cameras = await Html5Qrcode.getCameras();
                    if (!cameras || cameras.length === 0) {
                        throw new Error('Kaameraan hin argamne.');
                    }
                    await html5QrCodeRef.current.start(
                        cameras[cameras.length - 1].id,
                        config,
                        handleScan,
                        () => {}
                    );
                }
            } catch (err) {
                console.error('Scanner start error:', err);
                setError('Kaameraan hin banne: ' + (err?.message || 'unknown'));
                setIsScanning(false);
                html5QrCodeRef.current = null;
            }
        }, 300); // wait for modal to render
    };

    // ============================================================
    // Stop scanner
    // ============================================================
    const stopScanner = async () => {
        if (html5QrCodeRef.current) {
            try {
                const state = html5QrCodeRef.current.getState?.();
                // State 2 = SCANNING
                if (state === 2) await html5QrCodeRef.current.stop();
                else if (state === 3) await html5QrCodeRef.current.clear();
            } catch (e) {
                console.warn('Stop scanner error:', e);
            }
            html5QrCodeRef.current = null;
        }
        setIsScanning(false);
        setError('');
        setSuccess('');
    };

    // ============================================================
    // Cleanup on unmount
    // ============================================================
    useEffect(() => {
        return () => {
            if (html5QrCodeRef.current) {
                try { html5QrCodeRef.current.stop().catch(() => {}); } catch {}
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
                    {/* QR reader container — explicit dimensions for mobile */}
                    <div
                        id={containerId}
                        className="bg-gray-900 rounded-lg overflow-hidden w-full"
                        style={{
                            minHeight: '300px',
                            maxHeight: '60vh',
                            position: 'relative',
                        }}
                    >
                        {/* html5-qrcode injects its video + canvas here */}
                    </div>

                    {/* Mobile-specific CSS overrides injected once */}
                    <style>{`
                        #${containerId} video {
                            width: 100% !important;
                            height: auto !important;
                            max-height: 60vh !important;
                            object-fit: cover !important;
                            border-radius: 8px;
                        }
                        #${containerId} canvas {
                            display: none !important;
                        }
                    `}</style>

                    {loading && (
                        <div className="flex justify-center">
                            <Spinner size="md" color="blue" />
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                            {success}
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
                            ❌ {error}
                        </div>
                    )}

                    <p className="text-xs text-gray-500 text-center">
                        QR koodichi barataa morma isaatti fannifame (badge) ta'uu qaba.
                    </p>

                    <Button onClick={stopScanner} variant="secondary" fullWidth>
                        ✕ Cufuu
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default QRScanner;