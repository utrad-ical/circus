var voxelContainer = function(n){
  this.name = n;
}



//コンテナオブジェクトに新しいヒストリを追加
voxelContainer.prototype.addHistory = function(series_id,label_id,the_mode,position_array){

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
		series : series_id,
		label : label_id ,
		mode : the_mode ,
		position : new Array(0)
	}; //１筆分の描画オブジェクトの入れ物


	for(var i=position_array.length-1; i>=0; i--){
		tmp_step_obj.position[i] = [
			position_array[i][0],
			position_array[i][1],
			position_array[i][2]
		];
	}
	this_data.history.main.push(tmp_step_obj);
	this_data.history.redo = new Array(0); //新しい記述をした時点でredoは除去

};/*addHistory*/





//ラベル追加、positionsがあればそれを追加
voxelContainer.prototype.addLabel = function(series_id,label_id,position_array){
	var this_obj = this;
	var this_data = this_obj.data;
	
	var tmp_position_array =  new Array(0);
	if(typeof position_array == 'object'){
		tmp_position_array =  position_array;
	}
	
	
	var tmp_label_obj = {
		id : label_id,
		position : tmp_position_array
	}
	
	var tmp_series = this_obj.getSeriesObjectById(series_id);
	
	//シリーズがなかったらそのシリーズを作る
	if(typeof tmp_series == 'undefined'){	
		this_obj.addSeries(series_id);
	}
	var the_target_series =this_obj.getSeriesObjectById(series_id);
	the_target_series.label.push(tmp_label_obj);
 
};/*addLabel*/





//ラベル追加、positionsがあればそれを追加
voxelContainer.prototype.addSeries = function(series_id){
	var this_obj = this;
	var this_data = this_obj.data;
	var tmp_series_obj = {
		id : series_id,
		label : new Array(0)
	}
	this_data.series.push(tmp_series_obj); 
};





//保存用データ生成
voxelContainer.prototype.createSaveData = function(series_id,label_id){
	var this_obj = this;
	var this_data = this_obj.data;
	var the_series = this_obj.getSeriesObjectById(series_id);
	var the_label = this_obj.getLabelObjectById(label_id,series_id);
	
	//デフォルト。まだ何も描かれていないときはこれがそのまま返る
	var return_obj = {
		size : [0,0,0],
		offset : [0,0,0],
		image : new Array(0)
	}

	//描かれている者があればそれを反映する
	if(typeof the_label =='object'){

		/*
			var dumy_canvas_elm = document.getElementById('dummy_canvas');
			var dummy_canvas_ctx = dumy_canvas_elm.getContext("2d");
			var tmp_img_data = dummy_canvas_ctx.createImageData(2,2); 
			return_obj = dumy_canvas_elm.toDataURL();
		*/

		//まずは全面の全マスを見てxyz最大・最小を求める
		var max_x=0;
		var min_x=Number.MAX_VALUE;
		var max_y=0;
		var min_y=Number.MAX_VALUE;
		var max_z=0;
		var min_z=Number.MAX_VALUE;
		
		var this_series_x = the_series.size.X;
		
		//z面を全部見る
		for(var z=the_label.position.length-1;  z>=0; z--){
			var tmp_the_slice = the_label.position[z];
			if(typeof tmp_the_slice =='object'){
				for(var i = tmp_the_slice.length-1; i>=0; i--){
					if(tmp_the_slice[i] == 1){
						var y = Math.floor(i/this_series_x);
						var x = i- this_series_x*y;
						
						max_x = Math.max(max_x,x);
						max_y = Math.max(max_y,y);
						max_z = Math.max(max_z,z);
						
						min_x = Math.min(min_x,x);
						min_y = Math.min(min_y,y);
						min_z = Math.min(min_z,z);
					}				
				}
			}
		}
		
		//面はあっても全て消されていた場合,1枚も描かれていなかった場合等
		if(min_z==Number.MAX_VALUE){
			return_obj.size[2] =0;
			min_x = 0;
			min_y = 0;
			min_z = 0;
		}

		max_x++;
		max_y++;
		max_z++;

		return_obj.size[2] = max_z - min_z;
		return_obj.offset = [min_x,min_y,min_z];

		//最大最小の計三個個まで
		//imaga描画ここから
		var draw_w = max_x-min_x;//書き出すpngの横幅
		var draw_h = max_y-min_y;//書き出すpngのz断面グループ1枚あたりの高さ。書き出しpngの高さはこれにnumberをかけたもの
		
		return_obj.size[0] = draw_w;
		return_obj.size[1] = draw_h;
		
		var png_height = draw_h*return_obj.size[2];

		//書き出しのための一時的キャンバス・imageオブジェクト生成
		var dumy_canvas_elm = document.getElementById('dummy_canvas');
		dumy_canvas_elm.style.display = 'none';
		dumy_canvas_elm.setAttribute('width',draw_w);
		dumy_canvas_elm.setAttribute('height',png_height);
		var dummy_canvas_ctx = dumy_canvas_elm.getContext('2d');
		var tmp_img_data = dummy_canvas_ctx.createImageData(draw_w,png_height);
		console.log(draw_w,png_height);

		//まずはデータを全て透明にする
		for(var i=tmp_img_data.data.length-1; i>0; i--){
			tmp_img_data.data[i] = 0;
		}
		
		//uintArrayを1次元に変換
		for(var z=min_z;  z<max_z; z++){
			var tmp_the_slice = the_label.position[z];
			if(typeof tmp_the_slice =='object'){
				for(var i =tmp_the_slice.length-1; i>=0; i--){
					var y = Math.floor(i/this_series_x);
					var x = i- this_series_x*y;
					
					var this_x = x-min_x; 
					var this_y = y-min_y;
					var this_z = z-min_z;
					var the_index = 4*(this_x+ this_y*draw_w + this_z*draw_w*draw_h);

					//いずれにしてもアルファ値はmax
					tmp_img_data.data[the_index+3] = 255;
					if(tmp_the_slice[i] == 1){
						//描画されていた箇所のみ白塗り
						tmp_img_data.data[the_index+2] = 255;
						tmp_img_data.data[the_index+1] = 255;
						tmp_img_data.data[the_index] = 255;
					}
				}
			}
		}
		dummy_canvas_ctx.putImageData(tmp_img_data,0,0);

		return_obj.image  = dumy_canvas_elm.toDataURL();
		console.log(return_obj.image);
	}
	return return_obj;
	
};





