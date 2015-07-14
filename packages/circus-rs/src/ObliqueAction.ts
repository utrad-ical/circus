/**
 * Oblique Image generator Action class
 */
var url = require('url');

import RawData = require('./RawData');
import DicomReader = require('./DicomReader');
import DicomServerModule = require('./DicomServerModule');
import PNGWriter = require('./PNGWriter');
import MPR = require('./MPR');

import http = require('http');

import Logger = require('./Logger');
var logger = Logger.prepareLogger();

export = ObliqueAction;

class ObliqueAction extends DicomServerModule {

    private pngWriter: PNGWriter;

    protected initialize() {
        super.initialize();

        var pngModule = require('./' + this.config.options.pngWriter);
        this.pngWriter = new pngModule(this.config.options.pngWriterOptions);
    }

    public process(req: http.ServerRequest, res: http.ServerResponse, reader: DicomReader): void
    {
        var u = url.parse(req.url, true);
        var query = u.query;

        var window_width;
        var window_level;

        var target = 1;
        var series = '';
        var mode = 'axial';
        var image = 'all';

        if ('ww' in query) {
            window_width = query['ww'];
        }
        if ('wl' in query) {
            window_level = query['wl'];
        }
        if ('series' in query) {
            series = query['series'];
        }

        if (series == '') {
            logger.warn('no series in query');
            res.writeHead(500);
            res.end();
            return;
        }

        reader.readData(series, image, (raw: RawData, error: string) => {
            if (error) {
                logger.warn(error);
                res.writeHead(404);
                res.end();
                return;
            }

            var buffer;
            var out_width;
            var out_height;

            if (!window_width) {
                window_width = raw.ww;
            }
            if (!window_level) {
                window_level = raw.wl;
            }

            try {
                //logger.trace('axial(top)');
                out_width = raw.x;
                out_height = raw.y;

                // とりあえずaxialの1枚目を出力
                buffer = MPR.makeAxial(raw, target, window_width, window_level);

                // ヘッダは適当。
                res.setHeader('X-Circus-Pixel-Size', '0.5');
                res.setHeader('X-Circus-Pixel-Columns', '512');
                res.setHeader('X-Circus-Pixel-Rows', '512');
                res.setHeader('X-Circus-Center', '250,250');
                this.pngWriter.write(res, buffer, out_width, out_height);
            } catch(e) {
                logger.warn(e);
                res.writeHead(500);
                res.end();
                buffer = null;
            }

        });

    }

}
