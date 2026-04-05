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
  const [adminUser, setAdminUser] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null); // 

  // Initialize from localStorage and handle updates
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    console.log('UserContext - storedUser from localStorage:', storedUser);
    
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('UserContext - parsedUser:', parsedUser);
        console.log('UserContext - parsedUser.profileImage:', parsedUser.profileImage);
        setAdminUser(parsedUser);
      } catch (error) {
        console.error('UserContext - Error parsing stored user:', error);
        localStorage.removeItem("user");
      }
    }

    const handleStorage = (e) => {
      console.log('UserContext - storage event:', e.key, e.newValue);
      if (e.key === "user") {
        if (e.newValue) {
          try {
            const parsedUser = JSON.parse(e.newValue);
            console.log('UserContext - updating from storage event:', parsedUser);
            setAdminUser(parsedUser);
          } catch (error) {
            console.error('UserContext - Error parsing storage event user:', error);
          }
        } else {
          // User was cleared, set to null
          setAdminUser(null);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Also check for user changes when window gains focus (tab switching)
  useEffect(() => {
    const handleFocus = () => {
      const currentUser = localStorage.getItem("user");
      if (currentUser) {
        try {
          const parsedUser = JSON.parse(currentUser);
          console.log('UserContext - refreshing user data on focus:', parsedUser);
          
          // Only update if current user is null or has different email
          // This prevents overriding fresh data with stale localStorage data
          if (!adminUser || adminUser.email !== parsedUser.email) {
            setAdminUser(parsedUser);
          }
        } catch (error) {
          console.error('UserContext - Error parsing user on focus:', error);
        }
      } else {
        setAdminUser(null);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [adminUser]);

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

  return (
    <UserContext.Provider value={{ adminUser, updateUser, profileImageFile, setProfileImageFile }}>
      {children}
    </UserContext.Provider>
  );
};