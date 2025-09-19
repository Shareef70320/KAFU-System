import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [currentRole, setCurrentRole] = useState(() => {
    const role = localStorage.getItem('userRole') || 'USER';
    console.log('UserContext - Initializing currentRole from localStorage:', role);
    return role;
  });
  const [currentSid, setCurrentSid] = useState(() => {
    const sid = localStorage.getItem('userSid') || '2255';
    console.log('UserContext - Initializing currentSid from localStorage:', sid);
    return sid;
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Update localStorage when values change
  useEffect(() => {
    console.log('UserContext - Setting userRole to localStorage:', currentRole);
    localStorage.setItem('userRole', currentRole);
  }, [currentRole]);

  useEffect(() => {
    console.log('UserContext - Setting userSid to localStorage:', currentSid);
    localStorage.setItem('userSid', currentSid);
    
    // Clear ALL React Query cache when user changes
    console.log('UserContext - Clearing all cache for new user:', currentSid);
    queryClient.clear();
  }, [currentSid, queryClient]);

  // Mark as initialized after first render
  useEffect(() => {
    setIsInitialized(true);
    console.log('UserContext - Initialized with values:', { currentRole, currentSid });
  }, []);

  // Debug: Log current values
  useEffect(() => {
    console.log('UserContext - Current values:', { currentRole, currentSid });
  }, [currentRole, currentSid]);

  const value = {
    currentRole,
    setCurrentRole,
    currentSid,
    setCurrentSid,
    isInitialized
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
