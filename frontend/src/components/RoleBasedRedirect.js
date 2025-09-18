import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const RoleBasedRedirect = () => {
  const { currentRole, currentSid } = useUser();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check localStorage directly
    const storedRole = localStorage.getItem('userRole');
    const storedSid = localStorage.getItem('userSid');
    console.log('RoleBasedRedirect - localStorage check:', { storedRole, storedSid });
    
    // Wait for UserContext to be fully initialized
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="ml-4">Loading user context...</div>
      </div>
    );
  }

  console.log('RoleBasedRedirect - currentRole:', currentRole, 'currentSid:', currentSid);
  console.log('RoleBasedRedirect - localStorage role:', localStorage.getItem('userRole'));
  
  // Force USER role if localStorage says USER
  const effectiveRole = localStorage.getItem('userRole') || currentRole;
  console.log('RoleBasedRedirect - effectiveRole:', effectiveRole);
  
  // Redirect based on user role
  if (effectiveRole === 'ADMIN') {
    console.log('Redirecting to admin dashboard');
    return <Navigate to="/dashboard" replace />;
  } else {
    console.log('Redirecting to user dashboard (default)');
    return <Navigate to="/user" replace />;
  }
};

export default RoleBasedRedirect;
