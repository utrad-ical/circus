import koa from 'koa';
import compose from 'koa-compose';
import {
  isTuple,
  parseTuple,
  parseBoolean
} from '../../../common/ValidatorRules';
import { Section } from '../../../common/geometry/Section';
import StatusError from '../Error';
import compress from 'koa-compress';
import validate from '../middleware/Validate';
import { ValidatorRules } from '../../../common/Validator';
import { ServerHelpers } from '../../ServerHelpers';
import { Vector3 } from 'three';

/**
 * Handles 'scan' endpoint which returns MPR image for
 * an arbitrary orientation.
 */
export default function scan(helpers: ServerHelpers): koa.Middleware {
  const { imageEncoder } = helpers;

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
    const {
      ww,
      wl,
      origin,
      xAxis,
      yAxis,
      size,
      interpolation,
      format
    } = ctx.state.query;
    const vol = ctx.state.volume;
    const useWindow = typeof ww === 'number' && typeof wl === 'number';
    if (format === 'png' && !useWindow) {
      throw StatusError.badRequest(
        'Window values are required for PNG output.'
      );
    }
    if (size[0] * size[1] > 2048 * 2048) {
      throw StatusError.badRequest('Requested image size is too large.');
    }
    if (size[0] <= 0 || size[1] <= 0) {
      throw StatusError.badRequest('Invalid image size');
    }

    // Create the oblique image
    let buf: Uint8Array; // or similar
    if (useWindow) {
      buf = new Uint8Array(size[0] * size[1]);
    } else {
      buf = new (vol.getPixelFormatInfo()).arrayClass(size[0] * size[1]);
    }
    const section: Section = { origin, xAxis, yAxis };
    vol.scanObliqueSection(section, size, buf, interpolation, ww, wl);

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
