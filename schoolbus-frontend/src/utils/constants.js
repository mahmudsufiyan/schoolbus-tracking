// ============================================================
// API Base URL — reads from environment, falls back to localhost
// - In development (npm run dev): uses http://localhost:5000/api
// - In production (Vercel): uses VITE_API_BASE_URL from env
// ============================================================
export const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL
        ? `${import.meta.env.VITE_API_BASE_URL}/api`
        : 'http://localhost:5000/api';

// ============================================================
// Stop Proximity — distance in meters for "arrived at stop"
// ============================================================
export const STOP_PROXIMITY_METERS = 50;

// ============================================================
// GPS update frequency — every 5 seconds
// ============================================================
export const GPS_UPDATE_INTERVAL = 5000;

// ============================================================
// Default map center — Addis Ababa
// ============================================================
export const DEFAULT_MAP_CENTER = [9.0320, 38.7469];
export const DEFAULT_MAP_ZOOM = 13;