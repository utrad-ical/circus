declare var Zlib: any;
declare var $: any;

interface Series {
	id: string;
	label: {
		id: string,
		position: any
	}[];
	size: {
		X: number;
		Y: number;
		Z: number;
	}
}

interface VoxelContainerData {
	history: {
		init: any[];
		main: any[];
		redo: any[];
	};
	series: Series[];
	member: any[];
}


class voxelContainer {
	public name: string;

	constructor(n: string) {
		this.name = n;
	}

	//data object
	public data: VoxelContainerData = {
		history: {
			init: [],
			main: [],
			redo: []
		},
		series: [],
		member: [] //list of id of the viewer that uses this container.
	};

	public addHistory(series_id, label_id, the_mode, position_array) {

		//arguments
		// series_id : Series ID (String)
		// label_id : Label ID (String)
		// the_mode : mode ('pen' or 'erase')
		// position_array : array of positions of 1 stroke. ( [x1,y1,z1],[x2,y2,z2])

		//one stroke positions data object.
		var tmp_step_obj = {
			series: series_id,
			label: label_id,
			mode: the_mode,
			position: []
		};

		for (var i = position_array.length - 1; i >= 0; i--) {
			tmp_step_obj.position[i] = [
				position_array[i][0],
				position_array[i][1],
				position_array[i][2]
			];
		}

		this.data.history.main.push(tmp_step_obj);

		//remove Redo history when the new stroke is put.
		this.data.history.redo = [];

	};


	public addLoadedData(series_id, label_id, the_mode, position_array) {
		//put loaded data into container
		//this function is used to after page loading.

		//one stroke positions data object.
		var tmp_step_obj = {
			series: series_id,
			label: label_id,
			mode: the_mode,
			position: []
		};

		var tmp_series = this.getSeriesObjectById(series_id);

		for (var i = position_array.length - 1; i >= 0; i--) {
			if (typeof position_array[i] != 'undefined') {
				var this_slice = position_array[i];
				for (var j = this_slice.length - 1; j > -1; j--) {
					if (this_slice[j] == 1) {
						var tmp_x = j % tmp_series.size.X;
						var tmp_y = j / tmp_series.size.Y;
						tmp_y = Math.floor(tmp_y);
						tmp_step_obj.position.push([tmp_x, tmp_y, i]);
					}
				}
			}
		}
		this.data.history.init.push(tmp_step_obj);
	}

	public addLabel(series_id, label_id, position_array?) {
		var tmp_position_array = [];
		if (typeof position_array == 'object') {
			tmp_position_array = position_array;
		}

		var tmp_label_obj = {
			id: label_id,
			position: tmp_position_array
		};

		var tmp_series = this.getSeriesObjectById(series_id);

		//if the series does not exist, create new series.
		if (typeof tmp_series == 'undefined') {
			this.addSeries(series_id);
		}
		var the_target_series = this.getSeriesObjectById(series_id);
		the_target_series.label.push(tmp_label_obj);
	}

	public addSeries(series_id) {
		var tmp_series_obj = {
			id: series_id,
			label: [],
			size: null
		};
		this.data.series.push(tmp_series_obj);
	}

	public changeLabelName(current_label_id, series_id, new_label_id) {
		//change the id of the Label object.
		var the_label = this.getLabelObjectById(current_label_id, series_id);
		the_label.id = new_label_id;

		// search labels that has the ID, in history arrays.
		// find to change.
		for (var i = 0; i < this.data.history.init.length; i++) {
			if (this.data.history.init[i].label == current_label_id) {
				this.data.history.init[i].label = new_label_id;
			}
		}

		for (var i = 0; i < this.data.history.main.length; i++) {
			if (this.data.history.main[i].label == current_label_id) {
				this.data.history.main[i].label = new_label_id;
			}
		}

		for (var i = 0; i < this.data.history.redo.length; i++) {
			if (this.data.history.redo[i].label == current_label_id) {
				this.data.history.redo[i].label = new_label_id;
			}
		}

	}


