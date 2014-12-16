$(function(){

	var load_que_max	=	3;	//同時ロード数上限値(詳しくはブラウザ機能等を調査して設定
	var image_window_ratio	=	4;	//ドラッグで明るさ調整をする際のマウス移動に対する値の変化の倍率
	var wrap_elm	=	'#'	+	$('#wrapper').find('.page_unique').attr('id');
	wrap_elm	=	$(wrap_elm);


	/*本来はこのようなかたち・・・
	 * http://localhost:3000/?mode=metadata&series=LIDC-IDRI-0002
	 *	{"x":512,"y":512,"z":261,"window_width":2000,"window_level":0}
	 */

	var img_num	=	series_info.ammount;	//読み込み画像枚数(本来はシリーズごとに変動するので、枚数が取得できたら差し替える)
	var mouse_mode =	'view';	//表示モードなのか閲覧モードなのかの切替
	var resize_value	=	0.5;	//虫眼鏡を1回 叩いた際にどの程度大きさを変えるか(オリジナルに対しての倍率)。仕様は要確認

	//todo過去に描いた物の取り出し・格納・レバー追従について考えよう
	var past_label_obj	=	[];	//このページをロードした時点ですでに描かれていたもの





	//スコープ外から呼び出すための暫定的な変数(todoデータ構造を最適化する。最終形を要検討)
	var	zantei_memory_parent_obj	=	new Array;



	//ラベル表示・非表示切り替え
	//ラベル制御は角度に関係なく連動して動くので各画像内部のスコープの外
	wrap_elm.find('.label_select_area').find('.visible_check').change(function(){
		if($(this).prop('checked')	==true){
			$(this).closest('.label_select_cell').addClass('active');
		}else{
			$(this).closest('.label_select_cell').removeClass('active');
		};

		var the_parent	=	$(this).closest('.label_select_cell');
		the_parent.find('.now_draw_radio').attr('checked','checked').change();
		var target_label	=	the_parent.find('.now_draw_radio').val();

		var the_visible	=	$(this).prop('checked');
		var target_label	=	the_parent.find('.now_draw_radio').val();

		for(i=0;	i<label_info.length;	i++){
			if(label_info[i].name	==	target_label){
				label_info[i].visible	=	the_visible;
			}
		}
		//本来はここで更新処理（すでに描いた線の色を差し替える）


		//暫定処理
		//外部スコープから内部の非表示ボタンのクリックを発火
		wrap_elm.find('.btn_refresh').trigger('click');

	});



	//ラベル色変更
	wrap_elm.find('.label_select_area').find('.color_picker_diff_color').change(function(){
		var the_parent	=	$(this).closest('.label_select_cell');
		the_parent.find('.now_draw_radio').attr('checked','checked').change();

		var the_color	=	$(this).val();
		var target_label	=	the_parent.find('.now_draw_radio').val();

		//各描画エリアの中のスコープに色情報を送る・チェンジイベント発火
		wrap_elm.find('.now_draw_color').val(the_color).change();

		for(i=0;	i<label_info.length;	i++){
			if(label_info[i].name	==	target_label){
				label_info[i].color	=	the_color;
			}
		}
		//本来はここで更新処理（すでに描いた線の色を差し替える）

		for(i=0;	i<zantei_memory_parent_obj.length;	i++){
			//ここでいう i は各キャンバス(の含むmemory_obj)に相当
			var the_line_num	=	zantei_memory_parent_obj[i].length;
			//ここでいうjが各キャンバス上での１筆分の情報
			for(j=0;	j<the_line_num;	j++){
				if(zantei_memory_parent_obj[i][j].label	==target_label){
					zantei_memory_parent_obj[i][j].color	=	the_color;
				}
			}
		}

		//暫定処理
		//外部スコープから内部の非表示ボタンのクリックを発火
		wrap_elm.find('.btn_refresh').trigger('click');

	});

	//todo
	//ラベルの追加ボタンの機能実装
	//追加ボタンで増えたラベル項目へのイベント付与





	//描画ラベルの選択
	wrap_elm.find('.label_select_area').find('.now_draw_radio').change(function(){
		var the_parent	=	$(this).closest('.label_select_cell');

		if($(this).prop('checked')	==	true){
			the_parent.addClass('now_draw')
					.siblings().removeClass('now_draw')
					.find('.now_draw_radio').removeAttr('checked');
		}else{
			the_parent.removeClass('now_draw');
		};
	});





	wrap_elm.find('.img_area').each(function(){


		var	area_elm	=	$(this);

		//canvas要素のオブジェクト
		var	canvas_elm_obj	=	area_elm.find('.canvas_main_elm').get(0);
		var	canvas_elm_ctx	=	canvas_elm_obj.getContext('2d');

		//guide要素のオブジェクト
		var	guide_elm_obj	=	area_elm.find('.canvas_guide_elm').get(0);
		var	guide_elm_ctx	=	guide_elm_obj.getContext('2d');

		//写真要素のオブジェクト
		var	photo_elm_obj	=	area_elm.find('.canvas_photo_elm').get(0);
		var	photo_elm_ctx	=	photo_elm_obj.getContext('2d');

		var	tmp_obj	=new Array();	//描画の記憶のためのオブジェクト
		zantei_memory_parent_obj.push(tmp_obj);

		var memory_obj	=	zantei_memory_parent_obj[zantei_memory_parent_obj.length-1];


		var	reDo_obj	=new Array();	//進むの記憶のためのオブジェクト
		var	touch_flg	=	0;	//マウスが押下状態であることを示すフラグ

		//マウスで何かを動かす際の初期値格納用変数
		var	start_X =0;
		var	start_Y =0;

		//移動・拡大時のマウス座標格納用オブジェクト
		var cursor_info	=	{
			"start"	:	{	"X"	:	0,	"Y"	:	0},
			"current":	{	"X"	:	0,	"Y"	:	0}
		};

		//各種パラメータの格納用のjsonオブジェクト,初期値セット
		//このオブジェクトひとつが描画の１筆に相当する
		var draw_info	=	{
			"mode": "draw",	//描画: draw,消しゴム: erase
			"label": "label_1",
			"weight": 1,
			"color": {
				"code": "#000",
				"alpha": 100
			},
			"point": {
				"start"	: {	"x":	0	,	"y":	0	},
				"current": [{	"x":	0	,	"y":	0	}],	//途中の座標群,array形式で増えていく
				"goal"	: {	"x":	0	,	"y":	0	}
			},
			"z"	:	0,	//奥行の枚目か(レバーで変動)
		}

		//画像表示情報群格納用オブジェクト
		var img_disp_info	=	{
			'ow':512	,	'oh':512,		//元画像を拡大・縮小しない場合のオリジナルサイズ
			'sx':0	,	'sy':0,		//元画像のどの位置からトリミングするか
			'sw':512	,	'sh':512,		//元画像からのトリミング幅
			'dx':0	,	'dy':0,		//貼り付け先キャンバス内座標の左上始点
			'dw':512	,	'dh':512,		//貼りつけサイズ(基本的にはキャンバスの領域いっぱいに表示する)
			'zoom':1
		}

		//画像srcパス情報群格納用オブジェクト
		var img_src_info	=	{
			'name':area_elm.attr('name'),		//axialやsagital等の名前
			'target'	:	'000',
			'wl'	:	2000,	//todo：ウインドウレベル・サイズの初期値定義をどうするか確認
			'ww'	:	32000,
			'load_que'	:	0
		}





		//エイリアス除去・拡大したらドット絵になるのが正
		//描画内容を更新するメソッドの中にも必ず記述する
		imgSmoothDisabled(canvas_elm_ctx, false);
		imgSmoothDisabled(guide_elm_ctx, false);
		imgSmoothDisabled(photo_elm_ctx, false);





		//画面サイズからキャンバスサイズの変更を行う
		var canvasSizeChange	=	function(){
			img_disp_info.dw	=	area_elm.find('.img_wrap').get(0).offsetHeight;
			img_disp_info.dh	=	area_elm.find('.img_wrap').get(0).offsetHeight;

			guide_elm_obj.setAttribute('width',img_disp_info.dw);
			guide_elm_obj.setAttribute('height',img_disp_info.dh);

			canvas_elm_obj.setAttribute('width',img_disp_info.dw);
			canvas_elm_obj.setAttribute('height',img_disp_info.dh);

			photo_elm_obj.setAttribute('width',img_disp_info.dw);
			photo_elm_obj.setAttribute('height',img_disp_info.dh);
		}

		//初期サイズ適用のために発火
		canvasSizeChange();




		//画像表示差し替え挙動(レバー・明るさ・シリーズ差し替えの際等に共通して呼び出す)
		var photoSrcChange =	function (src_data,disp_data){
			if(src_data.ww	<1){
				//ウインドウサイズは最小値ゼロ
				src_data.ww	=1;
			}

			if(img_src_info.load_que<load_que_max){
				var photo_img = new Image();
				photo_img.src	=	series_info.url_base	+'?series='+series_info.series	+'&mode='+src_data.name	+'&target='+img_src_info.target	+'&ww='+src_data.ww	+'&wl='+src_data.wl;
				//photo_img.src=	'http://www.spiritek.co.jp/todaitestimg/img.php?id=4&count=1';
				imgSmoothDisabled(canvas_elm_ctx, false);
				imgSmoothDisabled(guide_elm_ctx, false);
				imgSmoothDisabled(photo_elm_ctx, false);

				//左端の行き過ぎ防止
				if(disp_data.sx<0){
					disp_data.sx	=	0;
				}

				//右端の行き過ぎ防止
				if(disp_data.sx	+	disp_data.sw>disp_data.dw){
					disp_data.sx	=	disp_data.dw	-	disp_data.sw;
				}

				//上端の行き過ぎ防止
				if(disp_data.sy<0){
					disp_data.sy	=	0;
				}

				//下端の行き過ぎ防止
				if(disp_data.sy	+	disp_data.sh>disp_data.dh){
					disp_data.sy	=	disp_data.dh	-disp_data.sh;
				}

				if(photo_img.complete	==	true){
					photo_elm_ctx.clearRect(0,0,disp_data.ow,disp_data.ow);
					photo_elm_ctx.drawImage(photo_img,disp_data.sx,disp_data.sy,disp_data.sw,disp_data.sh,disp_data.dx, disp_data.dy,disp_data.dw,disp_data.dh);
				}else{
					img_src_info.load_que++;
				}
				photo_img.onload = function() {
					img_src_info.load_que--;
					photo_elm_ctx.clearRect(0,0,disp_data.ow,disp_data.ow);
					photo_elm_ctx.drawImage(photo_img,disp_data.sx,disp_data.sy,disp_data.sw,disp_data.sh,disp_data.dx, disp_data.dy,disp_data.dw,disp_data.dh);
				}
			}

			//描画したものがあれば描画キャンバスも更新
			//redo・undoがあるときはたぶん処理が変わるのでそれはここで条件文を追加する
			if(memory_obj.length>0){
				clearCanvas();
				for(i=0;	i<memory_obj.length;	i++){
					drawCommon(memory_obj[i],canvas_elm_ctx);
				}
			}

			//各種の数値表示
			area_elm.find('.disp_num').find('span').text(src_data.target);	//画像右上の枚数表示
			area_elm.find('.image_window_level').val(src_data.wl);	//ウインドウレベル入力欄
			area_elm.find('.image_window_width').val(src_data.ww);	//ウインドウサイズ入力欄

			var the_sw	=	Number(img_disp_info.sw);
			var the_ow	=	Number(img_disp_info.ow);
			var disp_per	=	100 * img_disp_info.zoom;
			area_elm.find('.current_size').text(disp_per);
		}	//photoSrcChange
		photoSrcChange(img_src_info,img_disp_info);	//初期パラメータで一度発火





		//拡大
		area_elm.find('.ico_detail_sprite_resize_large,.ico_detail_sprite_resize_short').click(function(){
			if(img_disp_info.zoom	<32	&&	1	<=	img_disp_info.zoom){

				if($(this).hasClass('ico_detail_sprite_resize_large')){
					//拡大
					img_disp_info.zoom	+=	resize_value;
				}else if($(this).hasClass('ico_detail_sprite_resize_short')){
					//縮小
					img_disp_info.zoom	-=	resize_value;
				}

				var tmp_pre_w	=	img_disp_info.sw;	//拡大処理前のトリミング幅
				var tmp_pre_h	=	img_disp_info.sh;	//拡大処理前のトリミング高さ

				img_disp_info.sw 	=	img_disp_info.ow	/	img_disp_info.zoom;
				img_disp_info.sh 	=	img_disp_info.oh	/	img_disp_info.zoom;
				img_disp_info.sw 	=	Math.round(img_disp_info.sw);
				img_disp_info.sh 	=	Math.round(img_disp_info.sh);

				var diff_x	=	(img_disp_info.sw	-	tmp_pre_w)/2;
				var diff_y	=	(img_disp_info.sh	-	tmp_pre_h)/2;
				diff_x	=	Math.round(diff_x);
				diff_y	=	Math.round(diff_y);

				img_disp_info.sx	=	img_disp_info.sx	-	diff_x;
				img_disp_info.sy	=	img_disp_info.sy	-	diff_y;

				photoSrcChange(img_src_info,img_disp_info);
			}
		});





		//スライダー挙動設置
		area_elm.find('.slider_elm').slider({
			value:1,
			orientation: 'horizontal',
			min: 0,
			max: series_info.ammount,
			range: 'min',
			animate: false,
			slide: function(event,ui){
				img_src_info.target	=	zeroFormat(ui.value,3);
				photoSrcChange(img_src_info,img_disp_info);
			//next/prevボタン押下時に発火させるchangeイベント
			},change: function(event,ui){
				img_src_info.target	=	zeroFormat(ui.value,3);
				photoSrcChange(img_src_info,img_disp_info);
			}
		});

		//画像No戻るボタン
		area_elm.find('.btn_prev').click(function(){
			var the_num	=	img_src_info.target;
			the_num	=	Number(the_num);
			if(the_num>0){	//0番より手前は無い
				the_num--;
				img_src_info.target	=	zeroFormat(the_num,3);
				photoSrcChange(img_src_info,img_disp_info);
			}
			//レバー追従
			area_elm.find('.slider_elm').slider({
				value	:	the_num
			});
		});

		//画像No進むボタン
		area_elm.find('.btn_next').click(function(){
			var the_num	=	img_src_info.target;
			the_num	=	Number(the_num);
			if(the_num<series_info.ammount){	//上限枚数の制限
				the_num++;
				img_src_info.target	=	zeroFormat(the_num,3);
				photoSrcChange(img_src_info,img_disp_info);
			}
			//レバー追従
			area_elm.find('.slider_elm').slider({
				value	:	the_num
			});
		});

		area_elm.find('.btn_prev,.btn_next').mousedown(function(){
			return false;
		});


		//握ったままマウスが外れた時の制御
		area_elm.find('.ui-slider-handle').mouseout(function(){
			$(this).trigger('mouseup');
		});





		/*ウインドウレベル・サイズコントロール*/
		//明度コントローラーパネルを隠す
		area_elm.find('.image_window_controller_erase').click(function(){
			mouse_mode	=	'view';
			$('.img_view_area').removeClass('mode_image_window').addClass('mode_view');
			area_elm.find('.image_window_controller_wrap').slideUp();
		});

		//明度コントローラーパネルを表示する
		area_elm.find('.ico_detail_sprite_image_window').click(function(){
			mouse_mode	=	'image_window';
			$('.img_view_area').removeClass('mode_draw').addClass('mode_image_window');
			area_elm.find('.image_window_controller_wrap').slideDown();
		});

		//プリセット設定の適用
		area_elm.find('.image_window_preset_select').change(function(){
			var temp_lv	=	$(this).val().split(',')[0];
			var temp_width	=	$(this).val().split(',')[1];
			img_src_info.ww	=	Number(temp_width);
			img_src_info.wl	=	Number(temp_lv);
			area_elm.find('.image_window_level').val(img_src_info.wl);
			area_elm.find('.image_window_width').val(img_src_info.ww);
			photoSrcChange(img_src_info,img_disp_info);
		});

		//ウインドウレベルの直接書き換え
		area_elm.find('.image_window_level').change(function(){
			var temp_lv	=	$(this).val();
			img_src_info.wl	=	Number(temp_lv);
			photoSrcChange(img_src_info,img_disp_info);
		});

		//ウインドウサイズの直接書き換え
		area_elm.find('.image_window_width').change(function(){
			var temp_width	=	$(this).val();
			img_src_info.ww	=	Number(temp_width);
			photoSrcChange(img_src_info,img_disp_info);
		});
		/*ウインドウレベル・サイズコントロールここまで*/





		//モード変更
		$('#img_mode_view').change(function(){
			if($(this).prop('checked')==true){
				//閲覧モード
				mouse_mode	=	'view';
				$('.img_view_area').removeClass('mode_draw').addClass('mode_view');
				area_elm.find('.image_window_controller_erase').trigger('click');
			}else{
				//描画モード
				mouse_mode	=	'draw';
				draw_info.mode	=	'draw';
				$('.img_view_area').removeClass('mode_view').addClass('mode_draw');
				area_elm.find('.image_window_controller_erase').trigger('click');
			}
		});

		//それぞれの断面の左上にある鉛筆ボタン、描画モードになる
		area_elm.find('.ico_detail_sprite_pen').click(function(){
			$('#img_mode_draw').prop('checked',true);
			$('#img_mode_view').prop('checked',false).trigger('change');
			mouse_mode	=	'draw';
			draw_info.mode	=	'draw';
			$('.img_view_area').removeClass('mode_view').addClass('mode_draw');
			area_elm.find('.image_window_controller_wrap').slideUp();

		});

		//それぞれの断面の左上にある消しゴムボタン、消しゴムモードになる
		area_elm.find('.ico_detail_sprite_erase').click(function(){
			draw_info.mode	=	'erase';
			mouse_mode	=	'erase';
		});





		//それぞれの断面の左上にある手のひらボタン、閲覧モードになる
		area_elm.find('.ico_detail_sprite_pan').click(function(){
			$('#img_mode_draw').prop('checked',false);
			$('#img_mode_view').prop('checked',true).trigger('change');
		});

		//線の太さ切替
		area_elm.find('.toolbar_weight').change(function(){
			var tmp	=	$(this).val();
			draw_info.weight	=	tmp;
		});

		area_elm.find('.now_move').mousemove(function(e){
			e.preventDefault();
			return false;
		});

		area_elm.find('.img_wrap').mouseup(function(){
			$(this).removeClass('now_move');
			return false;
		});

		area_elm.find('.img_wrap').mouseout(function(){
			$(this).removeClass('now_move');
			return false;
		});




		//描画色の変更
		//全面で色変更は実行するためスコープの外で色を変化させて
		//全てのimg_areaにて下記のchangeイベントを発火する
		area_elm.find('.now_draw_color').change(function(){
			draw_info.color	=	$(this).val();
		});



		//表示ラベル変更
		area_elm.find('.visible_label').change(function(){

			clearCanvas();	//まずはクリアしてから再描画
			//この段階でmemory_objに描画情報が残っていればぞれは全て書き出す
			if(memory_obj.length>0){
				//メモリオブジェクトに格納されている全てのjsonを描画
				//このループの j ひとつひとつが１筆の描画項目
				for(i=0;		i	<memory_obj.length;	i++){
					drawCommon(memory_obj[i],canvas_elm_ctx);
				}
			}

		});




		//マウスイベント設置
		//マウスが滑るだけのパネルのオブジェクト
		var	mouse_panel_obj	=	area_elm.find('.mouse_cover').get(0);
		mouse_panel_obj.addEventListener('mousedown',mousedownFunc,false);
		mouse_panel_obj.addEventListener('mousemove',mousemoveFunc,false);
		mouse_panel_obj.addEventListener('mouseup',mouseupFunc,false);
		//mouse_panel_obj.addEventListener('mouseout',mouseupFunc,false);
		//mouse_panel_obj.addEventListener('mouseover',mousedownFunc,false);


		//マウスが滑ったときに次のmoveイベントまでの間にできる座標群を埋めるため
		//一時的に前のmoveイベントの座標を埋め込むオブジェクト
		var pre_x	=0;
		var pre_y	=0;

		//マウス押下開始
		function mousedownFunc(e){
			touch_flg=1;
			//描画または消しゴムモード
			if(mouse_mode	==	'draw'	||	mouse_mode	==	'erase'){

				//どのラベルで描画を行うかの取得
				draw_info.label	=wrap_elm.find('.label_select_list').find('.now_draw_radio:checked').val();

				//マウス座標(オリジナル画像の左上を始点としてズームなし状態での座標)
				var tmp_x	=	(e.clientX	-	canvas_elm_obj.getBoundingClientRect().left)	/	img_disp_info.zoom	+	img_disp_info.sx;
				var tmp_y	=	(e.clientY	-	canvas_elm_obj.getBoundingClientRect().top)	/	img_disp_info.zoom	+	img_disp_info.sy;

				draw_info.point.start.x	=	Math.round(tmp_x);
				draw_info.point.start.y	=	Math.round(tmp_y);
				draw_info.point.current	=	[];	//array初期化

				if(mouse_mode	==	'draw'){
					//描画モードの場合はキャンバスとガイドを描いていく

					draw_info.mode	=	'draw';
					canvas_elm_ctx.beginPath();
					guide_elm_ctx.beginPath();
				}else{
					draw_info.mode	=	'erase';
				}

				draw_info.point.current.push({	"x":draw_info.point.start.x	,	"y":draw_info.point.start.y	});

				//中間点群を取得するため,このmousemoveイベントを抜ける時点での座標を格納
				pre_x	=	draw_info.point.start.x;
				pre_y	=	draw_info.point.start.y;

			}else if(mouse_mode	==	'image_window'){
				//ウインドウレベル・サイズ調整モード
				cursor_info.start.X	=	e.clientX;	//マウスの初期位置取得
				cursor_info.start.Y	=	e.clientY;
				start_X	=	img_src_info.ww;	//ウインドウサイズ初期値
				start_Y	=	img_src_info.wl;	//ウインドウレベル初期値
			}else{
				//手のひらviewモード
				cursor_info.start.X	=	e.clientX;	//マウスの初期位置取得
				cursor_info.start.Y	=	e.clientY;
				start_X	=	img_disp_info.sx;	//トリミング領域の初期位置取得
				start_Y	=	img_disp_info.sy;
			}
		}	//マウス押下開始ここまで





		//ドラッグ中
		//ドラッグ中はあくまでもガイドレイヤーに描いていき、描画情報は全てjsonに格納していく
		//マウスを離した際 jsonを読みとってメインのcanvasレイヤーに一挙に描画を行う
		function mousemoveFunc(e){
			if(touch_flg==1){
				if(mouse_mode	==	'draw'	||	mouse_mode	==	'erase'){

					//現在表示OKなラベルかどうかのチェック
					//非表示中のラベルであれば描画はしない
					var 	tmp_visible_flg	=	0;
					for(k=	0;	k<label_info.length;	k++){
						if(label_info[k].name	==	draw_info.label){
							if(label_info[k].visible	==	true){
								tmp_visible_flg=1;
							}
						}
					}

					if(tmp_visible_flg	==	1){

						//描画または消しゴムの場合
						clearGuide();
						guide_elm_ctx.scale(1,1);	//縦横比クリア

						var	tmp_mouse_x	=	e.clientX;
						var	tmp_mouse_y	=	e.clientY;
						var	out_flg	=	0;	//領域外に行ったら座標は積まない

						//領域外に出ても繋がる
						if(canvas_elm_obj.getBoundingClientRect().width		+	canvas_elm_obj.getBoundingClientRect().left<	tmp_mouse_x){
							tmp_mouse_x	=	canvas_elm_obj.getBoundingClientRect().width	+	canvas_elm_obj.getBoundingClientRect().left;
							out_flg++;
						}else if(tmp_mouse_x<0){
							tmp_mouse_x	=	0;
							out_flg++;
						}

						if(canvas_elm_obj.getBoundingClientRect().height	+	canvas_elm_obj.getBoundingClientRect().top	<	tmp_mouse_y){
							tmp_mouse_y	=	canvas_elm_obj.getBoundingClientRect().height	+	canvas_elm_obj.getBoundingClientRect().top;
							out_flg++;
						}else if(tmp_mouse_x<0){
							tmp_mouse_y	=	0;
							out_flg++;
						}


						//本当にマウスが滑った座標(ズームなしオリジナルサイズの画像で, 左上を始点とした座標)
						var tmp_x	=	(tmp_mouse_x	-	canvas_elm_obj.getBoundingClientRect().left)	/	img_disp_info.zoom	+	img_disp_info.sx;
						var tmp_y	=	(tmp_mouse_y	-	canvas_elm_obj.getBoundingClientRect().top)	/	img_disp_info.zoom	+	img_disp_info.sy;

						tmp_x	=	Math.round(tmp_x);	//元画像上での座標は必ず整数
						tmp_y	=	Math.round(tmp_y);

						if(	Math.abs(tmp_x-pre_x)>1	||	Math.abs(tmp_y	-	pre_y	)>1	){
							//中間点群を取得するため,この直前のマウスイベントでマウスが居た位置座標を呼び出す
							//現在の座標との間に格納するための座標群を算出
							//始点と終点を渡すと中間点群の座標をarrayで戻す関数を別途定義
							var stopvers_array	=	getStopover(pre_x,pre_y,tmp_x,tmp_y);
							for (i = 0; i < stopvers_array.length; i++) {
							//	draw_info.point.current.push(stopvers_array[i]);
							}
							//中間座標群の算出・埋め込みここまで
						}


						draw_info.point.current.push({"x":tmp_x,"y":tmp_y});	//現在地点
						draw_info.point.current	=	removeOuterPoints(draw_info.point.current,img_disp_info);

						//中間座標の追加が済んだので次のmousemoveイベントに備えてpre_x/pre_yを更新
						pre_x	=	tmp_x;
						pre_y	=	tmp_y;

						if(mouse_mode	==	'draw'){
							//描画モード,ガイドに線を描いていく
							drawCommon(draw_info,guide_elm_ctx);
						}else{
							//消しゴムモード,メインキャンバスを消していく
							drawCommon(draw_info,canvas_elm_ctx);
						}
					}
					draw_info.point.goal	=	{"x":tmp_x,"y":tmp_y};	//ゴール地点は常に更新

				}else if(mouse_mode	==	'image_window'){//ウインドウレベル等の変更モードの場合
					img_src_info.ww	=	(e.clientX	-	cursor_info.start.X)	*	image_window_ratio	+	start_X	;	//ウインドウサイズ
					img_src_info.wl	=	(e.clientY	-	cursor_info.start.Y)	*	image_window_ratio	+	start_Y	;	//ウインドウレベル
					photoSrcChange(img_src_info,img_disp_info);
				}else{
					//手のひらツール
					img_disp_info.sx	=	start_X	-	(	e.clientX	-	cursor_info.start.X)	*		img_disp_info.sw	/	img_disp_info.ow;
					img_disp_info.sy	=	start_Y	-	(	e.clientY	-	cursor_info.start.Y)	*		img_disp_info.sw	/	img_disp_info.ow;

					img_disp_info.sx	=	Math.round(img_disp_info.sx);
					img_disp_info.sy	=	Math.round(img_disp_info.sy);
					photoSrcChange(img_src_info,img_disp_info);
				}
				e.preventDefault();
			}//touch_flgによる制御ここまで
		}	//mousemoveFuncここまで



		//離した時
		function mouseupFunc(){
			if(mouse_mode	==	'draw'){
				if(touch_flg==1){
					//draw object は一度stringify した後にparseすることで最適なjsonになるのでこの行は必須
					var temp_obj	=	JSON.parse(JSON.stringify(draw_info));
					memory_obj.push(temp_obj);	//記憶オブジェクトに今回の描画を記録
					drawCommon(temp_obj,canvas_elm_ctx);	//今回の１筆でメモリオブジェクトに格納していた座標群をメインキャンバスに描画
				}
			}else if(mouse_mode	==	'erase'){
				if(touch_flg==1){
					//draw object は一度stringify した後にparseすることで最適なjsonになるのでこの行は必須
					var temp_obj	=	JSON.parse(JSON.stringify(draw_info));
					memory_obj.push(temp_obj);	//記憶オブジェクトに今回の描画を記録
				}
			}else if(mouse_mode	==	'image_window'){
				//ウインドウサイズ・レベル調整モードの場合のマウスアップ時イベント
				//今現在は特にここで必要な機能は無いがいずれ実装する可能性があるため
				//この条件文は残す
			}
			touch_flg=0;
			clearGuide();	//描画モードにかかわらずマウスが離れたらガイドは消去
		}	//mouseupFuncここまで



		//押したままマウスがキャンバスの外に出たときの関数
		function mouseoutFunc(){
			//touch_flg=0;
		}



		//ガイドをクリア
		function clearGuide(){
			guide_elm_ctx.clearRect(0,0,img_disp_info.dw,img_disp_info.dh);
		}


		//カンバスのクリア
		function clearCanvas(){
			canvas_elm_ctx.clearRect(0,0,img_disp_info.dw,img_disp_info.dh);
		}//クリアボタン関連ここまで



		//保存ボタン
		var	btn_save_obj	=	document.getElementById('btn_save');
		if(btn_save_obj != null){
			btn_save_obj.addEventListener('click',saveCanvas,false);
			function saveCanvas(){
				alert('save!!\n本来はこのタイミングでサーバー通信を行いデータの保存を行う');
			}//保存ボタン関連ここまで
		}





		//ひとつ前に戻すボタン
		area_elm.find('.draw_back').click(function(){
			backCanvas();
		});

		//ひとつ前に戻す機能
		function backCanvas(){
			if(memory_obj.length>0){
				clearCanvas();	//まずはクリアしてから、ひとつ手前まで各描画を再現する
				reDo_obj.push(memory_obj[memory_obj.length-1]);		//memory_obj最後の項目はreDo配列にコピー
				delete memory_obj.pop();	//memory_obj最後の項目は除外

				//この段階でmemory_objに描画情報が残っていればぞれは全て書き出す
				if(memory_obj.length>0){
					//メモリオブジェクトに格納されている全てのjsonを描画
					//このループの j ひとつひとつが１筆の描画項目
					for(i=0;		i	<memory_obj.length;	i++){
						drawCommon(memory_obj[i],canvas_elm_ctx);
					}
				}
			}
		}
		//ひとつ前に戻す機能ここまで







		area_elm.find('.btn_refresh').click(function(){
			refreshCanvas();
		});

		//更新
		function refreshCanvas(){
			if(memory_obj.length>0){
				clearCanvas();
				for(i=0;		i	<memory_obj.length;	i++){
					drawCommon(memory_obj[i],canvas_elm_ctx);
				}
			}
		}
		//ひとつ前に戻す機能ここまで





		//戻すの取消ボタン ReDo
		area_elm.find('.draw_redo').click(function(){
			redoCanvas();
		});

		//戻すの取消機能
		function redoCanvas(){
			if(reDo_obj.length>0){	//reDoオブジェクトが空だったら何もしない
				//reDoオブジェクト末尾の項目のjson内容を描画させる
				var the_num	=	reDo_obj.length-1;
				drawCommon(reDo_obj[the_num],canvas_elm_ctx);
				memory_obj.push(reDo_obj[reDo_obj.length-1]);	//最後の項目はメモリ配列にコピー
				reDo_obj.pop();	//最後の項目は除外
			}
		}
		//戻すの取消ここまで





		//キャンバス描画の共通挙動
		//1筆分の挙動 (redoや再描画等を行う場合はこれを必要な配列分繰り返し発火させる
		//第一引数	:描画を行うパスの座標情報群
		function drawCommon(target_object,target_canvas_ctx){

			//現在visible状態の場合のみ描画
			var	tmp_visible_flg	=	false;
			for(k=0;	k<label_info.length;	k++){
				if(label_info[k].name	==	target_object.label){
					tmp_visible_flg	=	label_info[k].visible;
					break;
				}
			}

			if(tmp_visible_flg	==	true){

				var	tmp_w		=	img_disp_info.zoom	*	target_object.weight;
				var	tmp_num	=	target_object.point.current.length;

				for(j=0;	j	<	tmp_num;	j++){
					var tmp_x	=	(target_object.point.current[j].x	-	img_disp_info.sx	-	target_object.weight*0.5);
					var tmp_y	=	(target_object.point.current[j].y	-	img_disp_info.sy	-	target_object.weight*0.5);

					/*カーソルが四角の中央になるように線幅の半分だけ位置補正*/
					tmp_x	=	Math.floor(tmp_x)	*	img_disp_info.zoom;
					tmp_y	=	Math.floor(tmp_y)	*	img_disp_info.zoom;

					if(target_object.mode	==	'draw'){
						// 指定座標に四角いタイルを置くような描画
						target_canvas_ctx.beginPath();
						target_canvas_ctx.fillStyle	=		target_object.color;	//色指定
						target_canvas_ctx.lineWidth 	=		0;	//線幅指定
						target_canvas_ctx.fillRect(tmp_x,tmp_y,tmp_w,tmp_w);
						//target_canvas_ctx.strokeRect(tmp_x,tmp_y,tmp_w,tmp_w);
					}else if(target_object.mode	==	'erase'){
						 // 指定座標を消していく
						target_canvas_ctx.clearRect(tmp_x,tmp_y,tmp_w,tmp_w);
					}
				}

				imgSmoothDisabled(canvas_elm_ctx, false);

			}
		}//drawCommon キャンバス描画ここまで

	});	//$('.img_area').eachここまで

});