//ラベル削除
voxelContainer.prototype.deleteLabelObject = function(series_id,label_id){
	var this_obj = this;
	var this_data = this_obj.data;
	
	var the_series =this_obj.getSeriesObjectById(series_id);
	for(var j=0; j<the_series.label.length; j++){
	if(the_series.label[j].id ==label_id){
		the_series.label.splice(j,1);
	}
	}
};/*deleteLabel*/





//実データ格納オブジェクト
voxelContainer.prototype.data = {
	history : {
		main : new Array(0),
		redo : new Array(0)
	},
	
	series : [
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
	member : new Array(0) //共有しているビューアーの要素id一覧
};/*data*/





/*現在のorientation,奥行枚数ですでに描画されているラベルの情報を返す*/
voxelContainer.prototype.getCurrentLabel = function(tmp_orientation,tmp_current_num){
	var this_obj = this;
	var this_data = this_obj.data;
	var return_array = new Array(0);
	for(var j = this_obj.data.series.length-1; j>=0; j--){
		var the_series = this_obj.data.series[j];
		for(var i = the_series.label.length-1; i>=0; i--){
			var position_array = this_obj.returnSlice(
			 the_series.id,
			 the_series.label[i].id,
			 tmp_orientation,
			 tmp_current_num
			);
			return_array.push({
			 'series' : the_series.id,
			 'label' : the_series.label[i].id,
			 'position' : position_array
			})
		}
	}
	return return_array;
};





voxelContainer.prototype.getLabelObjectById = function(label_id,series_id){
	var this_obj = this;
	var this_data = this_obj.data;
	var the_series =this_obj.getSeriesObjectById(series_id);

	for(var i = the_series.label.length-1; i>=0; i--){
		if(the_series.label[i].id ==label_id){
			return the_series.label[i];
		}
	}
};/*getLabelObjectById*/




voxelContainer.prototype.getPositionDataFromImage = function(insertObject,series_w,series_h){
	//初期ロード時等、画像データからpositionデータを生成する
	var this_obj = this;
	var this_data = this_obj.data;
	var return_obj = new Array(0);
	
	var the_series_w = 512;
	var the_series_h = 512;
	
	if(typeof series_w == 'number'){
		the_series_w = series_w;
	}

	if(typeof series_h == 'number'){
		the_series_h = series_h;
	}

	var tmp_img = new Image();
	tmp_img.src = insertObject.image;
	
	var img_original_w =tmp_img.width;
	var img_original_h =tmp_img.height;

	//書き出しのための一時的キャンバス・imageオブジェクト生成
	var dumy_canvas_elm = document.getElementById('dummy_canvas');
	dumy_canvas_elm.style.display = 'none';
	dumy_canvas_elm.setAttribute('width',img_original_w);
	dumy_canvas_elm.setAttribute('height',img_original_h);
	var dummy_canvas_ctx = dumy_canvas_elm.getContext('2d');

	
	dummy_canvas_ctx.drawImage(tmp_img,0,0,img_original_w,img_original_h)
	var tmp_image_data = dummy_canvas_ctx.getImageData(0,0,img_original_w,img_original_h);

	for(var i=3; i<tmp_image_data.data.length+1; i=i+4){
		//塗られているマスだけに着目
	//console.log(tmp_image_data.data[i-1]);
		if(tmp_image_data.data[i-1]==255){
			var the_index = (i-3)/4;
			//このマスが投入画像の中でどの座標に位置するか
			var the_position_y = Math.floor(the_index / insertObject.size[0]);
			var the_position_x = the_index-the_position_y*insertObject.size[0];
	
			//投入画像をaxial面でスライスして重ねたと仮定した座標
			var slice_z = Math.floor(the_position_y/ insertObject.size[1]);
			var slice_y = the_position_y - slice_z*insertObject.size[1];
			var slice_x = the_position_x;
		
			//uintArrayでの座標
			var true_z = slice_z + insertObject.offset[2];
			var true_y = slice_y + insertObject.offset[1];
			var true_x = slice_x + insertObject.offset[0];

			if(typeof return_obj[true_z] != 'object'){
				return_obj[true_z] = new Uint8Array(the_series_w*the_series_h);
			}
			return_obj[true_z][the_series_w*true_y +true_x] = 1;
		}
	}
	
	return return_obj;
};/*getPositionDataFromImage*/




voxelContainer.prototype.getSeriesObjectById = function(series_id){		
	var this_obj = this;
	var this_data = this_obj.data;

	for(var i = this_data.series.length-1; i>=0; i--){
		if(this_data.series[i].id == series_id){
			return this_data.series[i];
		}
	}
};/*getSeriesObjectById*/





/*ひとつ手前に戻す*/
voxelContainer.prototype.historyBack = function(){
	var this_obj = this;
	var this_data = this_obj.data;
	
	if(this_data.history.main.length>0){
	//最後の1手順分をRedo用配列に移動
	var tmp_move_array  = new Array(0);
	$.extend(true,tmp_move_array,this_data.history.main[this_data.history.main.length-1]);
	this_data.history.redo.push(tmp_move_array);
	this_data.history.main.splice(this_data.history.main.length-1,1);
	
	//全てのラベルを空にする
	for(var i=this_obj.data.series.length-1; i>=0; i--){
		for(var j=this_obj.data.series[i].label.length-1; j>=0; j--){
			this_obj.data.series[i].label[j].position = new Array(0);
		}
	}
	
	//今現在のメインヒストリ配列の内容で再構築
	for(var i= this_data.history.main.length-1; i>=0; i--){
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





/*戻すの１個取消*/
voxelContainer.prototype.historyRedo = function(){
	var this_obj = this;
	var this_data = this_obj.data;
	if(this_data.history.redo.length>0){
	var tmp_move_array = new Array(0);
		$.extend(true,tmp_move_array, this_data.history.redo[this_data.history.redo.length-1]);
		this_data.history.main.push(tmp_move_array);
		this_data.history.redo.splice(this_data.history.redo.length-1,1);
		
	//全てのラベルを空にする
	for(var i=this_obj.data.series.length-1; i>=0; i--){
		for(var j=this_obj.data.series[i].label.length-1; j>=0; j--){
			this_obj.data.series[i].label[j].position = new Array(0);
		}
	}
		
		//今現在のメインヒストリ配列の内容で再構築
		for(var i= this_data.history.main.length-1; i>=0; i--){
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







voxelContainer.prototype.insertLabelData = function(insert_obj){
	/*ラベルデータをオブジェクトとして直接入れる*/
	/*主にページロード時のデータロード用*/
	var this_obj = this;
	var this_data = this_obj.data;

	for(var i=0; i<insert_obj.length; i++){
		var tmp_series = insert_obj[i];
		var the_zoom = 512 / tmp_series.voxel.x;
		var series_w = the_zoom * tmp_series.voxel.x;
		var series_h = the_zoom * tmp_series.voxel.y * tmp_series.voxel.voxel_y / tmp_series.voxel.voxel_x;
		
		if(typeof tmp_series.label =='object'){
			for(var j=0; j< tmp_series.label.length; j++){
				var tmp_label = tmp_series.label[j];
				var position_data = this_obj.getPositionDataFromImage(tmp_label,series_w,series_h);
				this_obj.addLabel(tmp_series.id,tmp_label.id,position_data);
			}
		}
	}
};



//ある断面で塗るべきマスの情報を返す
voxelContainer.prototype.returnSlice = function(series_id,label_id,tmp_orientation,tmp_current_num){

 /*
  第1引数 : ラベルid
  第2引数 : 向き
  第3引数 : その向きでの奥行
 */

	var this_obj = this;
	var this_data = this_obj.data;
	var return_array = new Array(0);
 	var tmp_target_series = this_obj.getSeriesObjectById(series_id);

	var voxel_x = tmp_target_series.size.X;

 //対象ラベル取得
	var tmp_target_label = this_obj.getLabelObjectById(label_id,series_id);

 //各面で描くべき座標を返す(座標自体はvoxel XYZ座標)
 if(tmp_orientation == 'axial'){
  //axialのときはZが奥行に相当する

  if(typeof tmp_target_label.position[tmp_current_num] != 'undefined'){
  	var the_data = tmp_target_label.position[tmp_current_num];    

   for(var i=the_data.length-1; i>=0; i--){
    if(the_data[i]==1){
    	var tmp_y = Math.floor(i/voxel_x);
    	var tmp_x = i-tmp_y *voxel_x;
     return_array.push([tmp_x,tmp_y,tmp_current_num]);
    }
   }
  }
 }else if(tmp_orientation == 'coronal'){
  //coronalのときはyが奥行に相当する
  for(var i=tmp_target_label.position.length-1; i>=0; i--){ //z軸
   //各断面を調査
   if( typeof tmp_target_label.position[i] != 'undefined'){
   	var the_data = tmp_target_label.position[i];
    //目当てのy座標の項目に該当するものだけ調査
    for(var j=voxel_x*tmp_current_num; j<voxel_x*(tmp_current_num+1); j++){
    	var this_y = Math.floor(j/voxel_x);
    	var this_x = j-voxel_x*this_y;
     if(the_data[j]==1 && this_y ==tmp_current_num){
      return_array.push([this_x,this_y,i]);
     }
    }
   }
  }
 }else if(tmp_orientation == 'sagital'){
  //sagitalのときはxが奥行に相当する
  for(var i=tmp_target_label.position.length-1; i>=0; i--){ //z軸
   //各断面を調査
   if( typeof tmp_target_label.position[i] != 'undefined'){
   	var the_data = tmp_target_label.position[i];
    //目当てのx座標の項目に該当するものだけ調査
    for(var j=tmp_current_num; j<the_data.length; j=j+voxel_x){
    	var this_y = Math.floor(j/voxel_x);
    	var this_x = j-voxel_x*this_y;
     if(the_data[j]==1 && this_x ==tmp_current_num){
      return_array.push([this_x,this_y,i]);
     }
    }
   }
  }
 }

 return return_array;

};/*returnSlice*/





//ボクセルのXYZを登録する
voxelContainer.prototype.setSize = function(series_id,the_x,the_y,the_z){
	var this_obj = this;
	var this_data = this_obj.data;
	var tmp_series = this_obj.getSeriesObjectById(series_id);
	
	if(typeof tmp_series != 'object'){
		tmp_series = new Object();
		tmp_series.id = series_id;
		tmp_series.label = new Array(0);
		tmp_series.size = {
			X : the_x,
			Y : the_y,
			Z : the_z
		}
		this_data.series.push(tmp_series);
	}else{
		tmp_series.size = {
			X : the_x,
			Y : the_y,
			Z : the_z
		}
	}
};/*setSize*/





//ボクセル情報を1筆分だけ更新する関数
voxelContainer.prototype.updateVoxel = function(series_id,label_id,the_mode,position_array){

	/*
		第1引数 : 書き込むべき１筆分の座標情報群 ( [x,y,z] が塗られたマスの分だけわたってくる)
		第2引数 : 対象ラベル
		第3引数 : 描画か消しゴムか (pen / erase)
	*/

	var this_obj = this;
	var this_data = this_obj.data;
	
	//該当ラベルが無い場合は今回追加されたラベル用に配列を生成
	var add_flg = true;

	//対象シリーズ取得
	if(typeof this_obj.getSeriesObjectById(series_id)  != 'object'){
		this_obj.addSeries(series_id,label_id);
	}
	var tmp_series = this_obj.getSeriesObjectById(series_id);

	//対象ラベル取得
	var tmp_target_label = this_obj.getLabelObjectById(label_id,series_id);
	if(typeof tmp_target_label != 'object'){
		this_obj.addLabel(series_id,label_id);
	}
	tmp_target_label = this_obj.getLabelObjectById(label_id,series_id);

	var target_position_data = tmp_target_label.position;

 //座標情報をimageオブジェクトに格納
	var input_value = 1;
 if(the_mode == 'erase'){
  input_value = 0;
 }

 for(var i=position_array.length-1; i>=0; i--){
 	var tmp_x = position_array[i][0];
 	var tmp_y = position_array[i][1];
 	var tmp_z = position_array[i][2];

  if(typeof target_position_data[tmp_z] != 'object'){
   target_position_data[tmp_z] = new Uint8Array(tmp_series.size.X*tmp_series.size.Y);
  }
  target_position_data[tmp_z][tmp_series.size.X*tmp_y + tmp_x] = input_value;
 }

};/*updateVoxel*/