var voxelContainer = function (n) {
  this.name = n;
}





//コンテナオブジェクトに新しいヒストリを追加
voxelContainer.prototype.addHistory = function (series_id, label_id, the_mode, position_array) {

  /*
   第1引数 : １筆分の座標情報群 ( [x,y,z] が塗られたマスの分だけわたってくる)
   第2引数 : 対象ラベル
   第3引数 : 描画か消しゴムか (pen / erase)
   */

  var this_obj = this;
  var this_data = this_obj.data;

  //1筆の中での重複は除外する
  //1筆分をヒストリーに格納
  //ヒストリーに渡すためのオブジェクト用意
  var tmp_step_obj = {
    series: series_id,
    label: label_id,
    mode: the_mode,
    position: []
  }; //１筆分の描画オブジェクトの入れ物


  for (var i = position_array.length - 1; i >= 0; i--) {
    tmp_step_obj.position[i] = [
      position_array[i][0],
      position_array[i][1],
      position_array[i][2]
    ];
  }

  this_data.history.main.push(tmp_step_obj);
  this_data.history.redo = []; //新しい記述をした時点でredoは除去

};//addHistory





voxelContainer.prototype.addLoadedData = function (series_id, label_id, the_mode,position_array) {
	//ページロード時点ですでに描かれていたものを格納
  var this_obj = this;
  var this_data = this_obj.data;

  //1筆分をヒストリーに格納,1筆の中での重複は除外する
  //ヒストリーに渡すためのオブジェクト用意
  var tmp_step_obj = {
    series: series_id,
    label: label_id,
    mode: the_mode,
    position: []
  }; //１筆分の描画オブジェクトの入れ物

  var tmp_series = this_obj.getSeriesObjectById(series_id);

  for (var i = position_array.length - 1; i >= 0; i--) {
    if(typeof position_array[i] != 'undefined'){
      var this_slice = position_array[i];
      for(var j =this_slice.length-1; j>-1; j--){
        if(this_slice[j] ==1){
          var tmp_x = j%tmp_series.size.X;
          var tmp_y = j/tmp_series.size.Y;
          tmp_y = Math.floor(tmp_y);
          tmp_step_obj.position.push([tmp_x,tmp_y,i]);
        }
      }
    }
  }
  this_data.history.init.push(tmp_step_obj);

};//addHistory





//ラベル追加、positionsがあればそれを追加
voxelContainer.prototype.addLabel = function (series_id, label_id, position_array) {
  var this_obj = this;
  var this_data = this_obj.data;

  var tmp_position_array = [];
  if (typeof position_array == 'object') {
    tmp_position_array = position_array;
  }

  var tmp_label_obj = {
    id: label_id,
    position: tmp_position_array
  }

  var tmp_series = this_obj.getSeriesObjectById(series_id);

  //シリーズがなかったらそのシリーズを作る
  if (typeof tmp_series == 'undefined') {
    this_obj.addSeries(series_id);
  }
  var the_target_series = this_obj.getSeriesObjectById(series_id);
  the_target_series.label.push(tmp_label_obj);

};//addLabel





voxelContainer.prototype.addSeries = function (series_id) {
  var this_obj = this;
  var this_data = this_obj.data;
  var tmp_series_obj = {
    id: series_id,
    label: []
  }
  this_data.series.push(tmp_series_obj);
};//addSeries





voxelContainer.prototype.changeLabelName = function (current_label_id, series_id,new_label_id){
  var this_obj = this;
  var this_data = this_obj.data;

  //ラベルオブジェクトのidを差し替え
  var the_label = this_obj.getLabelObjectById(current_label_id, series_id);
  the_label.id = new_label_id;

  //積まれているヒストリーの中身も調査してラベル名を変更
  for(var i=0; i<this_data.history.init.length; i++){
    if(this_data.history.init[i].label == current_label_id){
      this_data.history.init[i].label = new_label_id;
    }
  }

  for(var i=0; i<this_data.history.main.length; i++){
    if(this_data.history.main[i].label == current_label_id){
      this_data.history.main[i].label = new_label_id;
    }
  }

  for(var i=0; i<this_data.history.redo.length; i++){
    if(this_data.history.redo[i].label == current_label_id){
      this_data.history.redo[i].label = new_label_id;
    }
  }

};//changeLabelName





