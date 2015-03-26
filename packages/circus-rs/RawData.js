/**
 * DICOM series image data class.
 */
var utradical;
(function (utradical) {
    var circusrs;
    (function (circusrs) {
        var RawData = (function () {
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
            /**
             * set pixel dimension and allocate array.
             */
            RawData.prototype.setDimension = function () {
                this.x = this.header.width;
                this.y = this.header.height;
                this.z = this.header.depth;
                this.type = this.header.dataType;
                this.data = new Array(this.z);
                this.dataFlag = new Array(this.z);
                console.log('x:' + this.x);
                console.log('y:' + this.y);
                console.log('z:' + this.z);
                console.log('type:' + this.type);
            };
            /**
             * set voxel dimension and window
             */
            RawData.prototype.setVoxelDimension = function () {
                this.vx = this.header.voxelWidth;
                this.vy = this.header.voxelHeight;
                this.vz = this.header.voxelDepth;
                this.wl = this.header.estimatedWindowLevel;
                this.ww = this.header.estimatedWindowWidth;
                console.log('vx:' + this.vx);
                console.log('vy:' + this.vy);
                console.log('vz:' + this.vz);
                console.log('wl:' + this.wl);
                console.log('ww:' + this.ww);
            };
            RawData.prototype.containImage = function (image) {
                if (image == 'all') {
                    for (var index = 0; index < this.dataFlag.length; index++) {
                        if (!this.dataFlag[index]) {
                            return false;
                        }
                    }
                }
                else {
                    var ar = image.split(',').map(parseInt);
                    var count = 0;
                    var index = ar[0];
                    while (count < ar[2]) {
                        if (!this.dataFlag[index - 1]) {
                            return false;
                        }
                        index += ar[1];
                        count++;
                    }
                }
                return true;
            };
            /**
             * Buffer data: block data in dcm_voxel_dump conbined format
             */
            RawData.prototype.addBlock = function (jsonSize, binarySize, data) {
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
                }
                else if (binarySize == -2) {
                    //console.log('global footer');
                    // global footer
                    //console.log(json);
                    if (this.header) {
                        for (var key in json) {
                            this.header[key] = json[key];
                        }
                    }
                    else {
                        this.header = json;
                    }
                    this.setVoxelDimension();
                }
                else if (binarySize > 0) {
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
                    }
                    else {
                        console.log(json.errorMessage);
                    }
                }
                else {
                    // binarySize is 0. read failed.
                    console.log(json.errorMessage);
                }
            };
            return RawData;
        })();
        circusrs.RawData = RawData;
    })(circusrs = utradical.circusrs || (utradical.circusrs = {}));
})(utradical = exports.utradical || (exports.utradical = {}));
