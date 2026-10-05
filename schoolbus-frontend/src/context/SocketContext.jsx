import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../utils/constants';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const { token, isAuthenticated, user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    // Refs to prevent double-connect in React StrictMode
    const socketRef = useRef(null);
    const connectingRef = useRef(false);

    useEffect(() => {
        // ------------------------------------------------------------
        // Not authenticated → close any existing socket
        // ------------------------------------------------------------
        if (!isAuthenticated || !token) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                connectingRef.current = false;
                setSocket(null);
                setIsConnected(false);
                console.log('🔌 Socket disconnected (logged out)');
            }
            return;
        }

        // ------------------------------------------------------------
        // Prevent double-connect
        // ------------------------------------------------------------
        if (connectingRef.current || socketRef.current) {
            console.log('🔄 Socket already exists, skipping');
            return;
        }

        connectingRef.current = true;
        console.log('🔌 Creating socket connection...');

        const socketUrl = API_BASE_URL.replace('/api', '');

        const socketInstance = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            autoConnect: true,
        });

        socketRef.current = socketInstance;
        setSocket(socketInstance);

        // ----------------- CONNECTION EVENTS -----------------
        socketInstance.on('connect', () => {
            console.log('✅ Socket.io connected! ID:', socketInstance.id);
            setIsConnected(true);
            connectingRef.current = false;
        });

        socketInstance.on('disconnect', (reason) => {
            console.log('❌ Socket.io disconnected:', reason);
            setIsConnected(false);
        });

        socketInstance.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error.message);
            setIsConnected(false);
            connectingRef.current = false;
        });

        // ----------------- RECONNECT -----------------
        socketInstance.on('reconnect', (attemptNumber) => {
            console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
            if (user?.role === 'parent' && user?.id) {
                socketInstance.emit('join-parent-room', user.id);
            }
            if (user?.role === 'driver' && user?.bus_id) {
                socketInstance.emit('join-bus-room', user.bus_id);
            }
        });

        // ⚠️ NO cleanup here on purpose – socket stays alive while logged in
    }, [token, isAuthenticated, user]);

    // ------------------------------------------------------------
    // Provider unmount cleanup (app close)
    // ------------------------------------------------------------
    useEffect(() => {
        return () => {
            if (socketRef.current) {
                console.log('🛑 Provider unmounting, closing socket');
                socketRef.current.disconnect();
                socketRef.current = null;
                connectingRef.current = false;
            }
        };
    }, []);

    // ------------------------------------------------------------
    // Context value
    // ------------------------------------------------------------
    const value = {
        socket,
        isConnected,

        emit: (event, data) => {
            if (socketRef.current?.connected) {
                socketRef.current.emit(event, data);
            } else {
                console.warn('⚠️ Socket not connected. Cannot emit:', event);
            }
        },

        on: (event, callback) => {
            if (socketRef.current) {
                socketRef.current.on(event, callback);
                return () => socketRef.current?.off(event, callback);
            }
            return () => {};
        },
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};