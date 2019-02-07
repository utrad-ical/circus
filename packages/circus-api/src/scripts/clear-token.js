import connectDb from '../db/connectDb';
import createValidator from '../createValidator';
import createModels from '../db/createModels';

export function help() {
  console.log('Removes all access tokens.\n');
  console.log('Usage: node circus.js clear-token');
}

export async function exec() {
  const db = await connectDb();
  try {
    const validator = await createValidator();
    const models = await createModels(db, validator);
    const res = await models.token.deleteMany({});
    console.log(`Deleted ${res.result.n} access token(s).`);
  } finally {
    await db.close();
  }
}
