import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const RoleBasedRedirect = () => {
  const { currentRole, isInitialized } = useUser();
  
  // Show loading while context is initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }
  
  const effectiveRole = localStorage.getItem('userRole') || currentRole;
  
  // Redirect based on user role
  if (effectiveRole === 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/user" replace />;
};

export default RoleBasedRedirect;
