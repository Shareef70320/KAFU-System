import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const ClinicRoute = ({ children }) => {
  const { currentRole, currentSid, isInitialized } = useUser();
  const location = useLocation();

  // Show loading while context is initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Allow admins
  if (currentRole === 'ADMIN') {
    return children;
  }

  // Check if user has clinic access
  if (currentRole === 'USER' && currentSid) {
    try {
      const saved = localStorage.getItem('kafuClinicAccessList');
      const accessList = saved ? JSON.parse(saved) : [];
      const hasAccess = accessList.some(access => access.userId === currentSid);
      
      if (hasAccess) {
        return children;
      }
    } catch (error) {
      console.error('Error checking clinic access:', error);
    }
  }

  // Redirect to user dashboard if no access
  return <Navigate to="/user" state={{ from: location }} replace />;
};

export default ClinicRoute;

