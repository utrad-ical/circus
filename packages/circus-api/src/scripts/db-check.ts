import { ValidationError } from 'ajv';
import { CollectionAccessor } from '../db/createCollectionAccessor';
import { Models } from '../db/createModels';
import Command from './Command';

export const options = () => {
  return [
    {
      names: ['target', 't'],
      help: 'Checks only this collection.',
      type: 'arrayOfString'
    }
  ];
};

export const help = () => {
  return 'Performs DB integrity check.\n' + 'Usage: node circus.js db-check';
};

export const command: Command<{ models: Models }> = async (
  opts,
  { models }
) => {
  return async (options: any) => {
    const { target } = options;
    for (const key in models) {
      if (Array.isArray(target) && target.indexOf(key) === -1) continue;
      console.log('Validating:', key);
      const model = (models as any)[key] as CollectionAccessor;
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
};

command.dependencies = ['models'];
