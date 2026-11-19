import type {
  PartialVolumeDescriptor,
  Series
} from '@utrad-ical/circus-api-schema';
import { confirm, input, select, Separator } from '@inquirer/prompts';
import * as mr from 'multi-integer-range';
import type { AuthorizedFetch } from './createAuthorizedFetch.ts';

/** The images to use, from `start` to `end` stepping by `delta` */
export type ImageRange = PartialVolumeDescriptor;

type SeriesMetadata = Pick<
  Series,
  'images' | 'modality' | 'seriesDescription' | 'studyUid'
>;

type Range = ImageRange | 'auto';
type GetDefaultRange<Default extends Range> = (images: string) => Default;

export type SelectedSeries<Default extends Range = ImageRange> =
  SeriesMetadata & {
    seriesUid: Series['seriesUid'];
    range: ImageRange | Default;
  };

export const formatRange = (range: ImageRange) =>
  `${range.start}:${range.end}:${range.delta}`;

export const countImages = (range: ImageRange) =>
  (range.end - range.start) / range.delta + 1;

/** The first contiguous image range, in ascending order */
export const defaultRange = (images: string): ImageRange => {
  const [[start, end]] = mr.parse(images);
  return { start, end, delta: 1 };
};

const rangeFormat = /^\s*(\d+)\s*:\s*(\d+)\s*:\s*(-?\d+)\s*$/;

/** Matches the UID format accepted by the API schema. */
const validateSeriesUid = (seriesUid: string) => {
  if (seriesUid.length > 64 || !/^[0-9]+(?:\.[0-9]+)+$/.test(seriesUid)) {
    throw new Error(
      'Invalid Series UID. Use dot-separated numbers (up to 64 characters).'
    );
  }
};

/**
 * Parses `start:end:delta`, and checks it against the images of the series.
 * Returns an error message if it is invalid.
 */
export const parseRange = (
  text: string,
  images: string
): ImageRange | string => {
  const m = rangeFormat.exec(text);
  if (!m) return 'Enter the range as start:end:delta (e.g., 1:31:2).';
  const [start, end, delta] = m.slice(1).map(Number);
  if (delta === 0) return 'delta must not be 0.';
  const count = (end - start) / delta + 1;
  if (!Number.isInteger(count) || count < 1)
    return `${end} cannot be reached from ${start} by ${delta}.`;
  const range = mr.parse(images);
  // Checks the bounds before listing all the images
  const inSeries =
    Math.min(start, end) >= mr.min(range)! &&
    Math.max(start, end) <= mr.max(range)! &&
    count <= mr.length(range) &&
    mr.has(
      range,
      mr.normalize(Array.from({ length: count }, (_, i) => start + i * delta))
    );
  if (!inSeries) return `The range is not within the images (${images}).`;
  return { start, end, delta };
};

/**
 * Parses `uid` or `uid:start:end:delta` (the format of command arguments).
 */
export const parseSeriesSpec = (spec: string) => {
  const [seriesUid, ...rest] = spec.split(':');
  validateSeriesUid(seriesUid);
  const range = rest.length ? rest.join(':') : undefined;
  if (range !== undefined && !rangeFormat.test(range))
    throw new Error(`Invalid series: ${spec} (use uid or uid:start:end:delta)`);
  return { seriesUid, range };
};

/** Fetches the series and selects the requested or default image range. */
export const fetchSeries = async <Default extends Range>(
  fetch: AuthorizedFetch,
  seriesUid: string,
  getDefaultRange: GetDefaultRange<Default>,
  rangeText?: string
): Promise<SelectedSeries<Default>> => {
  validateSeriesUid(seriesUid);
  let data: SeriesMetadata;
  try {
    const res = await fetch(`series/${encodeURIComponent(seriesUid)}`);
    data = (await res.json()) as SeriesMetadata;
  } catch (err: any) {
    if (err.status === 404) throw new Error(`Series ${seriesUid} not found.`);
    if (err.status === 403 || err.status === 401)
      throw new Error(`You cannot access series ${seriesUid}.`);
    throw err;
  }
  const { images, modality, seriesDescription, studyUid } = data;
  let range: SelectedSeries<Default>['range'];
  if (rangeText === undefined) {
    range = getDefaultRange(images);
  } else {
    const parsed = parseRange(rangeText, images);
    if (typeof parsed === 'string') throw new Error(`${seriesUid}: ${parsed}`);
    range = parsed;
  }
  return { seriesUid, studyUid, range, images, modality, seriesDescription };
};

const describe = (s: SelectedSeries<Range>) =>
  [s.modality, s.seriesDescription].filter(Boolean).join(' ') || '-';

