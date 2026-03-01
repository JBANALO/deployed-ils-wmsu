import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null); // 

  // Initialize from localStorage
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
      if (e.key === "user" && e.newValue) {
        try {
          const parsedUser = JSON.parse(e.newValue);
          console.log('UserContext - updating from storage event:', parsedUser);
          setAdminUser(parsedUser);
        } catch (error) {
          console.error('UserContext - Error parsing storage event user:', error);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Update user helper
  const updateUser = (user) => {
    setAdminUser(user);
    setProfileImageFile(null); // reset file after saving
    localStorage.setItem("user", JSON.stringify(user)); // optional: keep localStorage in sync
  };

  return (
    <UserContext.Provider value={{ adminUser, updateUser, profileImageFile, setProfileImageFile }}>
      {children}
    </UserContext.Provider>
  );
};