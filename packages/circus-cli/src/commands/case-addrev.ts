import dedent from 'dedent';
import inq from 'inquirer';
import JSON5 from 'json5';
import pc from 'picocolors';
import { fetchWithSpinner } from '../utils/createAuthorizedFetch.js';
import createSpinner from '../utils/createSpinner.js';
import exec from '../utils/exec.js';
import launchEditor from '../utils/launchEditor.js';
import readIdFiles from '../utils/readIdFiles.js';
import CommandAction from './CommandAction.js';

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

const action: CommandAction = ({ getFetch }) => {
  return async (args: string[], options: Options) => {
    const fetch = getFetch();
    const { exec: command, desc, force, file, allRevs } = options;

    if (force && !desc)
      throw new Error("You must set '--desc' option to enable '--force'");
    if (allRevs && !command)
      throw new Error("You must set '--exec' option to enable '--all-revs'");

    const caseIds = !!file ? await readIdFiles(args) : args;

    for (const caseId of caseIds) {
      // const res = (await (await fetch(`cases/${caseId}`)).json()) as any;
      // const inputRev = allRevs ? res.revisions[0] : res.currentRevision;
      const inputRev = {
        description: 'FooBar',
        attributes: { smoker: true },
        status: 'draft',
        series: [
          {
            seriesUid: '1.2.803.7.326.35232.166922',
            partialVolumeDescriptor: { start: 1, end: 132, delta: 1 },
            labels: [
              {
                type: 'voxel',
                name: 'Voxels',
                data: {
                  color: '#ff0000',
                  alpha: 1,
                  voxels: 'd7afe8531d526e5abb19330d38385551b9f72dc4',
                  origin: [132, 126, 22],
                  size: [64, 45, 1]
                }
              }
            ]
          }
        ]
      };

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
          const { createdAt, creator, ...newRev } = JSON5.parse(newRevStr);
          return newRev;
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
        console.log(pc.cyan('Processed JSON:'));
        console.log(JSON.stringify(newRev, null, 2));
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
