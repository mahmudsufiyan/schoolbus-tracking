import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    const isStartingRef = useRef(false);
    const isProcessingRef = useRef(false); // 🆕 prevents multiple scans at once
    const lastScanTimeRef = useRef(0);      // 🆕 debounce rapid scans
    const containerId = 'qr-reader-container';

    // ============================================================
    // Cleanup — fully stop and release camera
    // ============================================================
    const killScanner = useCallback(async () => {
        const scanner = html5QrCodeRef.current;
        if (!scanner) return;
        html5QrCodeRef.current = null;

        try {
            const state = typeof scanner.getState === 'function' ? scanner.getState() : null;
            // 2 = SCANNING, 3 = PAUSED
            if (state === 2 || state === 3) {
                await scanner.stop();
            }
            if (typeof scanner.clear === 'function') {
                await scanner.clear();
            }
        } catch (e) {
            console.warn('killScanner error (safe):', e?.message);
        }

        // Also nuke anything left in the container
        const el = document.getElementById(containerId);
        if (el) el.innerHTML = '';
    }, []);

    // ============================================================
    // Handle decoded QR
    // ============================================================
    const handleScan = useCallback(async (decodedText) => {
        // 🆕 Debounce: ignore scans within 2s of the last one
        const now = Date.now();
        if (now - lastScanTimeRef.current < 2000) return;
        lastScanTimeRef.current = now;

        // 🆕 Prevent concurrent processing
        if (isProcessingRef.current || loading) return;
        isProcessingRef.current = true;

        setLoading(true);
        setError('');
        setSuccess('');

        // 🆕 Immediately pause the scanner so it doesn't keep firing
        try {
            if (html5QrCodeRef.current) {
                await html5QrCodeRef.current.pause(true);
            }
        } catch (e) {
            console.warn('pause error:', e?.message);
        }

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
                isProcessingRef.current = false;
                setLoading(false);
                // Resume scanning
                try { await html5QrCodeRef.current?.resume(); } catch {}
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

                // 🆕 Fully kill scanner AFTER successful scan (releases camera)
                await killScanner();

                setTimeout(() => {
                    setIsScanning(false);
                    setSuccess('');
                }, 2000);
            } else {
                setError(response.message || 'QR koodiin dogoggora ykn yeroo darbee');
                // Resume scanning so user can try again
                try { await html5QrCodeRef.current?.resume(); } catch {}
            }
        } catch (err) {
            setError('Scan godhuun hin dandaame: ' + (err?.message || 'unknown'));
            try { await html5QrCodeRef.current?.resume(); } catch {}
        } finally {
            setLoading(false);
            isProcessingRef.current = false;
        }
    }, [loading, socket, isConnected, busId, onScanSuccess, killScanner]);

    // ============================================================
    // Start scanner
    // ============================================================
    const startScanner = async () => {
        if (isStartingRef.current || html5QrCodeRef.current) return;
        isStartingRef.current = true;

        setError('');
        setSuccess('');
        setIsScanning(true);

        // Wait for modal + container to mount
        await new Promise(r => setTimeout(r, 400));

        try {
            const container = document.getElementById(containerId);
            if (!container) {
                setError('Scanner container hin argamne.');
                setIsScanning(false);
                isStartingRef.current = false;
                return;
            }

            container.innerHTML = '';

            const scanner = new Html5Qrcode(containerId, { verbose: false });
            html5QrCodeRef.current = scanner;

            const config = {
                fps: 10,
                qrbox: (vw, vh) => {
                    const min = Math.min(vw, vh);
                    const size = Math.floor(min * 0.7);
                    return { width: size, height: size };
                },
                aspectRatio: 1.0,
                disableFlip: false,
            };

            // Try back camera first
            try {
                await scanner.start(
                    { facingMode: 'environment' },
                    config,
                    handleScan,
                    () => {} // silent frame errors
                );
            } catch (err) {
                console.warn('Back camera failed, trying default:', err?.message);
                const cameras = await Html5Qrcode.getCameras();
                if (!cameras || cameras.length === 0) {
                    throw new Error('Kaameraan hin argamne.');
                }
                await scanner.start(
                    cameras[cameras.length - 1].id,
                    config,
                    handleScan,
                    () => {}
                );
            }
        } catch (err) {
            console.error('Scanner start error:', err);
            const msg = err?.message || String(err);
            if (msg.toLowerCase().includes('permission') || msg.includes('NotAllowed')) {
                setError('Kaameraaf hayyama hin kennine. Browser settings keessaa eeyyami.');
            } else if (msg.includes('NotFound') || msg.includes('hin argamne')) {
                setError('Kaameraan hin argamne.');
            } else {
                setError('Kaameraan hin banne: ' + msg);
            }
            await killScanner();
            setIsScanning(false);
        } finally {
            isStartingRef.current = false;
        }
    };

    // ============================================================
    // Stop scanner (user taps Close)
    // ============================================================
    const stopScanner = async () => {
        await killScanner();
        setIsScanning(false);
        setError('');
        setSuccess('');
        isStartingRef.current = false;
        isProcessingRef.current = false;
    };

    // ============================================================
    // Cleanup on unmount
    // ============================================================
    useEffect(() => {
        return () => { killScanner(); };
    }, [killScanner]);

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
                    <div
                        id={containerId}
                        className="bg-gray-900 rounded-lg overflow-hidden w-full"
                        style={{
                            minHeight: '300px',
                            maxHeight: '60vh',
                            position: 'relative',
                        }}
                    />

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