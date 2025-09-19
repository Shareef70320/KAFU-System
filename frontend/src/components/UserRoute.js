import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const UserRoute = ({ children }) => {
  const { currentRole, isInitialized } = useUser();
  const location = useLocation();

  // Show loading while context is initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (currentRole !== 'USER') {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  return children;
};

export default UserRoute;


