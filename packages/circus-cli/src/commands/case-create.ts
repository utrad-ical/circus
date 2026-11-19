import type { CaseCreate, CaseCreated } from '@utrad-ical/circus-api-schema';
import getCreationInputs from '../utils/getCreationInputs.ts';
import type { CommandAction } from './CommandAction.ts';

interface Options {
  project?: string;
  tags?: string;
}

const action: CommandAction = ({ getFetch }) => {
  return async (args: string[], { project, tags }: Options) => {
    const input = await getCreationInputs(getFetch, args, {
      target: project,
      option: '--project',
      label: 'Project',
      submitLabel: 'Create case',
      getTargets: ({ accessibleProjects }) =>
        accessibleProjects
          .filter(({ roles }) => roles.includes('write'))
          .map(({ projectId, project }) => ({
            id: projectId,
            name: project.projectName,
            label: `${project.projectName} (${projectId})`
          }))
    });
    if (!input) return;

    const { fetch, targetId, series } = input;
    const request: CaseCreate = {
      projectId: targetId,
      series,
      tags: tags
        ?.split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
    };
    const res = await fetch('cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    const { caseId } = (await res.json()) as CaseCreated;
    console.log(caseId);
  };
};

export default action;
