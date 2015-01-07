var	voxelContainer	=	function(n){
  this.name = n;
}



//コンテナオブジェクトに新しいヒストリを追加
voxelContainer.prototype.addHistory	=		function(position_array,label_id,the_mode){

	/*
		第1引数	:	１筆分の座標情報群	( [x,y,z] が塗られたマスの分だけわたってくる)
		第2引数	:	対象ラベル
		第3引数	:	描画か消しゴムか (pen / erase)
	*/

	var	this_obj	=	this;	//コンテナオブジェクト
	var	this_data	=	this.data;	//コンテナオブジェクト

	//1筆分をヒストリーに格納
	//ヒストリーに渡すためのオブジェクト用意
	var	tmp_step_obj	=	{	label	:	label_id	,	mode	:	the_mode	,	position	:	new Array(0)};	//１筆分の描画オブジェクトの入れ物
	for(i=position_array.length-1;	i>=0;	i--){
		tmp_step_obj.position[i]	=	[position_array[i][0],position_array[i][1],position_array[i][2]];
	}

	this_data.history.main.push(tmp_step_obj);
	this_data.history.redo	=	[];	//新しい記述をした時点でredoは除去

};/*addHistory*/



//ラベル追加、positionsがあればそれを追加
voxelContainer.prototype.addLabel	=	function(label_id,positions){
	var	this_obj	=	this;	//コンテナオブジェクト
	var	this_data	=	this.data;	//コンテナオブジェクト

	var	tmp_positions_array	=		new Array(0);
	if(positions){
		tmp_positions_array	=		positions;
	}

	var	tmp_label_obj	=	{
		id	:	label_id,
		position	:	tmp_positions_array
	}
	this_data.label.push(tmp_label_obj);
};/*addLabel*/



//ラベル追加、positionsがあればそれを追加
voxelContainer.prototype.deleteLabel	=	function(label_id){
	var	this_obj	=	this;	//コンテナオブジェクト
	var	this_data	=	this.data;	//コンテナオブジェクト

	for(deleteLabel_cnt=0;	deleteLabel_cnt<this_data.label.length;	deleteLabel_cnt++){
		if(this_data.label[deleteLabel_cnt].id	==label_id){
			this_data.label.splice(deleteLabel_cnt,1);
		}
	}
};/*addLabel*/



//実データ格納オブジェクト
voxelContainer.prototype.data	=	{
	history	:	{
		main	:	new Array(0),
		redo	:	new Array(0)
	},
	label	:	[//今現在塗られている座標の集合がラベルの個数分だけ積まれる
	],
	member	:	new Array(0),	//共有しているビューアーの要素id一覧
	size	:	{
		X	:	512,
		Y	:	512,
		Z	:	512
	}

};/*data*/



/*ひとつ手前に戻す*/
voxelContainer.prototype.historyBack	=	function(){
	var	this_data	=	this.data;	//コンテナオブジェクト
	if(this_data.history.main.length>0){
		var	tmp_move_array		=	new Array();
		$.extend(true,tmp_move_array,	this_data.history.main[this_data.history.main.length-1]);
		this_data.history.redo.push(tmp_move_array);
		this_data.history.main.splice(this_data.history.main.length-1,1);

		var	tmp_mode	=	'erase';
		if(tmp_move_array.mode	==	'erase'){
			tmp_mode	=	'pen';
		}
		voxelContainer.prototype.updateVoxel(tmp_move_array.position,tmp_move_array.label,tmp_mode);
	}
};



/*戻すの１個取消*/
voxelContainer.prototype.historyRedo	=	function(){
	var	this_data	=	this.data;	//コンテナオブジェクト
	if(this_data.history.redo.length>0){
		var	tmp_move_array		=	new Array();
		$.extend(true,tmp_move_array,	this_data.history.redo[this_data.history.redo.length-1]);
		this_data.history.main.push(tmp_move_array);
		this_data.history.redo.splice(this_data.history.redo.length-1,1);

		var	tmp_mode	=	'erase';
		if(tmp_move_array.mode	==	'pen'){
			tmp_mode	=	'pen';
		}
		voxelContainer.prototype.updateVoxel(tmp_move_array.position,tmp_move_array.label,tmp_mode);
	}
};



