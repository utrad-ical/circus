import { Readable } from 'node:stream';
import type { Handler, MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { compress } from 'hono/compress';
import type { RsEnv } from '../../types.ts';
import {
  isTuple,
  parseTuple,
  parseBoolean
} from '../../../common/ValidatorRules.ts';
import type { Section } from '../../../common/geometry/Section.ts';
import { vectorizeSection } from '../../../common/geometry/Section.ts';
import validate from '../middleware/validate.ts';
import type { ValidatorRules } from '../../../common/Validator.ts';
import type ImageEncoder from '../../helper/image-encoder/ImageEncoder.ts';
import type RawData from '../../../common/RawData.ts';
import * as mr from 'multi-integer-range';
import type PartialVolumeDescriptor from '../../../volume/PartialVolumeDescriptor.ts';

interface ScanOptions {
  imageEncoder: ImageEncoder;
}

const SCAN_PRIORITY = 100;

/**
 * Handles 'scan' endpoint which returns MPR image for
 * an arbitrary orientation.
 */
export default function scan({
  imageEncoder
}: ScanOptions): [
  MiddlewareHandler<RsEnv>,
  MiddlewareHandler<RsEnv>,
  Handler<RsEnv>
] {
  const rules: ValidatorRules = {
    'origin!': ['Origin', null, isTuple(3), parseTuple(3)],
    'xAxis!': ['Scan vector X', null, isTuple(3), parseTuple(3)],
    'yAxis!': ['Scan vector Y', null, isTuple(3), parseTuple(3)],
    'size!': ['Output image size', null, isTuple(2), parseTuple(2, true)],
    interpolation: ['Interpolation mode', false, null, parseBoolean],
    ww: ['Window width', undefined, 'isFloat', 'toFloat'],
    wl: ['Window level', undefined, 'isFloat', 'toFloat'],
    format: ['Output type', 'arraybuffer', s => s === 'png', () => 'png']
  };

  const main: Handler<RsEnv> = async ctx => {
    const state = ctx.var;

    const { ww, wl, origin, xAxis, yAxis, size, interpolation, format } =
      state.rsQuery;

    const useWindow = typeof ww === 'number' && typeof wl === 'number';
    if (format === 'png' && !useWindow) {
      throw new HTTPException(400, {
        message: 'Window values are required for PNG output.'
      });
    }

    if (size[0] * size[1] > 2048 * 2048) {
      throw new HTTPException(400, {
        message: 'Requested image size is too large.'
      });
    }
    if (size[0] <= 0 || size[1] <= 0) {
      throw new HTTPException(400, {
        message: 'Invalid image size'
      });
    }

    const { images, load } = state.volumeAccessor;
    const volume: RawData = state.volumeAccessor.volume;
    const section: Section = { origin, xAxis, yAxis };

    // Note: Even though the necessary image is only "2, 4, 6",
    // get "2, 3, 4, 5, 6" (in consideration of interpolation)
    const zAxisRange = getZRange(section, interpolation);
    const z2i = zIndexToImageNo(state.partialVolumeDescriptor);
    const waitForImages = zAxisRange
      .map(z => z2i(z))
      .filter(i => mr.has(images, mr.normalize(i)));

    await load(waitForImages, SCAN_PRIORITY);

    if (state.partialVolumeDescriptor)
      volume.setPartialVolumeDescriptor(state.partialVolumeDescriptor);
    try {
      // Create the oblique image
      let buf: Uint8Array; // or similar
      if (useWindow) {
        buf = new Uint8Array(size[0] * size[1]);
      } else {
        buf = new (volume.getPixelFormatInfo().arrayClass)(size[0] * size[1]);
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
        return ctx.body(
          Readable.toWeb(out) as ReadableStream<Uint8Array>,
          200,
          {
            'Content-Type': imageEncoder.mimeType()
          }
        );
      }
      return ctx.body(buf.buffer as ArrayBuffer, 200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(buf.byteLength)
      });
    } finally {
      volume.setPartialVolumeDescriptor(undefined);
    }
  };

  return [validate(rules), compress(), main];
}

function zIndexToImageNo(
  partialVolumeDescriptor?: PartialVolumeDescriptor
): (z: number) => number {
  if (partialVolumeDescriptor === undefined) {
    return z => z + 1;
  } else {
    const { start, delta } = partialVolumeDescriptor;
    return z => start + z * delta + 1;
  }
}

function getZRange(section: Section, interpolation: boolean): number[] {
  const { origin, xAxis, yAxis } = vectorizeSection(section);
  const zIndices = [
    origin.z,
    origin.z + xAxis.z,
    origin.z + yAxis.z,
    origin.z + xAxis.z + yAxis.z
  ];
  const zMin = Math.floor(Math.min(...zIndices)) - (interpolation ? 1 : 0);
  const zMax = Math.ceil(Math.max(...zIndices));
  return mr.flatten(mr.normalize([[zMin, zMax]]));
}
