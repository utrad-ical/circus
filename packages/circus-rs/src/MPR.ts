/**
 * MPR Image generator class
 */
import rawdata = require('./RawData');
import RawData = rawdata.utradical.circusrs.RawData;

export module utradical.circusrs {

    export class MPR {


        // Pixel値にWindow width/levelを適用
        private static _applyWindowInt16(width: number, level: number, offset: number, z: number, raw: RawData): number {
            var pixel = raw.getInt16Pixel(z, offset);

            var value = Math.round((pixel - level + width/2) * (255 / width));
            if (value >= 255) {
              value = 255;
            } else if (value < 0) {
              value = 0;
            }
            return value;
        }

        private static _applyWindowUInt16(width: number, level: number, offset: number, z: number, raw: RawData): number {
            var pixel = raw.getUInt16Pixel(z, offset);

            var value = Math.round((pixel - level + width/2) * (255 / width));
            if (value > 255) {
              value = 255;
            } else if (value < 0) {
              value = 0;
            }
            return value;
        }

        private static _applyWindowInt8(width: number, level: number, offset: number, z: number, raw: RawData): number {
            var pixel = raw.getInt8Pixel(z, offset);
            var value = Math.round((pixel - level + width/2) * (255 / width));
            if (value > 255) {
              value = 255;
            } else if (value < 0) {
              value = 0;
            }
            return value;
        }

        private static _applyWindowUInt8(width: number, level: number, offset: number, z: number, raw: RawData): number {
            var pixel = raw.getUInt8Pixel(z, offset);
            var value = Math.round((pixel - level + width/2) * (255 / width));
            if (value > 255) {
              value = 255;
            } else if (value < 0) {
              value = 0;
            }
            return value;
        }


        /////////////////////////////////////////////

        private static _makeAxialInt16(raw: RawData, target: number, window_width: number, window_level: number) : Buffer {
            var buffer_offset = 0;
            var offset;
            var value;

            var buffer = new Buffer(raw.x * raw.y)

            for (var y = 0; y < raw.y; y++) {
                for (var x = 0; x < raw.x; x++) {
        //        logger.trace('x: ' + x + ' y:' + y + ' target:' + target);
                    offset = y * raw.x + x;
                    value = MPR._applyWindowInt16(window_width, window_level, offset, target, raw);
                    buffer.writeUInt8(value, buffer_offset);
                    buffer_offset ++;
                }
            }
            return buffer;
        }

        private static _makeAxialUInt16(raw: RawData, target: number, window_width: number, window_level: number) : Buffer {
            var buffer_offset = 0;
            var offset;
            var value;

            var buffer = new Buffer(raw.x * raw.y)

            for (var y = 0; y < raw.y; y++) {
                for (var x = 0; x < raw.x; x++) {
                    offset = y * raw.x + x;
                    value = MPR._applyWindowUInt16(window_width, window_level, offset, target, raw);
                    buffer.writeUInt8(value, buffer_offset);
                    buffer_offset ++;
                }
            }
            return buffer;
        }

        private static _makeAxialInt8(raw: RawData, target: number, window_width: number, window_level: number) : Buffer {
            var buffer_offset = 0;
            var offset;
            var value;

            var buffer = new Buffer(raw.x * raw.y)

            for (var y = 0; y < raw.y; y++) {
                for (var x = 0; x < raw.x; x++) {
                    offset = y * raw.x + x;
                    value = MPR._applyWindowInt8(window_width, window_level, offset, target, raw);
                    buffer.writeUInt8(value, buffer_offset);
                    buffer_offset ++;
                }
            }
            return buffer;
        }

        private static _makeAxialUInt8(raw: RawData, target: number, window_width: number, window_level: number) : Buffer {
            var buffer_offset = 0;
            var offset;
            var value;

            var buffer = new Buffer(raw.x * raw.y)

            for (var y = 0; y < raw.y; y++) {
                for (var x = 0; x < raw.x; x++) {
                    offset = y * raw.x + x;
                    value = MPR._applyWindowUInt8(window_width, window_level, offset, target, raw);
                    buffer.writeUInt8(value, buffer_offset);
                    buffer_offset ++;
                }
            }
            return buffer;
        }


        private static _makeCoronalInt16(raw: RawData, target: number, window_width: number, window_level: number) : Buffer {
            var buffer_offset = 0;
            var offset;
            var value;

            var buffer = new Buffer(raw.x * raw.z);

            for (var z = 0; z < raw.z; z++) {
                for (var x = 0; x < raw.x; x++) {
                    offset = target * raw.x + x;
                    value = MPR._applyWindowInt16(window_width, window_level, offset, z, raw);
                    buffer.writeUInt8(value, buffer_offset);
                    buffer_offset ++;
                }
            }
            return buffer;
        }

        private static _makeCoronalUInt16(raw: RawData, target: number, window_width: number, window_level: number) : Buffer {
            var buffer_offset = 0;
            var offset;
            var value;

            var buffer = new Buffer(raw.x * raw.z);

            for (var z = 0; z < raw.z; z++) {
                for (var x = 0; x < raw.x; x++) {
                    offset = target * raw.x + x;
                    value = MPR._applyWindowUInt16(window_width, window_level, offset, z, raw);
                    buffer.writeUInt8(value, buffer_offset);
                    buffer_offset ++;
                }
            }
            return buffer;
        }

