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
      const parsedUser = JSON.parse(storedUser);
      console.log('UserContext - parsedUser:', parsedUser);
      setAdminUser(parsedUser);
    }

    const handleStorage = (e) => {
      console.log('UserContext - storage event:', e.key, e.newValue);
      if (e.key === "user" && e.newValue) {
        const parsedUser = JSON.parse(e.newValue);
        console.log('UserContext - updating from storage event:', parsedUser);
        setAdminUser(parsedUser);
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