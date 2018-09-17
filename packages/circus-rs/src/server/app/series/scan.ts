import koa from 'koa';
import compose from 'koa-compose';
import {
  isTuple,
  parseTuple,
  parseBoolean
} from '../../../common/ValidatorRules';
import { Section, vectorizeSection } from '../../../common/geometry/Section';
import httpStatus from 'http-status';
import compress from 'koa-compress';
import validate from '../middleware/validate';
import { ValidatorRules } from '../../../common/Validator';
import ImageEncoder from '../../helper/image-encoder/ImageEncoder';
import { SeriesMiddlewareState } from './seriesRoutes';
import RawData from '../../../common/RawData';
import { multirange } from 'multi-integer-range';
import PartialVolumeDescriptor from '../../../common/PartialVolumeDescriptor';

interface ScanOptions {
  imageEncoder: ImageEncoder;
}

const SCAN_PRIORITY = 100;

/**
 * Handles 'scan' endpoint which returns MPR image for
 * an arbitrary orientation.
 */
export default function scan({ imageEncoder }: ScanOptions): koa.Middleware {
  const rules: ValidatorRules = {
    'origin!': ['Origin', null, isTuple(3), parseTuple(3)],
    'xAxis!': ['Scan vector X', null, isTuple(3), parseTuple(3)],
    'yAxis!': ['Scan vector Y', null, isTuple(3), parseTuple(3)],
    'size!': ['Output image size', null, isTuple(2), parseTuple(2, true)],
    interpolation: ['Interpolation mode', false, null, parseBoolean],
    ww: ['Window width', undefined, 'isFloat', 'toFloat'],
    wl: ['Window width', undefined, 'isFloat', 'toFloat'],
    format: ['Output type', 'arraybuffer', s => s === 'png', () => 'png']
  };

  const main: koa.Middleware = async function scan(ctx, next): Promise<void> {
    const state = ctx.state as SeriesMiddlewareState;

    const {
      ww,
      wl,
      origin,
      xAxis,
      yAxis,
      size,
      interpolation,
      format
    } = state.query;

    const useWindow = typeof ww === 'number' && typeof wl === 'number';
    if (format === 'png' && !useWindow) {
      ctx.throw(
        httpStatus.BAD_REQUEST,
        'Window values are required for PNG output.'
      );
    }

    if (size[0] * size[1] > 2048 * 2048) {
      ctx.throw(httpStatus.BAD_REQUEST, 'Requested image size is too large.');
    }
    if (size[0] <= 0 || size[1] <= 0) {
      ctx.throw(httpStatus.BAD_REQUEST, 'Invalid image size');
    }

    const { images, load } = state.volumeAccessor;
    const volume: RawData = state.volumeAccessor.volume;
    const section: Section = { origin, xAxis, yAxis };

    // Note: Even though the necessary image is only "2, 4, 6",
    // get "2, 3, 4, 5, 6" (in consideration of interpolation)
    const zAxisRange = getZRange(section);
    const z2i = zIndexToImageNo(state.partialVolumeDescriptor);
    const waitForImages = zAxisRange
      .map(z => z2i(z))
      .filter(i => images.has(i));

    await load(waitForImages, SCAN_PRIORITY);

    if (state.partialVolumeDescriptor)
      volume.setPartialVolumeDescriptor(state.partialVolumeDescriptor);
    try {
      // Create the oblique image
      let buf: Uint8Array; // or similar
      if (useWindow) {
        buf = new Uint8Array(size[0] * size[1]);
      } else {
        buf = new (volume.getPixelFormatInfo()).arrayClass(size[0] * size[1]);
      }
      const section: Section = { origin, xAxis, yAxis };
      volume.scanObliqueSection(section, size, buf, interpolation, ww, wl);

      // Output
      if (format === 'png') {
        const out = await imageEncoder.write(
          Buffer.from(buf.buffer as ArrayBuffer),
          size[0],
          size[1]
        );
        ctx.body = out;
        ctx.type = imageEncoder.mimeType();
      } else {
        ctx.body = Buffer.from(buf.buffer as ArrayBuffer);
      }
    } finally {
      volume.setPartialVolumeDescriptor(undefined);
    }
  };

  return compose([validate(rules), compress(), main]);
}

function zIndexToImageNo(
  partialVolumeDescriptor?: PartialVolumeDescriptor
): (z: number) => number {
  if (partialVolumeDescriptor === undefined) {
    return z => z + 1;
  } else {
    const { start, end, delta } = partialVolumeDescriptor;
    return z => start + z * delta + 1;
  }
}

function getZRange(section: Section): number[] {
  const { origin, xAxis, yAxis } = vectorizeSection(section);
  const zIndices = [
    origin.z,
    origin.z + xAxis.z,
    origin.z + yAxis.z,
    origin.z + xAxis.z + yAxis.z
  ];
  const zMin = Math.floor(Math.min(...zIndices));
  const zMax = Math.ceil(Math.max(...zIndices));
  return multirange([[zMin, zMax]]).toArray();
}
