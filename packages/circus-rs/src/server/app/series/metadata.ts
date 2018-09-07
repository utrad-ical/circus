import koa from 'koa';
import compose from 'koa-compose';
import { ValidatorRules } from '../../../common/Validator';
import validate from '../middleware/validate';
import { ViewWindow } from '../../../common/ViewWindow';
import { PixelFormat } from '../../../common/PixelFormat';
import { SeriesMiddlewareState } from './seriesRoutes';
import MultiRange, {
  Initializer as MultiRangeInitializer
} from 'multi-integer-range';
import { DicomMetadata } from '../../../common/dicomImageExtractor';

type MetadataResponse = {
  voxelCount: [number, number, number];
  voxelSize: [number, number, number];
  dicomWindow?: ViewWindow;
  pixelFormat: PixelFormat;
  estimatedWindow?: ViewWindow;
};

/**
 * Handles 'metadata' endpoint which gives general information
 * of the specified series.
 */
export default function metadata(): koa.Middleware {
  const rules: ValidatorRules = {
    requireEstimatedWindow: [
      'Require estimated window',
      undefined,
      'isBoolean',
      'toBoolean'
    ]
  };

  const main: koa.Middleware = async function metadata(
    ctx,
    _next
  ): Promise<void> {
    const state = ctx.state as SeriesMiddlewareState;
    const { requireEstimatedWindow = true } = state.query;
    const { imageMetadata, load, images } = state.volumeAccessor;

    let loadImages: number[] = [];
    if (state.subVolumeDescriptor) {
      const { start, end, delta } = state.subVolumeDescriptor;
      for (let i = start; i <= end; i += delta) {
        loadImages.push(i);
      }
    } else {
      loadImages = images.toArray();
    }

    if (requireEstimatedWindow) {
      await load(loadImages);
    } else {
      await load(loadImages.slice(0, 2));
    }

    const {
      voxelCount,
      voxelSize,
      dicomWindow,
      pixelFormat,
      estimatedWindow
    } = extractMetadata(imageMetadata, loadImages);

    ctx.body = {
      voxelCount,
      voxelSize,
      dicomWindow,
      pixelFormat,
      estimatedWindow: requireEstimatedWindow ? estimatedWindow : undefined
    };
  };

  return compose([validate(rules), main]);
}

function extractMetadata(
  imageMetadata: Map<number, DicomMetadata>,
  targetRange: MultiRangeInitializer
): MetadataResponse {
  const range = new MultiRange(targetRange);
  const count = range.length();

  const [imageNo1, imageNo2] = range.toArray().slice(0, 2);

  const meta1 = imageMetadata.get(imageNo1)!;
  const {
    columns,
    rows,
    pixelFormat,
    window: dicomWindow,
    sliceLocation: sliceLocation1
  } = meta1;
  const voxelCount: [number, number, number] = [columns, rows, count];
  let pitch: number;
  if (meta1.pitch) {
    pitch = meta1.pitch;
  } else if (1 === count) {
    pitch = 1;
  } else {
    const { sliceLocation: sliceLocation2 } = imageMetadata.get(imageNo2)!;
    pitch = Math.abs(sliceLocation2 - sliceLocation1);
  }

  const voxelSize: [number, number, number] = [
    meta1.pixelSpacing[0],
    meta1.pixelSpacing[1],
    pitch
  ];

  // estimatedWindow
  let seriesMinValue: number = Infinity;
  let seriesMaxValue: number = -Infinity;
  imageMetadata.forEach(meta => {
    seriesMinValue = Math.min(seriesMinValue, meta.minValue!);
    seriesMaxValue = Math.max(seriesMaxValue, meta.maxValue!);
  });
  const width = Math.floor(seriesMaxValue - seriesMinValue + 1);
  const level = Math.floor(seriesMinValue + width / 2);
  const estimatedWindow = { level, width };

  return {
    voxelCount,
    voxelSize,
    dicomWindow,
    pixelFormat,
    estimatedWindow
  };
}