voxelContainer.prototype.createSaveData = function(series_id, label_id) {
  var this_obj = this;
  var this_data = this_obj.data;
  var the_series = this_obj.getSeriesObjectById(series_id);
  var the_label = this_obj.getLabelObjectById(label_id, series_id);

  //デフォルト。まだ何も描かれていないときはこれがそのまま返る
  var return_obj = {
    size: [0, 0, 0],
    offset: [0, 0, 0],
    image: []
  }

  //描かれている者があればそれを反映する
  if (typeof the_label == 'object') {

    //まずは全面の全マスを見てxyz最大・最小を求める
    var max_x = 0;
    var min_x = Number.MAX_VALUE;
    var max_y = 0;
    var min_y = Number.MAX_VALUE;
    var max_z = 0;
    var min_z = Number.MAX_VALUE;

    var this_series_x = the_series.size.X;

    //z面を全部見る
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

    //面はあっても全て消されていた場合,1枚も描かれていなかった場合等
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

    //最大最小の計三個まで
    var draw_w = max_x - min_x; //書き出すpngの横幅
    var draw_h = max_y - min_y; //書き出すpngのz断面グループ1枚あたりの高さ。書き出しpngの高さはこれにnumberをかけたもの
    var draw_wh = draw_w * draw_h;

    return_obj.size[0] = draw_w; //スライス横幅 = 生成画像の幅
    return_obj.size[1] = draw_h; //スライス１まいごとの高さ

    var png_height = draw_h * return_obj.size[2]; //生成画像のトータル高さ

    //uintArrayを1次元に変換,初期は全マスを0で埋める
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

    var arrayBufferToBase64 = function(bytes) {
      var binary = '';
      var len = bytes.byteLength;
      for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    }
    return_obj.image = arrayBufferToBase64(tmp_img_data);
  }
  return return_obj;

}; //createSaveData





voxelContainer.prototype.deleteLabelObject = function (series_id, label_id) {
  var this_obj = this;
  var this_data = this_obj.data;

  var the_series = this_obj.getSeriesObjectById(series_id);
  for (var j = 0; j < the_series.label.length; j++) {
    if (the_series.label[j].id == label_id) {
      the_series.label.splice(j, 1);
    }
  }
};//deleteLabelObject





//実データ格納オブジェクト
voxelContainer.prototype.data = {
  history: {
    init: [],
    main: [],
    redo: []
  },

  series: [
    /*
     {
     id : '',
     label : [
     {id:'',positions: object }
     ]
     size : {
     x:0,
     y:0,
     z:0
     }
     }
     */
  ],
  member: [] //共有しているビューアーの要素id一覧
};//data





