const VIEWING_SY_KEY = 'teacherViewingSchoolYearId';
const ACTIVE_SY_KEY = 'teacherActiveSchoolYearId';

export const getTeacherViewingSchoolYearId = () => {
  const value = localStorage.getItem(VIEWING_SY_KEY);
  return value ? String(value) : '';
};

export const setTeacherViewingSchoolYearId = (schoolYearId) => {
  if (!schoolYearId) {
    localStorage.removeItem(VIEWING_SY_KEY);
    return;
  }
  localStorage.setItem(VIEWING_SY_KEY, String(schoolYearId));
};

export const getTeacherActiveSchoolYearId = () => {
  const value = localStorage.getItem(ACTIVE_SY_KEY);
  return value ? String(value) : '';
};

export const setTeacherActiveSchoolYearId = (schoolYearId) => {
  if (!schoolYearId) {
    localStorage.removeItem(ACTIVE_SY_KEY);
    return;
  }
  localStorage.setItem(ACTIVE_SY_KEY, String(schoolYearId));
};

export const isTeacherViewOnlyMode = (viewingSchoolYearId, activeSchoolYearId) => {
  if (!viewingSchoolYearId || !activeSchoolYearId) return false;
  return Number(viewingSchoolYearId) !== Number(activeSchoolYearId);
};

export const appendSchoolYearId = (url, schoolYearId) => {
  if (!schoolYearId) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}schoolYearId=${encodeURIComponent(schoolYearId)}`;
};