const formatSeries = (s: SelectedSeries<Range>, index: number) => {
  const range =
    s.range === 'auto'
      ? `auto (images ${s.images})`
      : `${formatRange(s.range)} (${countImages(s.range)} images)`;
  return `#${index + 1}  ${s.seriesUid}  ${describe(s)}  ${range}`;
};

const askRange = async <Default extends Range>(
  series: SelectedSeries<Default>,
  getDefaultRange: GetDefaultRange<Default>
): Promise<SelectedSeries<Default>['range']> => {
  const defaultValue = getDefaultRange(series.images);
  const text = await input({
    message:
      defaultValue === 'auto'
        ? 'Image range (auto or start:end:delta):'
        : 'Image range (start:end:delta):',
    default: series.range === 'auto' ? 'auto' : formatRange(series.range),
    validate: value => {
      if (defaultValue === 'auto' && value.trim() === 'auto') return true;
      const range = parseRange(value, series.images);
      return typeof range === 'string' ? range : true;
    }
  });
  if (defaultValue === 'auto' && text.trim() === 'auto') return defaultValue;
  return parseRange(text, series.images) as ImageRange;
};

/** Asks a new series; returns undefined if the UID is left empty */
const askSeries = async <Default extends Range>(
  fetch: AuthorizedFetch,
  selected: SelectedSeries<Default>[],
  getDefaultRange: GetDefaultRange<Default>
) => {
  let series: SelectedSeries<Default> | undefined;
  const emptyLabel = selected.length ? 'go back' : 'cancel';
  await input({
    message: `Series UID (empty to ${emptyLabel}):`,
    validate: async value => {
      if (!value.trim()) {
        series = undefined;
        return true;
      }
      try {
        series = await fetchSeries(fetch, value.trim(), getDefaultRange);
        return true;
      } catch (err: any) {
        return err.message;
      }
    }
  });
  if (!series) return undefined;
  const { seriesUid, studyUid } = series;
  const primary = selected[0];
  if (primary && primary.studyUid !== studyUid) {
    const accepted = await confirm({
      message: 'Add the series with a different Study UID?',
      default: false
    });
    if (!accepted) return undefined;
  }
  if (selected.some(item => item.seriesUid === seriesUid)) {
    const accepted = await confirm({
      message: 'Add the same series?',
      default: false
    });
    if (!accepted) return undefined;
  }
  console.log(`  ${describe(series)}, images ${series.images}`);
  return { ...series, range: await askRange(series, getDefaultRange) };
};

interface EditSeriesOptions<Default extends Range> {
  /** The label of the choice that finishes editing, e.g. 'Start download' */
  submitLabel: string;
  /** The maximum number of series */
  max?: number;
  getDefaultRange: GetDefaultRange<Default>;
}

/**
 * Lets the user edit a list of series and their image ranges interactively.
 * Returns the list, or undefined if canceled.
 */
export const editSeriesList = async <Default extends Range>(
  fetch: AuthorizedFetch,
  initial: SelectedSeries<Default>[],
  options: EditSeriesOptions<Default>
): Promise<SelectedSeries<Default>[] | undefined> => {
  const { submitLabel, max = Infinity, getDefaultRange } = options;
  const list = [...initial];
  while (true) {
    if (!list.length) {
      const series = await askSeries(fetch, list, getDefaultRange);
      if (!series) return undefined;
      list.push(series);
      continue;
    }
    const action = await select<number | 'submit' | 'add' | 'cancel'>({
      message: 'Series:',
      choices: [
        ...list.map((s, i) => ({ name: formatSeries(s, i), value: i })),
        new Separator(),
        { name: submitLabel, value: 'submit' },
        {
          name: 'Add a series',
          value: 'add',
          disabled: list.length >= max ? `(up to ${max})` : false
        },
        { name: 'Cancel', value: 'cancel' }
      ],
      default: 'submit',
      loop: false,
      pageSize: list.length + 4
    });
    if (action === 'submit') return list;
    if (action === 'cancel') return undefined;
    if (action === 'add') {
      const series = await askSeries(fetch, list, getDefaultRange);
      if (series) list.push(series);
      continue;
    }
    const series = list[action];
    const sub = await select({
      message: formatSeries(series, action),
      choices: [
        { name: 'Change the image range', value: 'range' },
        { name: 'Remove', value: 'remove' },
        { name: 'Back', value: 'back' }
      ],
      loop: false
    });
    if (sub === 'range')
      list[action] = {
        ...series,
        range: await askRange(series, getDefaultRange)
      };
    if (sub === 'remove') list.splice(action, 1);
  }
};
