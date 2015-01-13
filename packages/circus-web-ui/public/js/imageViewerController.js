//コントローラ・ビューアーウィジェットをコントロールする
//この案件固有の機能群

(function($){

 //連動のために確保する情報群(デフォルト値)
 //コントローラ発動時にサーバーからもらった情報をマージして格納する
 //変更時にはこれを書き換えて、以降の処理時に参照する
 var controllerInfo = {
  baseUrl : 'http://your-website/', //画像格納ディレクトリ
  mode : 'pan', //pan,pen,erase,window
  activeSeriesId : '', //参照するシリーズid
  series: [
   {
    image : { //todo シリーズはケースに対して複数個、配列
     //ウインドウレベル・幅はシリーズに紐づかせるか否かはユーザー定義
     id : '',
     description : 'series name', //シリーズ名,今は特に使っていない
     number: 512, //何枚の断面が格納されているか
     thickness: 1, //断面１枚あたりの厚さ todo 名前を要確認
     window: {
      level: {
       current : 1000,
       maximum : 4000,
       minimum : 0
      },
      width: {
       current : 4000,
       maximum : 2000,
       minimum : 1
      },
      preset :[
          {label: 'your preset label' , level: 1000 , width : 4000}
      ]
     },
     voxel : {
      x : 512, //series画像での横ピクセル数
      y : 512, //series画像での縦ピクセル数
      z : 512, //seriesに含まれる画像の枚数
      voxel_x : 1, //ボクセルの幅
      voxel_y : 1, //ボクセルの奥行き
      voxel_z : 1 //ボクセルの高さ
     }
     //todo xyzの方向によって表示するときの縮尺が違うようなことがある場合には,その縮尺に相当するパラメータを用意しよう
    },
    label :{
     activeLabelId : '',
     colors : ['#FF0000','#FF3300','#FF6600','#FFCC00','#0033FF','#0099FF','#00CCFF','#00FFFF','#00FF00','#00CC00','#009900','#006600','#3333CC','#CC3399','#CC6666','#FF9999'],
     label : [
              /*
              // ラベル情報の格納形式のひながた、これが配列になってラベル分だけ配置される
      {
       id : '',//内部的な管理のためのラベルid
       name : '',//画面上で見せるラベルの名前
       color : '', //カラーコード,#ナシ、string,指定が無ければランダム値を割り当て
       alpha : 100,
       visible : true,
       position: '' //描画情報,形式未定
      }*/
     ]
    }
   } //series１個分の情報群
  ],
  control : {
   show : true, //そもそもコントロールパネルを置くかどうか
   pan : true, //手のひらツール
   window : {
    active : true,
    panel : true
   },
   pen :{
    active : true, //描画機能の有効・無効
    panel : true, //ラベル情報表示パネルの有無

   },
   boldness : {
    active : true,
    value : 1
   }, //太さ変更
   color : {
    control : true, //カラーピッカーの有無
    values : ['ff0000', '00ff00', '0000ff', 'FFFF00', '00FFFF', 'FF00FF', '000000', 'FF6600']
   },
   undo : true //戻す・やり直す一括
  },
  elements : {
   parent : '', //複数のビューアーを全て囲う親要素id
   panel : '', //操作パネルを入れ込む要素id
   label : '' //ラベルの操作ボタン等を入れ込む要素id
  },
  viewer : [ //展開するビューアーの情報
   {
    id : 'viewer_',//内部的にビューアーに名前を付けておく
    elementId : '',
    orientation : 'axial',
    window: {}, //ひな形の中身は active_series.image.window と共通
    number:{
     maximum : 512, //何枚の断面が格納されているか
     minimum : 0, //何枚の断面が格納されているか
     current : 0 //初期の表示番号
    }
   }
  ]
 }



 //3枚連動のためのメソッド群
 var controller_methods = {

	changeActiveSeries : function(active_series_id){
	   var this_elm = this;

		controllerInfo.activeSeriesId = active_series_id;
		this_elm.find('#'+active_series_id).addClass('active');
	
	
	},

  //モード変更 
  changeMode : function(new_mode){

   controllerInfo.mode= new_mode;
   var this_elm = this;
   var active_series = this_elm.imageViewerController('getActiveSeries',[controllerInfo.activeSeriesId]);

   var tmp_panel_elm = 'body';
   if(controllerInfo.elements.panel.length>0){
    tmp_panel_elm = '#'+controllerInfo.elements.panel;
   }
   tmp_panel_elm = $(tmp_panel_elm);

   if(controllerInfo.mode == 'erase'){
    //消しゴムモード
    tmp_panel_elm.find('.ico_detail_sprite_erase').addClass('active')
    .siblings().removeClass('active');
   }else if(controllerInfo.mode == 'pan'){
    //手のひら・ズーム
    tmp_panel_elm.find('.ico_detail_sprite_pan').addClass('active')
    .siblings().removeClass('active');
   }else if(controllerInfo.mode == 'pen'){
    //ペン
    tmp_panel_elm.find('.ico_detail_sprite_pen').addClass('active')
    .siblings().removeClass('active');

    if( active_series.label.label.length == 0){
     tmp_panel_elm.find('.add_label').trigger('click');
    };

   }else if(controllerInfo.mode == 'window'){
   //ウインドウ調整
    tmp_panel_elm.find('.ico_detail_sprite_image_window').addClass('active')
    .siblings().removeClass('active');
   };

   //紐づくビューアーたちにモード変更を伝播
   for(var i=0; i<controllerInfo.viewer.length; i++){
    var elmId = '#' + controllerInfo.viewer[i].elementId;
    $(elmId).imageViewer('changeMode',controllerInfo.mode);
   }

  },





  //各種操作ボタン等の設置
  //jQuery UI widget とは異なり、initの中から呼ぶ
  create : function(){

   var this_elm = this;
   var active_series = this_elm.imageViewerController('getActiveSeries',[controllerInfo.activeSeriesId]);

   var tmp_panel_elm = 'body';
   if(controllerInfo.elements.panel.length>0){
    tmp_panel_elm = '#'+controllerInfo.elements.panel;
   }
   tmp_panel_elm = $(tmp_panel_elm);

   if(controllerInfo.control.show == true){ //コントロールパネル有無
    tmp_panel_elm.prepend('<div class="img_toolbar_wrap"><ul class="img_toolbar"></ul><div class="clear">&nbsp;</div></div>');
    var tmp_panel_wrap =tmp_panel_elm.find('.img_toolbar');

    //ウインドウサイズ・レベル
    if(controllerInfo.control.window.active == true){

     if(controllerInfo.control.window.panel== true){

      var tmp_elments = '<li class="toolbar_btn ico_detail_sprite ico_detail_sprite_image_window">\
       <ul class="image_window_controller"><li><p class="btn_open"></p><p class="btn_close"></p></li></ul>\
       </li>';
      tmp_panel_wrap.append(tmp_elments);

      tmp_panel_wrap.find('.image_window_controller').append('<li class="window_level_wrap"></li><li class="window_width_wrap"></li>');

      var tmp_elments_window_level = '<span class="image_window_controller_label">window level</span><input type="text" class="image_window_level" value="">';
      var tmp_elments_window_width = '<span class="image_window_controller_label">window width</span><input type="text" class="image_window_width" value="">';

      tmp_panel_wrap.find('.image_window_controller').find('.window_level_wrap').append(tmp_elments_window_level);
      tmp_panel_wrap.find('.image_window_controller').find('.window_width_wrap').append(tmp_elments_window_width);

      tmp_panel_wrap.find('.image_window_level').val(active_series.image.window.level.current);
      tmp_panel_wrap.find('.image_window_width').val(active_series.image.window.width.current);

      tmp_elments_window_level = active_series.image.window.level.minimum + ' ～ ' + active_series.image.window.level.maximum;
      tmp_elments_window_width = active_series.image.window.width.minimum + ' ～ ' + active_series.image.window.width.maximum;

      tmp_panel_wrap.find('.image_window_controller').find('.window_level_wrap').append(tmp_elments_window_level);
      tmp_panel_wrap.find('.image_window_controller').find('.window_width_wrap').append(tmp_elments_window_width);

      //プリセット
      if(active_series.image.window.preset.length>0){
       tmp_panel_wrap.find('.image_window_controller').append('<li class="window_preset_wrap"><select class="image_window_preset_select"></select></li>');
       var tmp_elments_window_preset='<option value="blank">select setting</option>';
       for(var i=0; i<active_series.image.window.preset.length; i++){
        tmp_elments_window_preset = tmp_elments_window_preset + '<option value="'+active_series.image.window.preset[i].level+','+active_series.image.window.preset[i].width+'">'+active_series.image.window.preset[i].label+' '+active_series.image.window.preset[i].level+','+active_series.image.window.preset[i].width+'</option>';
       }
       tmp_panel_wrap.find('.image_window_preset_select').append(tmp_elments_window_preset);
      } //プリセット
      delete tmp_elments;
     }else{
      var tmp_elments = '<li class="toolbar_btn ico_detail_sprite ico_detail_sprite_image_window"></li>';
      tmp_panel_wrap.append(tmp_elments);
     }
    }

    //ペンツールボタン
    if(controllerInfo.control.pen.active == true){
     //パン切替
     var tmp_elments = '<li class="toolbar_btn ico_detail_sprite ico_detail_sprite_pan"></li>';

     //ペン切替
     tmp_elments = tmp_elments + '<li class="toolbar_btn ico_detail_sprite ico_detail_sprite_pen"></li>';

     //消しゴム
     tmp_elments = tmp_elments + '<li class="toolbar_btn ico_detail_sprite ico_detail_sprite_erase"></li>';

     //太さ変更
     if(controllerInfo.control.boldness.active == true){
      var tmp_boldness_elm = '<li class="toolbar_param toolbar_weight_wrap"><select class="toolbar_weight">';
      for(var i=1; i<9; i++){
       tmp_boldness_elm = tmp_boldness_elm + '<option value="'+[i]+ '">'+[i]+ 'px</option>';
      }
      tmp_elments = tmp_elments + tmp_boldness_elm + '</select></li>';
      delete tmp_boldness_elm;
     }

     //手前に戻す・繰り返す(セット)
     if(controllerInfo.control.undo == true){
      tmp_elments = tmp_elments + '<li class="toolbar_btn ico_detail_sprite draw_back"></li><li class="toolbar_btn ico_detail_sprite draw_redo"></li>';
     }

     tmp_panel_wrap.append(tmp_elments);
     delete tmp_elments;
     delete tmp_panel_wrap;
    }

    /*ラベル表示領域*/
    if(controllerInfo.control.pen.panel== true){
     //各ラベル項目はsetEventsの後に発動するのでここは外枠と追加ボタンだけ
     $('#'+controllerInfo.elements.label).append('<div class="label_select_wrap"><div class="add_label">新規ラベル追加</div></div>');

     if(typeof active_series.label.label !='object' ||active_series.label.label.length==0){
      //ロード時にラベルがなければ１つだけデフォルトラベル生成
      //ただしここではオブジェクトに追加するだけ。要素生成は別
      this_elm.imageViewerController('addLabelObject');
     }else{
      //todo ページ側から初期のラベル情報が与えられた場合にはそれを表示させる
      this_elm.imageViewerController('updateLabelElements');
     }

     //アクティブラベルの指定が無ければラベル配列の１番目を有効化
     if(active_series.label.activeLabelId == ''){
      active_series.label.activeLabelId = active_series.label.label[0].id;
     }

     var tmp_info_elm = '<div class="label_info_wrap"><div class="label_info">\
      <span class="common_btn edit_activate">Edit</span>\
      <span class="common_btn edit_finish disabled">OK</span>\
      <input type="hidden" value="" class="label_id">\
      <input type="text" value="" class="label_title readonly>\
      <textarea value="" class="label_description" readonly></textarea>\
      </div></div><div class="clear">&nbsp;</div>';

     $('#'+controllerInfo.elements.label).append(tmp_info_elm);

    }//ラベル関連
   }//control

   //要素設置が済んだらイベント設置
   this_elm.imageViewerController('setEvents');

  },//create





  addLabelObject : function(){
   //ラベルの新規追加
   var this_elm = this;
   var active_series = this_elm.imageViewerController('getActiveSeries',[controllerInfo.activeSeriesId]);

   var tmp_id = new Date();
   tmp_id = tmp_id.getFullYear()+'_'+tmp_id.getMonth()+'_'+tmp_id.getDate()+'_'+tmp_id.getHours()+'_'+tmp_id.getMinutes()+'_'+tmp_id.getSeconds()+'_'+tmp_id.getMilliseconds();
   var tmp_label_obj = {
    id : tmp_id,
    color : '#ff0000',  //todo初期は他のラベルで使われてない色をランダムで選ぶ
    alpha : 100,
    rgba : 'rgba(255,0,0,1)', //color/alphaを併せてcanvas適用用の値を作る
    title : '名称未設定',
    description :'',
    positoin : new Array(0),
    visible : true
   }
   active_series.label.label.push(tmp_label_obj);
  },





  deleteLabelObject : function(label_id){
   //ラベルオブジェクトから該当項目を削除
   var this_elm = this;
   var active_series = this_elm.imageViewerController('getActiveSeries',[controllerInfo.activeSeriesId]);

   var tmp_label_array = active_series.label.label;
   for(var i=0; i<tmp_label_array.length; i++){
    if(tmp_label_array[i].id == label_id){
     tmp_label_array.splice(i,1);
     break;
    }
   }

   //コンテナオブジェクトの中から除外
   for(var i=0; i<controllerInfo.viewer.length; i++){
    controllerInfo.viewer[i].container.deleteLabel(label_id);
   }

   //ラベルが無かったら手のひらモードに切り替える
   if(tmp_label_array.length==0){
    this_elm.imageViewerController('changeMode','pan');
   }

   //要素に反映
   this_elm.imageViewerController('updateLabelElements');

   //配下ビューアーオプション情報を書き換えて再描画を発火させる
   for(var i=controllerInfo.viewer.length-1; i>=0; i--){
    var elmId = '#' + controllerInfo.viewer[i].elementId;
    $(elmId).trigger('sync');
   }

  },





  getActiveSeries : function(insert_data){
		//series ID を渡して,そのseriesのオブジェクトを返す

		//第一引数は1項目の配列, jQuery widgetからの呼び出しの都合上,配列で渡している
		// 1項: active_series_id
   var target_series_id = insert_data[0];
	 
	 //console.log(target_series_id);

   //シリーズidを指定してそのシリーズのオブジェクトを返す
   var return_series_obj ='';
   for(var i=controllerInfo.series.length-1; i>=0; i--){
    if(controllerInfo.series[i].image.id == target_series_id){
     return_series_obj = controllerInfo.series[i];
     break;
    }
   }
	 
	 //該当シリーズが無い
   if(typeof return_series_obj != 'object'){
    return_series_obj = controllerInfo.series[0];
		controllerInfo.activeSeriesId = controllerInfo.series[0].image.id;
   }
   return return_series_obj;
  },





  init : function(insert_obj){

   //コントローラ呼び出し時の初期挙動
   //insert_obj はhtmlからinit のvalue値で渡された情報json
   var this_elm = this;

   //入力データ内でウィンドウ情報をマージ
   //シリーズ全体の適用とビューアごとの適応があるため
	 
		var active_series = this_elm.imageViewerController('getActiveSeries',[controllerInfo.activeSeriesId]);
		console.log(controllerInfo);

   for(var i=0; i<insert_obj.viewer.length; i++){
    var tmp_win_obj = new Object;
    var insert_obj_active_series = this_elm.imageViewerController('getActiveSeries',[controllerInfo.activeSeriesId]);
    tmp_win_obj = $.extend(true,tmp_win_obj,insert_obj_active_series.image.window);
    tmp_win_obj = $.extend(true,tmp_win_obj,insert_obj.viewer[i].window);
    insert_obj.viewer[i].window = tmp_win_obj;
   }

   //ビューアーオブジェクトは個別に整形
   //デフォルトでviewer配列の個数が判断付かないため,デフォルト配列を複製してviewer個数分配置しておく
   var tmp_viewer_param_array = new Array;
   for(var i=0; i<insert_obj.viewer.length; i++){
    tmp_viewer_param_array[i] = new Object;
    tmp_viewer_param_array[i].id = controllerInfo.viewer[0].id + i;
    tmp_viewer_param_array[i].elementId = controllerInfo.viewer[0].elementId;
    tmp_viewer_param_array[i].orientation = controllerInfo.viewer[0].orientation;
    tmp_viewer_param_array[i].number = {
     current : controllerInfo.viewer[0].number.current,
     maximum : controllerInfo.viewer[0].number.maximum,
     minimum : controllerInfo.viewer[0].number.minimum
    }
    tmp_viewer_param_array[i].elements = {
     slider : {
      panel  : true,
      display : true
     },
     zoom : {
      panel  : true,
      display : true
     },
     window : {
      panel  :true,
     }
    }
    tmp_viewer_param_array[i].window = {
     level : {
      current : active_series.image.window.level.current,
      maximum : active_series.image.window.level.maximum,
      minimum : active_series.image.window.level.minimum
     },
     width : {
      current : active_series.image.window.width.current,
      maximum : active_series.image.window.width.maximum,
      minimum : active_series.image.window.width.minimum
     },
     preset :  $.extend(true,'',active_series.image.window.preset)
    }
   }
   controllerInfo.viewer = tmp_viewer_param_array;

   //呼び出し時に渡されたオプション情報をマージ
   $.extend(true,controllerInfo,insert_obj);

   //コントローラ関連の要素生成発動
   this_elm.imageViewerController('create');

   var viewerRun = function(){
    //ビューアーオブジェクトの数だけビューアライブラリ発火
    for(var i=0; i<controllerInfo.viewer.length; i++){

     var elmId = '#' + controllerInfo.viewer[i].elementId;
     var tmo_orientation = controllerInfo.viewer[i].orientation;
     var tmp_w = 512;
     var tmp_h = 512;
     var tmp_ow = 512;
     var tmp_oh = 512;

     if(tmo_orientation == 'axial'){
      tmp_w = active_series.image.voxel.x;
      tmp_h = active_series.image.voxel.y * active_series.image.voxel.voxel_y / active_series.image.voxel.voxel_x;
      tmp_ow = active_series.image.voxel.x;
      tmp_oh = active_series.image.voxel.y;
     }else if(tmo_orientation == 'sagital'){
      tmp_w = active_series.image.voxel.y * active_series.image.voxel.voxel_y / active_series.image.voxel.voxel_x;
      tmp_h = active_series.image.voxel.z * active_series.image.voxel.voxel_z / active_series.image.voxel.voxel_x;
      tmp_ow = active_series.image.voxel.y;
      tmp_oh = active_series.image.voxel.z;
     }else if(tmo_orientation == 'coronal'){
      tmp_w = active_series.image.voxel.x;
      tmp_h = active_series.image.voxel.z *  active_series.image.voxel.voxel_z / active_series.image.voxel.voxel_x;
      tmp_ow = active_series.image.voxel.x;
      tmp_oh = active_series.image.voxel.z;
     }

     tmp_w = Math.floor(tmp_w);
     tmp_h = Math.floor(tmp_h);

     $(elmId).imageViewer({
      'viewer' : {
       'id' : controllerInfo.viewer[i].id,
        'orientation' : controllerInfo.viewer[i].orientation,
        'src' : controllerInfo.baseUrl + '?series='+active_series.image.id + '&mode='+tmo_orientation,
        'window': controllerInfo.viewer[i].window,
        'elements': controllerInfo.viewer[i].elements,
        'number' : controllerInfo.viewer[i].number,
        'position' : {
         ow : tmp_ow,
         oh : tmp_oh,
         sw : tmp_ow,
         sh : tmp_oh,
         dw : tmp_w,
         dh : tmp_h
        },
        'draw' : {
         activeLabelId : active_series.label.activeLabelId
        },
        'voxel' : {
         x : active_series.image.voxel.x,
         y : active_series.image.voxel.y,
         z : active_series.image.voxel.z,
         voxel_x : active_series.image.voxel.voxel_x,
         voxel_y : active_series.image.voxel.voxel_y,
         voxel_z : active_series.image.voxel.voxel_z,
        }
       },

      'control' : {
       'container' : controllerInfo.viewer[i].container
      }

     });/*.imageViewer()*/
    }

   }/*viewerRun*/

   viewerRun();

   //ビューアー発火後に生成された要素にイベント設置
   this_elm.imageViewerController('setViewerInnerEvents');

   //初期のモード設定
   this_elm.imageViewerController('changeMode',controllerInfo.mode);

  }/*init*/,





  //３面共用のコントローラー情報の取り出し
  getValues : function(){
   return controllerInfo;
  },





  //各種イベント設置
  setEvents : function(){

   var this_elm = this;
   var active_series = this_elm.imageViewerController('getActiveSeries',[controllerInfo.activeSeriesId]);

   //操作対象のビューアを格納しておく
   //ビューアーオブジェクトの数だけビューアライブラリ発火
   for(var i=0; i<controllerInfo.viewer.length; i++){
    var elmId = '#' + controllerInfo.viewer[i].elementId;
   }

   var tmp_options_elm = '';
   for(var i=controllerInfo.series.length-1; i>=0; i--){
    tmp_options_elm = tmp_options_elm + '<option value="'+controllerInfo.series[i].image.id+'">'+controllerInfo.series[i].image.description+'</option>';
   }
   $('.series_selector').html(tmp_options_elm);

   if(controllerInfo.control.show == true){

    var tmp_panel_elm = 'body';
    if(controllerInfo.elements.panel.length>0){
     tmp_panel_elm = '#'+controllerInfo.elements.panel;
    }
    tmp_panel_elm = $(tmp_panel_elm);

    //ウインドウサイズ・レベル
    if(controllerInfo.control.window.active == true){

     //パネルの表示・非表示操作
     tmp_panel_elm.find('.ico_detail_sprite_image_window').click(function(e){
      $(this).find('.image_window_controller').show(300);
      this_elm.imageViewerController('changeMode','window');
     });

     tmp_panel_elm.find('.btn_close').click(function(e){
      tmp_panel_elm.find('.image_window_controller').hide(300);
      this_elm.imageViewerController('changeMode','pan');
      e.stopPropagation();
     });

     tmp_panel_elm.find('.image_window_controller').click(function(e){
      e.stopPropagation();
     });

     //ウインドウサイズ・レベル操作
     //input
     tmp_panel_elm.find('.img_toolbar_wrap').find('input').change(function(){
      chgWinValCtrl();
     });

     //select
     tmp_panel_elm.find('.image_window_preset_select').change(function(){
      var tmp_value = $(this).val();  //value="32000,2000"
      if(tmp_value != 'blank'){
       $(this).closest('.image_window_controller').find('.image_window_level').val(tmp_value.split(',')[0]);
       $(this).closest('.image_window_controller').find('.image_window_width').val(tmp_value.split(',')[1]);
       chgWinValCtrl();
      }
     });

     //input,selectから呼び出す共通関数
     var chgWinValCtrl = function(){
      //ウインドウレベル
      var tmp_level = tmp_panel_elm.find('.image_window_level').val();
      tmp_level = Number(tmp_level);
      if(isFinite(tmp_level)==true){
       //数値であれば上限値・下限値との比較をしてcontrollerを書き換える
       //数値でないときは書き換えが走らないので操作前の値に戻る
       tmp_level = Math.min(tmp_level,active_series.image.window.level.maximum);
       tmp_level = Math.max(tmp_level,active_series.image.window.level.minimum);
       active_series.image.window.level.current = tmp_level;
      }
      tmp_panel_elm.find('.image_window_level').val(active_series.image.window.level.current);

      //ウインドウサイズ
      var tmp_width = tmp_panel_elm.find('.image_window_width').val();
      tmp_width = Number(tmp_width);
      if(isFinite(tmp_width)==true){
       //数値であれば上限値・下限値との比較をしてcontrollerを書き換える
       //数値でないときは書き換えが走らないので操作前の値に戻る
       tmp_width = Math.min(tmp_width,active_series.image.window.level.maximum);
       tmp_width = Math.max(tmp_width,active_series.image.window.level.minimum);
       active_series.image.window.width.current = tmp_width;
      }
      tmp_panel_elm.find('.image_window_width').val(active_series.image.window.width.current);

      //配下ビューアーオプション情報を書き換えて再描画を発火させる
      //まず挿入用ウインドウ情報を用意
      var tmp_win_values = { viewer : {
        window: { //todo 今回ははコントローラから伝播
         level: {
          current : active_series.image.window.level.current,
          maximum : active_series.image.window.level.maximum,
          minimum : active_series.image.window.level.minimum
         },
         width: {
          current : active_series.image.window.width.current,
          maximum : active_series.image.window.width.maximum,
          minimum : active_series.image.window.width.minimum
         },
         preset : active_series.image.window.preset
        }
       }
      }
      //ビューアーに伝播
      for(var i=0; i<controllerInfo.viewer.length; i++){
       var elmId = '#' + controllerInfo.viewer[i].elementId;
       $(elmId).trigger('setOptions',[tmp_win_values])
          .trigger('changeImageSrc');
      }
     }//chgWinValCtrl
    }
   }

   //ペンツールボタン
   if(controllerInfo.control.pen.active== true){

    //パン切替
    tmp_panel_elm.find('.ico_detail_sprite_pan').click(function(){
     this_elm.imageViewerController('changeMode','pan');
    });

    //ペン切替
    tmp_panel_elm.find('.ico_detail_sprite_pen').click(function(){
     this_elm.imageViewerController('changeMode','pen');
    });

    //消しゴム
    tmp_panel_elm.find('.ico_detail_sprite_erase').click(function(){
     this_elm.imageViewerController('changeMode','erase');
    });

    //太さ変更
    tmp_panel_elm.find('.toolbar_weight').change(function(e){
     var the_boldness = $(this).val();
     //配下ビューアーのモードをまとめて変更する
     for(var h=0; h<controllerInfo.viewer.length; h++){
      var elmId = '#' + controllerInfo.viewer[h].elementId;
      $(elmId).trigger('setOptions',{viewer:{draw:{boldness:the_boldness}}});
     }
    });

    //手前に戻す


    tmp_panel_elm.find('.draw_back').click(function(){
     for(var i=0; i<1; i++){
      var elmId = '#' + controllerInfo.viewer[i].elementId;
      if(i==0){
       //最初のビューアーを介してhistorybackを行う
       $(elmId).imageViewer('historyBack');
      }
     }
    });

    //戻すの取消
    tmp_panel_elm.find('.draw_redo').click(function(){
     for(var i=0; i<controllerInfo.viewer.length; i++){
      var elmId = '#' + controllerInfo.viewer[i].elementId;
      if(i==0){
       //最初のビューアーを介してhistorybackを行う
       $(elmId).imageViewer('historyRedo');
      }
     }
    });
   }

   /*ラベル表示領域*/
   if(controllerInfo.control.pen.panel== true){
    $('#'+controllerInfo.elements.label).find('.add_label').click(function(){

     this_elm.imageViewerController('addLabelObject');

     if(active_series.label.label.length==1){
      active_series.label.activeLabelId = active_series.label.label[0].id;
     }

     this_elm.imageViewerController('updateLabelElements');
    });
		
		 //現在フォーカス中ラベルの情報表示・書き換え
		 $('#'+controllerInfo.elements.label).find('.label_title,.label_description').change(function(){
			var tmp_label_id = $(this).closest('.label_info_wrap').find('.label_id').val();
	
			for(var i=0; i<active_series.label.label.length; i++){
				var tmp_the_label = active_series.label.label[i];
				if(tmp_the_label.id == tmp_label_id){
					tmp_the_label.title =  $('#'+controllerInfo.elements.label).find('.label_title').val();
					tmp_the_label.description = $('#'+controllerInfo.elements.label).find('.label_description').val();
					break;
				}
			}
			this_elm.imageViewerController('updateLabelElements');		
		 });


   }
  },





  //color,alphaの値からRGBA値を計算する
  getRgba : function(color_num,alpha_num){
   var tmp_color = color_num.replace('#','');
   var tmp_alpha = alpha_num *0.01;
   var tmp_color_r = Number('0x'+tmp_color[0])*Number('0x'+tmp_color[0]) + Number('0x'+tmp_color[1]);
   var tmp_color_g = Number('0x'+tmp_color[2])*Number('0x'+tmp_color[2]) + Number('0x'+tmp_color[3]);
   var tmp_color_b = Number('0x'+tmp_color[4])*Number('0x'+tmp_color[4]) + Number('0x'+tmp_color[5]);
   var return_txt = 'rgba('+tmp_color_r+','+tmp_color_g+','+tmp_color_b+','+tmp_alpha+')';
   return return_txt;
  },





  setColorToViewer : function(){
   //コントローラの現在のラベル表示情報を、配下ビューアーに適用させる
   //id , rgba , visible を適用させる

   var this_elm = this;
   var active_series = this_elm.imageViewerController('getActiveSeries',[controllerInfo.activeSeriesId]);
   var tmp_insert_obj = new Array(0);

   //ビューアーに渡すためのラベル表示情報を生成
   for(var i=active_series.label.label.length-1; i>=0; i--){
    var tmp_insert = {
     id : active_series.label.label[i].id,
     rgba : active_series.label.label[i].rgba,
     visible : active_series.label.label[i].visible
    }
    tmp_insert_obj.push(tmp_insert);
   }

   //配下ビューアーオプション情報を書き換えて再描画を発火させる
   for(var i=controllerInfo.viewer.length-1; i>=0; i--){
    var elmId = '#' + controllerInfo.viewer[i].elementId;
    var tmp_val = { viewer : {
      draw: {
       activeLabelId : active_series.label.activeLabelId,
       label: tmp_insert_obj
      }
     }
    }
    $(elmId).trigger('setOptions',[tmp_val])
       .trigger('sync');
   }
  }/*setColorToViewer*/,





  setViewerInnerEvents : function(){
   //ビューアー内部で生成した要素群へのイベント設置
   //ビューアーが固有で持つ機能はビューアー内部で持たせる
   //ここでは連携のために必要なものを引き出すイベントを設置

   var this_elm = this;
   var tmp_panel_elm = 'body';
   if(controllerInfo.elements.panel.length>0){
    tmp_panel_elm = '#'+controllerInfo.elements.panel;
   }
   tmp_panel_elm = $(tmp_panel_elm);

   for(var i=0; i<controllerInfo.viewer.length; i++){

    //パネル内の虫眼鏡ボタンの押下を受けて全体のモード追従させる
    //他のビューアもパネル等を追従させる
    var tmp_elm = '#' + controllerInfo.viewer[i].elementId;
    $(tmp_elm).bind('onModeChange',function(e,tmp_id,tmp_mode){
     controllerInfo.mode= tmp_mode;

     for(var j=0; j<controllerInfo.viewer.length; j++){
      var elmId = '#' + controllerInfo.viewer[j].elementId;
      var the_opts = $(elmId).imageViewer('getOptions');
      if(the_opts.viewer.id != tmp_id && the_opts.control.mode != tmp_mode){
       $(elmId).imageViewer('changeMode',tmp_mode);
      }
     }
     this_elm.imageViewerController('changeMode',controllerInfo.mode);
     //全体用のウインドウ情報パネルの表示切替
     if(tmp_mode != 'window'){
      tmp_panel_elm.find('.image_window_controller').hide(300);
     }else{
      tmp_panel_elm.find('.image_window_controller').show(300);
     }
    });

    //ある面でwindow情報が変更されたらそれを他の面にも適用させる
    $(tmp_elm).find('.mouse_cover').bind('mouseup',function(){
     if(controllerInfo.mode == 'window'){
      var tmp_this_opts = $(this).closest('.img_area').imageViewer('getOptions');
      this_elm.imageViewerController('syncWindowInfo',tmp_this_opts.viewer.window);
     }
    });

    $(tmp_elm).find('.image_window_preset_select,.image_window_level,.image_window_width').change(function(){
     var tmp_this_opts = $(this).closest('.img_area').imageViewer('getOptions');
     this_elm.imageViewerController('syncWindowInfo',tmp_this_opts.viewer.window);
    });
   }

   //各ラベル項目の表示情報を適用
   this_elm.imageViewerController('updateLabelElements');

  }/*setViewerInnerEvents*/,





  //３面共用のコントローラー情報群の書き換え
  //必要な項目だけ与えてその項目だけマージ
  setValues : function(insert_obj){
   //controllerInfo = $.extend(true,controllerInfo,insert_obj);
  },





  //３面のウインドウレベル・幅を同期する
  //第一引数：変更されたウインドウの情報
  syncWindowInfo : function(tmp_this_opts){

   var this_elm = this;
   var active_series = this_elm.imageViewerController('getActiveSeries',[controllerInfo.activeSeriesId]);

   var tmp_panel_elm = 'body';
   if(controllerInfo.elements.panel.length>0){
    tmp_panel_elm = '#'+controllerInfo.elements.panel;
   }
   tmp_panel_elm = $(tmp_panel_elm);

   active_series.image.window.level.current = tmp_this_opts.level.current+0;
   active_series.image.window.width.current = tmp_this_opts.width.current+0;
   tmp_panel_elm.find('.image_window_level').val(active_series.image.window.level.current);
   tmp_panel_elm.find('.image_window_width').val(active_series.image.window.width.current);

   //配下ビューアーオプション情報を書き換えて再描画を発火させる
   //まずは適用させる値を用意
   var tmp_win_values = { viewer : {
     window: {
      level: {
       current : active_series.image.window.level.current,
      },
      width: {
       current : active_series.image.window.width.current,
      }
     }
    }
   }

   //値を渡してビュワー発火
   for(var i=0; i<controllerInfo.viewer.length; i++){
    var elmId = '#' + controllerInfo.viewer[i].elementId;
    $(elmId).trigger('setOptions',[tmp_win_values])
     .trigger('changeImageSrc');
   }
  }/*syncWindowInfo*/,





  updateLabelElements : function(){

   //ラベルオブジェクトの増減を要素に反映する
   //ラベルパネル内のイベントも全てここで生成する

   var this_elm = this;
   var tmp_wrap_elm =   $('#'+controllerInfo.elements.label).find('.label_select_wrap');

   var active_series = this_elm.imageViewerController('getActiveSeries',[controllerInfo.activeSeriesId]);
   var tmp_elm = '';

	//関連要素は初期化
   $('.color-picker').remove();	//bodyの直下に生成されるピッカーの補助要素
   tmp_wrap_elm.find('.series_wrap').remove();
   tmp_wrap_elm.find('.label_info').text('');
   tmp_wrap_elm.find('.label_description').text('');
	 
	for(var j =0; j<controllerInfo.series.length; j++){
		var	tmp_the_series=	controllerInfo.series[j];
		tmp_elm	=	tmp_elm+'<div class="series_wrap" id="'+tmp_the_series.image.id+'">';
		tmp_elm	=	tmp_elm+'<p class="series_name">'+tmp_the_series.image.id+'</p>';
		tmp_elm	=	tmp_elm+'<ul class="label_select_list">';
				
		if(typeof tmp_the_series.label != 'undefined'){
			for(var i=0; i<tmp_the_series.label.label.length; i++){
				var tmp_the_label = tmp_the_series.label.label[i];
				if(tmp_the_label.visible == true){
					tmp_elm = tmp_elm + '<li class="label_select_cell visible" id="'+tmp_the_label.id+'"><label class="visible_check_wrap"></label>';
				}else{
					tmp_elm = tmp_elm + '<li class="label_select_cell" id="'+tmp_the_label.id+'"><label class="visible_check_wrap"></label>';
				}
				
				tmp_elm = tmp_elm + '<input type="text" value="'+tmp_the_label.color+'" class="color_picker color_picker_diff_color" readonly id="'+tmp_the_label.id+'_cp">\
				<label class="label_txt">'+tmp_the_label.title+'</label><label class="alpha_label"><input type="text" value="'+tmp_the_label.alpha+'" class="alpha_change">%</label>\
				<label class="now_draw_label"></label><label class="delete_label"></label><div class="clear">&nbsp;</div></li>';
				
				if(tmp_the_label.id ==tmp_the_series.label.activeLabelId){
					$('#'+controllerInfo.elements.label).find('.label_id').val(tmp_the_label.id);
					$('#'+controllerInfo.elements.label).find('.label_title').val(tmp_the_label.title);
					$('#'+controllerInfo.elements.label).find('.label_description').val(tmp_the_label.description);
				}
			}
		}
		tmp_elm = tmp_elm+'</ul></div>';
	}

		
  tmp_wrap_elm.prepend(tmp_elm);
	tmp_wrap_elm.find('#'+controllerInfo.activeSeriesId).addClass('active');

   if(active_series.label.label.length>1){
    $('#'+active_series.label.activeLabelId).addClass('now_draw');
   }else{
    tmp_wrap_elm.find('.label_select_cell:first-child').addClass('now_draw');
   }

   if(tmp_wrap_elm.find('.color_picker').length>0){
     $('.color_picker_diff_color').simpleColorPicker({
      colors: active_series.label.colors,
      onChangeEvent: true
    });

    //ピッカーで色を変えた時の挙動
    tmp_wrap_elm.find('.color_picker').change(function(){

     var the_color = $(this).val();
     $(this).css('background-color',the_color);
     var tmp_label_id = $(this).closest('.label_select_cell').attr('id');
     var target_label = '';
     for(var i=0; i<active_series.label.label.length; i++){
      var tmp_the_label = active_series.label.label[i];
      if(tmp_the_label.id == tmp_label_id){
       target_label = tmp_the_label;
       break;
      }
     }

     target_label.color = the_color;
     target_label.rgba =  this_elm.imageViewerController('getRgba',target_label.color,target_label.alpha);
     this_elm.imageViewerController('setColorToViewer');
     $(this).closest('.label_select_cell').find('.now_draw_label').trigger('click');

    });
    $('.color_picker').trigger('change');//初期の色を適用させる
		
		$('.ico_detail_sprite_pen ').trigger('click');
   }

   if(tmp_wrap_elm.find('.alpha_change').length>0){
    //透明度を変えた時の挙動
   	tmp_wrap_elm.find('.alpha_change').change(function(){
     var the_alpha = $(this).val();
     var tmp_label_id = $(this).closest('.label_select_cell').attr('id');
     var target_label = '';

     for(var i=0; i<active_series.label.label.length; i++){
      var tmp_the_label = active_series.label.label[i];
      if(tmp_the_label.id == tmp_label_id){
       target_label = tmp_the_label;
      }
     }/*for*/
     target_label.alpha = the_alpha;
     target_label.rgba =  this_elm.imageViewerController('getRgba',target_label.color,target_label.alpha);

     this_elm.imageViewerController('setColorToViewer');
     $(this).closest('.label_select_cell').find('.now_draw_label').trigger('click');
    });
   }

   //描画対象ラベルの変更
   tmp_wrap_elm.find('.now_draw_label').click(function(){
    $(this).closest('.label_select_cell').addClass('now_draw').siblings().removeClass('now_draw');
    active_series.label.activeLabelId =$(this).closest('.label_select_cell').attr('id');
    this_elm.imageViewerController('updateLabelElements');
    this_elm.imageViewerController('setColorToViewer');
   });

   //表示・非表示切り替え
   tmp_wrap_elm.find('.visible_check_wrap').click(function(){
    var tmp_parent = $(this).closest('.label_select_cell');
    var tmp_label_id = tmp_parent.attr('id');
    var tmp_the_label = '';

    for(var i=0; i<active_series.label.label.length; i++){
     tmp_the_label = active_series.label.label[i];
     if(tmp_the_label.id == tmp_label_id){
      break;
     }
    }
    if(tmp_parent.hasClass('visible') == true){
     //非表示化する
     tmp_parent.removeClass('visible');
     tmp_the_label.visible = false;
    }else{
     //表示する
     tmp_parent.addClass('visible');
     tmp_the_label.visible = true;
    }
    this_elm.imageViewerController('setColorToViewer');
   });

   //ラベル削除
   tmp_wrap_elm.find('.delete_label').click(function(){
    var tmp_label_id = $(this).closest('.label_select_cell').attr('id');
    var tmp_txt  = confirm('Are you sure delete this label?');
    if ( tmp_txt == true ){
     this_elm.imageViewerController('deleteLabelObject',tmp_label_id);
    }
   });
	 
	 
	 //操作対象シリーズ変更
   $('#'+controllerInfo.elements.label).find('.series_name').click(function(){
			var tmp_parent_elm = $(this).closest('.series_wrap');
			if(tmp_parent_elm.hasClass('active') == false){
				tmp_parent_elm.addClass('active').siblings().removeClass('active');
				var tmp_id = tmp_parent_elm.attr('id');
				this_elm.imageViewerController('changeActiveSeries',tmp_id);
			}
   });

   $('#'+controllerInfo.elements.label).find('.edit_activate').click(function(){
    if($(this).hasClass('disabled') ==false){
     $(this).addClass('disabled');
     $(this).closest('.label_info_wrap').find('.edit_finish').removeClass('disabled');
     $(this).closest('.label_info_wrap').find('.label_title,.label_description').removeAttr('readonly');
    }
   });

   $('#'+controllerInfo.elements.label).find('.edit_finish').click(function(){
    if($(this).hasClass('disabled') ==false){
     alert('changed textdata is not saved.\n they willbe saved when the [SAVE] operation.');
     $(this).addClass('disabled');
     $(this).closest('.label_info_wrap').find('.edit_activate').removeClass('disabled');
     $(this).closest('.label_info_wrap').find('.label_title,.label_description').attr('readonly','readonly');
    }
   });

  }/*updateLabelElements*/

  /*
   描画イベントハンドラー（LABEL番号／描画座標の配列）
   UNDO・REDO
   保存用データ取得
   ラベル表示／非表示（LABEL番号）
   ラベル追加・削除
   描画対象ラベル変更
   ラベル色変更
   表示・描画モード切り替え
   */
 }

 // プラグインメイン
 $.fn.imageViewerController = function(method){
  // メソッド呼び出し部分
  if ( controller_methods[method] ) {
   return controller_methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
  } else if ( typeof method === 'object' || ! method ) {
   return controller_methods.init.apply( this, arguments );
  } else {
   $.error( 'Method ' +  method + ' does not exist on jQuery.tooltip' );
  }
 }

})(jQuery);