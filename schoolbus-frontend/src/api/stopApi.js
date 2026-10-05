import apiClient from './axiosConfig';

// GET all stops
export const getAllStops = async () => {
    const response = await apiClient.get('/stops');
    return response.data;
};

// GET stops by bus ID
export const getStopsByBus = async (busId) => {
    const response = await apiClient.get(`/stops/bus/${busId}`);
    return response.data;
};

// POST create stop (Admin only)
export const createStop = async (stopData) => {
    const response = await apiClient.post('/stops', stopData);
    return response.data;
};

// PUT update stop (Admin only)
export const updateStop = async (id, stopData) => {
    const response = await apiClient.put(`/stops/${id}`, stopData);
    return response.data;
};

// DELETE stop (Admin only)
export const deleteStop = async (id) => {
    const response = await apiClient.delete(`/stops/${id}`);
    return response.data;
};