import { isTuple, parseTuple, parseBoolean } from '../../common/ValidatorRules';
import { Section } from '../../common/geometry/Section';
import * as express from 'express';
import { StatusError } from './Error';
import * as compression from 'compression';
import Logger from '../loggers/Logger';
import AsyncLruCache from '../../common/AsyncLruCache';
import ImageEncoder from '../image-encoders/ImageEncoder';
import { validate } from './Middleware';
import DicomVolume from '../../common/DicomVolume';
import { ValidatorRules } from '../../common/Validator';

/**
 * Handles 'scan' endpoint which returns MPR image for
 * an arbitrary orientation.
 */
export function execute(
	logger: Logger, reader: AsyncLruCache<DicomVolume>, imageEncoder: ImageEncoder
): express.RequestHandler[] {

	const rules: ValidatorRules = {
		'origin!': ['Origin', null, isTuple(3), parseTuple(3)],
		'xAxis!': ['Scan vector X', null, isTuple(3), parseTuple(3)],
		'yAxis!': ['Scan vector Y', null, isTuple(3), parseTuple(3)],
		'size!': ['Output image size', null, isTuple(2), parseTuple(2, true)],
		interpolation: ['Interpolation mode', false, null, parseBoolean],
		ww: ['Window width', undefined, 'isFloat', 'toFloat'],
		wl: ['Window width', undefined, 'isFloat', 'toFloat'],
		format: ['Output type', 'arraybuffer', (s) => s === 'png', () => 'png']
	};
	const validator = validate(rules);

	const compressor = compression();

	const main = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
		const { ww, wl, origin, xAxis, yAxis, size, interpolation, format } = req.query;
		const vol = req.volume;
		const useWindow = (typeof ww === 'number' && typeof wl === 'number');
		if (format === 'png' && !useWindow) {
			next(StatusError.badRequest('Window values are required for PNG output.'));
			return;
		}
		if (size[0] * size[1] > 2048 * 2048) {
			next(StatusError.badRequest('Requested image size is too large.'));
			return;
		}
		if (size[0] <= 0 || size[1] <= 0) {
			next(StatusError.badRequest('Invalid image size'));
			return;
		}

		// Create the oblique image
		let buf: Uint8Array; // or similar
		if (useWindow) {
			buf = new Uint8Array(size[0] * size[1]);
		} else {
			buf = new (vol.getPixelFormatInfo().arrayClass)(size[0] * size[1]);
		}
		const section: Section = { origin, xAxis, yAxis };
		vol.scanObliqueSection(section, size, buf, interpolation, ww, wl);

		// Output
		if (format === 'png') {
			res.writeHead(200, {
				'Content-Type': imageEncoder.mimeType()
			});
			imageEncoder.write(res, Buffer.from(buf.buffer), size[0], size[1]);
		} else {
			res.send(Buffer.from(buf));
		}
	};

	return [validator, compressor, main];

}
