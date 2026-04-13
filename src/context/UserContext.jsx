import React, { createContext, useState, useEffect, useContext } from "react";

export const UserContext = createContext();

// Custom hook to use the UserContext
export const useAuth = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useAuth must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(() => {
    // Initialize from localStorage on app load
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Error parsing stored user:", error);
      return null;
    }
  });
  const [profileImageFile, setProfileImageFile] = useState(null); // 

  // Update user helper
  const updateUser = (user) => {
    console.log('UserContext - updateUser called with:', user);
    setAdminUser(user);
    setProfileImageFile(null); // reset file after saving
    localStorage.setItem("user", JSON.stringify(user)); // optional: keep localStorage in sync
    
    // Force refresh other tabs to clear stale data
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'user',
      newValue: JSON.stringify(user)
    }));
  };

  // Login update function that preserves localStorage changes
  const loginUpdate = (serverUser) => {
    console.log('UserContext - loginUpdate called with server data:', serverUser);
    
    // Get current localStorage data
    const storedUser = localStorage.getItem("user");
    let finalUser = serverUser;
    
    if (storedUser) {
      try {
        const parsedStoredUser = JSON.parse(storedUser);
        
        // Preserve updated fields from localStorage that might be newer than server data
        finalUser = {
          ...serverUser,
          firstName: parsedStoredUser.firstName || serverUser.firstName || serverUser.first_name,
          lastName: parsedStoredUser.lastName || serverUser.lastName || serverUser.last_name,
          phone: parsedStoredUser.phone || serverUser.phone,
          profileImage: parsedStoredUser.profileImage || serverUser.profileImage,
        };
        
        console.log('UserContext - merged user data:', finalUser);
      } catch (error) {
        console.error('Error parsing stored user during login:', error);
      }
    }
    
    setAdminUser(finalUser);
    localStorage.setItem("user", JSON.stringify(finalUser));
    
    // Force refresh other tabs
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'user',
      newValue: JSON.stringify(finalUser)
    }));
  };

  // Logout function to clear user data but preserve profile updates
  const logout = () => {
    console.log('UserContext - logout called, clearing user data');
    
    // Before clearing, save profile updates to a temporary location
    if (adminUser) {
      const profileUpdates = {
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        phone: adminUser.phone,
        profileImage: adminUser.profileImage,
      };
      localStorage.setItem("profileUpdates", JSON.stringify(profileUpdates));
      console.log('UserContext - saved profile updates before logout');
    }
    
    setAdminUser(null);
    setProfileImageFile(null);
    localStorage.removeItem("user"); // Only remove user, not profileUpdates
    
    // Force refresh other tabs to clear stale data
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'user',
      newValue: null
    }));
  };

  return (
    <UserContext.Provider value={{ adminUser, updateUser, logout, profileImageFile, setProfileImageFile }}>
      {children}
    </UserContext.Provider>
  );
};