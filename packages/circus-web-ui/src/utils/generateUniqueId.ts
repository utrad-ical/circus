import { ulid } from 'ulid';

/**
 * Generate a new unique ID for project, case, etc.
 */
const generateUniqueId = () => {
  return ulid().toLowerCase();
};

export default generateUniqueId;
