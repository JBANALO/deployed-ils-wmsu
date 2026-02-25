import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null); // ✅ add this

  // Initialize from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setAdminUser(JSON.parse(storedUser));

    const handleStorage = (e) => {
      if (e.key === "user" && e.newValue) {
        setAdminUser(JSON.parse(e.newValue));
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