        private static _makeCoronalInt8(raw: RawData, target: number, window_width: number, window_level: number) : Buffer {
            var buffer_offset = 0;
            var offset;
            var value;

            var buffer = new Buffer(raw.x * raw.z);

            for (var z = 0; z < raw.z; z++) {
                for (var x = 0; x < raw.x; x++) {
                    offset = target * raw.x + x;
                    value = MPR._applyWindowInt8(window_width, window_level, offset, z, raw);
                    buffer.writeUInt8(value, buffer_offset);
                    buffer_offset ++;
                }
            }
            return buffer;
        }

        private static _makeCoronalUInt8(raw: RawData, target: number, window_width: number, window_level: number) : Buffer {
            var buffer_offset = 0;
            var offset;
            var value;

            var buffer = new Buffer(raw.x * raw.z);

            for (var z = 0; z < raw.z; z++) {
                for (var x = 0; x < raw.x; x++) {
                    offset = target * raw.x + x;
                    value = MPR._applyWindowUInt8(window_width, window_level, offset, z, raw);
                    buffer.writeUInt8(value, buffer_offset);
                    buffer_offset ++;
                }
            }
            return buffer;
        }

        private static _makeSagittalInt16(raw: RawData, target: number, window_width: number, window_level: number) : Buffer {
            var buffer_offset = 0;
            var offset;
            var value;

            var buffer = new Buffer(raw.y * raw.z);

            for (var y = 0; y < raw.z; y++) { // 出力画像上のy座標
                for (var x = 0; x < raw.y; x++) { // 出力画像上のx座標
                    offset = x * raw.x + target;
                    value = MPR._applyWindowInt16(window_width, window_level, offset, y, raw);
                    buffer.writeUInt8(value, buffer_offset);
                    buffer_offset ++;
                }
            }
            return buffer;
        }

        private static _makeSagittalUInt16(raw: RawData, target: number, window_width: number, window_level: number) : Buffer {
            var buffer_offset = 0;
            var offset;
            var value;

            var buffer = new Buffer(raw.y * raw.z);

            for (var y = 0; y < raw.z; y++) { // 出力画像上のy座標
                for (var x = 0; x < raw.y; x++) { // 出力画像上のx座標
                    offset = x * raw.x + target;
                    value = MPR._applyWindowUInt16(window_width, window_level, offset, y, raw);
                    buffer.writeUInt8(value, buffer_offset);
                    buffer_offset ++;
                }
            }
            return buffer;
        }

        private static _makeSagittalInt8(raw: RawData, target: number, window_width: number, window_level: number) : Buffer {
            var buffer_offset = 0;
            var offset;
            var value;

            var buffer = new Buffer(raw.y * raw.z);

            for (var y = 0; y < raw.z; y++) { // 出力画像上のy座標
                for (var x = 0; x < raw.y; x++) { // 出力画像上のx座標
                    offset = x * raw.x + target;
                    value = MPR._applyWindowInt8(window_width, window_level, offset, y, raw);
                    buffer.writeUInt8(value, buffer_offset);
                    buffer_offset ++;
                }
            }
            return buffer;
        }

        private static _makeSagittalUInt8(raw: RawData, target: number, window_width: number, window_level: number) : Buffer {
            var buffer_offset = 0;
            var offset;
            var value;

            var buffer = new Buffer(raw.y * raw.z);

            for (var y = 0; y < raw.z; y++) { // 出力画像上のy座標
                for (var x = 0; x < raw.y; x++) { // 出力画像上のx座標
                    offset = x * raw.x + target;
                    value = MPR._applyWindowUInt8(window_width, window_level, offset, y, raw);
                    buffer.writeUInt8(value, buffer_offset);
                    buffer_offset ++;
                }
            }
            return buffer;
        }


        static makeAxial(raw: RawData, target: number, window_width: number, window_level: number) : Buffer {
            var buffer = null;
            switch(raw.type) {
            case 0:
                buffer = MPR._makeAxialUInt8(raw, target, window_width, window_level);
                break;
            case 1:
                buffer = MPR._makeAxialInt8(raw, target, window_width, window_level);
                break;
            case 2:
                buffer = MPR._makeAxialUInt16(raw, target, window_width, window_level);
                break;
            case 3:
                buffer = MPR._makeAxialInt16(raw, target, window_width, window_level);
                break;
            default:
                buffer = MPR._makeAxialInt16(raw, target, window_width, window_level);
                break;
            }
            return buffer;
        }

        static makeCoronal(raw: RawData, target: number, window_width: number, window_level: number) : Buffer {
            var buffer = null;
            switch(raw.type) {
            case 0:
                buffer = MPR._makeCoronalUInt8(raw, target, window_width, window_level);
                break;
            case 1:
                buffer = MPR._makeCoronalInt8(raw, target, window_width, window_level);
                break;
            case 2:
                buffer = MPR._makeCoronalUInt16(raw, target, window_width, window_level);
                break;
            case 3:
                buffer = MPR._makeCoronalInt16(raw, target, window_width, window_level);
                break;
            default:
                buffer = MPR._makeCoronalInt16(raw, target, window_width, window_level);
                break;
            }
            return buffer;
        }

        static makeSagittal(raw: RawData, target: number, window_width: number, window_level: number) : Buffer {
            var buffer = null;
            switch(raw.type) {
            case 0:
                buffer = MPR._makeSagittalUInt8(raw, target, window_width, window_level);
                break;
            case 1:
                buffer = MPR._makeSagittalInt8(raw, target, window_width, window_level);
                break;
            case 2:
                buffer = MPR._makeSagittalUInt16(raw, target, window_width, window_level);
                break;
            case 3:
                buffer = MPR._makeSagittalInt16(raw, target, window_width, window_level);
                break;
            default:
                buffer = MPR._makeSagittalInt16(raw, target, window_width, window_level);
                break;
            }
            return buffer;
        }

    }
}
