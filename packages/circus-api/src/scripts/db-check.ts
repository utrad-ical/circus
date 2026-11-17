import type { CollectionAccessor } from '../db/createCollectionAccessor.ts';
import type { Models } from '../interface.ts';
import { styleText } from 'node:util';
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
    // The number of documents with each issue, e.g., 'clinicalCase
    // revisions[*].series[*].labels[*].attributes: Invalid input'
    const summary = new Map<string, number>();
    for (const key in models) {
      if (Array.isArray(target) && target.indexOf(key) === -1) continue;
      console.log(styleText('bold', `Validating: ${key}`));
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
          console.error(
            styleText(
              'red',
              `  Validation error (#${count + errors}, ${String(err.documentId)}):`
            )
          );
          const kinds = new Set<string>();
          for (const i of err.issues) {
            console.error(
              `    ${styleText('yellow', formatPath(i.path))}: ${i.message}`
            );
            const path = formatPath(i.path).replace(/\[\d+\]/g, '[*]');
            kinds.add(`${key} ${path}: ${i.message}`);
          }
          for (const kind of kinds)
            summary.set(kind, (summary.get(kind) ?? 0) + 1);
        }
      }
      totalErrors += errors;
      console.log(
        styleText(
          errors ? 'red' : 'green',
          `  Validated: ${count} ${count === 1 ? 'item' : 'items'}` +
            (errors ? `, ${errors} with errors.` : '.')
        )
      );
    }
    if (totalErrors) {
      console.error(
        styleText('bold', 'Summary (the number of items with each issue):')
      );
      for (const [kind, n] of summary)
        console.error(`  ${styleText('red', String(n))}\t${kind}`);
      console.error(styleText('red', `Found ${totalErrors} invalid item(s).`));
      process.exitCode = 1;
    }
  };
};

command.dependencies = ['models'];
