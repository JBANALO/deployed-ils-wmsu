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

const normalizeGrade = (value = '') => String(value).trim().toLowerCase().replace(/^grade\s+/i, '').replace(/\s+/g, ' ');
const normalizeSection = (value = '') => String(value).trim().toLowerCase().replace(/\s+/g, ' ');

export const dedupeTeacherClasses = (classes = []) => {
  const uniqueMap = new Map();
  for (const cls of Array.isArray(classes) ? classes : []) {
    if (!cls) continue;
    const idPart = cls.id !== undefined && cls.id !== null && String(cls.id).trim() !== ''
      ? `id:${String(cls.id).trim().toLowerCase()}`
      : '';
    const gsPart = `gs:${normalizeGrade(cls.grade || cls.grade_level)}::${normalizeSection(cls.section)}`;
    const key = idPart || gsPart;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, cls);
    } else {
      uniqueMap.set(key, { ...uniqueMap.get(key), ...cls });
    }
  }
  return Array.from(uniqueMap.values());
};
