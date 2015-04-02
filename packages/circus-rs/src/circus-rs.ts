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

import log4js = require('log4js');
var logger = prepareLogger();

import rawdata = require('./RawData');
var RawData = rawdata.utradical.circusrs.RawData;

logger.info('CIRCUS RS is starting up...');

// include config modules
logger.info('Loading configuration files');
var config: any = require('./config');
var resolver = require('./' + config.pathresolver);

// create server process
var server = http.createServer();
server.on('request', doRequest);
server.listen(config.port);
logger.info('Server running on port ' + config.port);

var execCounter = 0;

// image cache
var imageCache = {};


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
    logger.trace('read chunk len:' + chunk.length);

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

  resolver.resolvPath(series, function(dcmdir) {

      if (!dcmdir) {
         callback(null, 'not found');
         return;
      }

	  //
	  if (execCounter > 0) {
	    logger.trace('waiting... ');
	    setTimeout(function(){ readData(series, image, callback) }, 500);
	    return;
	  }

	  var rawData;
	  if (series in imageCache) {
		logger.trace('cache found.');
		rawData = imageCache[series];
		if (rawData.containImage(image)) {
			logger.trace('request images already cached.');
		    callback(rawData, null);
		    return;
		}
	  } else {
		logger.trace('no cache found.');
		rawData = new RawData();
	    imageCache[series] = rawData;
	  }

	  var cmd = config.dumper + ' combined --input-path="' + dcmdir + '" --stdout';
	  if (image != 'all') {
	    cmd += ' -image=' + image;
	  }
	  logger.trace(cmd);

	  execCounter = 1;
	  var child = my_exec(cmd, rawData,
	    function (rawData) {
	        callback(rawData, null);
	        execCounter = 0;
	    });
  });
}

// Pixel値にWindow width/levelを適用
// いずれループ展開してmakeXXXにとりこむ
function applyWindowInt16(width, level, offset, z, raw)
{
	if (!raw.dataFlag[z]) {
		return 0;
	}

    var pixel = raw.data[z].readInt16LE(offset * 2);

    var value = Math.round((pixel - level + width/2) * (255 / width));
    if (value >= 255) {
      value = 255;
    } else if (value < 0) {
      value = 0;
    }
    return value;
}

function applyWindowUInt16(width, level, offset, z, raw)
{
	if (!raw.dataFlag[z]) {
		return 0;
	}

    var pixel = raw.data[z].readInt16LE(offset * 2);
    var value = Math.round((pixel - level + width/2) * (255 / width));
    if (value > 255) {
      value = 255;
    } else if (value < 0) {
      value = 0;
    }
    return value;
}

function applyWindowInt8(width, level, offset, z, raw)
{
	if (!raw.dataFlag[z]) {
		return 0;
	}

    var pixel = raw.data[z].readInt8(offset);
    var value = Math.round((pixel - level + width/2) * (255 / width));
    if (value > 255) {
      value = 255;
    } else if (value < 0) {
      value = 0;
    }
    return value;
}

function applyWindowUInt8(width, level, offset, z, raw)
{
	if (!raw.dataFlag[z]) {
		return 0;
	}

    var pixel = raw.data[z].readUInt8(offset);
    var value = Math.round((pixel - level + width/2) * (255 / width));
    if (value > 255) {
      value = 255;
    } else if (value < 0) {
      value = 0;
    }
    return value;
}


/////////////////////////////////////////////

