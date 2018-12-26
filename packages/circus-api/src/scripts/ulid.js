import generateUniqueId from '../utils/generateUniqueId';

export function help() {
  console.log('Generates and prints a new ID.');
}

export default async function exec() {
  console.log(generateUniqueId());
}
