import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(null);

  // Initialize from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setAdminUser(JSON.parse(storedUser));

    // Listen to storage events from other tabs
    const handleStorage = (e) => {
      if (e.key === "user" && e.newValue) {
        setAdminUser(JSON.parse(e.newValue));
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Helper to update user both in context and localStorage
  const updateUser = (user) => {
    setAdminUser(user);
    localStorage.setItem("user", JSON.stringify(user));
  };

  return (
    <UserContext.Provider value={{ adminUser, updateUser }}>
      {children}
    </UserContext.Provider>
  );
};