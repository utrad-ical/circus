/// <reference path="typings/node/node.d.ts" />
/// <reference path="typings/log4js/log4js.d.ts" />

/*----------------------------------------------

  Image getter from DICOM image series

-----------------------------------------------*/

// include require modules
var http = require('http');
var url = require('url');
var exec = require('child_process').exec;
var Png = require('png').Png;
var argv = require('minimist')(process.argv.slice(2));

import log4js = require('log4js');
var logger = prepareLogger();

import RawData = require('./RawData');
import MPR = require('./MPR');

logger.info('CIRCUS RS is starting up...');

// include config modules
logger.info('Loading configuration files');

var configFile = typeof argv.config === 'string' ? argv.config : '../config';
var config: any = require(configFile);

var resolverClass = require('./' + config.pathResolver.module);
var resolver = new resolverClass(config.pathResolver.options);

// create ImageCache
import ImageCache = require('./ImageCache');
var imageCache = new ImageCache(config.memoryThreshold);

// create server process
var server = http.createServer();
server.on('request', doRequest);
server.listen(config.port);
logger.info('Server running on port ' + config.port);

var execCounter = 0;

function my_exec(command, rawData, callback)
{
    logger.trace('execute command');

    var proc = exec(command, {encoding: 'binary', maxBuffer: config.bufferSize});

    var jsonLength = 0;
    var binaryLength = 0;

    var blockData;
    var blockDataOffset = 0;
    var blockDataSize;

    const HEADER_LENGTH = 8;

    var headerBuffer = new Buffer(HEADER_LENGTH);
    var headerBufferOffset = 0;

    proc.stdout.on('data', function (chunk) {
        // logger.trace('read chunk len:' + chunk.length);

        try {

            while(chunk.length > 0) {

                var len;

                if (!blockData && jsonLength == 0 && binaryLength == 0) {
                    //console.log('no block');

                    // block buffer is null
                    len = HEADER_LENGTH - headerBufferOffset;
                    if (chunk.length < len) {
                        len = chunk.length;
                    }
                    headerBuffer.write(chunk, 0, len, 'binary');
                    headerBufferOffset += len;
                    if (headerBufferOffset < HEADER_LENGTH) {
                        return;
                    }

                    chunk = chunk.slice(len);

                    jsonLength = headerBuffer.readInt32LE(0);
                    binaryLength = headerBuffer.readInt32LE(4);

                    blockDataSize = jsonLength + ((binaryLength < 0) ? 0 : binaryLength);

                    blockData = new Buffer(blockDataSize);
                    blockDataOffset = 0;
                    //console.log('header read.');
                }

                len = blockDataSize - blockDataOffset;
                if (chunk.length < len) {
                    len = chunk.length;
                }

                //console.log('write: offset:'+blockDataOffset+' len:'+len);
                blockData.write(chunk, blockDataOffset, len, 'binary');
                blockDataOffset += len;
                chunk = chunk.slice(len);

                if (blockDataOffset < blockDataSize) {
                    return;
                }

                //console.log('block read. size=' + blockDataOffset + '/' + blockDataSize);

                rawData.addBlock(jsonLength, binaryLength, blockData);

                headerBuffer = new Buffer(HEADER_LENGTH)
                headerBufferOffset = 0;
                jsonLength = 0;
                binaryLength = 0;

                blockData = null;
                blockDataSize = 0;
                blockDataOffset = 0;
            }
        } catch(e) {
            logger.trace(e);
            rawData = null;
        }

    });

    proc.stdout.on('end', function () {
        logger.trace('end');
        callback(rawData);
    });
}

// read header/image from DICOM data.
function readData(series, image, callback)
{
  logger.info('readData: ' + series +' image:' + image);

  //
  if (execCounter > 0) {
    logger.trace('waiting... ');
    setTimeout(function(){ readData(series, image, callback) }, 500);
    return;
  }

  execCounter = 1;

  var rawData = imageCache.get(series);
  if (rawData != null) {
    if (rawData.containImage(image)) {
        logger.trace('request images already cached.');
        callback(rawData, null);
        execCounter = 0;
        return;
    }
  } else {
    logger.trace('no cache found.');
    rawData = new RawData();
    imageCache.put(series, rawData);
  }

  resolver.resolvePath(series, function(dcmdir) {
      if (!dcmdir) {
         callback(null, 'cannot resolve path.');
         imageCache.remove(series);
         execCounter = 0;
         return;
      }

      var cmd = config.dumper + ' combined --input-path="' + dcmdir + '" --stdout';
      if (image != 'all') {
        cmd += ' -image=' + image;
      }
      logger.trace(cmd);

      var child = my_exec(cmd, rawData,
        function (rawData) {
            var err: string = '';
            if (rawData == null) {
                imageCache.remove(series);
                err = "cannot read image.";
            }
            callback(rawData, err);
            execCounter = 0;
        });
  });
}

/////////////////////////////////////////////

function prepareLogger(): log4js.Logger
{
    log4js.configure({
        appenders: [
            { type: 'console' },
            { type: 'dateFile', filename: 'logs/debug.log', pattern: '-yyyyMMdd.log' }
        ]
    });
    return log4js.getLogger();
}

function doRequest(req, res)
{
    logger.info(req.method + ' ' + req.url);
    var u = url.parse(req.url, true);
    var query = u.query;
    logger.trace(query);

    if (u.pathname != '/') {
        logger.trace('not supported path.');
        res.writeHead(404);
        res.end();
        return;
    }

    var window_width = 2000;
    var window_level = 0;

    var target = 100;
    var maxZ = 261;
    var series = '';
    var mode = 'axial';
    var image = 'all';

    if ('target' in query) {
        target = Number(query['target']);
    }
    if ('ww' in query) {
        window_width = query['ww'];
    }
    if ('wl' in query) {
        window_level = query['wl'];
    }
    if ('series' in query) {
        series = query['series'];
    }
    if ('mode' in query) {
        mode = query['mode'];
    }
    if ('image' in query) {
        image = query['image'];
    }

    if (series == '') {
        logger.trace('no series in query');
        res.writeHead(500);
        res.end();
        return;
    }

    readData(series, image, function(raw, error) {
        if (error) {
            logger.trace(error);
            res.writeHead(500);
            res.end();
            return;
        }

        var buffer;
        var out_width;
        var out_height;
        var png;

        try {
            if (mode == 'metadata') {
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

                response.allow_mode=['axial', 'coronal', 'sagittal'];

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify(response));
                return;
            } else if (mode == 'axial') {
                // 天頂方向描画
                logger.trace('axial(top)');
                out_width = raw.x;
                out_height = raw.y;
                buffer = MPR.makeAxial(raw, target, window_width, window_level);
            } else if (mode == 'coronal') {
                logger.trace('coronal');
                // 前方向描画
                out_width = raw.x;
                out_height = raw.z;
                buffer = MPR.makeCoronal(raw, target, window_width, window_level);
            } else if (mode == 'sagittal') {
                logger.trace('sagittal');
                // 横方向描画
                out_width = raw.y;
                out_height = raw.z;
                buffer = MPR.makeSagittal(raw, target, window_width, window_level);
            } else {
                logger.trace('unknown mode');
                res.writeHead(500);
                res.end();
                return;
            }

            png = new Png(buffer, out_width, out_height, 'gray', 8);
            logger.trace('create png');

            png.encode(function (png_data) {
                res.writeHead(200,
                {
                    'Content-Type': 'image/png',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(png_data);

                buffer = null;
                png = null;
            });

        } catch(e) {
            logger.trace(e);
            res.writeHead(500);
            res.end();
        }

    });
}
