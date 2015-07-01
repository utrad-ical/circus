/**
 * DICOM image metadata process class
 */
var url = require('url');

import RawData = require('./RawData');
import DicomReader = require('./DicomReader');
import DicomServerModule = require('./DicomServerModule');

import Logger = require('./Logger');
var logger = Logger.prepareLogger();

export = Metadata;

class Metadata extends DicomServerModule {

	public process(req: any, res: any, reader: DicomReader): void
	{
		logger.info('Metadata::process');

		var u = url.parse(req.url, true);
		var query = u.query;

		var series = '';

		if ('series' in query) {
			series = query['series'];
		}

		if (series == '') {
			logger.warn('no seriesUID specified.')
			res.writeHead(404);
			res.end();
			return;
		}

		reader.readData(series, 'all', function(raw: RawData, error: any) {
			if (error) {
				logger.warn(error);
				res.writeHead(500);
				res.end();
				return;
			}

			try {
				var response: any = {};
				response.x = raw.x;
				response.y = raw.y;
				response.z = raw.z;
				response.voxel_x = raw.vx;
				response.voxel_y = raw.vy;
				response.voxel_z = raw.vz;
				response.window_width = raw.ww;
				response.window_level = raw.wl;
				if (raw.dcm_ww != null) {
					response.window_width_dicom = raw.dcm_ww;
				}
				if (raw.dcm_wl != null) {
					response.window_level_dicom = raw.dcm_wl;
				}
				switch(raw.type) {
				case 0:
					response.window_width_min = 1;
					response.window_width_max = 256;
					response.window_level_min = 0;
					response.window_level_max = 255;
					break;
				case 1:
					response.window_width_min = 1;
					response.window_width_max = 256;
					response.window_level_min = -128;
					response.window_level_max = 127;
					break;
				case 2:
					response.window_width_min = 1;
					response.window_width_max = 65536;
					response.window_level_min = 0;
					response.window_level_max = 65535;
					break;
				case 3:
					response.window_width_min = 1;
					response.window_width_max = 65536;
					response.window_level_min = -32768;
					response.window_level_max = 32767;
					break;
				default:
					break;
				}

				res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
				res.end(JSON.stringify(response));
			} catch(e) {
				logger.warn(e);
				res.writeHead(500);
				res.end();
			}
		});
	}

}
