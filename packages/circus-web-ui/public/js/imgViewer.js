//	imageViewer
;(function($){

	// プラグインメイン
	$.widget('ui.imageViewer',	{	// ビューアーごとオプション、デフォルト値
		options:	{
			control	:	{	//コントロール機能の有無
				show	:	true,	//そもそもコントロールパネルを置くかどうか
				zoom	:	true,	//虫眼鏡
				slider	:	true,	//枚数送りレバー
				mode	:	'pan',	//pan,pen,erase,window,external
				container	:	''	//指定必須,ラベル情報の格納用オブジェクト
			},
			viewer	:	{	//中身の情報群
				id	:	'viewer_0'	,	//断面
				orientation	:	'axial'	,	//断面
				src:	'',	//画像URL
				window:	{	//todo	今回ははコントローラから電波
					level:	{
						current	:	0,
						maximum	:	0,
						minimum	:	0
					},
					width:	{
						current	:	0,
						maximum	:	0,
						minimum	:	1
					},
					preset	:	[
									//sample {label:	'your preset label'	,	level:	1000	,	width	:	4000}
								]
				},
				number	:	{
					current	:	0,
					maximum	:	512,
					minimum	:	0
				},
				loadQue	:	{//画像ロードのずれ防止のためのキュー
					current	:	0,
					maximum	:	2
				},
				elements	:	{
					slider	:	{		//枚数送りのスライダーと枚数表示
						panel	:	true,	//スライダーの表示有無
						display	:	true,	//枚数表示の表示有無
					},
					zoom	:	{	//虫眼鏡と拡大率表示
						panel:	true,
						display	:	true
					},
					window	:	{	//windowレベル・幅の操作パネル
						panel:	true		//todo	これがtrueならパネルを表示させる
					}
				},
				position	:	{	//写真の表示位置・サイズに関する情報群,512はデフォルト値
					ow:512	,	oh:512,	//元画像の拡大・縮小なし状態でのオリジナルサイズ
					sx:0	,	sy:0,		//元画像のどの位置からトリミング表示するか
					sw:512	,	sh:512,		//元画像からのトリミング幅・高さ
					dw:512	,	dh:512,	//貼りつけサイズ(基本的にはキャンバスの領域いっぱいに表示する)	todo:シリーズ情報から参照して上書き
					zoom:	1				//元画像に対しての拡大率
				},
				draw	:	{
					activeLabelId	:	'',	//現在の描画対象ラベル
					boldness	:	1,
					label	:	[
						/*描画情報格納用,今現在表示しているz軸で塗られているxy座標の集合を格納する。ラベルにつき１項目ずつ
							{
								id	:	'label_1',
								rgba	:	rgba(0,0,0,1),
								visible	:	true
							}
						*/
					]
				}
			}
		},



		addLabel	:	function(insert_obj){
			//ラベル追加
			//todo	viewer単体で, ラベル描画機能を持ちスライダー操作時に, No に応じてラベル情報が追従するようにするのかどうか確認
			var	this_obj	=	this;
			var	tmp_target_label_obj	=	{	color	:	'#000000',id	:	'',	position	:	new Array()	};
			$.extend(true,tmp_target_label_obj,insert_obj);
			this_obj.options.viewer.draw.label.push(tmp_target_label_obj);
		},



		_applyBoldness	:	function(insert_array){
			//ペンで描いた状態の座標情報群と現時点でのboldnessを踏まえ,塗るべきマス目の集合に変換する
			var	this_obj	=	this;
			var	this_opts	=	this.options
			var	rtn_array	=	new Array();
			var	point_num	=	insert_array.length;
			for(j=0;	j<point_num;	j++){
				for(k=0;	k<this_opts.viewer.draw.boldness;	k++){	//x軸
					for(l=0;	l<this_opts.viewer.draw.boldness;	l++){	//y軸
						var	tmp_x	=	insert_array[j][0]	-	this_opts.viewer.draw.boldness*0.5		+	k;
						var	tmp_y	=	insert_array[j][1]	-	this_opts.viewer.draw.boldness*0.5		+	l;
						tmp_x	=	Math.round(tmp_x);
						tmp_y	=	Math.round(tmp_y);
						rtn_array.push([tmp_x,tmp_y]);
					}
				}
			}
			return	rtn_array;
		},



		_changeImgSrc :	function (){
			//画像表示差し替え挙動(レバー・明るさ・シリーズ差し替えの際等に共通して呼び出す)
			//第一引数:捜査対象コンテキスト
			//第二引数:ソース情報(URL情報)
			//第三引数:表示情報(画角・トリミング情報等)
			var	this_obj	=	this;
			var	this_elm	=	this.element;
			var	this_opts	=	this.options;
			var	target_ctx	=	this_elm.find('.series_image_elm').get(0).getContext('2d');

			//右端の行き過ぎ防止
			if(this_opts.viewer.position.sx	+	this_opts.viewer.position.sw	>	this_opts.viewer.position.dw){
				this_opts.viewer.position.sx	=	this_opts.viewer.position.dw	-	this_opts.viewer.position.sw;
			}

			//下端の行き過ぎ防止
			if(this_opts.viewer.position.sy	+	this_opts.viewer.position.sh	>	this_opts.viewer.position.dh){
				this_opts.viewer.position.sy	=	this_opts.viewer.position.dh	-	this_opts.viewer.position.sh;
			}

			//左端の行き過ぎ防止
			this_opts.viewer.position.sx	=	Math.max(this_opts.viewer.position.sx,0);
			//上端の行き過ぎ防止
			this_opts.viewer.position.sy	=	Math.max(this_opts.viewer.position.sy,0);

			//以下、画像src差し替え
			var	src_url	=	this_opts.viewer.src	+	'&wl='	+	this_opts.viewer.window.level.current	+	'&ww='	+	this_opts.viewer.window.width.current	+	'&target='	+	this_opts.viewer.number.current;

			var	tmp_img_obj	=	new Image;
			var	changeMain	=	function(){

				target_ctx.clearRect(0,0,this_opts.viewer.position.ow,this_opts.viewer.position.oh);
				target_ctx.drawImage(tmp_img_obj,
					this_opts.viewer.position.sx,
					this_opts.viewer.position.sy,
					this_opts.viewer.position.sw,
					this_opts.viewer.position.sh,
					0,
					0,
					this_opts.viewer.position.dw,
					this_opts.viewer.position.dh
				);
			}


			//すでにリクエスト済み画像であればメモリから読みだす
			var	tmp_request_flg	=	true;
			var	cache_num	=	this_obj._tmpInfo.imgCache.length;
			for(i=0;	i<cache_num;	i++){
				if(this_obj._tmpInfo.imgCache[i].src	==	src_url){
					tmp_img_obj	=	this_obj._tmpInfo.imgCache[i];
					tmp_request_flg	=	false;
				}
			}

			//初めてリクエストを出す場合
			if(tmp_request_flg==	true){
				if(this_opts.viewer.loadQue.current<this_opts.viewer.loadQue.maximum){
					var tmp_img_obj = new Image();
					tmp_img_obj.src	=	src_url;
					this_obj._tmpInfo.imgCache.push(tmp_img_obj);

					if(tmp_img_obj.complete	==	true){
						changeMain();
					}else{
						this_opts.viewer.loadQue.current++;
					}

					tmp_img_obj.onload = function(){
						this_opts.viewer.loadQue.current--;
						//ロード完了時点でその画像がまだ参照先として指定されたものであればキャンバスを書き換え


						if(tmp_img_obj.src	==	this_opts.viewer.src	+	'&wl='	+	this_opts.viewer.window.level.current	+	'&ww='	+	this_opts.viewer.window.width.current	+	'&target='	+	this_opts.viewer.number.current)	{
							changeMain();
						}
					}

					tmp_img_obj.onerror= function(){
						this_opts.viewer.loadQue.current--;
					}
				}
			}else{
				//すでにリクエストを出していてロードされている場合
				changeMain();
			}

			this_obj._disableImageAlias(target_ctx, false);
			this_elm.find('.image_window_controller_wrap').find('.win_lv_label').text(this_opts.viewer.window.level.current);
			this_elm.find('.image_window_controller_wrap').find('.win_width_label').text(this_opts.viewer.window.width.current);
			this_elm.find('.image_window_controller_wrap').find('.image_window_controller').find('.image_window_level').val(this_opts.viewer.window.level.current);
			this_elm.find('.image_window_controller_wrap').find('.image_window_controller').find('.image_window_width').val(this_opts.viewer.window.width.current);

		}	/*_changeImgSrc*/,



		changeMode	:	function(new_mode){
			//モード切替処理
			var	this_obj	=	this;
			var	this_elm	=	this.element;
			var	this_opts	=	this.options;

			if(this_opts.control.mode	!=	new_mode){
				this_opts.control.mode	=	new_mode;
				this_elm.trigger('onModeChange',[this_opts.viewer.id,new_mode]);
				//ここでは変更のあったビューアーのidと適用後のモードを生成して外から取れる状態にするだけ
				//具体的な処理はコントローラ側

				var	the_win_controller	=	this_elm.find('.image_window_controller');
				if(this_opts.control.mode	==	'window'){
					//パネルを出す
					the_win_controller.slideDown(200);
					this_elm.find('.image_window_controller_wrap').find('.btn_close').show();
					this_elm.find('.image_window_controller_wrap').find('.btn_open').hide();
				}else{
					//パネルを消す
					the_win_controller.slideUp(200);
					this_elm.find('.image_window_controller_wrap').find('.btn_close').hide();
					this_elm.find('.image_window_controller_wrap').find('.btn_open').show();
				}

				//カーソル用クラス変更
				this_elm.removeClass('mode_pan mode_pen mode_window mode_erase');
				if(this_opts.control.mode	==	'erase'){
					this_elm.addClass('mode_erase');
				}else if(this_opts.control.mode	==	'window'){
					this_elm.addClass('mode_window');
				}else if(this_opts.control.mode	==	'pen'){
					this_elm.addClass('mode_pen');
				}else if(this_opts.control.mode	==	'pan'){
					this_elm.addClass('mode_pan');
				}

			}
		},



		_clearCanvas	:	function (){
			var	this_obj	=	this;
			var	this_elm	=	this.element;

			//カンバスのクリア
			this_elm.find('.canvas_main_elm').get(0).getContext('2d').clearRect(0,0,this_obj.options.viewer.position.ow,this_obj.options.viewer.position.oh);
		},



		_create	:	function(insert_obj){

			//ウィジェット発動時に一番最初に走る
			//optionsに応じて要素生成
			//設置した要素へのイベント発行は _setEventsにて
			var	this_obj	=	this;
			var	this_elm	=	this.element;
			var	this_opts	=	this.options;

			//キャンバス要素群生成
			var	createCanvas	=	function(){
				var	tmp_elm	=	'';
				tmp_elm	=	tmp_elm	+	'<div class="img_wrap">';	//画像枠,入れ子を作るので開始タグのみ
				tmp_elm	=	tmp_elm	+	'<canvas class="canvas_elm series_image_elm"></canvas>';//背景画像
				tmp_elm	=	tmp_elm	+	'<canvas class="canvas_elm canvas_main_elm"></canvas>';//ラベルを描くキャンバス	todo:ラベルがあれば、という条件文を付けよう
				tmp_elm	=	tmp_elm	+	'<div class="mouse_cover"></div>';//マウス挙動キャッチ用要素
				tmp_elm	=	tmp_elm	+	'</div>';//画像枠,閉じタグ
				this_elm.append(tmp_elm);
				delete	tmp_elm;
			}
			createCanvas();
			//キャンバス要素群生成ここまで

			//ウインドウレベル・サイズ変更パネル
			if(this_opts.viewer.elements.window.panel==true){
				var	tmp_elm	=	'<div class="image_window_controller_wrap"><p class="btn_open">L:<span class="win_lv_label">'+this_opts.viewer.window.level.current+'</span>\
				 / W:<span class="win_width_label">'+this_opts.viewer.window.width.current+'</span></p>\
				 <p class="btn_close"></p><ul class="image_window_controller">';

				//レベル
				tmp_elm	=	tmp_elm	+'<li class="window_level_wrap"><span class="image_window_controller_label">window level</span>\
					<input type="text" class="image_window_level" value="'+this_opts.viewer.window.level.current+'">\
					<span class="label_level_min">'+this_opts.viewer.window.level.minimum+'</span> ～ \
					<span class="label_level_max">'+this_opts.viewer.window.level.maximum+'</span></li>';

				//幅
				tmp_elm	=	tmp_elm	+'<li class="window_width_wrap"><span class="image_window_controller_label">window width</span>\
					<input type="text" class="image_window_width" value="'+this_opts.viewer.window.width.current+'">\
					<span class="label_width_min">'+this_opts.viewer.window.width.minimum+'</span> - \
					<span class="label_width_max">'+this_opts.viewer.window.width.maximum+'</span></li>';

				//プリセット
				if(this_opts.viewer.window.preset.length>0){
					var	tmp_opts	=	'<option value="blank">select setting</option>';
					for(i=0;i<this_opts.viewer.window.preset.length;	i++){
						tmp_opts	=	tmp_opts	+	'<option value="'+this_opts.viewer.window.preset[i].level+','+this_opts.viewer.window.preset[i].width+'">'+this_opts.viewer.window.preset[i].label+'</option>';
					}
					tmp_elm	=	tmp_elm	+	'<li class="window_preset_wrap"><select class="image_window_preset_select">'	+	tmp_opts	+'</select></li>';
				}

				tmp_elm	=	tmp_elm	+'</ul></div>';
				this_elm.find('.img_wrap').append(tmp_elm);
				delete	tmp_elm;
			}


			//枚数送り関連要素
			if(this_opts.viewer.elements.slider.panel==true){
				//スライダー
				var	tmp_elm	=	'<div class="btn_prev common_btn">Prev</div><div class="slider_outer">\
				<div class="slider_elm"></div></div><div class="btn_next common_btn">Next</div><div class="clear">&nbsp;</div>';
				this_elm.prepend(tmp_elm);
				delete	tmp_elm;
			}
			if(this_opts.viewer.elements.slider.display==true){
				//枚数表示枠	todo枚数テキストは後で入れる形式にする
				var	tmp_elm	=	'<p class="disp_num">'+this_opts.viewer.number.current+'</p>';
				this_elm.find('.img_wrap').append(tmp_elm);
				delete	tmp_elm;
			}

			//ズーム機能関連要素
			if(this_opts.viewer.elements.zoom.panel==true){
				var	tmp_elm	=	'<div class="img_toolbar_wrap"><ul class="img_toolbar">\
											<li class="toolbar_btn ico_detail_sprite ico_detail_sprite_resize_large"></li>\
											<li class="toolbar_btn ico_detail_sprite ico_detail_sprite_resize_short"></li>\
										</ul></div>';
				this_elm.find('.img_wrap').prepend(tmp_elm);
				delete	tmp_elm;
			}

			if(this_opts.viewer.elements.zoom.display==true){
				//ズーム表示枠	todo パーセントのテキストは後で入れる形式にする
				this_elm.find('.img_wrap').append('<p class="disp_size"><span class="current_size"></span>%</p>');
			}

		},



		_disableImageAlias	:	function(target_context,state){
			//アンチエイリアス処理変更
			//第1引数	:	対象とするコンテキストオブジェクト
			//第2引数	:	適用するステータス(trueまたはfalse)
			target_context.mozImageSmoothingEnabled = state;
			target_context.oImageSmoothingEnabled = state;
			target_context.webkitImageSmoothingEnabled = state;
			target_context.imageSmoothingEnabled = state;
			target_context.antialias = 'none';
			target_context.patternQuality = 'fast';
		},



		drawLabel	:	function (labelId,positions_array){
			//塗り機能
			//第1引数	:	対象ラベル
			//第2引数	:	塗る点の集合の配列(boxel上でのxy値)	[10,29],[10,30],...

			var	this_obj	=	this;
			var	this_elm	=	this.element;
			var	this_opts	=	this.options;
			var	tmp_ctx	=	this_elm.find('.canvas_main_elm').get(0).getContext('2d');

			//描画対象ラベルのチェック
			var	target_label	=	new Object;
 			for(i=0;i<this_opts.viewer.draw.label.length;	i++){
				if(this_opts.viewer.draw.label[i].id	==	labelId){
					target_label	=	this_opts.viewer.draw.label[i];
					break;
				}
			}
			if(target_label.visible	==	true){
				var	array_num	=	positions_array.length;
				var	tmp_zoom	=	this_opts.viewer.position.zoom;

				tmp_ctx.beginPath();
				for(i=0;	i<array_num;	i++){
					var	tmp_x	=	(positions_array[i][0]	-	this_opts.viewer.position.sx)*tmp_zoom;
					var	tmp_y	=	(positions_array[i][1]	-	this_opts.viewer.position.sy)*tmp_zoom;
					tmp_ctx.rect(tmp_x,tmp_y,tmp_zoom,tmp_zoom);
				}
				tmp_ctx.fillStyle =	target_label.rgba;	//本来はラベルごとの色を取得して入れ込む
				tmp_ctx.fill();
				tmp_ctx.closePath();
			}

		},//drawCommon キャンバス描画ここまで



		eraseLabel	:	function (labelId,positions_array){
			//塗り機能
			//第1引数	:	対象ラベル
			//第2引数	:	塗る点の集合の配列(boxel上でのxy値)

			var	this_obj	=	this;
			var	this_elm	=	this.element;
			var	this_opts	=	this.options;
			var	tmp_ctx	=	this_elm.find('.canvas_main_elm').get(0).getContext('2d');

			//描画対象ラベルのチェック
			var	target_label	=	new Object;
 			for(i=0;i<this_opts.viewer.draw.label.length;	i++){
				if(this_opts.viewer.draw.label.id	==	labelId){
					target_label	=	this_obj.viewer.draw.label[i];
				}
			}

			var	array_num	=	positions_array.length;
			var	tmp_zoom	=	this_opts.viewer.position.zoom;

			tmp_ctx.beginPath();
			for(i=0;	i<array_num;	i++){
				var	tmp_x	=	(positions_array[i][0]	-	this_opts.viewer.position.sx)*tmp_zoom;
				var	tmp_y	=	(positions_array[i][1]	-	this_opts.viewer.position.sy)*tmp_zoom;
				tmp_ctx.clearRect(tmp_x,tmp_y,tmp_zoom,tmp_zoom);
			}
			tmp_ctx.closePath();

		},//drawCommon キャンバス描画ここまで



		_exchangePositionCtoV	:	function(insert_array){
			//ある方向・ある面で描画された座標情報群の値をボクセル上での座標に変換
			//第一引数: 現在の No. orientation でのXY座標群

			var	this_opts	=	this.options;
			var	rtn_array	=	new Array();

			var	tmp_orientation	=	this_opts.viewer.orientation;
			var	tmp_number_index	=	this_opts.viewer.number.current;
			for (var i = insert_array.length-1;	i>=0; i--) {
				var	tmp_obj	=	new Array();	//ボクセル上での座標を格納するオブジェクト

				if(tmp_orientation	==	'axial'){
					//真上から見た断面
					tmp_obj[0]	=	insert_array[i][0];
					tmp_obj[1]	=	insert_array[i][1];
					tmp_obj[2]	=	tmp_number_index;

				}else if(tmp_orientation	==	'coronal'){
					//正面からみた断面
					tmp_obj[0]	=	insert_array[i][0];
					tmp_obj[1]	=	tmp_number_index;
					tmp_obj[2]	=	insert_array[i][1];

				}else if(tmp_orientation	==	'sagital'){
					//正面から見て右側面からみた断面
					tmp_obj[0]	= tmp_number_index;
					tmp_obj[1]	=	insert_array[i][0];
					tmp_obj[2]	=	insert_array[i][1];
				}
				rtn_array.push(tmp_obj);
			}
			return	rtn_array;
		},



		getOptions	:	function(){
			//外部からのオプション参照用メソッド
			return	this.options;
		},



		_getStopover	:	function(start_x,start_y,goal_x,goal_y){
			//始点・終点座標を渡すと、その中間を埋める座標群をarrayで返す
			var dist_x	=Math.abs(goal_x	-	start_x);
			var dist_y	=Math.abs(goal_y	-	start_y);
			var tmp_base	=	dist_x;

			if(dist_y	>	dist_x){//縦の移動が大きければ縦を基準に中間点を作成していく
				tmp_base	=	dist_y;
			}
			var rtn_ary	=	new Array();
			for(i=0;i<tmp_base;	i++){
				var ary_x	=	start_x	+	i	*	(goal_x	-	start_x)	/	tmp_base;
				var ary_y	=	start_y	+	i	*	(goal_y	-	start_y)	/	tmp_base;
				rtn_ary.push([Math.round(ary_x),Math.round(ary_y)]);
			}
			return rtn_ary;
			delete rtn_ary;
		},



		historyBack	:	function(){
			//ひとつ手前の手順に戻る
			var	this_obj	=	this;
			var	this_elm	=	this.element;
			var	this_opts	=	this.options;
			this_opts.control.container.historyBack();

			//自分自身、同じボクセルを共用するビューアーに対してコンテナとの同期を促す
			var	tmp_this_id	=this_elm.attr('id');
			for(l=0;	l<this_opts.control.container.data.member.length;	l++){
				$('#'+this_opts.control.container.data.member[l]).imageViewer('syncVoxel');
			}
		},



		historyRedo	:	function(){
			//戻る手順を１つ取消
			var	this_obj	=	this;
			var	this_elm	=	this.element;
			var	this_opts	=	this.options;
			this_opts.control.container.historyRedo();

			//自分自身、同じボクセルを共用するビューアーに対してコンテナとの同期を促す
			var	tmp_this_id	=this_elm.attr('id');
			for(l=0;	l<this_opts.control.container.data.member.length;	l++){
				$('#'+this_opts.control.container.data.member[l]).imageViewer('syncVoxel');
			}
		},



		// 初期化・イベント設置
		_init: function(insert_object){

			var	this_obj	=	this;
			var	this_elm	=	this.element;
			var	this_opts	=	this.options;

			if(insert_object){
				this_opts	=	$.extend(true,this_opts,insert_object);
			}



			//連動用コンテナに自分のidを登録
			var	this_id	=	this_elm.attr('id')
			this_opts.control.container.data.member.push(this_id);
			delete	this_id;

			this_elm.find('.series_image_elm,.canvas_main_elm').attr({
				width	:	this_opts.viewer.position.ow,
				height	:	this_opts.viewer.position.oh
			});

			//コンテナのボクセルXYZ設定
			var	tmp_x	=		512;
			var	tmp_y	=		512;
			var	tmp_z	=		512;



			if(this_opts.viewer.orientation		==	'axial'){
				tmp_x	=	this_opts.viewer.position.ow;
				tmp_y	=	this_opts.viewer.position.oh;
				tmp_z	=	this_opts.viewer.number.maximum;
			}else	if(this_opts.viewer.orientation		==	'sagital'){
				tmp_x	=	this_opts.viewer.number.maximum;
				tmp_y	=	this_opts.viewer.position.ow;
				tmp_z	=	this_opts.viewer.position.oh;
			}else if(this_opts.viewer.orientation		==	'coronal'){
				tmp_x	=	this_opts.viewer.position.ow;
				tmp_y	=	this_opts.viewer.number.maximum;
				tmp_z	=	this_opts.viewer.position.oh;
			}
			this_opts.control.container.setSize(tmp_x,tmp_y,tmp_z);


			//以下各種イベント群
			this_elm.bind('changeImageSrc',function(){
				this_obj._changeImgSrc();
			})
			.bind('getOptions',function(){
				this_obj.getOptions();
			})
			.bind('sync',function(){
				this_obj.syncVoxel();
			});


			//マウスによるパン・描画関連
			this_elm.find('.mouse_cover')
			.bind('mousedown',function(e){
				this_obj._mousedownFunc(e);
			})
			.bind('mousemove',function(e){
				this_obj._mousemoveFunc(e);
			})
			.bind('mouseout',function(e){
				this_obj._mouseoutFunc(e);
			})
			.bind('mouseup',function(e){
				this_obj._mouseupFunc(e);
			});


			//オプション情報の書き換え
			this_elm.bind('setOptions',function(e,tmpSetValues){
				this_obj._setOptions(tmpSetValues);
			});

			//枚数送り関連要素
			if(this_opts.control.slider==true){
				//スライダー
				this_elm.find('.slider_elm').slider({
					value:this_opts.viewer.number.current,
					orientation: 'horizontal',
					min: this_opts.viewer.number.minimum,
					max: this_opts.viewer.number.maximum,
					range: 'min',
					animate: false,
					slide: function(event,ui){
						this_opts.viewer.number.current	=	ui.value;
						this_elm.find('.disp_num').text(ui.value);	//画像右上の枚数表示
						this_obj._changeImgSrc();
						this_elm.imageViewer('syncVoxel');
					//next/prevボタン押下時に発火させるchangeイベント
					},change: function(event,ui){
						this_opts.viewer.number.current	=	ui.value;
						this_elm.find('.disp_num').text(ui.value);	//画像右上の枚数表示
						this_obj._changeImgSrc();
						this_elm.imageViewer('syncVoxel');
					}
				});

				//画像No戻るボタン
				this_elm.find('.btn_prev').click(function(){
					var tmp_num	=	this_opts.viewer.number.current;
					tmp_num	=	Number(tmp_num);
					if(tmp_num>0){	//0番より手前は無い
						tmp_num--;
						this_elm.find('.disp_num').text(tmp_num);	//画像右上の枚数表示
						this_obj._changeImgSrc();
					}
					//レバー追従
					this_elm.find('.slider_elm').slider({
						value	:	tmp_num
					});
					this_elm.imageViewer('syncVoxel');
				});

				//画像No進むボタン
				this_elm.find('.btn_next').click(function(){
					var tmp_num	=	this_opts.viewer.number.current;
					tmp_num	=	Number(tmp_num);
					if(tmp_num<this_opts.viewer.number.maximum){	//上限枚数の制限
						tmp_num++;
						this_elm.find('.disp_num').text(tmp_num);	//画像右上の枚数表示
						this_obj._changeImgSrc();
					}
					//レバー追従
					this_elm.find('.slider_elm').slider({
						value	:	tmp_num
					});
					this_elm.imageViewer('syncVoxel');
				});

				this_elm.find('.btn_prev,.btn_next').mousedown(function(){
					return false;
				});
			}

			//ウインドウレベル・幅関係のイベント設置
			if(this_opts.viewer.elements.window.panel==true){

				var	the_win_controller	=	this_elm.find('.image_window_controller');
				//パネルの表示・非表示操作
				the_win_controller.click(function(e){
					e.stopPropagation();
				});

				//パネルを出す
				this_elm.find('.image_window_controller_wrap').find('.btn_open').click(function(e){
						this_elm.imageViewer('changeMode','window');
				});

				//パネルを消す
				this_elm.find('.image_window_controller_wrap').find('.btn_close').click(function(e){
						this_elm.imageViewer('changeMode','pan');
				});

				//ウインドウサイズ・レベル操作
				//input
				the_win_controller.find('input').change(function(){
					windowValuesChange();
				});

				//プリセット
				the_win_controller.find('.image_window_preset_select').change(function(){
					var	tmp_value	=	$(this).val();
					if(tmp_value	!=	'blank'){
						the_win_controller.find('.image_window_level').val(tmp_value.split(',')[0]);
						the_win_controller.find('.image_window_width').val(tmp_value.split(',')[1]);
						windowValuesChange();
					}
				});

				//input,selectから呼び出す共通関数
				var	windowValuesChange	=	function(){

					//ウインドウレベル
					var	tmp_level	=	the_win_controller.find('.image_window_level').val();
					tmp_level	=	Number(tmp_level);
					if(isFinite(tmp_level)==true){
						//数値であれば上限値・下限値との比較をしてcontrollerを書き換える
						//数値でないときは書き換えが走らないので操作前の値に戻る
						tmp_level	=	Math.min(tmp_level,this_opts.viewer.window.level.maximum);
						tmp_level	=	Math.max(tmp_level,this_opts.viewer.window.level.minimum);
						this_opts.viewer.window.level.current	=	tmp_level;
					}

					//ウインドウサイズ
					var	tmp_width	=	the_win_controller.find('.image_window_width').val();
					tmp_width	=	Number(tmp_width);
					if(isFinite(tmp_width)==true){
						//数値であれば上限値・下限値との比較
						//数値でないときは書き換えが走らないので操作前の値に戻る
						tmp_width	=	Math.min(tmp_width,this_opts.viewer.window.level.maximum);
						tmp_width	=	Math.max(tmp_width,this_opts.viewer.window.level.minimum);
						this_opts.viewer.window.width.current	=	tmp_width;
					}
					this_obj._changeImgSrc();

				}//windowValuesChange
			}//ウインドウレベル・幅関係のイベント設置ここまで



			//ズーム機能
			if(this_opts.control.zoom==true){
				//拡大・縮小
				this_elm.find('.ico_detail_sprite_resize_large,.ico_detail_sprite_resize_short').click(function(){
					if(this_opts.viewer.position.zoom	<=32	&&	1	<=	this_opts.viewer.position.zoom){

						var	resize_value	=	0.5;	//todo確認 １回のプッシュでどの程度ズームインアウトするかの度合の変数はウィジェットの共通変数で持つ方が良い？
						if($(this).hasClass('ico_detail_sprite_resize_large')){
							//拡大
							this_opts.viewer.position.zoom	+=	resize_value;
							this_opts.viewer.position.zoom	=	Math.min(this_opts.viewer.position.zoom,32);
						}else if($(this).hasClass('ico_detail_sprite_resize_short')){
							//縮小
							this_opts.viewer.position.zoom	-=	resize_value;
							this_opts.viewer.position.zoom	=	Math.max(this_opts.viewer.position.zoom,1);
						}

						var tmp_pre_w	=	this_opts.viewer.position.sw;	//拡大処理前のトリミング幅
						var tmp_pre_h	=	this_opts.viewer.position.sh;	//拡大処理前のトリミング高さ

						this_opts.viewer.position.sw 	=	this_opts.viewer.position.ow	/	this_opts.viewer.position.zoom;
						this_opts.viewer.position.sh 	=	this_opts.viewer.position.oh	/	this_opts.viewer.position.zoom;

						var diff_x	=	(this_opts.viewer.position.sw	-	tmp_pre_w)/2;
						var diff_y	=	(this_opts.viewer.position.sh	-	tmp_pre_h)/2;

						this_opts.viewer.position.sx	=	this_opts.viewer.position.sx	-	diff_x;
						this_opts.viewer.position.sy	=	this_opts.viewer.position.sy	-	diff_y;

						//画像右下のズーム表示
						this_elm.find('.current_size').text(100*Number(this_opts.viewer.position.zoom));	//初期発火用

						this_obj._changeImgSrc();
						this_elm.imageViewer('changeMode','pan');
						this_elm.imageViewer('syncVoxel');

						//パンモードに戻すのでウインドウ情報パネルは隠す
						if(this_opts.viewer.elements.window.panel==true){
							this_elm.find('.image_window_controller_wrap').find('.btn_close').trigger('click');
						}
					}
				});

				this_elm.find('.ico_detail_sprite_resize_large,.ico_detail_sprite_resize_short').mousedown(function(){
					return false;
				});
			}//ズーム機能ここまで
			this_elm.find('.current_size').text(100*Number(this_opts.viewer.position.zoom));	//初期発火用

			//諸々のデータ群のセットが終わったところで描画機能発火
			this_obj._changeImgSrc();

		}/*_init*/,



		_mousedownFunc:	function(e){
			var	this_obj	=	this;
			var	this_elm	=	this.element;
			var	this_opts	=	this.options;

			this_obj._tmpInfo.cursor.touch_flg	=	1;

			//マウスの初期位置取得
			this_obj._tmpInfo.cursor.start.X	=	e.clientX;
			this_obj._tmpInfo.cursor.start.Y	=	e.clientY;

			if(this_opts.control.mode	==	'pan'){
				//トリミング領域の初期位置取得
				this_obj._tmpInfo.elementParam.start.X	=	this_opts.viewer.position.sx;
				this_obj._tmpInfo.elementParam.start.Y	=	this_opts.viewer.position.sy;
			}else  if(this_opts.control.mode	==	'pen'	||	this_opts.control.mode	==	'erase'){

				//ラベルを描くcanvas要素のオブジェクト
				var	tmp_ctx	=	this_elm.find('.canvas_main_elm').get(0).getContext('2d');

				//座標計算ここから
				//描画開始する要素の位置（スクリーン全体での位置）
				this_obj._tmpInfo.elementParam.start.X	=	this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left;
				this_obj._tmpInfo.elementParam.start.Y	=	this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top;

				this_obj._tmpInfo.elementParam.start.X	=	Math.round(this_obj._tmpInfo.elementParam.start.X);
				this_obj._tmpInfo.elementParam.start.Y	=	Math.round(this_obj._tmpInfo.elementParam.start.Y);

				//canvas要素の左端を起点としたときのマウス位置(ズーム解除状態でのXY値)
				this_obj._tmpInfo.cursor.current.X	=	(e.clientX	-	this_obj._tmpInfo.elementParam.start.X)	/	this_opts.viewer.position.zoom	+	this_opts.viewer.position.sx;
				this_obj._tmpInfo.cursor.current.Y	=	(e.clientY	-	this_obj._tmpInfo.elementParam.start.Y)	/	this_opts.viewer.position.zoom	+	this_opts.viewer.position.sy;

				this_obj._tmpInfo.label	=	new Array();
				this_obj._tmpInfo.label.push([this_obj._tmpInfo.cursor.current.X,this_obj._tmpInfo.cursor.current.Y]);

				//本来はここで奥にあるラベルを全て描く

				//太さを加味
				this_obj._tmpInfo.label	=	this_obj._applyBoldness(this_obj._tmpInfo.label);
				if(this_opts.control.mode	==	'pen'){
					this_obj.drawLabel(this_opts.viewer.draw.activeLabelId,this_obj._tmpInfo.label);
				}else if(this_opts.control.mode	==	'erase'){
					this_obj.eraseLabel(this_opts.viewer.draw.activeLabelId,this_obj._tmpInfo.label);
				}

				//本来はここで手前にあるラベルを描く
				this_obj._disableImageAlias(tmp_ctx, false);

			}else if(this_opts.control.mode	==	'window'){

				//ウインドウ情報の初期値
				this_obj._tmpInfo.elementParam.start.X	=	this_opts.viewer.window.width.current;
				this_obj._tmpInfo.elementParam.start.Y	=	this_opts.viewer.window.level.current;
			}
		}/*_mousedownFunc*/,



		_mousemoveFunc:	function(e){
			var	this_obj	=	this;
			var	this_elm	=	this.element;
			var	this_opts	=	this.options;

			//手のひらツール
			if(this_opts.control.mode	==	'pan'){
				if(this_obj._tmpInfo.cursor.touch_flg	==	1){

					//シリーズ画像表示要素のオブジェクト
					var	series_image_elm_ctx	=	this_elm.find('.series_image_elm').get(0).getContext('2d');

					//手のひらツール
					var	tmp_x	=	this_obj._tmpInfo.elementParam.start.X	-	(e.clientX	-	this_obj._tmpInfo.cursor.start.X)	/	this_opts.viewer.position.zoom;
					var	tmp_y	=	this_obj._tmpInfo.elementParam.start.Y	-	(e.clientY	-	this_obj._tmpInfo.cursor.start.Y)	/	this_opts.viewer.position.zoom;

					this_opts.viewer.position.sx	=	Math.round(tmp_x);
					this_opts.viewer.position.sy	=	Math.round(tmp_y);
					this_obj._changeImgSrc();
					this_elm.imageViewer('syncVoxel');
				}
			}else if(this_opts.control.mode	==	'pen'	||	this_opts.control.mode	==	'erase'){
				if(this_obj._tmpInfo.cursor.touch_flg	==	1){

					if(this_obj._tmpInfo.cursor.out_flg		==	0){

						//ラベルを描くcanvas要素のオブジェクト
						var	tmp_ctx	=	this_elm.find('.canvas_main_elm').get(0).getContext('2d');

						//新しいマウス位置(ズーム解除状態に換算した際のXY値)
						var	tmp_x	=	(e.clientX	-	this_obj._tmpInfo.elementParam.start.X)	/	this_opts.viewer.position.zoom	+	this_opts.viewer.position.sx;
						var	tmp_y	=	(e.clientY	-	this_obj._tmpInfo.elementParam.start.Y)	/	this_opts.viewer.position.zoom	+	this_opts.viewer.position.sy;

						var	tmp_array	=	new Array();
						//中間点を埋める
						if(Math.abs(this_obj._tmpInfo.cursor.current.X-tmp_x)>1	||	Math.abs(this_obj._tmpInfo.cursor.current.Y	-	tmp_y	)>1	){
							//スキマがあるとき
							tmp_array	=	this_obj._getStopover(this_obj._tmpInfo.cursor.current.X,this_obj._tmpInfo.cursor.current.Y,tmp_x,tmp_y);
						}else{
							//スキマがない、中間点を埋める必要が無いとき
							tmp_array.push([tmp_x,tmp_y]);
							tmp_array.push([this_obj._tmpInfo.cursor.current.X,this_obj._tmpInfo.cursor.current.Y]);
						}

						//太さを加味
						tmp_array	=	this_obj._applyBoldness(tmp_array);
						tmp_array	=	this_obj._reduceOverlap(tmp_array);
						this_obj._tmpInfo.label	=	this_obj._tmpInfo.label.concat(tmp_array);
						this_obj._tmpInfo.label	=	this_obj._reduceOverlap(this_obj._tmpInfo.label);

						if(this_opts.control.mode	==	'pen'){
								this_obj.drawLabel(this_opts.viewer.draw.activeLabelId,tmp_array);
						}else if(this_opts.control.mode	==	'erase'){
								this_obj.eraseLabel(this_opts.viewer.draw.activeLabelId,tmp_array);
						}

						this_obj._disableImageAlias(tmp_ctx, false);

						//本来はここで手前にあるラベルを描く

						//次のmousemoveイベントに備えて {_tmpInfo.cursor.current} 更新
						this_obj._tmpInfo.cursor.current.X	=	tmp_x;
						this_obj._tmpInfo.cursor.current.Y	=	tmp_y;

					}else{
						//新しいマウス位置(ズーム解除状態に換算した際のXY値)
						var	tmp_x	=	(e.clientX	-	this_obj._tmpInfo.elementParam.start.X)	/	this_opts.viewer.position.zoom	+	this_opts.viewer.position.sx;
						var	tmp_y	=	(e.clientY	-	this_obj._tmpInfo.elementParam.start.Y)	/	this_opts.viewer.position.zoom	+	this_opts.viewer.position.sy;
						//次のmousemoveイベントに備えて {_tmpInfo.cursor.current} 更新
						this_obj._tmpInfo.cursor.current.X	=	tmp_x;
						this_obj._tmpInfo.cursor.current.Y	=	tmp_y;
						this_obj._tmpInfo.cursor.out_flg		=	0;
					}
				}
			}else if(this_opts.control.mode	==	'window'){
				if(this_obj._tmpInfo.cursor.touch_flg	==	1){
					//ウインドウ情報書き換えモード
					var	tmp_x	=	this_obj._tmpInfo.elementParam.start.X	+	(e.clientX	-	this_obj._tmpInfo.cursor.start.X)	*	10;
					var	tmp_y	=	this_obj._tmpInfo.elementParam.start.Y	-	(e.clientY	-	this_obj._tmpInfo.cursor.start.Y)	*	10;

					//最大最小のハミダシ防止
					//width
					tmp_x	=	Math.max(this_opts.viewer.window.width.minimum,tmp_x);
					tmp_x	=	Math.min(this_opts.viewer.window.width.maximum,tmp_x);

					//level
					tmp_y	=	Math.max(this_opts.viewer.window.level.minimum,tmp_y);
					tmp_y	=	Math.min(this_opts.viewer.window.level.maximum,tmp_y);

					this_opts.viewer.window.width.current	=	Math.round(tmp_x);
					this_opts.viewer.window.level.current	=	Math.round(tmp_y);

					this_obj._setOptions();
					this_obj._changeImgSrc();
				}
			}
		}/*_mousemoveFunc*/,



		_mouseoutFunc:	function(e){
			var	this_obj	=	this;
			var	this_elm	=	this.element;
			var	this_opts	=	this.options;

			this_obj._tmpInfo.cursor.out_flg		=	1;

			//手のひらツール
			if(this_opts.control.mode	==	'pan'){
				this_obj._tmpInfo.cursor.touch_flg	=	0;
			}else if(this_opts.control.mode	==	'pen'){

			}else if(this_opts.control.mode	==	'window'){
				this_obj._tmpInfo.cursor.touch_flg	=	0;
			}
		}/*_mouseoutFunc*/,



		_mouseupFunc:	function(e){
			var	this_obj	=	this;
			var	this_elm	=	this.element;
			var	this_opts	=	this.options;

			this_obj._tmpInfo.cursor.touch_flg	=	0;
			if(this_opts.control.mode	==	'pan'){
				//手のひらツール

			}else if(this_opts.control.mode	==	'pen'	||	this_opts.control.mode	==	'erase'){
				//ペンまたは消しゴムモード
				//ボクセル上での座標に変換
				this_obj._tmpInfo.label	=	this_obj._exchangePositionCtoV(this_obj._tmpInfo.label);

				//ボクセルコンテナに書き込み
				if(this_obj._tmpInfo.label.length>0){
					//ヒストリ
					this_opts.control.container.addHistory(
						this_obj._tmpInfo.label,
						this_opts.viewer.draw.activeLabelId,
						this_opts.control.mode
					);
					//ボクセル
					this_opts.control.container.updateVoxel(
						this_obj._tmpInfo.label,
						this_opts.viewer.draw.activeLabelId,
						this_opts.control.mode
					);
				}

				//メモリ解放のため配列消去
				this_obj._tmpInfo.label	=	[];

				//同じボクセルを共用するビューアーに対して同期を促す
				var	tmp_this_id	=this_elm.attr('id');
				for(l=0;	l<this_opts.control.container.data.member.length;	l++){
					$('#'+this_opts.control.container.data.member[l]).imageViewer('syncVoxel');
				}
			}
		}/*_mouseupFunc*/,



		/*重複座標を除去する*/
		_reduceOverlap	:	function(insert_array){
			for(p=insert_array.length-1;	p>=0;	p--){
				var	px	=	insert_array[p][0];
				var	py	=	insert_array[p][1];
				for(k=p-1;	k>=0;	k--){
					if(px	==	insert_array[k][0]	&&	py	==	insert_array[k][1]){
						insert_array.splice(p,1);
						break;
					}
				}
			}
			return	insert_array;
		},



		_setOptions	:	function(tmpSetValues){
			var	this_obj	=	this;
			var	this_elm	=	this.element;
			var	this_opts	=	this.options;

			$.extend(true,this_opts,tmpSetValues);

			//ウインドウレベル・サイズ領域に値を入れ込む
			if(this_opts.viewer.elements.window.panel	==	true){
				this_elm.find('.image_window_level').val(this_opts.viewer.window.level.current);
				this_elm.find('.label_level_min').val(this_opts.viewer.window.level.minimum);
				this_elm.find('.label_level_max').val(this_opts.viewer.window.level.maximum);
				this_elm.find('.image_window_width').val(this_opts.viewer.window.width.current);
				this_elm.find('.label_width_min').val(this_opts.viewer.window.width.minimum);
				this_elm.find('.label_width_max').val(this_opts.viewer.window.width.maximum);

				var	tmp_preset_array	=	this_opts.viewer.window.preset;
				if(this_opts.viewer.window.preset.length==0){
					this_elm.find('.image_window_preset_select').empty().append();
				}else{
					var	tmp_elm	=	'<option value="blank">select setting</option>';
					for(i=0;i<tmp_preset_array.length;	i++){
						tmp_elm	=	tmp_elm	+	'<option value="'+tmp_preset_array[i].level+','+tmp_preset_array[i].width+'">'+tmp_preset_array[i].label+'</option>';
					}
					this_elm.find('.image_window_preset_select').empty().append(tmp_elm);
				}
			}
		}/*_setOptions*/,



		syncVoxel	:	function(){

			//ボクセル情報を取得して現在のキャンバスを更新する
			var	this_obj	=	this;
			var	this_opts	=	this.options;

			this_obj._clearCanvas();//初期化

			//今描こうと思っている面のorientationを用意
			var	tmp_orientation	=	this_opts.viewer.orientation;
			var	tmp_now_num	=	this_opts.viewer.number.current;

			//全ラベルについて以下を行う
			for(j=0;	j<this_opts.control.container.data.label.length;	j++){

				//ラベル・方向・現在の向きでの奥行 を渡して塗るべき座標を戻してもらう
				var	tmp_array	=	this_opts.control.container.returnSlice(
													this_opts.control.container.data.label[j].id,
													this_opts.viewer.orientation,
													this_opts.viewer.number.current
												);

				if(tmp_array.length>0){
					this_obj.drawLabel(this_opts.control.container.data.label[j].id,tmp_array);
				}
			}
		}/*syncVoxel*/,


		//動作時に一時的に要素の状態やマウス状態等を保持したいときに格納するオブジェクト
		_tmpInfo	:	{
			cursor	:	{	//移動・拡大時のマウス座標格納用オブジェクト
				start	:	{	X	:	0,	Y	:	0},
				current:	{	X	:	0,	Y	:	0},
				touch_flg	:	0,	//マウス押下状態を示すフラグ,1が押された状態
				out_flg	:	1	//マウスがキャンバス領域の外に居るかどうかのフラグ。１が外
			},
			elementParam	:	{	//マウスで何かを動かす際の初期値格納用変数
					start	:	{	X	:	0,	Y:	0},
					current	:	{	X	:	0,	Y:	0}
			},
			imgCache	:	[],
			label	:	[]	//ペンモードでマウスが一度触れてから離れるまでの描画内容の保存用
		}/*_tmpInfo*/,
  });

})(jQuery);