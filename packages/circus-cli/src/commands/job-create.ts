import type {
  PluginJobCreate,
  PluginJobCreated
} from '@utrad-ical/circus-api-schema';
import getCreationInputs from '../utils/getCreationInputs.ts';
import type { CommandAction } from './CommandAction.ts';

interface Options {
  plugin?: string;
  priority?: number;
}

const isDuplicateJobError = (error: unknown) => {
  if (
    !(error instanceof Error) ||
    !('status' in error) ||
    error.status !== 400 ||
    !('body' in error) ||
    typeof error.body !== 'string'
  ) {
    return false;
  }
  try {
    return (
      JSON.parse(error.body)?.error ===
      'There is a duplicate job that is already registered.'
    );
  } catch {
    return false;
  }
};

const action: CommandAction = deps => {
  return async (args: string[], { plugin, priority }: Options) => {
    const input = await getCreationInputs(deps, args, {
      target: plugin,
      option: '--plugin',
      label: 'Plug-in',
      submitLabel: 'Register job',
      getTargets: ({ accessiblePlugins }) =>
        accessiblePlugins
          .filter(({ roles }) => roles.includes('executePlugin'))
          .map(({ pluginId, plugin }) => ({
            id: pluginId,
            name: plugin.pluginName,
            label: `${plugin.pluginName} v${plugin.version}`
          }))
    });
    if (!input) return;

    const { fetch, targetId, series, interactive } = input;
    const request: PluginJobCreate = { pluginId: targetId, series, priority };
    const register = (body: PluginJobCreate) =>
      fetch('plugin-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

    let res: Response;
    try {
      res = await register(request);
    } catch (error) {
      if (!interactive || !isDuplicateJobError(error)) throw error;
      const confirmed = await deps.prompts.confirm({
        message: 'A duplicate job already exists. Register this job anyway?',
        default: false
      });
      if (!confirmed) {
        console.log('Canceled.');
        return;
      }
      res = await register({ ...request, force: true });
    }
    const { jobId } = (await res.json()) as PluginJobCreated;
    console.log(jobId);
  };
};

export default action;
