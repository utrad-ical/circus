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
		init: HistoryEntry[];
		main: HistoryEntry[];
		redo: HistoryEntry[];
	};
	series: Series[];
	member: any[];
}

interface HistoryEntry {
	series: string;
	label: string; // label ID
	mode: string;
	position: [number, number, number][];
}

class voxelContainer {
	public name: string;

	constructor(name: string) {
		this.name = name;
	}

	public data: VoxelContainerData = {
		history: {
			init: [],
			main: [],
			redo: []
		},
		series: [],
		member: [] //list of id of the viewer that uses this container.
	};


	/**
	 * @param series_id Series ID
	 * @param label_id Label ID
	 * @param mode 'pen' or 'erase'
	 * @param position_array array of positions of one stroke ([x1,y1,z1],[x2,y2,z2])
	 */
	public addHistory(series_id: string, label_id: string, mode: string, position_array: any[]) {
		//one stroke positions data object.
		let step: HistoryEntry = {
			series: series_id,
			label: label_id,
			mode: mode,
			position: []
		};

		for (let i = position_array.length - 1; i >= 0; i--) {
			step.position[i] = [
				position_array[i][0],
				position_array[i][1],
				position_array[i][2]
			];
		}

		this.data.history.main.push(step);

		//remove Redo history when the new stroke is put.
		this.data.history.redo = [];

	}


	public addLoadedData(series_id, label_id, mode, position_array) {
		//put loaded data into container
		//this function is used to after page loading.

		//one stroke positions data object.
		let tmp_step_obj: HistoryEntry = {
			series: series_id,
			label: label_id,
			mode: mode,
			position: []
		};

		let tmp_series = this.getSeriesObjectById(series_id);

		for (let i = position_array.length - 1; i >= 0; i--) {
			if (typeof position_array[i] !== 'undefined') {
				let this_slice = position_array[i];
				for (let j = this_slice.length - 1; j > -1; j--) {
					if (this_slice[j] == 1) {
						let tmp_x = j % tmp_series.size.X;
						let tmp_y = j / tmp_series.size.Y;
						tmp_y = Math.floor(tmp_y);
						tmp_step_obj.position.push([tmp_x, tmp_y, i]);
					}
				}
			}
		}
		this.data.history.init.push(tmp_step_obj);
	}


	public addLabel(series_id, label_id, position_array?) {
		let tmp_position_array = [];
		if (typeof position_array === 'object') {
			tmp_position_array = position_array;
		}

		let tmp_label_obj = {
			id: label_id,
			position: tmp_position_array
		};

		let tmp_series = this.getSeriesObjectById(series_id);

		//if the series does not exist, create new series.
		if (typeof tmp_series === 'undefined') {
			this.addSeries(series_id);
		}
		let the_target_series = this.getSeriesObjectById(series_id);
		the_target_series.label.push(tmp_label_obj);
	}


	public addSeries(series_id) {
		let tmp_series_obj = {
			id: series_id,
			label: [],
			size: null
		};
		this.data.series.push(tmp_series_obj);
	}


	public changeLabelName(current_label_id, series_id, new_label_id) {
		//change the id of the Label object.
		let the_label = this.getLabelObjectById(current_label_id, series_id);
		the_label.id = new_label_id;

		// search labels that has the ID, in history arrays.
		// find to change.
		for (let i = 0; i < this.data.history.init.length; i++) {
			if (this.data.history.init[i].label == current_label_id) {
				this.data.history.init[i].label = new_label_id;
			}
		}

		for (let i = 0; i < this.data.history.main.length; i++) {
			if (this.data.history.main[i].label == current_label_id) {
				this.data.history.main[i].label = new_label_id;
			}
		}

		for (let i = 0; i < this.data.history.redo.length; i++) {
			if (this.data.history.redo[i].label == current_label_id) {
				this.data.history.redo[i].label = new_label_id;
			}
		}

	}


