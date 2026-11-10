import type koa from 'koa';
import compose from 'koa-compose';
import type { ValidatorRules } from '../../../common/Validator.ts';
import validate from '../middleware/validate.ts';
import type { ViewWindow } from '../../../common/ViewWindow.ts';
import type { PixelFormat } from '../../../volume/PixelFormat.ts';
import type { SeriesMiddlewareState } from './createSeriesRoutes.ts';
import * as mr from 'multi-integer-range';
import type { VolumeAccessor } from '../../helper/createVolumeProvider.ts';
import { partialVolumeDescriptorToArray } from '../../../volume/PartialVolumeDescriptor.ts';

interface MetadataQuery {
  estimateWindow?: 'full' | 'first' | 'center' | 'none';
}

interface MetadataResponse {
  voxelCount: [number, number, number];
  voxelSize: [number, number, number];
  dicomWindow?: ViewWindow;
  pixelFormat: PixelFormat;
  mode: '3d' | '2d';
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
    const loadImages = state.partialVolumeDescriptor
      ? partialVolumeDescriptorToArray(state.partialVolumeDescriptor)
      : mr.flatten(images);

    const volumeAccessor: VolumeAccessor = {
      ...state.volumeAccessor,
      images: mr.normalize(loadImages)
    };

    const { voxelCount, voxelSize, dicomWindow, pixelFormat, mode } =
      await extractVolumeMetadata(volumeAccessor);

    const estimatedWindow =
      estimateWindow === 'none'
        ? undefined
        : await extractEstimatedWindow(volumeAccessor, estimateWindow);

    const body: MetadataResponse = {
      voxelCount,
      voxelSize,
      dicomWindow,
      pixelFormat,
      estimatedWindow,
      mode
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
  mode: '3d' | '2d';
};

async function extractVolumeMetadata(
  volumeAccessor: VolumeAccessor
): Promise<VolumeMetadata> {
  const { imageMetadata, load, images, determinePitch, isLike3d } =
    volumeAccessor;
  if (images.length === 0) throw new TypeError('Invalid volume accessor.');

  const count = mr.length(images);
  const primaryImageNo = mr.min(images)!;
  await load(primaryImageNo);
  const primaryMetadata = imageMetadata.get(primaryImageNo)!;

  const mode = (await isLike3d()) ? '3d' : '2d';
  const pitch = mode === '3d' ? await determinePitch() : 1;

  return {
    voxelCount: [primaryMetadata.columns, primaryMetadata.rows, count],
    voxelSize: [
      primaryMetadata.pixelSpacing[0],
      primaryMetadata.pixelSpacing[1],
      pitch
    ],
    dicomWindow: primaryMetadata.window,
    pixelFormat: primaryMetadata.pixelFormat,
    mode
  };
}

async function extractEstimatedWindow(
  volumeAccessor: VolumeAccessor,
  algo: 'full' | 'first' | 'center'
): Promise<ViewWindow> {
  const { imageMetadata, load, images } = volumeAccessor;
  if (images.length === 0) throw new TypeError('Invalid volume accessor.');

  let slices: number[];
  switch (algo) {
    case 'full':
      slices = mr.flatten(images);
      break;
    case 'first':
      slices = [mr.min(images)!];
      break;
    case 'center': {
      const centerIdx = Math.floor(mr.length(images) / 2);
      slices = [mr.at(images, centerIdx)!];
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