	public createSaveData(series_id, label_id) {
		var the_series = this.getSeriesObjectById(series_id);
		var the_label = this.getLabelObjectById(label_id, series_id);

		// default.
		var return_obj = {
			size: [0, 0, 0],
			offset: [0, 0, 0],
			image: ''
		};

		// if some positions are drawn, create data.
		if (typeof the_label == 'object') {

			//check all positions
			//decide the Maximum & Minimum of XYZ.
			var max_x = 0;
			var min_x = Number.MAX_VALUE;
			var max_y = 0;
			var min_y = Number.MAX_VALUE;
			var max_z = 0;
			var min_z = Number.MAX_VALUE;

			var this_series_x = the_series.size.X;

			// check Z index.
			for (var z = the_label.position.length - 1; z >= 0; z--) {
				var tmp_the_slice = the_label.position[z];
				if (typeof tmp_the_slice == 'object') {
					for (var i = tmp_the_slice.length - 1; i >= 0; i--) {
						if (tmp_the_slice[i] == 1) {
							var y = Math.floor(i / this_series_x);
							var x = i - this_series_x * y;

							max_x = Math.max(max_x, x);
							max_y = Math.max(max_y, y);
							max_z = Math.max(max_z, z);

							min_x = Math.min(min_x, x);
							min_y = Math.min(min_y, y);
							min_z = Math.min(min_z, z);
						}
					}
				}
			}

			//if the Z index exists & no positions are drawn in the index.
			if (min_z == Number.MAX_VALUE) {
				return_obj.size[2] = 0;
				min_x = 0;
				min_y = 0;
				min_z = 0;
			}

			max_x++;
			max_y++;
			max_z++;

			return_obj.size[2] = max_z - min_z;
			return_obj.offset = [min_x, min_y, min_z];

			var draw_w = max_x - min_x; // width of the PNG.
			var draw_h = max_y - min_y; // height of the 1 slice image.
			var draw_wh = draw_w * draw_h; // height of the PNG.

			return_obj.size[0] = draw_w; //width of the slice.
			return_obj.size[1] = draw_h; //height of the 1 slice image.

			var png_height = draw_h * return_obj.size[2]; //height of the PNG.

			//exchange Uint Array to 1 dimension.
			//each of the value in this array is zero. init
			var tmp_img_data = new Uint8Array(draw_w * png_height);

			for (var z = min_z; z < max_z; z++) {
				if (typeof the_label.position[z] == 'object') {
					var tmp_the_slice = the_label.position[z];
					for (var y = min_y; y < max_y; y++) {
						var pre_x = this_series_x * y;
						for (var x = min_x; x < max_x; x++) {
							var the_index = x - min_x + (y - min_y) * draw_w + (z - min_z) * draw_wh;
							tmp_img_data[the_index] = tmp_the_slice[x + pre_x];
						}
					}
				}
			}

			var gzip = new Zlib.Gzip(tmp_img_data);
			tmp_img_data = gzip.compress();

			var arrayBufferToBase64 = function (bytes) {
				var binary = '';
				var len = bytes.byteLength;
				for (var i = 0; i < len; i++) {
					binary += String.fromCharCode(bytes[i]);
				}
				return window.btoa(binary);
			};
			return_obj.image = arrayBufferToBase64(tmp_img_data);
		}
		return return_obj;

	};


	public deleteLabelObject(series_id, label_id) {
		var the_series = this.getSeriesObjectById(series_id);
		for (var j = the_series.label.length - 1; j >= 0; j--) {
			if (the_series.label[j].id == label_id) {
				the_series.label.splice(j, 1);
			}
		}
	}


	public getCurrentLabel(tmp_orientation, tmp_current_num) {
		// tmp_orientation : Current orientation
		// tmp_current_num : Current index number

		var return_array = [];
		for (var j = this.data.series.length - 1; j >= 0; j--) {
			var the_series = this.data.series[j];
			for (var i = the_series.label.length - 1; i >= 0; i--) {
				var position_array = this.returnSlice(
					the_series.id,
					the_series.label[i].id,
					tmp_orientation,
					tmp_current_num
				);
				return_array.push({
					'series': the_series.id,
					'label': the_series.label[i].id,
					'position': position_array
				})
			}
		}
		return return_array;
	}

	public getLabelObjectById(label_id, series_id) {
		var the_series = this.getSeriesObjectById(series_id);

		for (var i = the_series.label.length - 1; i >= 0; i--) {
			if (the_series.label[i].id == label_id) {
				return the_series.label[i];
			}
		}
	}


