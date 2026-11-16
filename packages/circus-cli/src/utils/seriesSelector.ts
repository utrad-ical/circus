import { input, select, Separator } from '@inquirer/prompts';
import * as mr from 'multi-integer-range';
import type { AuthorizedFetch } from './createAuthorizedFetch.ts';

/** The images to use, from `start` to `end` stepping by `delta` */
export interface ImageRange {
  start: number;
  end: number;
  delta: number;
}

export interface SelectedSeries {
  seriesUid: string;
  range: ImageRange;
  /** `images` of the series, e.g. '1-132' */
  images: string;
  modality?: string;
  seriesDescription?: string;
}

export const formatRange = (range: ImageRange) =>
  `${range.start}:${range.end}:${range.delta}`;

export const countImages = (range: ImageRange) =>
  (range.end - range.start) / range.delta + 1;

/** The first range of the images, which is used by default */
export const defaultRange = (images: string): ImageRange => {
  const [[start, end]] = mr.parse(images);
  return { start, end, delta: 1 };
};

/**
 * Parses `start:end:delta`, and checks it against the images of the series.
 * Returns an error message if it is invalid.
 */
export const parseRange = (
  text: string,
  images: string
): ImageRange | string => {
  const m = /^\s*(\d+)\s*:\s*(\d+)\s*:\s*(-?\d+)\s*$/.exec(text);
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
  if (!seriesUid || (rest.length !== 0 && rest.length !== 3))
    throw new Error(`Invalid series: ${spec} (use uid or uid:start:end:delta)`);
  return { seriesUid, range: rest.length ? rest.join(':') : undefined };
};

/**
 * Fetches the series, and returns it with the range.
 * The range defaults to the first range of the series.
 */
export const fetchSeries = async (
  fetch: AuthorizedFetch,
  seriesUid: string,
  rangeText?: string
): Promise<SelectedSeries> => {
  let data: any;
  try {
    data = await (
      await fetch(`series/${encodeURIComponent(seriesUid)}`)
    ).json();
  } catch (err: any) {
    if (err.status === 404) throw new Error(`Series ${seriesUid} not found.`);
    if (err.status === 403 || err.status === 401)
      throw new Error(`You cannot access series ${seriesUid}.`);
    throw err;
  }
  const { images, modality, seriesDescription } = data;
  let range = defaultRange(images);
  if (rangeText !== undefined) {
    const parsed = parseRange(rangeText, images);
    if (typeof parsed === 'string') throw new Error(`${seriesUid}: ${parsed}`);
    range = parsed;
  }
  return { seriesUid, range, images, modality, seriesDescription };
};

const describe = (s: SelectedSeries) =>
  [s.modality, s.seriesDescription].filter(Boolean).join(' ') || '-';

const formatSeries = (s: SelectedSeries, index: number) =>
  `#${index + 1}  ${s.seriesUid}  ${describe(s)}  ` +
  `${formatRange(s.range)} (${countImages(s.range)} images)`;

const askRange = async (series: SelectedSeries) => {
  const text = await input({
    message: 'Image range (start:end:delta):',
    default: formatRange(series.range),
    validate: value => {
      const range = parseRange(value, series.images);
      return typeof range === 'string' ? range : true;
    }
  });
  return parseRange(text, series.images) as ImageRange;
};

/** Asks a new series; returns undefined if the UID is left empty */
const askSeries = async (fetch: AuthorizedFetch, emptyLabel: string) => {
  let series: SelectedSeries | undefined;
  await input({
    message: `Series UID (empty to ${emptyLabel}):`,
    validate: async value => {
      if (!value.trim()) return true;
      try {
        series = await fetchSeries(fetch, value.trim());
        return true;
      } catch (err: any) {
        return err.message;
      }
    }
  });
  if (!series) return undefined;
  console.log(`  ${describe(series)}, images ${series.images}`);
  series.range = await askRange(series);
  return series;
};

export interface EditSeriesOptions {
  /** The label of the choice that finishes editing, e.g. 'Start download' */
  submitLabel: string;
  /** The maximum number of series */
  max?: number;
}

/**
 * Lets the user edit a list of series and their image ranges interactively.
 * Returns the list, or undefined if canceled.
 */
export const editSeriesList = async (
  fetch: AuthorizedFetch,
  initial: SelectedSeries[],
  options: EditSeriesOptions
): Promise<SelectedSeries[] | undefined> => {
  const { submitLabel, max = Infinity } = options;
  const list = [...initial];
  while (true) {
    if (!list.length) {
      const series = await askSeries(fetch, 'cancel');
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
      const series = await askSeries(fetch, 'go back');
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
      list[action] = { ...series, range: await askRange(series) };
    if (sub === 'remove') list.splice(action, 1);
  }
};
