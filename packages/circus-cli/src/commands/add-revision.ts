import CommandAction from './CommandAction.js';
import * as cp from 'node:child_process';
import pc from 'picocolors';

interface Options {
  exec: string;
  desc?: string;
  dryRun?: boolean;
  file?: boolean;
  all?: boolean;
}

const action: CommandAction = ({ getFetch }) => {
  return async (args: string[], options: Options) => {
    const fetch = getFetch();
    const caseIds = args;
    const { exec: command, desc, dryRun } = options;

    for (const caseId of caseIds) {
      // (await fetch(`cases/${caseId}`)).json();
      // const inputRev = res.revisions[0];
      // delete inputRev.creator;
      // delete inputRev.createdAt;
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

      const newRevStr = await new Promise<string>((resolve, reject) => {
        const p = cp.exec(command, (err, stdout) => {
          if (err) reject(err);
          else resolve(stdout);
        });
        p.stdin!.end(JSON.stringify(inputRev));
      });
      const newRev = JSON.parse(newRevStr);

      if (desc) {
        newRev.description = options.desc;
      }

      if (dryRun) {
        console.log(pc.cyan('Processed JSON:'));
        console.log(JSON.stringify(newRev, null, 2));
      } else {
        console.log('Saving revision...');
      }
    }
  };
};

export default action;
