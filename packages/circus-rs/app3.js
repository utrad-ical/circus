/*----------------------------------------------

  Image getter from DICOM image series

-----------------------------------------------*/

// include require modules
var http = require('http');
var url = require('url');
var exec = require('child_process').exec;
var Png = require('png').Png;

// include config modules
var config = require('./config');

var resolver = require('./' + config.pathresolver);

// create server process
var server = http.createServer();
server.on('request', doRequest);
server.listen(config.port);
console.log('Server running');

var execCounter = 0;


//
// DICOM series image data class.
//
function RawData() {

	this.x = 1;
	this.y = 1;
	this.z = 1;
	this.type = -1;
    this.vx = 1;
    this.vy = 1;
    this.vz = 1;
    this.wl = 1500;
    this.ww = 2000;
    this.min = 65535;
    this.max = -65535;
}
// set pixel dimension and allocate array.
RawData.prototype.setDimension = function()
{
    this.x = this.header.width;
    this.y = this.header.height;
    this.z = this.header.depth;
    this.type = this.header.dataType;

    this.data = new Array(this.z);
	this.dataFlag = new Array(this.z, false);

	console.log('x:' + this.x);
	console.log('y:' + this.y);
	console.log('z:' + this.z);
	console.log('type:' + this.type);

}

// set voxel dimension and window
RawData.prototype.setVoxelDimension = function()
{
	this.vx = this.header.voxelWidth;
	this.vy = this.header.voxelHeight;
	this.vz = this.header.voxelDepth;
    this.wl = this.header.estimatedWindowLevel;
    this.ww = this.header.estimatedWindowWidth ;

	console.log('vx:' + this.vx);
	console.log('vy:' + this.vy);
	console.log('vz:' + this.vz);
	console.log('wl:' + this.wl);
	console.log('ww:' + this.ww);
}

RawData.prototype.containImage = function(image)
{
	if (image == 'all') {
		for (var index=0; index < this.dataFlag.length; index++) {
			if (!this.dataFlag[index]) {
				return false;
			}
		}
	} else {
		var ar = image.split(',');

		var count = 0;
		var index = ar[0];
		while (count < ar[2]) {
			if (!this.dataFlag[index-1]) {
				return false;
			}
			index += ar[1];
			count ++;
		}
	}
	return true;
}


//
// Buffer data: block data in dcm_voxel_dump conbined format
RawData.prototype.addBlock = function(jsonSize, binarySize, data)
{
	var jsonData = data.toString('utf8', 0, jsonSize);
	var offset = jsonSize;

	var json = JSON.parse(jsonData);

	//console.log('json size=' + jsonSize);
	//console.log('binary size=' + binarySize);

	if (binarySize == -1) {
		//console.log('global header');
		//console.log(json);
		// global header
		this.header = json;
		this.setDimension();

	} else if (binarySize == -2) {
		//console.log('global footer');
		// global footer
		//console.log(json);
		if (this.header) {
			for (var key in json) {
				this.header[key] = json[key];
			}
		} else {
			this.header = json;
		}
		this.setVoxelDimension();
	} else if (binarySize > 0) {
		//console.log('image block: ' + json.instanceNumber + ' size:' + binarySize + ' raw:' + data.length);
		if (json.success) {
			var voxelData = new Buffer(binarySize);
			data.copy(voxelData, 0, jsonSize);
			this.data[json.instanceNumber - 1] = voxelData;
			this.dataFlag[json.instanceNumber - 1] = true;

			if (this.min > json.min) {
				this.min = json.min;
			}
			if (this.max < json.max) {
				this.max = json.max;
			}
			//console.log('image size: ' + voxelData.length);
		} else {
			console.log(json.errorMessage);
		}
	} else {
		// binarySize is 0. read failed.
		console.log(json.errorMessage);
	}
}

// 画像キャッシュ(いずれpushoutとか実装)
var imageCache = {};


function my_exec(command, rawData, callback)
{
//	console.log('execute command');

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
//		console.log('read chunk len:' + chunk.length);

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

console.log('end');

        callback(rawData);
    });
}

