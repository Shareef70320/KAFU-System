import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const RoleBasedRedirect = () => {
  const { currentRole } = useUser();
  const effectiveRole = localStorage.getItem('userRole') || currentRole;
  
  // Redirect based on user role
  if (effectiveRole === 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/user" replace />;
};

export default RoleBasedRedirect;
