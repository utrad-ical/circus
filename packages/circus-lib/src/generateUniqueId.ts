import { ulid } from 'ulid';

/**
 * Generate a new unique ID for project, case, etc.
 */
const generateUniqueId: () => string = () => {
  return ulid().toLowerCase();
};

export default generateUniqueId;
