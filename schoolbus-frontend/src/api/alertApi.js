import apiClient from './axiosConfig';

// GET all alerts
export const getAllAlerts = async () => {
    const response = await apiClient.get('/alerts');
    return response.data;
};

// GET active alerts
export const getActiveAlerts = async () => {
    const response = await apiClient.get('/alerts/active');
    return response.data;
};

// POST create alert (Driver only)
export const createAlert = async (alertData) => {
    const response = await apiClient.post('/alerts', alertData);
    return response.data;
};

// PUT resolve alert (Police or Admin)
export const resolveAlert = async (id) => {
    const response = await apiClient.put(`/alerts/${id}/resolve`);
    return response.data;
};

// GET alert statistics (Admin/Police)
export const getAlertStats = async () => {
    const response = await apiClient.get('/alerts/stats');
    return response.data;
};