	public getPositionDataFromImage(insertObject, series_w, series_h) {

		// create positions data from loaded data.
		// this function is used to run after Page load.

		var return_obj = [];

		var the_series_w = 512;
		var the_series_h = 512;

		if (typeof series_w == 'number') {
			the_series_w = Math.floor(series_w);
		}

		if (typeof series_h == 'number') {
			the_series_h = Math.floor(series_h);
		}

		if (typeof insertObject.image != 'undefined' && insertObject.image != 'error') {
			var arrayBufferFromBase64 = function (base64string) {
				var binary = window.atob(base64string);
				var return_array = [];
				for (var i = 0; i < binary.length; i++) {
					return_array.push(binary.charCodeAt(i));
				}
				return return_array;
			}; // arrayBufferFromBase64

			var tmp_img_data = arrayBufferFromBase64(insertObject.image);
			var gunzip = new Zlib.Gunzip(tmp_img_data);
			tmp_img_data = gunzip.decompress(); //uint8Array
			var insertImgSlice_wh = insertObject.size[0] * insertObject.size[1];

			for (var i = 0; i < tmp_img_data.length; i++) {
				// check only drawn positions
				if (tmp_img_data[i] == 1) {
					var the_index = i;
					// calculate the position in PNG.
					var the_position_y = Math.floor(the_index / insertObject.size[0]);
					var the_position_x = the_index - the_position_y * insertObject.size[0];

					// Positions that the PNGs are sliced by axial plane & are superimposed.
					var slice_z = Math.floor(the_index / insertImgSlice_wh);
					var slice_y = the_position_y - slice_z * insertObject.size[1];
					var slice_x = the_position_x;

					//positions in UintArray
					var true_z = slice_z + insertObject.offset[2];
					var true_y = slice_y + insertObject.offset[1];
					var true_x = slice_x + insertObject.offset[0];

					if (typeof return_obj[true_z] != 'object') {
						return_obj[true_z] = new Uint8Array(the_series_w * the_series_h);
					}
					return_obj[true_z][the_series_w * true_y + true_x] = 1;
				}
			}
		}

		return return_obj;
	};


	public getSeriesObjectById(series_id) {
		for (var i = this.data.series.length - 1; i >= 0; i--) {
			if (this.data.series[i].id == series_id) {
				return this.data.series[i];
			}
		}
	};


	public historyBack() {
		if (this.data.history.main.length > 0) {
			//put the last one stroke to Redo history array.
			var tmp_move_array = new Object();
			$.extend(true, tmp_move_array, this.data.history.main[this.data.history.main.length - 1]);
			this.data.history.redo.push(tmp_move_array);
			this.data.history.main.splice(this.data.history.main.length - 1, 1);

			//clear all labels.
			for (var i = this.data.series.length - 1; i >= 0; i--) {
				for (var j = this.data.series[i].label.length - 1; j >= 0; j--) {
					this.data.series[i].label[j].position = [];
				}
			}

			//draw preload drawn data.
			for (var i = this.data.history.init.length - 1; i >= 0; i--) {
				var this_history = this.data.history.init[i];
				this.updateVoxel(
					this_history.series,
					this_history.label,
					this_history.mode,
					this_history.position
				);
			}

			//re-draw the Main history.
			for (var i = 0; i < this.data.history.main.length; i++) {
				var this_history = this.data.history.main[i];
				this.updateVoxel(
					this_history.series,
					this_history.label,
					this_history.mode,
					this_history.position
				);
			}
		}
	};

	public historyRedo () {
		var this_obj = this;
		var this_data = this_obj.data;
		if (this_data.history.redo.length > 0) {
			var tmp_move_array = new Object();
			$.extend(true, tmp_move_array, this_data.history.redo[this_data.history.redo.length - 1]);
			this_data.history.main.push(tmp_move_array);
			this_data.history.redo.splice(this_data.history.redo.length - 1, 1);

			//clear all labels.
			for (var i = this_obj.data.series.length - 1; i >= 0; i--) {
				for (var j = this_obj.data.series[i].label.length - 1; j >= 0; j--) {
					this_obj.data.series[i].label[j].position = [];
				}
			}

			//draw preload drawn data.
			for (var i = this_data.history.init.length - 1; i >= 0; i--) {
				var this_history = this_data.history.init[i];
				this_obj.updateVoxel(
					this_history.series,
					this_history.label,
					this_history.mode,
					this_history.position
				);
			}

			//re-draw the Main history.
			for (var i = 0; i < this_data.history.main.length; i++) {
				var this_history = this_data.history.main[i];
				this_obj.updateVoxel(
					this_history.series,
					this_history.label,
					this_history.mode,
					this_history.position
				);
			}
		}
	};


	public insertLabelData(insert_obj) {
		// insert Label data directry
		// this function is call for insert loaded Label data into container

		for (var i = 0; i < insert_obj.length; i++) {
			var tmp_series = insert_obj[i];
			var series_w = tmp_series.voxel.x;
			var series_h = tmp_series.voxel.y * tmp_series.voxel.voxel_y / tmp_series.voxel.voxel_x;

			if (typeof tmp_series.label == 'object') {
				for (var j = 0; j < tmp_series.label.length; j++) {
					var tmp_label = tmp_series.label[j];
					var position_data = this.getPositionDataFromImage(tmp_label, series_w, series_h);
					this.addLabel(tmp_series.id, tmp_label.id, position_data);

					//put loaded data into History object.
					this.addLoadedData(tmp_series.id, tmp_label.id, 'pen', position_data);
				}
			}
		}
	};


