import { ulid } from 'ulid';

/**
 * Generate a new unique ID for project, case, etc.
 */
export default function generateUniqueId() {
  return ulid().toLowerCase();
}
