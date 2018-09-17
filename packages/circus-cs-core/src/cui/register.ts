import { Configuration } from '../config';
import { JobSeries } from '../interface';
import isDicomUid from '../util/isDicomUid';
import { createModuleLoader } from '../createCsCore';

function parseSeries(str: string): JobSeries {
  const [seriesUid, startImgNum, endImgNum, imageDelta] = str.split(':');
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

  return {
    seriesUid,
    ...(startImgNum ? { startImgNum: asInt(startImgNum) } : {}),
    ...(endImgNum ? { endImgNum: asInt(endImgNum) } : {}),
    ...(imageDelta ? { imageDelta: asInt(imageDelta) } : {})
  };
}

export default async function register(config: Configuration, argv: any) {
  const moduleLoader = createModuleLoader(config);
  const [dispose, registerer] = [
    await moduleLoader.load('dispose'),
    await moduleLoader.load('pluginJobRegisterer')
  ];

  try {
    const newJobId = () => new Date().getTime().toString();
    const {
      _: [pluginId, ...series],
      jobId = newJobId(),
      environment = undefined,
      priority = 0
    } = argv;

    // Each series definition must be in the form of
    // `seriesUid(:startImgNum(:endImgNum(:imageDelta)))`.
    const seriesList = series.map(parseSeries);

    if (!pluginId || !series.length) {
      console.log('Usage: cui <pluginId> <series0> [<series1> ...]');
      return;
    }

    const payload = { pluginId, series: seriesList, environment };
    await registerer.register(jobId, payload, priority);
    console.log(`Registered Job ID: ${jobId}`);
  } finally {
    await dispose();
  }
}
