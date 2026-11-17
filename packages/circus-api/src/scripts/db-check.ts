import type { CollectionAccessor } from '../db/createCollectionAccessor.ts';
import type { Models } from '../interface.ts';
import { styleText } from 'node:util';
import type Command from './Command.ts';
import checkRevisionAttributes from '../case/checkRevisionAttributes.ts';
import {
  formatPath,
  ValidationError,
  type ValidationIssue
} from '../createValidator.ts';

export const options = () => {
  return [
    {
      names: ['target', 't'],
      help: 'Checks only this collection.',
      type: 'arrayOfString'
    },
    {
      names: ['documents-only'],
      help: 'Checks only the documents with their schemas.',
      type: 'bool'
    },
    {
      names: ['attributes-only'],
      help: 'Checks only the attributes of cases with the project schemas.',
      type: 'bool'
    }
  ];
};

export const help = () => {
  return 'Performs DB integrity check.\n' + 'Usage: circus db-check';
};

/**
 * Collects the issues of documents, and prints them and their summary.
 * The summary has the number of documents with each issue, with the array
 * indexes merged (e.g., 'revisions[*].series[*].labels[*].attributes').
 */
const createReporter = (color: 'red' | 'yellow') => {
  const summary = new Map<string, number>();
  let documents = 0;
  return {
    add: (
      label: string,
      id: unknown,
      issues: ValidationIssue[],
      collection: string
    ) => {
      documents++;
      console.error(styleText(color, `  ${label} (${String(id)}):`));
      const kinds = new Set<string>();
      for (const i of issues) {
        const path = formatPath(i.path);
        console.error(`    ${styleText('yellow', path)}: ${i.message}`);
        kinds.add(
          `${collection} ${path.replace(/\[\d+\]/g, '[*]')}: ${i.message}`
        );
      }
      for (const kind of kinds) summary.set(kind, (summary.get(kind) ?? 0) + 1);
    },
    get documents() {
      return documents;
    },
    printSummary: () => {
      for (const [kind, n] of summary)
        console.error(`  ${styleText(color, String(n))}\t${kind}`);
    }
  };
};

/**
 * Shows the progress like `1022/10105 checked` on a terminal,
 * which is cleared before other output.
 */
const createProgress = (total: number) => {
  const tty = process.stdout.isTTY;
  let last = 0;
  return {
    update: (done: number) => {
      const now = Date.now();
      if (!tty || (now - last < 100 && done < total)) return;
      last = now;
      process.stdout.write(`\r  ${done}/${total} checked`);
    },
    clear: () => {
      if (tty) process.stdout.write('\r\x1b[K');
    }
  };
};

/**
 * Checks the attributes of the latest revisions of the cases with the
 * current schemas of their projects. A mismatch is a warning, because
 * the project schemas may have changed after the cases were saved;
 * such a case cannot be saved until its attributes are fixed.
 */
const checkCaseAttributes = async (models: Models) => {
  console.log(
    styleText(
      'bold',
      'Checking the attributes of the latest revisions of cases ' +
        'with the current project schemas'
    )
  );
  const projects = new Map<
    string,
    Awaited<ReturnType<Models['project']['findById']>>
  >();
  const projectCursor = models.project.findAsCursor();
  while (await projectCursor.hasNext()) {
    try {
      const project = await projectCursor.next();
      projects.set(project.projectId, project);
    } catch (err) {
      if (!(err instanceof ValidationError)) throw err; // Reported above
    }
  }
  const reporter = createReporter('yellow');
  let count = 0;
  let done = 0;
  const cursor = models.clinicalCase.findAsCursor();
  const progress = createProgress(await cursor.count());
  while (await cursor.hasNext()) {
    progress.update(done++);
    let aCase;
    try {
      aCase = await cursor.next();
    } catch (err) {
      if (!(err instanceof ValidationError)) throw err; // Reported above
      continue;
    }
    count++;
    const project = projects.get(aCase.projectId);
    const issues: ValidationIssue[] = project
      ? checkRevisionAttributes(project, aCase.latestRevision).map(i => ({
          ...i,
          path: ['latestRevision', ...i.path]
        }))
      : [{ path: ['projectId'], message: 'No such project', code: 'custom' }];
    if (issues.length) {
      progress.clear();
      reporter.add('Warning', aCase.caseId, issues, 'clinicalCase');
    }
  }
  progress.clear();
  console.log(
    styleText(
      reporter.documents ? 'yellow' : 'green',
      `  Checked: ${count} ${count === 1 ? 'case' : 'cases'}` +
        (reporter.documents ? `, ${reporter.documents} with warnings.` : '.')
    )
  );
  if (reporter.documents) {
    console.error(
      styleText('bold', 'Summary (the number of cases with each warning):')
    );
    reporter.printSummary();
  }
};

export const command: Command<{ models: Models }> = async (
  opts,
  { models }
) => {
  return async (options: any) => {
    const { target, documents_only, attributes_only } = options;
    const isTarget = (key: string) =>
      !Array.isArray(target) || target.includes(key);
    const reporter = createReporter('red');
    for (const key in models) {
      if (!isTarget(key) || attributes_only) continue;
      console.log(styleText('bold', `Validating: ${key}`));
      const model = (models as any)[key] as CollectionAccessor;
      const cursor = await model.findAsCursor({}, { strict: true });
      const progress = createProgress(await cursor.count());
      let count = 0;
      let errors = 0;
      while (await cursor.hasNext()) {
        progress.update(count + errors);
        try {
          await cursor.next(); // This will perform the validation
          count++;
        } catch (err) {
          if (!(err instanceof ValidationError)) throw err;
          errors++;
          progress.clear();
          reporter.add(
            `Validation error (#${count + errors})`,
            err.documentId,
            err.issues,
            key
          );
        }
      }
      progress.clear();
      console.log(
        styleText(
          errors ? 'red' : 'green',
          `  Validated: ${count} ${count === 1 ? 'item' : 'items'}` +
            (errors ? `, ${errors} with errors.` : '.')
        )
      );
    }
    if (isTarget('clinicalCase') && !documents_only)
      await checkCaseAttributes(models);
    if (reporter.documents) {
      console.error(
        styleText('bold', 'Summary (the number of items with each issue):')
      );
      reporter.printSummary();
      console.error(
        styleText('red', `Found ${reporter.documents} invalid item(s).`)
      );
      process.exitCode = 1;
    }
  };
};

command.dependencies = ['models'];