voxelContainer.prototype.getCurrentLabel = function (tmp_orientation, tmp_current_num) {
  //現在のorientation,奥行枚数ですでに描画されているラベルの情報を返す
  var this_obj = this;
  var this_data = this_obj.data;
  var return_array = [];
  for (var j = this_obj.data.series.length - 1; j >= 0; j--) {
    var the_series = this_obj.data.series[j];
    for (var i = the_series.label.length - 1; i >= 0; i--) {
      var position_array = this_obj.returnSlice(
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
};





voxelContainer.prototype.getLabelObjectById = function (label_id, series_id) {
  var this_obj = this;
  var this_data = this_obj.data;
  var the_series = this_obj.getSeriesObjectById(series_id);

  for (var i = the_series.label.length - 1; i >= 0; i--) {
    if (the_series.label[i].id == label_id) {
      return the_series.label[i];
    }
  }
};//getLabelObjectById





voxelContainer.prototype.getPositionDataFromImage = function (insertObject, series_w, series_h) {

  //初期ロード時等、画像データからpositionデータを生成する
  var this_obj = this;
  var this_data = this_obj.data;
  var return_obj = [];

  var the_series_w = 512;
  var the_series_h = 512;

  if (typeof series_w == 'number') {
    the_series_w = series_w;
  }

  if (typeof series_h == 'number') {
    the_series_h = series_h;
  }

	if(typeof insertObject.image != 'undefined' && insertObject.image != 'error'){
		var arrayBufferFromBase64 = function( base64string ) {
			var binary = window.atob( base64string );
			var return_array = [];
			for(var i=0; i<binary.length; i++){
					return_array.push(binary.charCodeAt(i));
					}
			return return_array;
		}//arrayBufferFromBase64

		var tmp_img_data = arrayBufferFromBase64( insertObject.image );
		var gunzip = new Zlib.Gunzip(tmp_img_data);
		tmp_img_data = gunzip.decompress(); //uint8Array
		var insertImgSlice_wh = insertObject.size[0]*insertObject.size[1];

		for (var i = 0; i < tmp_img_data.length ; i++) {
			//塗られているマスだけに着目
			if (tmp_img_data[i] == 1) {
				var the_index = i;
				//このマスが投入画像の中でどの座標に位置するか
				var the_position_y = Math.floor(the_index / insertObject.size[0]);
				var the_position_x = the_index - the_position_y * insertObject.size[0];

				//投入画像をaxial面でスライスして重ねたと仮定した座標
				var slice_z = Math.floor(the_index / insertImgSlice_wh);
				var slice_y = the_position_y - slice_z * insertObject.size[1];
				var slice_x = the_position_x;

				//uintArrayでの座標
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
};//getPositionDataFromImage





voxelContainer.prototype.getSeriesObjectById = function (series_id) {
  var this_obj = this;
  var this_data = this_obj.data;

  for (var i = this_data.series.length - 1; i >= 0; i--) {
    if (this_data.series[i].id == series_id) {
      return this_data.series[i];
    }
  }
};//getSeriesObjectById





voxelContainer.prototype.historyBack = function () {
  var this_obj = this;
  var this_data = this_obj.data;

  if (this_data.history.main.length > 0) {
    //最後の1手順分をRedo用配列に移動
    var tmp_move_array = new Object();
    $.extend(true, tmp_move_array, this_data.history.main[this_data.history.main.length - 1]);
    this_data.history.redo.push(tmp_move_array);
    this_data.history.main.splice(this_data.history.main.length - 1, 1);

    //全てのラベルを空にする
    for (var i = this_obj.data.series.length - 1; i >= 0; i--) {
      for (var j = this_obj.data.series[i].label.length - 1; j >= 0; j--) {
        this_obj.data.series[i].label[j].position = [];
      }
    }

    //ロード時点で読み込まれていたデータをまず描画
    for (var i = this_data.history.init.length - 1; i >= 0; i--) {
      var this_history = this_data.history.init[i];
      this_obj.updateVoxel(
        this_history.series,
        this_history.label,
        this_history.mode,
        this_history.position
      );
    }

    //今現在のメインヒストリ配列の内容で再構築
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
};//historyBack





voxelContainer.prototype.historyRedo = function () {
  var this_obj = this;
  var this_data = this_obj.data;
  if (this_data.history.redo.length > 0) {
    var tmp_move_array = new Object();
    $.extend(true, tmp_move_array, this_data.history.redo[this_data.history.redo.length - 1]);
    this_data.history.main.push(tmp_move_array);
    this_data.history.redo.splice(this_data.history.redo.length - 1, 1);

    //全てのラベルを空にする
    for (var i = this_obj.data.series.length - 1; i >= 0; i--) {
      for (var j = this_obj.data.series[i].label.length - 1; j >= 0; j--) {
        this_obj.data.series[i].label[j].position = [];
      }
    }

    //ロード時点で読み込まれていたデータを描画
    for (var i = this_data.history.init.length - 1; i >= 0; i--) {
      var this_history = this_data.history.init[i];
      this_obj.updateVoxel(
        this_history.series,
        this_history.label,
        this_history.mode,
        this_history.position
      );
    }

    //今現在のメインヒストリ配列の内容で再構築
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
};//historyRedo





voxelContainer.prototype.insertLabelData = function (insert_obj) {
  // insert Label data directry
  // this function is call for insert loaded Label data into container

  var this_obj = this;
  var this_data = this_obj.data;

  for (var i = 0; i < insert_obj.length; i++) {
    var tmp_series = insert_obj[i];
    var series_w = tmp_series.voxel.x;
    var series_h = tmp_series.voxel.y * tmp_series.voxel.voxel_y / tmp_series.voxel.voxel_x;

    if (typeof tmp_series.label == 'object') {
      for (var j = 0; j < tmp_series.label.length; j++) {
        var tmp_label = tmp_series.label[j];
        var position_data = this_obj.getPositionDataFromImage(tmp_label, series_w, series_h);
        this_obj.addLabel(tmp_series.id, tmp_label.id, position_data);

        //put loaded data into History object.
        this_obj.addLoadedData(tmp_series.id,tmp_label.id,'pen',position_data);
      }
    }
  }
};//insertLabelData





voxelContainer.prototype.returnSlice = function (series_id, label_id, tmp_orientation, tmp_current_num) {

  var this_obj = this;
  var this_data = this_obj.data;
  var return_array = [];
  var tmp_target_series = this_obj.getSeriesObjectById(series_id);
  var voxel_x = tmp_target_series.size.X;

  //対象ラベル取得
  var tmp_target_label = this_obj.getLabelObjectById(label_id, series_id);

  //各面で描くべき座標を返す(座標自体はvoxel XYZ座標)
  if (tmp_orientation == 'axial') {
    //axialのときはZが奥行に相当する

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
    //coronalのときはyが奥行に相当する
    for (var i = tmp_target_label.position.length - 1; i >= 0; i--) { //z軸
      //各断面を調査
      if (typeof tmp_target_label.position[i] != 'undefined') {
        var the_data = tmp_target_label.position[i];
        //目当てのy座標の項目に該当するものだけ調査
        for (var j = voxel_x * tmp_current_num; j < voxel_x * (tmp_current_num + 1); j++) {
          var this_y = Math.floor(j / voxel_x);
          var this_x = j - voxel_x * this_y;
          if (the_data[j] == 1 && this_y == tmp_current_num) {
            return_array.push([this_x, this_y, i]);
          }
        }
      }
    }
  } else if (tmp_orientation == 'sagittal') {
    //sagittalのときはxが奥行に相当する
    for (var i = tmp_target_label.position.length - 1; i >= 0; i--) { //z軸
      //各断面を調査
      if (typeof tmp_target_label.position[i] != 'undefined') {
        var the_data = tmp_target_label.position[i];
        //目当てのx座標の項目に該当するものだけ調査
        for (var j = tmp_current_num; j < the_data.length; j = j + voxel_x) {
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

};//returnSlice





voxelContainer.prototype.setSize = function (series_id, the_x, the_y, the_z) {
  var this_obj = this;
  var this_data = this_obj.data;
  var tmp_series = this_obj.getSeriesObjectById(series_id);

  if (typeof tmp_series != 'object') {
    tmp_series = new Object();
    tmp_series.id = series_id;
    tmp_series.label = [];
    tmp_series.size = {
      X: the_x,
      Y: the_y,
      Z: the_z
    }
    this_data.series.push(tmp_series);
  } else {
    tmp_series.size = {
      X: the_x,
      Y: the_y,
      Z: the_z
    }
  }
};//setSize





voxelContainer.prototype.updateVoxel = function (series_id, label_id, the_mode, position_array) {
  var this_obj = this;
  var this_data = this_obj.data;

  //該当ラベルが無い場合は今回追加されたラベル用に配列を生成
  var add_flg = true;

  //対象シリーズ取得
  if (typeof this_obj.getSeriesObjectById(series_id) != 'object') {
    this_obj.addSeries(series_id, label_id);
  }
  var tmp_series = this_obj.getSeriesObjectById(series_id);

  //対象ラベル取得
  var tmp_target_label = this_obj.getLabelObjectById(label_id, series_id);
  if (typeof tmp_target_label != 'object') {
    this_obj.addLabel(series_id, label_id);
  }
  tmp_target_label = this_obj.getLabelObjectById(label_id, series_id);

  var target_position_data = tmp_target_label.position;

  //座標情報をimageオブジェクトに格納
  var input_value = 1;
  if (the_mode == 'erase') {
    input_value = 0;
  }

  for (var i = position_array.length - 1; i >= 0; i--) {
    var tmp_x = position_array[i][0];
    var tmp_y = position_array[i][1];
    var tmp_z = position_array[i][2];

    if (typeof target_position_data[tmp_z] != 'object') {
      target_position_data[tmp_z] = new Uint8Array(tmp_series.size.X * tmp_series.size.Y);
    }
    target_position_data[tmp_z][tmp_series.size.X * tmp_y + tmp_x] = input_value;
  }

};//updateVoxel
