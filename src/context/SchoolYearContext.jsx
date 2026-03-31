import React, { createContext, useState, useContext } from 'react';

const SchoolYearContext = createContext();

export function SchoolYearProvider({ children }) {
  const [viewingSchoolYear, setViewingSchoolYear] = useState(null);
  const [activeSchoolYear, setActiveSchoolYear] = useState(null);

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
