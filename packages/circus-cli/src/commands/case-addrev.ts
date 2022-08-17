import dedent from 'dedent';
import inq from 'inquirer';
import JSON5 from 'json5';
import pc from 'picocolors';
import { fetchWithSpinner } from '../utils/createAuthorizedFetch.js';
import exec from '../utils/exec.js';
import launchEditor from '../utils/launchEditor.js';
import readIds from '../utils/readIds.js';
import CommandAction from './CommandAction.js';
import { diff } from 'jest-diff';

interface Options {
  exec: string;
  desc?: string | boolean;
  force?: boolean;
  file: boolean;
  allRevs: boolean;
}

const promptString = async (message: string) => {
  const ans = await inq.prompt([{ type: 'input', name: 'value', message }]);
  return ans.value;
};

const withoutMetadata = (obj: any): any => {
  const { createdAt, creator, ...rest } = obj;
  return rest;
};

const action: CommandAction = ({ getFetch }) => {
  return async (args: string[], options: Options) => {
    const fetch = getFetch();
    const { exec: command, desc, force, file, allRevs } = options;

    if (force && !desc)
      throw new Error("You must set '--desc' option to enable '--force'");
    if (allRevs && !command)
      throw new Error("You must set '--exec' option to enable '--all-revs'");

    const caseIds = await readIds(args, !!file);

    for (const caseId of caseIds) {
      const res = await fetchWithSpinner(
        fetch,
        `Retreiving case ${caseId}`,
        `cases/${caseId}`
      );
      const data = (await res.json()) as any;
      const inputRev = allRevs ? data.revisions : data.revisions[0];

      const newRevStr = command
        ? await exec(command, JSON.stringify(inputRev), {
            ...process.env,
            CIRCUS_CASE_ID: caseId
          })
        : await launchEditor(
            dedent`
              // The following is the content of the latest revision.
              // Edit the JSON below and close the editor.
              // The 'creator' and 'createdAt' fields will be ignored.
              // Case ID: ${caseId}
            ` +
              '\n\n' +
              JSON.stringify(inputRev, null, 2)
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
      } else if (typeof desc === 'undefined') {
        newRev.description = await promptString('Revision description');
      }

      if (!force) {
        if (allRevs) {
          console.log(pc.cyan('Processed JSON:'));
          console.log(JSON.stringify(newRev, null, 2));
        } else {
          const diffStr = diff(newRev, withoutMetadata(inputRev), {
            aAnnotation: 'New revision',
            bAnnotation: 'Current revision'
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
        const ans = await inq.prompt([
          { type: 'confirm', name: 'ok', message: 'Is this okay?' }
        ]);
        if (!ans.ok) return;
      }

      await fetchWithSpinner(
        fetch,
        `Saving a revision to ${caseId}`,
        `cases/${caseId}/revisions`,
        { method: 'POST', body: JSON.stringify(newRev) }
      );
    }
  };
};

export default action;