//ある断面で塗るべきマスの情報を返す
voxelContainer.prototype.returnSlice	=	function(label_id,tmp_orientation,tmp_now_num){

	/*
		第1引数	:	ラベルid
		第2引数	:	向き
		第3引数	:	その向きでの奥行
	*/

	var	this_obj	=	this;	//コンテナオブジェクト
	var	this_data	=	this.data;	//コンテナオブジェクト
	var	tmp_target_label	=	'';
	var	return_array	=	new Array(0);

	for(con_cnt_i	=	0;	con_cnt_i<this_data.label.length;		con_cnt_i++){
		if(this_data.label[con_cnt_i].id	==	label_id){
			tmp_target_label	=	this_data.label[con_cnt_i];
			break;
		}
	}

	if(tmp_orientation	==	'axial'){
		//axialのときはZが奥行に相当する
		for(con_cnt_i=tmp_target_label.position[tmp_now_num].length-1;	con_cnt_i>=0;	con_cnt_i--){	//y軸
			for(con_cnt_j=tmp_target_label.position[tmp_now_num][con_cnt_i].length-1;	con_cnt_j>=0;	con_cnt_j--){	//x軸
				if(tmp_target_label.position[tmp_now_num][con_cnt_i][con_cnt_j]	==	1){
					return_array.push([con_cnt_j,con_cnt_i]);
				}
			}
		}
	}else	if(tmp_orientation	==	'coronal'){
		//coronalのときはyが奥行に相当する
		for(con_cnt_i=tmp_target_label.position.length-1;	con_cnt_i>=0;	con_cnt_i--){	//z軸
			for(con_cnt_j=tmp_target_label.position[con_cnt_i][tmp_now_num].length-1;	con_cnt_j>=0;	con_cnt_j--){	//x軸
				if(tmp_target_label.position[con_cnt_i][tmp_now_num][con_cnt_j]	==	1){
					return_array.push([con_cnt_j,con_cnt_i]);
				}
			}
		}
	}else	if(tmp_orientation	==	'sagital'){
		//sagitalのときはxが奥行に相当する
		for(con_cnt_i=tmp_target_label.position.length-1;	con_cnt_i>=0;	con_cnt_i--){	//z軸
			for(con_cnt_j=tmp_target_label.position[con_cnt_i].length-1;	con_cnt_j>=0;	con_cnt_j--){	//y軸
				if(tmp_target_label.position[con_cnt_i][con_cnt_j][tmp_now_num]	==	1){
					return_array.push([con_cnt_j,con_cnt_i]);
				}
			}
		}
	}

	return return_array;
};/*data*/



//ボクセルのXYZを登録する
voxelContainer.prototype.setSize	=	function(the_x,the_y,the_z){
	this.data.size	=	{
		X	:	the_x,
		Y:	the_y,
		Z	:	the_z
	}
};/*data*/





//ボクセル情報を更新する関数
voxelContainer.prototype.updateVoxel	=	function(positions_array,label_id,the_mode){

	/*
		第1引数	:	書き込むべき１筆分の座標情報群	( [x,y,z] が塗られたマスの分だけわたってくる)
		第2引数	:	対象ラベル
		第3引数	:	描画か消しゴムか (pen / erase)
	*/

	var	this_obj	=	this;	//コンテナオブジェクト
	var	this_data	=	this.data;	//コンテナオブジェクト

	//該当ラベルが無い場合は今回追加されたラベル用に配列を生成
	var	add_flg	=	true;
	for(con_cnt_j=0;	con_cnt_j<this_data.label.length;	con_cnt_j++){
		if(this_data.label[con_cnt_j].id	==	label_id){
			add_flg	=	false;
			break;
		}
	}
	if(add_flg	==	true){
		voxelContainer.prototype.addLabel(label_id);
	}



	//書き込み対象ラベル選定
	var	tmp_target_label	=	'';
	for(con_cnt_j	=	0;	con_cnt_j<this_data.label.length;		con_cnt_j++){
		if(this_data.label[con_cnt_j].id	==	label_id){
			tmp_target_label	=	this_data.label[con_cnt_j];
		}
	}



	//todoココから下をさらにオブジェクト化する



	//まだこのラベルに何も描かれていないときは格納用の３次元配列を生成
	if(tmp_target_label.position.length==0){
		tmp_target_label.position = new Array(this_data.size.Z);
		for (cotainer_cnt_k=0; cotainer_cnt_k<this_data.size.Z; cotainer_cnt_k++){
			tmp_target_label.position[cotainer_cnt_k] = new Array(this_data.size.Y);
			for(cotainer_cnt_l=0; cotainer_cnt_l<this_data.size.Y; cotainer_cnt_l++){
				tmp_target_label.position[cotainer_cnt_k][cotainer_cnt_l] = new Uint8Array(this_data.size.X);
			}
		}
	};



	//描画
	if(the_mode	==	'pen'){
		for(con_cnt_j=positions_array.length-1;	con_cnt_j>=0;	con_cnt_j--){
			var	tmp_x	=	positions_array[con_cnt_j][0];
			var	tmp_y	=	positions_array[con_cnt_j][1];
			var	tmp_z	=	positions_array[con_cnt_j][2];
			tmp_target_label.position[tmp_z][tmp_y][tmp_x]	=	1;
		}
	}else if(the_mode	==	'erase'){
		//消しゴム
		for(con_cnt_j=positions_array.length-1;	con_cnt_j>=0;	con_cnt_j--){
			var	tmp_x	=	positions_array[con_cnt_j][0];
			var	tmp_y	=	positions_array[con_cnt_j][1];
			var	tmp_z	=	positions_array[con_cnt_j][2];
			tmp_target_label.position[tmp_z][tmp_y][tmp_x]	=	0;
		}
	}	//if erase

};/*updateVoxel*/
