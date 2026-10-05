import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, allowedRoles = [] }) => {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">⏳ Loading...</div>;
    }

    // ❌ Not logged in → go to login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // ❌ Logged in but wrong role → go to their own dashboard
    if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
        return <Navigate to={`/${user?.role}`} replace />;
    }

    return children ? children : <Outlet />;
};

export default PrivateRoute;