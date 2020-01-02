import connectDb from '../db/connectDb';
import createValidator from '../createValidator';
import createModels from '../db/createModels';
import { ValidationError } from 'ajv';

export const options = () => {
  return [
    {
      names: ['target', 't'],
      help: 'Checks only this collection.',
      type: 'arrayOfString'
    }
  ];
};

export const help = optionText => {
  console.log('Performs DB integrity check.\n');
  console.log('Usage: node circus.js db-check');
  console.log(optionText);
};

/**
 * @param {ReturnType<createModels>} models
 */
const main = async (options, models) => {
  const { target } = options;
  for (const key in models) {
    if (Array.isArray(target) && target.indexOf(key) === -1) continue;
    console.log('Validating:', key);
    const model = models[key];
    const cursor = await model.findAsCursor();
    let count = 0;
    while (await cursor.hasNext()) {
      try {
        await cursor.next(); // This will perform the validation
        count++;
      } catch (err) {
        if (err instanceof ValidationError) {
          console.error('There was a validation error:');
          console.error(err.errors);
          return;
        } else {
          throw err;
        }
      }
    }
    console.log(`  Validated: ${count} ${count === 1 ? 'item' : 'items'}.`);
  }
};

export const exec = async options => {
  const { db, dbConnection } = await connectDb();
  const validator = await createValidator();
  const models = await createModels(db, validator);
  try {
    await main(options, models);
  } finally {
    await dbConnection.close();
  }
};
