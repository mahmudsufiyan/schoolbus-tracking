import apiClient from './axiosConfig';

// 1. Galmaa'uu (Register) - Maqaa, Email, Password, Role (driver, parent, police)
export const registerUser = async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data; // { token, user }
};

// 2. Seenuu (Login) - Email fi Password qofa
export const loginUser = async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data; // { token, user }
};

// 3. Ba'uu (Logout) - Lokal keessaa balleessuu
export const logoutUser = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Yeroo ba'u gara login
    window.location.href = '/login';
};

// 4. Nama amma seenee argachuu (Token irraa) - Backend irraa qabachuu
export const getCurrentUser = async () => {
    const response = await apiClient.get('/auth/me');
    return response.data; // { user }
};