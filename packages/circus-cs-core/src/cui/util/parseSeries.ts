import { isDicomUid } from '@utrad-ical/circus-lib';
import * as circus from '../../interface';

const parseSeries: (str: string) => circus.JobSeries = str => {
  const [seriesUid, start, end, delta = '1'] = str.split(':');
  const asInt = (str: string | undefined) => {
    if (typeof str === 'string') {
      if (/^[0-9]+$/.test(str)) return parseInt(str, 10);
      throw new Error('Invalid argument.');
    }
    return undefined;
  };

  if (!isDicomUid(seriesUid)) {
    throw new SyntaxError(
      `Series ${seriesUid} does not seem to be a valid DICOM UID.`
    );
  }

  // Todo: Use shared validators and interfaces in lib
  const seriesEntry: any = { seriesUid };
  if (start !== undefined && end !== undefined) {
    seriesEntry.partialVolumeDescriptor = {
      start: asInt(start),
      end: asInt(end),
      delta: asInt(delta)
    };
  }
  return seriesEntry;
};

export default parseSeries;
