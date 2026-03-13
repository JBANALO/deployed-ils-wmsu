const normalizePasswordSeed = ({ email = '', username = '', firstName = '', lastName = '' }) => {
  const emailSeed = email.includes('@') ? email.split('@')[0] : email;
  return (emailSeed || username || `${firstName}${lastName}` || 'teacher')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
};

export const generateWmsuPassword = (teacher = {}) => {
  const seed = normalizePasswordSeed(teacher);
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 90000;
  }

  const suffix = String(hash + 10000).padStart(5, '0');
  return `WMSU${suffix}`;
};