	public createSaveData(series_id, label_id) {
		let series = this.getSeriesObjectById(series_id);
		let label = this.getLabelObjectById(label_id, series_id);

		// default.
		let return_obj = {
			size: [0, 0, 0],
			offset: [0, 0, 0],
			image: ''
		};

		// if some positions are drawn, create data.
		if (typeof label === 'object') {

			//check all positions
			//decide the Maximum & Minimum of XYZ.
			let max_x = 0;
			let min_x = Number.MAX_VALUE;
			let max_y = 0;
			let min_y = Number.MAX_VALUE;
			let max_z = 0;
			let min_z = Number.MAX_VALUE;

			let this_series_x = series.size.X;

			// check Z index.
			for (let z = label.position.length - 1; z >= 0; z--) {
				let tmp_the_slice = label.position[z];
				if (typeof tmp_the_slice === 'object') {
					for (let i = tmp_the_slice.length - 1; i >= 0; i--) {
						if (tmp_the_slice[i] == 1) {
							let y = Math.floor(i / this_series_x);
							let x = i - this_series_x * y;

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

			let draw_w = max_x - min_x; // width of the PNG.
			let draw_h = max_y - min_y; // height of the 1 slice image.
			let draw_wh = draw_w * draw_h; // height of the PNG.

			return_obj.size[0] = draw_w; //width of the slice.
			return_obj.size[1] = draw_h; //height of the 1 slice image.

			let png_height = draw_h * return_obj.size[2]; //height of the PNG.

			//exchange Uint Array to 1 dimension.
			//each of the value in this array is zero. init
			let tmp_img_data = new Uint8Array(draw_w * png_height);

			for (let z = min_z; z < max_z; z++) {
				if (typeof label.position[z] === 'object') {
					let tmp_the_slice = label.position[z];
					for (let y = min_y; y < max_y; y++) {
						let pre_x = this_series_x * y;
						for (let x = min_x; x < max_x; x++) {
							let the_index = x - min_x + (y - min_y) * draw_w + (z - min_z) * draw_wh;
							tmp_img_data[the_index] = tmp_the_slice[x + pre_x];
						}
					}
				}
			}

			let gzip = new Zlib.Gzip(tmp_img_data);
			tmp_img_data = gzip.compress();

			let arrayBufferToBase64 = function (bytes) {
				let binary = '';
				let len = bytes.byteLength;
				for (let i = 0; i < len; i++) {
					binary += String.fromCharCode(bytes[i]);
				}
				return window.btoa(binary);
			};
			return_obj.image = arrayBufferToBase64(tmp_img_data);
		}
		return return_obj;

	}


	public deleteLabelObject(series_id, label_id) {
		let series = this.getSeriesObjectById(series_id);
		for (let j = series.label.length - 1; j >= 0; j--) {
			if (series.label[j].id == label_id) {
				series.label.splice(j, 1);
			}
		}
	}


	public getCurrentLabel(orientation, current_num) {
		// tmp_orientation : Current orientation
		// tmp_current_num : Current index number

		let return_array = [];
		for (let j = this.data.series.length - 1; j >= 0; j--) {
			let the_series = this.data.series[j];
			for (let i = the_series.label.length - 1; i >= 0; i--) {
				let position_array = this.returnSlice(
					the_series.id,
					the_series.label[i].id,
					orientation,
					current_num
				);
				return_array.push({
					series: the_series.id,
					label: the_series.label[i].id,
					position: position_array
				})
			}
		}
		return return_array;
	}


	public getLabelObjectById(label_id, series_id) {
		let the_series = this.getSeriesObjectById(series_id);

		for (let i = the_series.label.length - 1; i >= 0; i--) {
			if (the_series.label[i].id == label_id) {
				return the_series.label[i];
			}
		}
	}


	public getPositionDataFromImage(insertObject, series_w, series_h) {

		// create positions data from loaded data.
		// this function is used to run after Page load.

		let return_obj = [];

		let the_series_w = 512;
		let the_series_h = 512;

		if (typeof series_w === 'number') {
			the_series_w = Math.floor(series_w);
		}

		if (typeof series_h === 'number') {
			the_series_h = Math.floor(series_h);
		}

		if (typeof insertObject.image !== 'undefined' && insertObject.image != 'error') {
			let arrayBufferFromBase64 = function (base64string) {
				let binary = window.atob(base64string);
				let return_array = [];
				for (let i = 0; i < binary.length; i++) {
					return_array.push(binary.charCodeAt(i));
				}
				return return_array;
			}; // arrayBufferFromBase64

			let tmp_img_data = arrayBufferFromBase64(insertObject.image);
			let gunzip = new Zlib.Gunzip(tmp_img_data);
			tmp_img_data = gunzip.decompress(); //uint8Array
			let insertImgSlice_wh = insertObject.size[0] * insertObject.size[1];

			for (let i = 0; i < tmp_img_data.length; i++) {
				// check only drawn positions
				if (tmp_img_data[i] == 1) {
					let the_index = i;
					// calculate the position in PNG.
					let the_position_y = Math.floor(the_index / insertObject.size[0]);
					let the_position_x = the_index - the_position_y * insertObject.size[0];

					// Positions that the PNGs are sliced by axial plane & are superimposed.
					let slice_z = Math.floor(the_index / insertImgSlice_wh);
					let slice_y = the_position_y - slice_z * insertObject.size[1];
					let slice_x = the_position_x;

					//positions in UintArray
					let true_z = slice_z + insertObject.offset[2];
					let true_y = slice_y + insertObject.offset[1];
					let true_x = slice_x + insertObject.offset[0];

					if (typeof return_obj[true_z] !== 'object') {
						return_obj[true_z] = new Uint8Array(the_series_w * the_series_h);
					}
					return_obj[true_z][the_series_w * true_y + true_x] = 1;
				}
			}
		}

		return return_obj;
	}


	public getSeriesObjectById(series_id): Series {
		for (let i = this.data.series.length - 1; i >= 0; i--) {
			if (this.data.series[i].id == series_id) {
				return this.data.series[i];
			}
		}
	}


	public historyBack() {
		let history = this.data.history;
		if (history.main.length > 0) {
			//put the last one stroke to Redo history array.
			let tmp_move_array = {};
			$.extend(true, tmp_move_array, history.main[history.main.length - 1]);
			history.redo.push(<HistoryEntry>tmp_move_array);
			history.main.splice(history.main.length - 1, 1);

			//clear all labels.
			for (let i = this.data.series.length - 1; i >= 0; i--) {
				for (let j = this.data.series[i].label.length - 1; j >= 0; j--) {
					this.data.series[i].label[j].position = [];
				}
			}

			//draw preload drawn data.
			for (let i = history.init.length - 1; i >= 0; i--) {
				let this_history = history.init[i];
				this.updateVoxel(
					this_history.series,
					this_history.label,
					this_history.mode,
					this_history.position
				);
			}

			//redraw the Main history.
			for (let i = 0; i < history.main.length; i++) {
				let this_history = history.main[i];
				this.updateVoxel(
					this_history.series,
					this_history.label,
					this_history.mode,
					this_history.position
				);
			}
		}
	}


	public historyRedo() {
		let history = this.data.history;
		if (history.redo.length > 0) {
			let tmp_move_array = new Object();
			$.extend(true, tmp_move_array, history.redo[history.redo.length - 1]);
			history.main.push(<HistoryEntry>tmp_move_array);
			history.redo.splice(history.redo.length - 1, 1);

			//clear all labels.
			for (let i = this.data.series.length - 1; i >= 0; i--) {
				for (let j = this.data.series[i].label.length - 1; j >= 0; j--) {
					this.data.series[i].label[j].position = [];
				}
			}

			//draw preload drawn data.
			for (let i = history.init.length - 1; i >= 0; i--) {
				let this_history = history.init[i];
				this.updateVoxel(
					this_history.series,
					this_history.label,
					this_history.mode,
					this_history.position
				);
			}

			//re-draw the Main history.
			for (let i = 0; i < history.main.length; i++) {
				let this_history = history.main[i];
				this.updateVoxel(
					this_history.series,
					this_history.label,
					this_history.mode,
					this_history.position
				);
			}
		}
	}


	public insertLabelData(insert_obj) {
		// insert Label data directory
		// this function is call for insert loaded Label data into container

		for (let i = 0; i < insert_obj.length; i++) {
			let tmp_series = insert_obj[i];
			let series_w = tmp_series.voxel.x;
			let series_h = tmp_series.voxel.y * tmp_series.voxel.voxel_y / tmp_series.voxel.voxel_x;

			if (typeof tmp_series.label === 'object') {
				for (let j = 0; j < tmp_series.label.length; j++) {
					let tmp_label = tmp_series.label[j];
					let position_data = this.getPositionDataFromImage(tmp_label, series_w, series_h);
					this.addLabel(tmp_series.id, tmp_label.id, position_data);

					//put loaded data into History object.
					this.addLoadedData(tmp_series.id, tmp_label.id, 'pen', position_data);
				}
			}
		}
	}


	public returnSlice(series_id, label_id, tmp_orientation, tmp_current_num) {

		let return_array = [];
		let tmp_target_series = this.getSeriesObjectById(series_id);
		let voxel_x = tmp_target_series.size.X;

		let tmp_target_label = this.getLabelObjectById(label_id, series_id);

		//get the array of the positions that should be drawn.(the positions are voxel XYZ unit.)
		if (tmp_orientation === 'axial') {
			// Z axis means index number.
			if (typeof tmp_target_label.position[tmp_current_num] !== 'undefined') {
				let the_data = tmp_target_label.position[tmp_current_num];

				for (let i = the_data.length - 1; i >= 0; i--) {
					if (the_data[i] == 1) {
						let tmp_y = Math.floor(i / voxel_x);
						let tmp_x = i - tmp_y * voxel_x;
						return_array.push([tmp_x, tmp_y, tmp_current_num]);
					}
				}
			}
		} else if (tmp_orientation === 'coronal') {
			// Y axis means index number.
			for (let i = tmp_target_label.position.length - 1; i >= 0; i--) {
				//check all slice
				if (typeof tmp_target_label.position[i] !== 'undefined') {
					let the_data = tmp_target_label.position[i];
					// check only positions that the Y hits the index
					for (let j = voxel_x * tmp_current_num; j < voxel_x * (tmp_current_num + 1); j++) {
						let this_y = Math.floor(j / voxel_x);
						let this_x = j - voxel_x * this_y;
						if (the_data[j] == 1 && this_y == tmp_current_num) {
							return_array.push([this_x, this_y, i]);
						}
					}
				}
			}
		} else if (tmp_orientation === 'sagittal') {
			// X axis means index number.
			for (let i = tmp_target_label.position.length - 1; i >= 0; i--) {
				//check all slice
				if (typeof tmp_target_label.position[i] !== 'undefined') {
					let the_data = tmp_target_label.position[i];
					// check only positions that the X hits the index
					for (let j = tmp_current_num; j < the_data.length; j = j + voxel_x) {
						let this_y = Math.floor(j / voxel_x);
						let this_x = j - voxel_x * this_y;
						if (the_data[j] == 1 && this_x == tmp_current_num) {
							return_array.push([this_x, this_y, i]);
						}
					}
				}
			}
		}
		return return_array;

	}


	public setSize(series_id, the_x, the_y, the_z) {
		let tmp_series = this.getSeriesObjectById(series_id);

		let tmp_x = Math.floor(the_x);
		let tmp_y = Math.floor(the_y);
		let tmp_z = Math.floor(the_z);

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
	}


	public updateVoxel(series_id, label_id, the_mode, position_array) {
		if (typeof this.getSeriesObjectById(series_id) !== 'object') {
			this.addSeries(series_id);
		}
		let tmp_series = this.getSeriesObjectById(series_id);

		let tmp_target_label = this.getLabelObjectById(label_id, series_id);
		if (typeof tmp_target_label !== 'object') {
			this.addLabel(series_id, label_id);
		}
		tmp_target_label = this.getLabelObjectById(label_id, series_id);

		let target_position_data = tmp_target_label.position;

		let input_value = 1; // draw or erase.
		if (the_mode === 'erase') {
			input_value = 0;
		}

		// put positions data in image object.
		for (let i = position_array.length - 1; i >= 0; i--) {
			let tmp_x = position_array[i][0];
			let tmp_y = position_array[i][1];
			let tmp_z = position_array[i][2];

			if (typeof target_position_data[tmp_z] !== 'object') {
				target_position_data[tmp_z] = new Uint8Array(tmp_series.size.X * tmp_series.size.Y);
			}
			target_position_data[tmp_z][tmp_series.size.X * tmp_y + tmp_x] = input_value;
		}

	}

}

