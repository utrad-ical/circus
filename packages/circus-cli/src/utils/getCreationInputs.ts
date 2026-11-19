import type { LoginInfoFull } from '@utrad-ical/circus-api-schema';
import type { CommandDeps, Prompts } from '../commands/CommandAction.ts';
import {
  editSeriesList,
  fetchSeries,
  parseSeriesSpec,
  type SelectedSeries
} from './seriesSelector.ts';

interface Target {
  id: string;
  name: string;
  label: string;
}

interface Options {
  target?: string;
  option: '--project' | '--plugin';
  label: 'Project' | 'Plug-in';
  submitLabel: string;
  getTargets: (user: LoginInfoFull) => Target[];
}

const resolveTarget = async (
  targets: Target[],
  options: Options,
  select: Prompts['select']
) => {
  const { target, label, option } = options;
  if (target === undefined) {
    if (!targets.length)
      throw new Error(`No available ${label.toLowerCase()}s.`);
    return await select({
      message: `${label}:`,
      choices: targets.map(({ id, label }) => ({ name: label, value: id }))
    });
  }

  const byId = targets.find(({ id }) => id === target);
  if (byId) return byId.id;
  const byName = targets.filter(({ name }) => name === target);
  if (byName.length === 1) return byName[0].id;
  if (!byName.length) {
    throw new Error(`No available ${label.toLowerCase()} matches '${target}'.`);
  }
  const ids = byName.map(({ id }) => `  ${id}`).join('\n');
  throw new Error(
    `Multiple ${label.toLowerCase()}s match '${target}'. Use ${option} with one of these IDs.\n${ids}`
  );
};

const getCreationInputs = async (
  {
    getFetch,
    prompts,
    isInputTTY
  }: Pick<CommandDeps, 'getFetch' | 'prompts' | 'isInputTTY'>,
  seriesArgs: string[],
  options: Options
) => {
  const specs = seriesArgs.map(parseSeriesSpec);
  const missing: string[] = [];
  if (options.target === undefined) missing.push(options.option);
  if (!specs.length) missing.push('at least one series UID');
  const interactive = missing.length > 0;
  if (interactive && !isInputTTY) {
    throw new Error(`Specify ${missing.join(' and ')}.`);
  }

  const fetch = getFetch();
  const response = await fetch('login-info/full');
  const user = (await response.json()) as LoginInfoFull;
  const targetId = await resolveTarget(
    options.getTargets(user),
    options,
    prompts.select
  );

  const getDefaultRange = () => 'auto' as const;
  const initial: SelectedSeries<'auto'>[] = [];
  for (const { seriesUid, range } of specs) {
    initial.push(await fetchSeries(fetch, seriesUid, getDefaultRange, range));
  }
  const selected = interactive
    ? await editSeriesList(fetch, initial, {
        submitLabel: options.submitLabel,
        prompts,
        getDefaultRange
      })
    : initial;
  if (!selected) {
    console.log('Canceled.');
    return;
  }

  return {
    fetch,
    targetId,
    interactive,
    series: selected.map(({ seriesUid, range }) => ({
      seriesUid,
      partialVolumeDescriptor: range
    }))
  };
};

export default getCreationInputs;
