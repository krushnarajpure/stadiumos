import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0C0E12]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-[#00E676]" />
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};
export default ProtectedRoute;
