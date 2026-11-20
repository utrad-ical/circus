import type {
  CaseDetail,
  CaseRevisionCreate
} from '@utrad-ical/circus-api-schema';
import JSON5 from 'json5';
import { isDeepStrictEqual, styleText } from 'node:util';
import { fetchWithSpinner } from '../utils/createAuthorizedFetch.ts';
import exec from '../utils/exec.ts';
import formatJsonDiff from '../utils/formatJsonDiff.ts';
import { defaultValidateString } from '../utils/inquiry.ts';
import launchEditor from '../utils/launchEditor.ts';
import readIds from '../utils/readIds.ts';
import type { CommandAction } from './CommandAction.ts';

interface Options {
  exec: string;
  desc?: string;
  editDesc?: boolean;
  force?: boolean;
  file: boolean;
  allRevs: boolean;
}

const withoutMetadata = (obj: CaseRevisionCreate): CaseRevisionCreate => {
  const { series, attributes, status, description } = obj;
  return { series, attributes, status, description };
};

const action: CommandAction = ({ getFetch, prompts }) => {
  return async (args: string[], options: Options) => {
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
    if (!caseIds.length)
      throw new Error('No case IDs found in the input files.');

    const fetch = getFetch();
    for (const caseId of caseIds) {
      const res = await fetchWithSpinner(
        fetch,
        `Retreiving case ${caseId}`,
        `cases/${caseId}`
      );
      const { revisions } = (await res.json()) as CaseDetail;
      const latestRevision = revisions[revisions.length - 1];
      const inputRev = allRevs ? revisions : latestRevision;

      const newRevStr = command
        ? await exec(command, JSON.stringify(inputRev), {
            ...process.env,
            CIRCUS_CASE_ID: caseId
          })
        : await launchEditor(
            `// The following is the content of the latest revision.\n` +
              `// Edit the JSON below and close the editor.\n` +
              `// The 'creator' and 'date' fields will be ignored.\n` +
              `// Case ID: ${caseId}\n\n` +
              JSON.stringify(inputRev, null, 2),
            'json'
          );

      const newRev = (() => {
        try {
          return withoutMetadata(JSON5.parse(newRevStr) as CaseRevisionCreate);
        } catch (err: any) {
          console.error('The filter command returned the following:');
          console.error(newRevStr + '\n');
          throw new Error(
            `Error parsing output from the filter command: ${err.message}`
          );
        }
      })();

      if (typeof desc === 'string' && desc.length > 0) {
        newRev.description = desc;
      } else if (!editDesc) {
        newRev.description = await prompts.input({
          message: 'Revision description:',
          validate: defaultValidateString
        });
      }

      if (!force) {
        if (allRevs) {
          console.log(styleText('cyan', 'Processed JSON:'));
          console.log(JSON.stringify(newRev, null, 2));
        } else {
          const currentRev = withoutMetadata(latestRevision);
          if (isDeepStrictEqual(newRev, currentRev)) {
            console.log(
              styleText('bgYellow', 'WARN'),
              'No change has been made to the latest revision!'
            );
          } else {
            console.log(styleText('cyan', 'Diff:'));
            console.log(
              formatJsonDiff(currentRev, newRev, {
                before: 'Current revision',
                after: 'New revision'
              })
            );
          }
        }
        if (
          !(await prompts.confirm({ message: 'Is this okay?', default: false }))
        ) {
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
