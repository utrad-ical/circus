import type { CollectionAccessor } from '../db/createCollectionAccessor.ts';
import type { Models } from '../interface.ts';
import type Command from './Command.ts';
import { formatPath, ValidationError } from '../createValidator.ts';

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
  return 'Performs DB integrity check.\n' + 'Usage: circus db-check';
};

export const command: Command<{ models: Models }> = async (
  opts,
  { models }
) => {
  return async (options: any) => {
    const { target } = options;
    let totalErrors = 0;
    for (const key in models) {
      if (Array.isArray(target) && target.indexOf(key) === -1) continue;
      console.log('Validating:', key);
      const model = (models as any)[key] as CollectionAccessor;
      const cursor = await model.findAsCursor({}, { strict: true });
      let count = 0;
      let errors = 0;
      while (await cursor.hasNext()) {
        try {
          await cursor.next(); // This will perform the validation
          count++;
        } catch (err) {
          if (!(err instanceof ValidationError)) throw err;
          errors++;
          console.error(`  Validation error (#${count + errors}):`);
          for (const i of err.issues)
            console.error(`    ${formatPath(i.path)}: ${i.message}`);
        }
      }
      totalErrors += errors;
      console.log(
        `  Validated: ${count} ${count === 1 ? 'item' : 'items'}` +
          (errors ? `, ${errors} with errors.` : '.')
      );
    }
    if (totalErrors) {
      console.error(`Found ${totalErrors} invalid item(s).`);
      process.exitCode = 1;
    }
  };
};

command.dependencies = ['models'];
