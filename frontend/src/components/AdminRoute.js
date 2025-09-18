import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const AdminRoute = ({ children }) => {
  const { currentRole } = useUser();
  const location = useLocation();

  if (currentRole !== 'ADMIN') {
    return <Navigate to="/user" state={{ from: location }} replace />;
  }

  return children;
};

export default AdminRoute;


