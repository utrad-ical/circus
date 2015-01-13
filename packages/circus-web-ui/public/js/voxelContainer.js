var voxelContainer = function(n){
  this.name = n;
}





//コンテナオブジェクトに新しいヒストリを追加
voxelContainer.prototype.addHistory =  function(position_array,label_id,the_mode){

 /*
  第1引数 : １筆分の座標情報群 ( [x,y,z] が塗られたマスの分だけわたってくる)
  第2引数 : 対象ラベル
  第3引数 : 描画か消しゴムか (pen / erase)
 */

 var this_obj = this; //コンテナオブジェクト
 var this_data = this_obj.data; //データ実体

 //1筆の中での重複は除外する

 //1筆分をヒストリーに格納
 //ヒストリーに渡すためのオブジェクト用意
 var tmp_step_obj = { label : label_id , mode : the_mode , position : new Array(0)}; //１筆分の描画オブジェクトの入れ物
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
voxelContainer.prototype.addLabel = function(label_id,position_array){
 var this_obj = this; //コンテナオブジェクト
 var this_data = this_obj.data; //データ実体

 var tmp_positions_array =  new Array(0);
 if(position_array){
  tmp_positions_array =  position_array;
 }

 var tmp_label_obj = {
  id : label_id,
  position : tmp_positions_array
 }
 this_data.label.push(tmp_label_obj);
};/*addLabel*/



//ラベル追加、positionsがあればそれを追加
voxelContainer.prototype.deleteLabel = function(label_id){
 var this_obj = this; //コンテナオブジェクト
 var this_data = this_obj.data; //データ実体

 for(var i=0; i<this_data.label.length; i++){
  if(this_data.label[i].id ==label_id){
   this_data.label.splice(i,1);
  }
 }
};/*addLabel*/





//実データ格納オブジェクト
voxelContainer.prototype.data = {
 history : {
  main : new Array(0),
  redo : new Array(0)
 },
 label : [
      //今現在塗られている座標の集合がラベルの個数分だけ積まれる
      /* [(imageObject-width=X,height=Y),.....]   */
 ],
 member : new Array(0), //共有しているビューアーの要素id一覧
 size : {
  X : 512,
  Y : 512,
  Z : 512
 }
};/*data*/





/*現在のorientation,奥行枚数ですでに描画されているラベルの情報を返す*/
voxelContainer.prototype.getCurrentLabel = function(tmp_orientation,tmp_current_num){
 var this_obj = this; //コンテナオブジェクト
 var this_data = this_obj.data; //データ実体
 var return_array = new Array(0);

 for(var i = this_obj.data.label.length-1; i>=0; i--){
  var position_array = this_obj.returnSlice(
   this_obj.data.label[i].id,
   tmp_orientation,
   tmp_current_num
  );
  return_array.push({
   'id' : this_obj.data.label[i].id,
   'position' : position_array
  })
 }
 return return_array;
};





/*idを指定して対象のラベルオブジェクトを返す*/
voxelContainer.prototype.getTargetLabel = function(label_id){
 var this_obj = this; //コンテナオブジェクト
 var this_data = this_obj.data; //データ実体
 var tmp_target_label = '';
 for(var i = 0; i<this_data.label.length;  i++){
  if(this_data.label[i].id == label_id){
   tmp_target_label = this_data.label[i];
   return tmp_target_label;
  }
 }
};





/*ひとつ手前に戻す*/
voxelContainer.prototype.historyBack = function(){
 var this_obj = this; //コンテナオブジェクト
 var this_data = this_obj.data; //データ実体

 if(this_data.history.main.length>0){
  //最後の1手順分をRedo用配列に移動
  var tmp_move_array  = new Array(0);
  $.extend(true,tmp_move_array,this_data.history.main[this_data.history.main.length-1]);
  this_data.history.redo.push(tmp_move_array);
  this_data.history.main.splice(this_data.history.main.length-1,1);

  //全てのラベルを空にする
  for(var i=this_obj.data.label.length-1; i>=0; i--){
   this_obj.data.label[i].position = new Array(0);
  }

  //今現在のメインヒストリ配列の内容で再構築
  for(var i= this_data.history.main.length-1; i>=0; i--){
   var this_history = this_data.history.main[i];
   this_obj.updateVoxel(
     this_history.position,
     this_history.label,
     this_history.mode
   );
  }
 }
};



/*戻すの１個取消*/
voxelContainer.prototype.historyRedo = function(){
 var this_obj = this; //コンテナオブジェクト
 var this_data = this_obj.data; //データ実体
 if(this_data.history.redo.length>0){
  var tmp_move_array  = new Array(0);
  $.extend(true,tmp_move_array, this_data.history.redo[this_data.history.redo.length-1]);
  this_data.history.main.push(tmp_move_array);
  this_data.history.redo.splice(this_data.history.redo.length-1,1);

  //全てのラベルを空にする
  for(var i=this_obj.data.label.length-1; i>=0; i--){
   this_obj.data.label[i].position = new Array(0);
  }

  //今現在のメインヒストリ配列の内容で再構築
  for(var i= this_data.history.main.length-1; i>=0; i--){
   var this_history = this_data.history.main[i];
   this_obj.updateVoxel(
     this_history.position,
     this_history.label,
     this_history.mode
   );
  }
 }
};



//ある断面で塗るべきマスの情報を返す
voxelContainer.prototype.returnSlice = function(label_id,tmp_orientation,tmp_current_num){

 /*
  第1引数 : ラベルid
  第2引数 : 向き
  第3引数 : その向きでの奥行
 */

 var this_obj = this; //コンテナオブジェクト
 var this_data = this_obj.data; //データ実体
 var return_array = new Array(0);
 var voxel_x = this_obj.data.size.X;

 //対象ラベル取得
 var tmp_target_label = this_obj.getTargetLabel(label_id);

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
voxelContainer.prototype.setSize = function(the_x,the_y,the_z){
 this.data.size = {
  X : the_x,
  Y : the_y,
  Z : the_z
 }
};/*data*/





//ボクセル情報を1筆分だけ更新する関数
voxelContainer.prototype.updateVoxel = function(positions_array,label_id,the_mode){

 /*
  第1引数 : 書き込むべき１筆分の座標情報群 ( [x,y,z] が塗られたマスの分だけわたってくる)
  第2引数 : 対象ラベル
  第3引数 : 描画か消しゴムか (pen / erase)
 */

 var this_obj = this; //コンテナオブジェクト
 var this_data = this_obj.data; //データ実体

 //該当ラベルが無い場合は今回追加されたラベル用に配列を生成
 var add_flg = true;
 for(var i=0; i<this_data.label.length; i++){
  if(this_data.label[i].id == label_id){
   add_flg = false;
   break;
  }
 }
 if(add_flg == true){
  this_obj.addLabel(label_id);
 }

 //対象ラベル取得
 var tmp_target_label = this_obj.getTargetLabel(label_id);
 var target_position_data = tmp_target_label.position;

 //座標情報をimageオブジェクトに格納
 var input_value = 1;
 if(the_mode == 'erase'){
  input_value = 0;
 }

 for(var i=positions_array.length-1; i>=0; i--){
  var tmp_x = positions_array[i][0];
  var tmp_y = positions_array[i][1];
  var tmp_z = positions_array[i][2];

  if(typeof target_position_data[tmp_z] != 'object'){
   target_position_data[tmp_z] = new Uint8Array(this_obj.data.size.X*this_obj.data.size.Y);
  }
  target_position_data[tmp_z][this_obj.data.size.X*tmp_y + tmp_x] = input_value;
 }

};/*updateVoxel*/