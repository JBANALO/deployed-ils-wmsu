import React, { createContext, useState, useContext, useEffect } from 'react';

const SchoolYearContext = createContext();

const VIEWING_SY_STORAGE_KEY = 'adminViewingSchoolYear';
const ACTIVE_SY_STORAGE_KEY = 'adminActiveSchoolYear';

const loadStoredSchoolYear = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn(`Failed to parse localStorage key ${key}:`, error);
    return null;
  }
};

export function SchoolYearProvider({ children }) {
  const [viewingSchoolYear, setViewingSchoolYearState] = useState(() => loadStoredSchoolYear(VIEWING_SY_STORAGE_KEY));
  const [activeSchoolYear, setActiveSchoolYearState] = useState(() => loadStoredSchoolYear(ACTIVE_SY_STORAGE_KEY));

  useEffect(() => {
    if (viewingSchoolYear) {
      localStorage.setItem(VIEWING_SY_STORAGE_KEY, JSON.stringify(viewingSchoolYear));
    } else {
      localStorage.removeItem(VIEWING_SY_STORAGE_KEY);
    }
  }, [viewingSchoolYear]);

  useEffect(() => {
    if (activeSchoolYear) {
      localStorage.setItem(ACTIVE_SY_STORAGE_KEY, JSON.stringify(activeSchoolYear));
    } else {
      localStorage.removeItem(ACTIVE_SY_STORAGE_KEY);
    }
  }, [activeSchoolYear]);

  const setViewingSchoolYear = (schoolYear) => {
    setViewingSchoolYearState(schoolYear || null);
  };

  const setActiveSchoolYear = (schoolYear) => {
    setActiveSchoolYearState(schoolYear || null);
  };

  const isViewingLocked = viewingSchoolYear && activeSchoolYear && viewingSchoolYear.id !== activeSchoolYear.id;

  return (
    <SchoolYearContext.Provider
      value={{
        viewingSchoolYear,
        setViewingSchoolYear,
        activeSchoolYear,
        setActiveSchoolYear,
        isViewingLocked,
      }}
    >
      {children}
    </SchoolYearContext.Provider>
  );
}

export function useSchoolYear() {
  const context = useContext(SchoolYearContext);
  if (!context) {
    throw new Error('useSchoolYear must be used within SchoolYearProvider');
  }
  return context;
}