	public returnSlice(series_id, label_id, tmp_orientation, tmp_current_num) {

		var return_array = [];
		var tmp_target_series = this.getSeriesObjectById(series_id);
		var voxel_x = tmp_target_series.size.X;

		var tmp_target_label = this.getLabelObjectById(label_id, series_id);

		//get the array of the positions that should be drawn.(the positions are voxel XYZ unit.)
		if (tmp_orientation == 'axial') {
			// Z axis means index number.
			if (typeof tmp_target_label.position[tmp_current_num] != 'undefined') {
				var the_data = tmp_target_label.position[tmp_current_num];

				for (var i = the_data.length - 1; i >= 0; i--) {
					if (the_data[i] == 1) {
						var tmp_y = Math.floor(i / voxel_x);
						var tmp_x = i - tmp_y * voxel_x;
						return_array.push([tmp_x, tmp_y, tmp_current_num]);
					}
				}
			}
		} else if (tmp_orientation == 'coronal') {
			// Y axis means index number.
			for (var i = tmp_target_label.position.length - 1; i >= 0; i--) { //z軸
				//check all slice
				if (typeof tmp_target_label.position[i] != 'undefined') {
					var the_data = tmp_target_label.position[i];
					// check only positions that the Y hits the index
					for (let j = voxel_x * tmp_current_num; j < voxel_x * (tmp_current_num + 1); j++) {
						var this_y = Math.floor(j / voxel_x);
						var this_x = j - voxel_x * this_y;
						if (the_data[j] == 1 && this_y == tmp_current_num) {
							return_array.push([this_x, this_y, i]);
						}
					}
				}
			}
		} else if (tmp_orientation == 'sagittal') {
			// X axis means index number.
			for (var i = tmp_target_label.position.length - 1; i >= 0; i--) { //z軸
				//check all slice
				if (typeof tmp_target_label.position[i] != 'undefined') {
					var the_data = tmp_target_label.position[i];
					// check only positions that the X hits the index
					for (let j = tmp_current_num; j < the_data.length; j = j + voxel_x) {
						var this_y = Math.floor(j / voxel_x);
						var this_x = j - voxel_x * this_y;
						if (the_data[j] == 1 && this_x == tmp_current_num) {
							return_array.push([this_x, this_y, i]);
						}
					}
				}
			}
		}
		return return_array;

	};


	public setSize(series_id, the_x, the_y, the_z) {
		var tmp_series = this.getSeriesObjectById(series_id);

		var tmp_x = Math.floor(the_x);
		var tmp_y = Math.floor(the_y);
		var tmp_z = Math.floor(the_z);

		if (typeof tmp_series !== 'object') {
			let new_series: any = {};
			new_series.id = series_id;
			new_series.label = [];
			new_series.size = {
				X: tmp_x,
				Y: tmp_y,
				Z: tmp_z
			};
			tmp_series = new_series;
			this.data.series.push(tmp_series);
		} else {
			tmp_series.size = {
				X: tmp_x,
				Y: tmp_y,
				Z: tmp_z
			}
		}
	};

	public updateVoxel(series_id, label_id, the_mode, position_array) {
		if (typeof this.getSeriesObjectById(series_id) != 'object') {
			this.addSeries(series_id);
		}
		var tmp_series = this.getSeriesObjectById(series_id);

		var tmp_target_label = this.getLabelObjectById(label_id, series_id);
		if (typeof tmp_target_label != 'object') {
			this.addLabel(series_id, label_id);
		}
		tmp_target_label = this.getLabelObjectById(label_id, series_id);

		var target_position_data = tmp_target_label.position;

		var input_value = 1; // draw or erase.
		if (the_mode === 'erase') {
			input_value = 0;
		}

		// put positions data in image object.
		for (var i = position_array.length - 1; i >= 0; i--) {
			var tmp_x = position_array[i][0];
			var tmp_y = position_array[i][1];
			var tmp_z = position_array[i][2];

			if (typeof target_position_data[tmp_z] != 'object') {
				target_position_data[tmp_z] = new Uint8Array(tmp_series.size.X * tmp_series.size.Y);
			}
			target_position_data[tmp_z][tmp_series.size.X * tmp_y + tmp_x] = input_value;
		}

	};

}














