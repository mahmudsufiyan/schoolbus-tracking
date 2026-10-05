import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Context Providers
import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';

// Routes
import PrivateRoute from './PrivateRoute';
import PublicRoute from './PublicRoute';

// Pages
import Home from '../pages/Home';        // ✅ Public – Everyone sees this first
import Login from '../pages/Login';      // ✅ Public
import Register from '../pages/Register';// ✅ Public
import DriverDashboard from '../pages/DriverDashboard';
import ParentDashboard from '../pages/ParentDashboard';
import AdminDashboard from '../pages/AdminDashboard';
import PoliceDashboard from '../pages/PoliceDashboard';

const AppRoutes = () => {
    return (
        <Router>
            <AuthProvider>
                <SocketProvider>
                    <Routes>
                        {/* ✅ EVERYONE → HOME PAGE FIRST */}
                        <Route path="/" element={<Home />} />

                        {/* Public Routes (only accessible when NOT logged in) */}
                        <Route path="/login" element={
                            <PublicRoute>
                                <Login />
                            </PublicRoute>
                        } />
                        <Route path="/register" element={
                            <PublicRoute>
                                <Register />
                            </PublicRoute>
                        } />

                        {/* Private Routes (only accessible when logged in) */}
                        <Route path="/driver" element={
                            <PrivateRoute allowedRoles={['driver']}>
                                <DriverDashboard />
                            </PrivateRoute>
                        } />
                        <Route path="/parent" element={
                            <PrivateRoute allowedRoles={['parent']}>
                                <ParentDashboard />
                            </PrivateRoute>
                        } />
                        <Route path="/admin" element={
                            <PrivateRoute allowedRoles={['admin']}>
                                <AdminDashboard />
                            </PrivateRoute>
                        } />
                        <Route path="/police" element={
                            <PrivateRoute allowedRoles={['police']}>
                                <PoliceDashboard />
                            </PrivateRoute>
                        } />

                        {/* 404 → Redirect to Home */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </SocketProvider>
            </AuthProvider>
        </Router>
    );
};

export default AppRoutes;