function makeAxialInt16(raw: any, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.x * raw.y)

  for (var y = 0; y < raw.y; y++) {
    for (var x = 0; x < raw.x; x++) {
//	logger.trace('x: ' + x + ' y:' + y + ' target:' + target);
      offset = y * raw.x + x;
      value = applyWindowInt16(window_width, window_level, offset, target, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}

function makeAxialUInt16(raw, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.x * raw.y)

  for (var y = 0; y < raw.y; y++) {
    for (var x = 0; x < raw.x; x++) {
      offset = y * raw.x + x;
      value = applyWindowUInt16(window_width, window_level, offset, target, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}

function makeAxialInt8(raw: any, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.x * raw.y)

  for (var y = 0; y < raw.y; y++) {
    for (var x = 0; x < raw.x; x++) {
      offset = y * raw.x + x;
      value = applyWindowInt8(window_width, window_level, offset, target, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}

function makeAxialUInt8(raw: any, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.x * raw.y)

  for (var y = 0; y < raw.y; y++) {
    for (var x = 0; x < raw.x; x++) {
      offset = y * raw.x + x;
      value = applyWindowUInt8(window_width, window_level, offset, target, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}


/////////////////////////////////////////////

function makeCoronalInt16(raw: any, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.x * raw.z);

  for (var z = 0; z < raw.z; z++) {
    for (var x = 0; x < raw.x; x++) {
      offset = target * raw.x + x;
      value = applyWindowInt16(window_width, window_level, offset, z, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}

function makeCoronalUInt16(raw: any, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.x * raw.z);

  for (var z = 0; z < raw.z; z++) {
    for (var x = 0; x < raw.x; x++) {
      offset = target * raw.x + x;
      value = applyWindowUInt16(window_width, window_level, offset, z, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}

function makeCoronalInt8(raw: any, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.x * raw.z);

  for (var z = 0; z < raw.z; z++) {
    for (var x = 0; x < raw.x; x++) {
      offset = target * raw.x + x;
      value = applyWindowInt8(window_width, window_level, offset, z, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}

function makeCoronalUInt8(raw: any, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.x * raw.z);

  for (var z = 0; z < raw.z; z++) {
    for (var x = 0; x < raw.x; x++) {
      offset = target * raw.x + x;
      value = applyWindowUInt8(window_width, window_level, offset, z, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}

/////////////////////////////////////////////

function makeSagitalInt16(raw: any, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.y * raw.z);

  for (var y = 0; y < raw.z; y++) { // 出力画像上のy座標
    for (var x = 0; x < raw.y; x++) { // 出力画像上のx座標
      offset = x * raw.x + target;
      value = applyWindowInt16(window_width, window_level, offset, y, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}

function makeSagitalUInt16(raw: any, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.y * raw.z);

  for (var y = 0; y < raw.z; y++) { // 出力画像上のy座標
    for (var x = 0; x < raw.y; x++) { // 出力画像上のx座標
      offset = x * raw.x + target;
      value = applyWindowUInt16(window_width, window_level, offset, y, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}

function makeSagitalInt8(raw: any, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.y * raw.z);

  for (var y = 0; y < raw.z; y++) { // 出力画像上のy座標
    for (var x = 0; x < raw.y; x++) { // 出力画像上のx座標
      offset = x * raw.x + target;
      value = applyWindowInt8(window_width, window_level, offset, y, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}

function makeSagitalUInt8(raw: any, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.y * raw.z);

  for (var y = 0; y < raw.z; y++) { // 出力画像上のy座標
    for (var x = 0; x < raw.y; x++) { // 出力画像上のx座標
      offset = x * raw.x + target;
      value = applyWindowUInt8(window_width, window_level, offset, y, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
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
        response.min = raw.min;
        response.max = raw.max;
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

        response.allow_mode=['axial', 'coronal', 'sagital'];

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(response));
        return;
      } else if (mode == 'axial') {
        // 天頂方向描画
        logger.trace('axial(top)');
        out_width = raw.x;
        out_height = raw.y;

        switch(raw.type) {
        case 0:
            buffer = makeAxialUInt8(raw, target, window_width, window_level);
            png = new Png(buffer, out_width, out_height, 'gray', 8);
            break;
        case 1:
            buffer = makeAxialInt8(raw, target, window_width, window_level);
            png = new Png(buffer, out_width, out_height, 'gray', 8);
            break;
        case 2:
            buffer = makeAxialUInt16(raw, target, window_width, window_level);
            png = new Png(buffer, out_width, out_height, 'gray', 8);
            break;
        case 3:
            buffer = makeAxialInt16(raw, target, window_width, window_level);
            png = new Png(buffer, out_width, out_height, 'gray', 8);
            break;
        default:
            buffer = makeAxialInt16(raw, target, window_width, window_level);
            png = new Png(buffer, out_width, out_height, 'gray', 8);
            break;
        }

      } else if (mode == 'coronal') {
        logger.trace('coronal');
        // 前方向描画
        out_width = raw.x;
        out_height = raw.z;

        switch(raw.type) {
        case 0:
            buffer = makeCoronalUInt8(raw, target, window_width, window_level);
            png = new Png(buffer, out_width, out_height, 'gray', 8);
            break;
        case 1:
            buffer = makeCoronalInt8(raw, target, window_width, window_level);
            png = new Png(buffer, out_width, out_height, 'gray', 8);
            break;
        case 2:
            buffer = makeCoronalUInt16(raw, target, window_width, window_level);
            png = new Png(buffer, out_width, out_height, 'gray', 8);
            break;
        case 3:
            buffer = makeCoronalInt16(raw, target, window_width, window_level);
            png = new Png(buffer, out_width, out_height, 'gray', 8);
            break;
        default:
            buffer = makeCoronalInt16(raw, target, window_width, window_level);
            png = new Png(buffer, out_width, out_height, 'gray', 8);
            break;
        }

      } else if (mode == 'sagital') {
        logger.trace('sagital');
        // 横方向描画
        out_width = raw.y;
        out_height = raw.z;

        switch(raw.type) {
        case 0:
            buffer = makeSagitalUInt8(raw, target, window_width, window_level);
            png = new Png(buffer, out_width, out_height, 'gray', 8);
            break;
        case 1:
            buffer = makeSagitalInt8(raw, target, window_width, window_level);
            png = new Png(buffer, out_width, out_height, 'gray', 8);
            break;
        case 2:
            buffer = makeSagitalUInt16(raw, target, window_width, window_level);
            png = new Png(buffer, out_width, out_height, 'gray', 8);
            break;
        case 3:
            buffer = makeSagitalInt16(raw, target, window_width, window_level);
            png = new Png(buffer, out_width, out_height, 'gray', 8);
            break;
        default:
            buffer = makeSagitalInt16(raw, target, window_width, window_level);
            png = new Png(buffer, out_width, out_height, 'gray', 8);
            break;
        }

      } else {
        logger.trace('unknown mode');
        res.writeHead(500);
        res.end();
        return;
      }

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
