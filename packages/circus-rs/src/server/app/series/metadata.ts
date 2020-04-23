import koa from 'koa';
import compose from 'koa-compose';
import { ValidatorRules } from '../../../common/Validator';
import validate from '../middleware/validate';
import { ViewWindow } from '../../../common/ViewWindow';
import { PixelFormat } from '../../../common/PixelFormat';
import { SeriesMiddlewareState } from './createSeriesRoutes';
import MultiRange from 'multi-integer-range';
import { VolumeAccessor } from '../../helper/createVolumeProvider';

interface MetadataQuery {
  estimateWindow?: 'full' | 'first' | 'center' | 'none';
}

interface MetadataResponse {
  voxelCount: [number, number, number];
  voxelSize: [number, number, number];
  dicomWindow?: ViewWindow;
  pixelFormat: PixelFormat;
  estimatedWindow?: ViewWindow;
}

/**
 * Handles 'metadata' endpoint which gives general information
 * of the specified series.
 */
export default function metadata(): koa.Middleware {
  const rules: ValidatorRules = {
    estimateWindow: [
      'estimate window',
      'none',
      /^(?:full|first|center|none)$/,
      null
    ]
  };

  const metadata: koa.Middleware = async (ctx, next) => {
    const state = ctx.state as SeriesMiddlewareState;
    const { estimateWindow = 'none' } = state.query as MetadataQuery;
    const { images } = state.volumeAccessor;

    // Modify full volume accessor to partial volume accessor
    let loadImages: number[] = [];
    if (state.partialVolumeDescriptor) {
      const { start, end, delta } = state.partialVolumeDescriptor;
      for (let i = start; i <= end; i += delta) {
        loadImages.push(i);
      }
    } else {
      loadImages = images.toArray();
    }

    const volumeAccessor: VolumeAccessor = {
      ...state.volumeAccessor,
      images: new MultiRange(loadImages)
    };

    const {
      voxelCount,
      voxelSize,
      dicomWindow,
      pixelFormat
    } = await extractVolumeMetadata(volumeAccessor);

    const estimatedWindow =
      estimateWindow === 'none'
        ? undefined
        : await extractEstimatedWindow(volumeAccessor, estimateWindow);

    const body: MetadataResponse = {
      voxelCount,
      voxelSize,
      dicomWindow,
      pixelFormat,
      estimatedWindow
    };

    ctx.body = body;
  };

  return compose([validate(rules), metadata]);
}

type VolumeMetadata = {
  voxelCount: [number, number, number];
  voxelSize: [number, number, number];
  dicomWindow?: ViewWindow;
  pixelFormat: PixelFormat;
};
async function extractVolumeMetadata(
  volumeAccessor: VolumeAccessor
): Promise<VolumeMetadata> {
  const { imageMetadata, load, images, determinePitch } = volumeAccessor;
  if (images.segmentLength() === 0)
    throw new TypeError('Invalid volume accessor.');

  const count = images.length();
  const primaryImageNo = images.min()!;
  await load(primaryImageNo);
  const primaryMetadata = imageMetadata.get(primaryImageNo)!;

  const pitch = await determinePitch();

  return {
    voxelCount: [primaryMetadata.columns, primaryMetadata.rows, count],
    voxelSize: [
      primaryMetadata.pixelSpacing[0],
      primaryMetadata.pixelSpacing[1],
      pitch
    ],
    dicomWindow: primaryMetadata.window,
    pixelFormat: primaryMetadata.pixelFormat
  };
}

async function extractEstimatedWindow(
  volumeAccessor: VolumeAccessor,
  algo: 'full' | 'first' | 'center'
): Promise<ViewWindow> {
  const { imageMetadata, load, images } = volumeAccessor;
  if (images.segmentLength() === 0)
    throw new TypeError('Invalid volume accessor.');

  let slices: number[];
  switch (algo) {
    case 'full':
      slices = images.toArray();
      break;
    case 'first':
      slices = [images.clone().shift()!];
      break;
    case 'center': {
      const centerIdx = Math.floor(images.length() / 2);
      slices = [images.toArray()[centerIdx]];
      break;
    }
    default:
      throw new TypeError('Unsupported estimation algorithm was specified');
  }

  await load(slices);

  let seriesMinValue: number = Infinity;
  let seriesMaxValue: number = -Infinity;
  slices.forEach(imageNo => {
    const meta = imageMetadata.get(imageNo)!;
    seriesMinValue = Math.min(seriesMinValue, meta.minValue!);
    seriesMaxValue = Math.max(seriesMaxValue, meta.maxValue!);
  });
  const width = Math.floor(seriesMaxValue - seriesMinValue + 1);
  const level = Math.floor(seriesMinValue + width / 2);
  return { level, width };
}
