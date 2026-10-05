import apiClient from './axiosConfig';

// GET all drivers (Admin only)
export const getAllDrivers = async () => {
    const response = await apiClient.get('/drivers');
    return response.data;
};

// GET driver by ID
export const getDriverById = async (id) => {
    const response = await apiClient.get(`/drivers/${id}`);
    return response.data;
};

// GET driver trip history
export const getDriverTrips = async (id) => {
    const response = await apiClient.get(`/drivers/${id}/trips`);
    return response.data;
};