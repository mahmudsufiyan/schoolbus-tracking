import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PublicRoute = ({ children }) => {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">⏳ Loading...</div>;
    }

    // ✅ If already logged in → redirect to their dashboard
    if (isAuthenticated && user) {
        return <Navigate to={`/${user.role}`} replace />;
    }

    return children ? children : <Outlet />;
};

export default PublicRoute;