import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_BASE_URL } from '../utils/constants';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // ✅ REAL AUTHENTICATION - No mock user
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check localStorage for existing token
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    // Register
    const register = async (userData) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
            const { token, user } = response.data;
            
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            
            setToken(token);
            setUser(user);
            
            return { success: true, user };
        } catch (error) {
            return { 
                success: false, 
                message: error.response?.data?.message || 'Registration failed!'
            };
        }
    };

    // Login
    const login = async (email, password) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
            const { token, user } = response.data;
            
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            
            setToken(token);
            setUser(user);
            
            return { success: true, user };
        } catch (error) {
            return { 
                success: false, 
                message: error.response?.data?.message || 'Invalid email or password!'
            };
        }
    };

    // Logout
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        window.location.href = '/login';
    };

    const value = {
        user,
        token,
        loading,
        register,
        login,
        logout,
        isAuthenticated: !!token && !!user, // ✅ Only true if token and user exist
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};