// read header/image from DICOM data.
function readData(series, image, callback)
{
  console.log('readData: ' + series +' image:' + image);

  resolver.resolvPath(series, function(dcmdir) {

      if (!dcmdir) {
         callback(null, 'not found');
         return;
      }

	  // 
	  if (execCounter > 0) {
	    console.log('waiting... ');
	    setTimeout(function(){ readData(series, image, callback) }, 500);
	    return;
	  }

	  var rawData;
	  if (series in imageCache) {
		console.log('cache found.');
		rawData = imageCache[series];
		if (rawData.containImage(image)) {
			console.log('request images already cached.');
		    callback(rawData, null);
		    return;
		}
	  } else {
		console.log('no cache found.');
		rawData = new RawData();
	    imageCache[series] = rawData;
	  }

	  var cmd = config.dumper + ' combined --input-path="' + dcmdir + '" --stdout';
	  if (image != 'all') {
	    cmd += ' -image=' + image;
	  }
	  console.log(cmd);

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

function makeAxialInt16(raw, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.x * raw.y)

  for (y = 0; y < raw.y; y++) {
    for (x = 0; x < raw.x; x++) {
//	console.log('x: ' + x + ' y:' + y + ' target:' + target);
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

  for (y = 0; y < raw.y; y++) {
    for (x = 0; x < raw.x; x++) {
      offset = y * raw.x + x;
      value = applyWindowUInt16(window_width, window_level, offset, target, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}

function makeAxialInt8(raw, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.x * raw.y)

  for (y = 0; y < raw.y; y++) {
    for (x = 0; x < raw.x; x++) {
      offset = y * raw.x + x;
      value = applyWindowInt8(window_width, window_level, offset, target, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}

function makeAxialUInt8(raw, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.x * raw.y)

  for (y = 0; y < raw.y; y++) {
    for (x = 0; x < raw.x; x++) {
      offset = y * raw.x + x;
      value = applyWindowUInt8(window_width, window_level, offset, target, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}


/////////////////////////////////////////////

function makeCoronalInt16(raw, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.x * raw.z);

  for (z = 0; z < raw.z; z++) {
    for (x = 0; x < raw.x; x++) {
      offset = target * raw.x + x;
      value = applyWindowInt16(window_width, window_level, offset, z, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}

function makeCoronalUInt16(raw, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.x * raw.z);

  for (z = 0; z < raw.z; z++) {
    for (x = 0; x < raw.x; x++) {
      offset = target * raw.x + x;
      value = applyWindowUInt16(window_width, window_level, offset, z, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}

function makeCoronalInt8(raw, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.x * raw.z);

  for (z = 0; z < raw.z; z++) {
    for (x = 0; x < raw.x; x++) {
      offset = target * raw.x + x;
      value = applyWindowInt8(window_width, window_level, offset, z, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}

function makeCoronalUInt8(raw, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.x * raw.z);

  for (z = 0; z < raw.z; z++) {
    for (x = 0; x < raw.x; x++) {
      offset = target * raw.x + x;
      value = applyWindowUInt8(window_width, window_level, offset, z, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}

/////////////////////////////////////////////

function makeSagitalInt16(raw, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.y * raw.z);

  for (y = 0; y < raw.z; y++) { // 出力画像上のy座標
    for (x = 0; x < raw.y; x++) { // 出力画像上のx座標
      offset = x * raw.x + target;
      value = applyWindowInt16(window_width, window_level, offset, y, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}

function makeSagitalUInt16(raw, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.y * raw.z);

  for (y = 0; y < raw.z; y++) { // 出力画像上のy座標
    for (x = 0; x < raw.y; x++) { // 出力画像上のx座標
      offset = x * raw.x + target;
      value = applyWindowUInt16(window_width, window_level, offset, y, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}

function makeSagitalInt8(raw, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.y * raw.z);

  for (y = 0; y < raw.z; y++) { // 出力画像上のy座標
    for (x = 0; x < raw.y; x++) { // 出力画像上のx座標
      offset = x * raw.x + target;
      value = applyWindowInt8(window_width, window_level, offset, y, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}

function makeSagitalUInt8(raw, target, window_width, window_level)
{
  var buffer_offset = 0;
  var offset;
  var value;

  var buffer = new Buffer(raw.y * raw.z);

  for (y = 0; y < raw.z; y++) { // 出力画像上のy座標
    for (x = 0; x < raw.y; x++) { // 出力画像上のx座標
      offset = x * raw.x + target;
      value = applyWindowUInt8(window_width, window_level, offset, y, raw);
      buffer.writeUInt8(value, buffer_offset);
      buffer_offset ++;
    }
  }
  return buffer;
}

/////////////////////////////////////////////

function doRequest(req, res)
{
    console.log(req.method + ' ' + req.url);
    var u = url.parse(req.url, true);
    var query = u.query;
    console.log(query);

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
        console.log('no series in query');
        res.writeHead(500);
        res.end();
        return;
    }

    readData(series, image, function(raw, error) {
      if (error) {
        console.log(error);
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
        var response = {};
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
        console.log('axial(top)');
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
        console.log('coronal');
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
        console.log('sagital');
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
        console.log('unknown mode');
        res.writeHead(500);
        res.end();
        return;
      }

      console.log('create png');

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
  console.log(e);
  res.writeHead(500);
  res.end();
}

    });
}
