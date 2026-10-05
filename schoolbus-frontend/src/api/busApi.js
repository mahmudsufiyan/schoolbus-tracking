import apiClient from './axiosConfig';

// GET all buses
export const getAllBuses = async () => {
    const response = await apiClient.get('/buses');
    return response.data;
};

// GET bus by ID
export const getBusById = async (id) => {
    const response = await apiClient.get(`/buses/${id}`);
    return response.data;
};

// POST create bus (Admin only)
export const createBus = async (busData) => {
    const response = await apiClient.post('/buses', busData);
    return response.data;
};

// PUT update bus (Admin only)
export const updateBus = async (id, busData) => {
    const response = await apiClient.put(`/buses/${id}`, busData);
    return response.data;
};

// DELETE bus (Admin only)
export const deleteBus = async (id) => {
    const response = await apiClient.delete(`/buses/${id}`);
    return response.data;
};

// POST update bus location (Driver only)
export const updateBusLocation = async (id, latitude, longitude) => {
    const response = await apiClient.post(`/buses/${id}/location`, { latitude, longitude });
    return response.data;
};

// PUT update bus status (Admin or Driver)
export const updateBusStatus = async (id, status) => {
    const response = await apiClient.put(`/buses/${id}/status`, { status });
    return response.data;
};