import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const UserRoute = ({ children }) => {
  const { currentRole } = useUser();
  const location = useLocation();

  if (currentRole !== 'USER') {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  return children;
};

export default UserRoute;


