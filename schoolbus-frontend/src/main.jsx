import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRoutes from './routes/AppRoutes';
import './assets/styles/global.css';
import 'leaflet/dist/leaflet.css';

// 🎯 NOTE: React.StrictMode is removed on purpose.
// It causes sockets to connect/disconnect twice in development,
// breaking real-time features like live tracking.
ReactDOM.createRoot(document.getElementById('root')).render(
    <AppRoutes />
);