//始点と終点の座標を渡すと中間を埋める座標群をarrayで返す関数
var getStopover	=	function(start_x,start_y,goal_x,goal_y){
	var dist_x	=Math.abs(goal_x	-	start_x);
	var dist_y	=Math.abs(goal_y	-	start_y);
	var return_array	=	new Array();
	var the_base	=	dist_x;

	//縦の移動が大きければ縦を基準に中間点を作成していく
	if(Math.max(dist_x,dist_y)==dist_y){
		the_base	=	dist_y;
	}
	for(i=0;i<the_base;	i++){
		var array_x	=	start_x	+	i	*	(goal_x	-	start_x)	/	the_base;
		var array_y	=	start_y	+	i	*	(goal_y	-	start_y)	/	the_base;
		array_x	=	Math.round(array_x);
		array_y	=	Math.round(array_y);
		return_array.push({	"x":array_x	,	"y":array_y	});
	}
	return return_array;

}





//アンチエイリアス処理除去
//第一引数	:	コンテキストオブジェクト
//第二引数	：	trueまたはfalse
var imgSmoothDisabled	=	function(the_ctx, state){
	 the_ctx.mozImageSmoothingEnabled = state;
	 the_ctx.oImageSmoothingEnabled = state;
	 the_ctx.webkitImageSmoothingEnabled = state;
	 the_ctx.imageSmoothingEnabled = state;
	 the_ctx.antialias = 'none';
	 the_ctx.patternQuality = 'fast';
}



//枠外ポイントを除外
var	removeOuterPoints	=	function(target_array,limit_array){

	var	tmp_array_num	=	target_array.length;
	for(i=tmp_array_num-1;	-1<i;	i--){
		var	delete_flg	=	0;
		if(limit_array.sx		>	target_array[i].x){
				delete_flg++;
		}
		if(limit_array.sx	+	limit_array.sw	<	target_array[i].x){
				delete_flg++;
		}

		if(limit_array.sy		>	target_array[i].y){
				delete_flg++;
		}
		if(limit_array.sy	+	limit_array.sh	<	target_array[i].y){
				delete_flg++;
		}
		if(delete_flg	>0){
			delete target_array[i];
		}
	}
	return target_array;

}





//桁数整形
var zeroFormat=function(e,t){var n=String(e).length;if(t>n){return(new Array(t-n+1)).join(0)+e}else{return e}}