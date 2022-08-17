import dedent from 'dedent';
import { diff } from 'jest-diff';
import JSON5 from 'json5';
import pc from 'picocolors';
import { fetchWithSpinner } from '../utils/createAuthorizedFetch.js';
import exec from '../utils/exec.js';
import { confirm, promptString } from '../utils/inquiry.js';
import launchEditor from '../utils/launchEditor.js';
import readIds from '../utils/readIds.js';
import CommandAction from './CommandAction.js';

interface Options {
  exec: string;
  desc?: string;
  editDesc?: boolean;
  force?: boolean;
  file: boolean;
  allRevs: boolean;
}

const withoutMetadata = (obj: any): any => {
  const { series, attributes, status, description } = obj;
  return { series, attributes, status, description };
};

const action: CommandAction = ({ getFetch }) => {
  return async (args: string[], options: Options) => {
    const fetch = getFetch();
    const { exec: command, desc, editDesc, force, file, allRevs } = options;

    if (force && !desc && !editDesc)
      throw new Error(
        "You must set either '-d (--desc)' or '-D (--edit-desc)' to enable '--force'"
      );
    if (desc && editDesc) {
      throw new Error(
        "You cannot use both '-d (--desc)' and '-D (--edit-desc)'"
      );
    }
    if (allRevs && !command)
      throw new Error(
        "You must set '-e (--exec)' option to enable '-a (--all-revs)'"
      );

    const caseIds = await readIds(args, !!file);

    for (const caseId of caseIds) {
      const res = await fetchWithSpinner(
        fetch,
        `Retreiving case ${caseId}`,
        `cases/${caseId}`
      );
      const data = (await res.json()) as any;
      const inputRev = allRevs
        ? data.revisions
        : data.revisions[data.revisions.length - 1];

      const newRevStr = command
        ? await exec(command, JSON.stringify(inputRev), {
            ...process.env,
            CIRCUS_CASE_ID: caseId
          })
        : await launchEditor(
            dedent`
              // The following is the content of the latest revision.
              // Edit the JSON below and close the editor.
              // The 'creator' and 'date' fields will be ignored.
              // Case ID: ${caseId}
            ` +
              '\n\n' +
              JSON.stringify(inputRev, null, 2),
            'json'
          );

      const newRev = (() => {
        try {
          return withoutMetadata(JSON5.parse(newRevStr));
        } catch (err: any) {
          console.error('The filter command returned the following:');
          console.error(newRevStr + '\n');
          throw new Error(
            `Error parsing output from the filter command: ${err.message}`
          );
        }
      })();

      if (typeof desc === 'string' && desc.length > 0) {
        newRev.description = options.desc;
      } else if (!editDesc) {
        newRev.description = await promptString('Revision description:');
      }

      if (!force) {
        if (allRevs) {
          console.log(pc.cyan('Processed JSON:'));
          console.log(JSON.stringify(newRev, null, 2));
        } else {
          const diffStr = diff(newRev, withoutMetadata(inputRev), {
            aAnnotation: 'New revision',
            bAnnotation: 'Current revision',
            contextLines: 5,
            expand: false
          });
          if (/Compared values have no visual difference/.test(diffStr!)) {
            console.log(
              pc.bgYellow('WARN'),
              'No change has been made to the latest revision!'
            );
          } else {
            console.log(pc.cyan('Diff:'));
            console.log(diffStr);
          }
        }
        if (!(await confirm('Is this okay?'))) {
          console.log('Operation cancelled.');
          return;
        }
      }

      await fetchWithSpinner(
        fetch,
        `Saving a revision to ${caseId}`,
        `cases/${caseId}/revision`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRev)
        }
      );
    }
  };
};

export default action;
