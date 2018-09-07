import koa from 'koa';
import compose from 'koa-compose';
import {
  isTuple,
  parseTuple,
  parseBoolean
} from '../../../common/ValidatorRules';
import { Section } from '../../../common/geometry/Section';
import httpStatus from 'http-status';
import compress from 'koa-compress';
import validate from '../middleware/validate';
import { ValidatorRules } from '../../../common/Validator';
import ImageEncoder from '../../helper/image-encoder/ImageEncoder';
import { SeriesMiddlewareState } from './seriesRoutes';
import RawData from '../../../common/RawData';
import createPartialVolume from './createPartialVolume';

interface scanOptions {
  imageEncoder: ImageEncoder;
}

const PARTIAL_VOLUME_PRIORITY = 1;

/**
 * Handles 'scan' endpoint which returns MPR image for
 * an arbitrary orientation.
 */
export default function scan({ imageEncoder }: scanOptions): koa.Middleware {
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

    let volume: RawData;
    if (state.subVolumeDescriptor) {
      volume = await createPartialVolume(
        state.volumeAccessor,
        state.subVolumeDescriptor,
      );
    } else {
      const { images, load } = state.volumeAccessor;
      await load(images);
      volume = state.volumeAccessor.volume;
    }

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
  };

  return compose([validate(rules), compress(), main]);
}
