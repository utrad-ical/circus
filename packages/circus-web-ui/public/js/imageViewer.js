//	imageViewer
;
(function ($) {

  //プラグインメイン
  $.widget('ui.imageViewer', {	//	ビューアーごとオプション、デフォルト値
    options: {
      control: {	//コントロール機能の有無
        show: true, //そもそもコントロールパネルを置くかどうか
        zoom: true, //虫眼鏡
        slider: true, //枚数送りレバー
        mode: 'pan', //pan,pen,erase,window,external
        container: '' //指定必須,ラベル情報の格納用オブジェクト
      },
      viewer: {	//中身の情報群
        id: 'viewer_0',
        orientation: 'axial', //断面
        src: '', //baseURL
        window: {	//todo	今回ははコントローラから電波
          level: {
            current: 0,
            maximum: 0,
            minimum: 0
          },
          width: {
            current: 0,
            maximum: 0,
            minimum: 1
          },
          preset: []	//sample	{label: 'your	preset	label' , level: 1000 , width : 4000}
        },
        number: {
          current: 0,
          maximum: 512,
          minimum: 1
        },
        loadQue: {//画像ロードのずれ防止のためのキュー
          current: 0,
          maximum: 3
        },
        elements: {
          slider: {		//枚数送りのスライダーと枚数表示
            panel: true, //スライダーの表示有無
            display: true //枚数表示の表示有無
          },
          zoom: {	//虫眼鏡と拡大率表示
            panel: true,
            display: true
          },
          window: {	//windowレベル・幅の操作パネル
            panel: true		//todo	これがtrueならパネルを表示させる
          }
        },
        position: {	//写真の表示位置・サイズに関する情報群,512はデフォルト値
          ow: 512, oh: 512, //元画像の拡大・縮小なし状態でのオリジナルサイズ
          sx: 0, sy: 0, 	//元画像のどの位置からトリミング表示するか
          sw: 512, sh: 512, 	//元画像からのトリミング幅・高さ
          dw: 512, dh: 512, //貼りつけサイズ(基本的にはキャンバスの領域いっぱいに表示する)	todo:シリーズ情報から参照して上書き
          zoom: 1				//元画像に対しての拡大率
        },
        draw: {
          activeSeriesId: '',
          boldness: 1,
          series: [
            {
              activeLabelId: '', //現在の描画対象ラベル
              id: '',
              label: [
                /*
                 描画情報格納用,今現在表示しているz軸で塗られているxy座標の集合を格納する。ラベルにつき１項目ずつ
                 {	id : 'label_1', rgba : rgba(0,0,0,1),position:[] ,visible : true				}
                 */
              ]
            }
          ]
        },
        voxel: {
          x: 512,
          y: 512,
          z: 512,
          voxel_x: 1,
          voxel_y: 1,
          voxel_z: 1
        }
      }
    },


    addLabelObject: function (series_id, label_obj) {

      //ラベル追加
      var this_obj = this;
      var this_opts = this.options
      var tmp_add_label_obj = {
        color: label_obj.color,
        id: label_obj.id,
        position: new Array(0),
        rgba: label_obj.rgba,
        visible: label_obj.visible
      };

      var target_series = this_obj.getSeriesObjectById(series_id);
      if (typeof target_series.label != 'object') {
        target_series.label = new Array(0);
        target_series.activeLabelId = tmp_add_label_obj.id;
      }

      target_series.label.push(tmp_add_label_obj);
      if (target_series.label.length == 1) {
        target_series.activeLabelId = tmp_add_label_obj.id;
      }
    },


    _applyBoldness: function (insert_array) {
      //ペンで描いた状態の座標群と現時点での太さ指定を踏まえ,塗るべきマス目の集合に変換する
      var this_obj = this;
      var this_opts = this.options
      var rtn_array = new Array(0);
      var the_boldness = this_opts.viewer.draw.boldness;

      for (var i = insert_array.length - 1; i >= 0; i--) {
        for (var k = the_boldness - 1; k >= 0; k--) {	//x軸
          for (var l = the_boldness - 1; l >= 0; l--) {	//y軸
            var tmp_x = insert_array[i][0] - the_boldness * 0.5 + k;
            var tmp_y = insert_array[i][1] - the_boldness * 0.5 + l;
            rtn_array.push([tmp_x, tmp_y]);
          }
        }
      }
      return rtn_array;
    },


    _changeImgSrc: function () {
      //画像表示差し替え挙動(レバー・明るさ・シリーズ差し替えの際等に共通して呼び出す)
      //第一引数:捜査対象コンテキスト
      //第二引数:ソース情報(URL情報)
      //第三引数:表示情報(画角・トリミング情報等)
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      var target_ctx = this_elm.find('.series_image_elm').get(0).getContext('2d');

      //右端の行き過ぎ防止
      if (this_opts.viewer.position.sx + this_opts.viewer.position.sw > this_opts.viewer.position.ow) {
        this_opts.viewer.position.sx = this_opts.viewer.position.ow - this_opts.viewer.position.sw;
      }

      //下端の行き過ぎ防止
      if (this_opts.viewer.position.sy + this_opts.viewer.position.sh > this_opts.viewer.position.oh) {
        this_opts.viewer.position.sy = this_opts.viewer.position.oh - this_opts.viewer.position.sh;
      }

      //左端の行き過ぎ防止
      this_opts.viewer.position.sx = Math.max(this_opts.viewer.position.sx, 0);
      //上端の行き過ぎ防止
      this_opts.viewer.position.sy = Math.max(this_opts.viewer.position.sy, 0);

      //以下、画像src差し替え
      var src_url = this_opts.viewer.src + '?series=' + this_opts.viewer.draw.activeSeriesId + '&mode=' + this_opts.viewer.orientation + '&wl=' + this_opts.viewer.window.level.current + '&ww=' + this_opts.viewer.window.width.current + '&target=' + this_opts.viewer.number.current;

      var tmp_img_obj = new Image;
      var changeMain = function () {
        target_ctx.clearRect(0, 0, this_opts.viewer.position.dw, this_opts.viewer.position.dh);
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
      var tmp_request_flg = true;
      var cache_num = this_obj._tmpInfo.imgCache.length;
      for (var i = cache_num - 1; i >= 0; i--) {
        if (this_obj._tmpInfo.imgCache[i].src == src_url) {
          tmp_img_obj = this_obj._tmpInfo.imgCache[i];
          tmp_request_flg = false;
        }
      }

      //初めてリクエストを出す場合
      if (tmp_request_flg == true) {
        if (this_opts.viewer.loadQue.current < this_opts.viewer.loadQue.maximum) {
          var tmp_img_obj = new Image();
          tmp_img_obj.src = src_url;

          if (tmp_img_obj.complete == true) {
            changeMain();
            this_obj._tmpInfo.imgCache.push(tmp_img_obj);
          } else {
            this_opts.viewer.loadQue.current++;
          }

          tmp_img_obj.onload = function () {
            this_opts.viewer.loadQue.current--;
            //ロード完了時点でその画像がまだ参照先として指定されたものであればキャンバスを書き換え
            if (tmp_img_obj.src == this_opts.viewer.src + '?series=' + this_opts.viewer.draw.activeSeriesId + '&mode=' + this_opts.orientation + '&wl=' + this_opts.viewer.window.level.current + '&ww=' + this_opts.viewer.window.width.current + '&target=' + this_opts.viewer.number.current) {
              changeMain();
            } else {
              this_obj._changeImgSrc();
            }
          }

          tmp_img_obj.onerror = function () {
            this_opts.viewer.loadQue.current--;
          }
        }
      } else {
        //すでにリクエストを出していてロードされている場合
        changeMain();
      }

      this_obj._disableImageAlias(target_ctx, false);
      this_elm.find('.image_window_controller_wrap').find('.win_lv_label').text(this_opts.viewer.window.level.current);
      this_elm.find('.image_window_controller_wrap').find('.win_width_label').text(this_opts.viewer.window.width.current);
      this_elm.find('.image_window_controller_wrap').find('.image_window_controller').find('.image_window_level').val(this_opts.viewer.window.level.current);
      this_elm.find('.image_window_controller_wrap').find('.image_window_controller').find('.image_window_width').val(this_opts.viewer.window.width.current);

    }    /*_changeImgSrc*/,


    changeMode: function (new_mode) {
      //モード切替処理
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      if (this_opts.control.mode != new_mode) {
        this_opts.control.mode = new_mode;
        this_elm.trigger('onModeChange', [this_opts.viewer.id, new_mode]);
        //ここでは変更のあったビューアーのidと適用後のモードを生成して外から取れる状態にするだけ
        //具体的な処理はコントローラ側

        var the_win_controller = this_elm.find('.image_window_controller');
        if (this_opts.control.mode == 'window') {
          //パネルを出す
          the_win_controller.slideDown(200);
          this_elm.find('.image_window_controller_wrap').find('.btn_close').show();
          this_elm.find('.image_window_controller_wrap').find('.btn_open').hide();
        } else {
          //パネルを消す
          the_win_controller.slideUp(200);
          this_elm.find('.image_window_controller_wrap').find('.btn_close').hide();
          this_elm.find('.image_window_controller_wrap').find('.btn_open').show();
        }

        //カーソルcss用クラス変更
        this_elm.removeClass('mode_pan mode_pen mode_window	mode_erase');
        if (this_opts.control.mode == 'erase') {
          this_elm.addClass('mode_erase');
        } else if (this_opts.control.mode == 'window') {
          this_elm.addClass('mode_window');
        } else if (this_opts.control.mode == 'pen') {
          this_elm.addClass('mode_pen');
        } else if (this_opts.control.mode == 'pan') {
          this_elm.addClass('mode_pan');
        } else if (this_opts.control.mode == 'measure') {
          this_elm.addClass('mode_measure');
        } else if (this_opts.control.mode == 'bucket') {
          this_elm.addClass('mode_bucket');
        }
      }
    },


    changeSeries: function (seriesId) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      this_opts.viewer.draw.activeSeriesId = seriesId;

      this_obj.setCanvasSize();
      this_obj._changeImgSrc();
    },


    _clearCanvas: function () {
      var this_obj = this;
      var this_elm = this.element;

      //カンバスのクリア
      this_elm.find('.canvas_main_elm').get(0).getContext('2d').clearRect(0, 0, this_obj.options.viewer.position.dw, this_obj.options.viewer.position.dh);
    },


    _create: function (insert_obj) {

      //ウィジェット発動時に一番最初に走る
      //optionsに応じて要素生成
      //設置した要素へのイベント発行は	_setEventsにて
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      //キャンバス要素群生成
      var createCanvas = function () {
        var tmp_elm = '';
        tmp_elm = tmp_elm + '<div	class="img_wrap">'; //画像枠,入れ子を作るので開始タグのみ
        tmp_elm = tmp_elm + '<canvas	class="canvas_elm	series_image_elm"></canvas>';//背景画像
        tmp_elm = tmp_elm + '<canvas	class="canvas_elm	canvas_main_elm"></canvas>';//ラベルを描くキャンバス	todo:ラベルがあれば、という条件文を付けよう
        tmp_elm = tmp_elm + '<div	class="mouse_cover"></div>';//マウス挙動キャッチ用要素
        tmp_elm = tmp_elm + '</div>';//画像枠,閉じタグ
        this_elm.append(tmp_elm);
        delete    tmp_elm;
      }
      createCanvas();
      //キャンバス要素群生成ここまで

      //ウインドウレベル・サイズ変更パネル
      if (this_opts.viewer.elements.window.panel == true) {
        var tmp_elm = '<div	class="image_window_controller_wrap"><p	class="btn_open">L:<span	class="win_lv_label">' + this_opts.viewer.window.level.current + '</span>\
					/	W:<span	class="win_width_label">' + this_opts.viewer.window.width.current + '</span></p>\
					<p	class="btn_close"></p><ul	class="image_window_controller">';

        //レベル
        tmp_elm = tmp_elm + '<li	class="window_level_wrap"><span	class="image_window_controller_label">window	level</span>\
					<input	type="text"	class="image_window_level"	value="' + this_opts.viewer.window.level.current + '">\
					<span	class="label_level_min">' + this_opts.viewer.window.level.minimum + '</span>	～	\
					<span	class="label_level_max">' + this_opts.viewer.window.level.maximum + '</span></li>';

        //幅
        tmp_elm = tmp_elm + '<li	class="window_width_wrap"><span	class="image_window_controller_label">window	width</span>\
					<input	type="text"	class="image_window_width"	value="' + this_opts.viewer.window.width.current + '">\
					<span	class="label_width_min">' + this_opts.viewer.window.width.minimum + '</span>	-	\
					<span	class="label_width_max">' + this_opts.viewer.window.width.maximum + '</span></li>';

        //プリセット
        if (this_opts.viewer.window.preset.length > 0) {
          var tmp_opts = '<option	value="blank">select	setting</option>';
          for (var i = this_opts.viewer.window.preset.length - 1; i >= 0; i--) {
            tmp_opts = tmp_opts + '<option	value="' + this_opts.viewer.window.preset[i].level + ',' + this_opts.viewer.window.preset[i].width + '">' + this_opts.viewer.window.preset[i].label + '</option>';
          }
          tmp_elm = tmp_elm + '<li	class="window_preset_wrap"><select	class="image_window_preset_select">' + tmp_opts + '</select></li>';
        }

        tmp_elm = tmp_elm + '</ul></div>';
        this_elm.find('.img_wrap').append(tmp_elm);
        delete    tmp_elm;
      }


      //枚数送り関連要素
      if (this_opts.viewer.elements.slider.panel == true) {
        //スライダー
        var tmp_elm = '<div	class="btn_prev	common_btn">Prev</div><div	class="slider_outer">\
				<div	class="slider_elm"></div></div><div	class="btn_next	common_btn">Next</div><div	class="clear">&nbsp;</div>';
        this_elm.prepend(tmp_elm);
        delete    tmp_elm;
      }
      if (this_opts.viewer.elements.slider.display == true) {
        //枚数表示枠	todo枚数テキストは後で入れる形式にする

        var tmp_disp_num = this_opts.viewer.number.current + 1;
        var tmp_elm = '<p	class="disp_num">' + this_opts.viewer.number.current + '</p>';
        this_elm.find('.img_wrap').append(tmp_elm);
        delete    tmp_elm;
      }

      //ズーム機能関連要素
      if (this_opts.viewer.elements.zoom.panel == true) {
        var tmp_elm = '<div	class="img_toolbar_wrap"><ul	class="img_toolbar">\
											<li	class="toolbar_btn	ico_detail_sprite	ico_detail_sprite_resize_large"></li>\
											<li	class="toolbar_btn	ico_detail_sprite	ico_detail_sprite_resize_short"></li>\
										</ul></div>';
        this_elm.find('.img_wrap').prepend(tmp_elm);
        delete    tmp_elm;
      }

      if (this_opts.viewer.elements.zoom.display == true) {
        //ズーム表示枠	todo	パーセントのテキストは後で入れる形式にする
        this_elm.find('.img_wrap').append('<p	class="disp_size"><span	class="current_size"></span>%</p>');
      }

    },


    createSaveData: function (series_id, label_id) {
      //保存用データを作成する
      var this_obj = this;
      var this_opts = this.options;
      var return_data = this_opts.control.container.createSaveData(series_id, label_id);
      return return_data;
    },


    deleteLabelObject: function (series_id, label_id) {

      var this_obj = this;
      var this_opts = this.options
      var target_series = this_obj.getSeriesObjectById(series_id);
      for (var i = 0; i < target_series.label.length; i++) {
        if (target_series.label[i].id == label_id) {
          target_series.label.splice(i, 1);
          this_opts.control.container.deleteLabelObject(series_id, label_id);
          break;
        }
      }
    },


    _disableImageAlias: function (target_context, state) {
      //アンチエイリアス処理変更
      //第1引数 : 対象とするコンテキストオブジェクト
      //第2引数 : 適用するステータス(trueまたはfalse)
      target_context.mozImageSmoothingEnabled = state;
      target_context.oImageSmoothingEnabled = state;
      target_context.webkitImageSmoothingEnabled = state;
      target_context.imageSmoothingEnabled = state;
      target_context.antialias = 'none';
      target_context.patternQuality = 'fast';
    },


    drawLabel: function (series_id, label_id, positions_array) {
      //塗り機能
      //第1引数 : 対象ラベル
      //第2引数 : 塗る点の集合の配列	[x,y,z],[x2,y2,z2]...

      var this_obj = this;
      var this_elm = this_obj.element;
      var this_opts = this_obj.options;
      var tmp_ctx = this_elm.find('.canvas_main_elm').get(0).getContext('2d');
      var tmp_orientation = this_opts.viewer.orientation;

      //描画対象ラベルのチェック
      var target_label = this_obj.getLabelObjectById(label_id, series_id);

      if (target_label.visible == true) {
        var tmp_sx = this_opts.viewer.position.sx;
        var tmp_sy = this_opts.viewer.position.sy;
        var bold_width = this_opts.viewer.position.zoom * this_opts.viewer.position.dw / this_opts.viewer.position.ow;
        var bold_height = this_opts.viewer.position.zoom * this_opts.viewer.position.dh / this_opts.viewer.position.oh;
        tmp_ctx.beginPath();
        for (var i = positions_array.length - 1; i >= 0; i--) {
          var tmp_x = 0;
          var tmp_y = 0;
          if (tmp_orientation == 'axial') {
            tmp_x = positions_array[i][0];
            tmp_y = positions_array[i][1];
          } else if (tmp_orientation == 'coronal') {
            tmp_x = positions_array[i][0];
            tmp_y = positions_array[i][2];
          } else if (tmp_orientation == 'sagital') {
            tmp_x = positions_array[i][1];
            tmp_y = positions_array[i][2];
          }
          tmp_x = (tmp_x - tmp_sx) * bold_width;
          tmp_y = (tmp_y - tmp_sy) * bold_height;
          tmp_ctx.rect(tmp_x, tmp_y, bold_width, bold_height);
        }
        tmp_ctx.fillStyle = target_label.rgba;
        tmp_ctx.fill();
        tmp_ctx.closePath();
      }
    },//drawCommon	キャンバス描画ここまで


    eraseLabel: function (series_id, label_id, positions_array) {
      //塗り機能
      //第1引数 : 対象ラベル
      //第2引数 : 塗る点の集合の配列(boxel上でのxy値)

      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      var tmp_ctx = this_elm.find('.canvas_main_elm').get(0).getContext('2d');

      //描画対象ラベルのチェック
      var target_label = this_obj.getLabelObjectById(label_id, series_id);
      var array_num = positions_array.length;
      var tmp_zoom = this_opts.viewer.position.zoom;

      tmp_ctx.beginPath();
      for (var i = array_num - 1; i >= 0; i--) {
        var tmp_x = (positions_array[i][0] - this_opts.viewer.position.sx) * tmp_zoom;
        var tmp_y = (positions_array[i][1] - this_opts.viewer.position.sy) * tmp_zoom;
        tmp_ctx.clearRect(tmp_x, tmp_y, tmp_zoom, tmp_zoom);
      }
      tmp_ctx.closePath();

    },//drawCommon	キャンバス描画ここまで


    _exchangePositionCtoV: function (insert_array) {
      //ある方向・ある面で描画された座標情報群の値をボクセル上での座標に変換
      //第一引数: 現在の	No.	orientation	でのXY座標群

      var this_opts = this.options;
      var rtn_array = new Array(0);
      var tmp_orientation = this_opts.viewer.orientation;
      var tmp_number_index = this_opts.viewer.number.current;

      for (var i = insert_array.length - 1; i >= 0; i--) {
        var tmp_obj = new Array(); //ボクセル上での座標を格納するオブジェクト
        if (tmp_orientation == 'axial') {
          //真上から見た断面
          tmp_obj[0] = Math.floor(insert_array[i][0] * this_opts.viewer.position.ow / this_opts.viewer.position.dw);
          tmp_obj[1] = Math.floor(insert_array[i][1] * this_opts.viewer.position.oh / this_opts.viewer.position.dh);
          tmp_obj[2] = tmp_number_index;
        } else if (tmp_orientation == 'coronal') {
          //正面からみた断面
          tmp_obj[0] = Math.floor(insert_array[i][0] * this_opts.viewer.position.ow / this_opts.viewer.position.dw);
          tmp_obj[1] = tmp_number_index;
          tmp_obj[2] = Math.floor(insert_array[i][1] * this_opts.viewer.position.oh / this_opts.viewer.position.dh);
        } else if (tmp_orientation == 'sagital') {
          //正面から見て右側面からみた断面
          tmp_obj[0] = tmp_number_index;
          tmp_obj[1] = Math.floor(insert_array[i][0] * this_opts.viewer.position.ow / this_opts.viewer.position.dw);
          tmp_obj[2] = Math.floor(insert_array[i][1] * this_opts.viewer.position.oh / this_opts.viewer.position.dh);
        }
        rtn_array.push(tmp_obj);
      }

      return rtn_array;
    },


    getOptions: function () {
      //外部からのオプション参照用メソッド
      return this.options;
    },


    getLabelObjectById: function (label_id, series_id) {

      //描画対象ラベルのチェック
      var this_obj = this;
      var this_opts = this.options;
      var tmp_the_series = this_obj.getSeriesObjectById(series_id);

      for (var i = tmp_the_series.label.length - 1; i >= 0; i--) {
        if (tmp_the_series.label[i].id == label_id) {
          return tmp_the_series.label[i];
          break;
        }
      }

    },


    _getBucketFillPositions: function(series_id,label_id,pointed_position){
   	 //バケツ発動用関数
   	 // 第一引数: 対象シリーズid
   	 // 第二引数: 対象ラベルid
   	 // クリックされたポイントの縮尺ナシXYZ座標 [X,Y,Z]
console.log(series_id,label_id,pointed_position);
   	 var this_obj = this;
       var this_elm = this.element;
       var this_opts = this.options;

   	 //今の向き・奥行ですでに描画・格納されている情報をコンテナから取得
       var the_painted_positions_in_target_slice = this_opts.control.container.returnSlice(
   		 series_id,
   		 label_id,
          this_opts.viewer.orientation,
          this_opts.viewer.number.current
        );
console.log(this_opts);
console.log(the_painted_positions_in_target_slice);
       //返ってくる形式
       //[[X1,Y1,Z1],[X2,Y2,Z3]......]


       /*ここからバケツフィル機能*/
// TODO forの処理を修正 コメント書く リファクタリング　バケツ全体
      var max_x = 0;
      var max_y = 0;

      if (this_opts.viewer.orientation === 'axial') {
        max_x = this_opts.viewer.voxel.x;
        max_y = this_opts.viewer.voxel.y;
      } else if (this_opts.viewer.orientation === 'coronal') {
        max_x = this_opts.viewer.voxel.x;
        max_y = this_opts.viewer.voxel.z;
      } else if (this_opts.viewer.orientation === 'sagital') {
        max_x = this_opts.viewer.voxel.y;
        max_y = this_opts.viewer.voxel.z;
      } 

      var paint_map = new Array(max_y);
      for (var count = paint_map.length-1; count >= 0; count--) {
        paint_map[count] = new Uint8Array(max_x);
      }

      for (var count = the_painted_positions_in_target_slice.length-1; count >= 0; count--) {
        if (this_opts.viewer.orientation === 'axial') {
          paint_map[the_painted_positions_in_target_slice[count][1]][the_painted_positions_in_target_slice[count][0]] = 1;
        } else if (this_opts.viewer.orientation === 'coronal') {
          paint_map[the_painted_positions_in_target_slice[count][2]][the_painted_positions_in_target_slice[count][0]] = 1;
        } else if (this_opts.viewer.orientation === 'sagital') {
          paint_map[the_painted_positions_in_target_slice[count][2]][the_painted_positions_in_target_slice[count][1]] = 1;
        }
      }
console.log(paint_map);
//TODO 名前を変えること
  var position_x = 0;
  var position_y = 0;
  var other = 0;

    if (this_opts.viewer.orientation === 'axial') {
      position_x = pointed_position[0];
      position_y = pointed_position[1];
      other = pointed_position[2];
    } else if (this_opts.viewer.orientation === 'coronal') {
      position_x = pointed_position[0];
      position_y = pointed_position[2];
      other = pointed_position[1];
    } else if (this_opts.viewer.orientation === 'sagital') {
      position_x = pointed_position[1];
      position_y = pointed_position[2];
      other = pointed_position[0];
    }
  
  var point = new Array();
  point.push(position_x);
  point.push(position_y);

  var position = new Array();
  position.push(point);

  while (position.length != 0) {
    var point = position.shift();
    if (paint_map[point[1]][point[0]+1] == 0) {
      paint_map[point[1]][point[0]+1] = 1;
      var next_point = [point[0]+1,point[1]];
      position.push(next_point);
    }
    if (paint_map[point[1]+1][point[0]] == 0) {
      paint_map[point[1]+1][point[0]] = 1;
      var next_point = [point[0],point[1]+1];
      position.push(next_point);
    }
    if (paint_map[point[1]][point[0]-1] == 0) {
      paint_map[point[1]][point[0]-1] = 1;
      var next_point = [point[0]-1,point[1]];
      position.push(next_point);
    }
    if (paint_map[point[1]-1][point[0]] == 0) {
      paint_map[point[1]-1][point[0]] = 1;
      var next_point = [point[0],point[1]-1];
      position.push(next_point);
    }
  }
// TODO コメント書く、リファクタリング
var target_position_array = new Array();

  for (var row = paint_map.length-1; row >= 0; row--) {
    for (var count = paint_map[row].length-1; count >= 0; count--) {
      if (this_opts.viewer.orientation === 'axial') {
        if (paint_map[row][count] == 1) {
          target_position_array[target_position_array.length] = [count, row, other];
        }
      } else if (this_opts.viewer.orientation === 'coronal') {
        if (paint_map[row][count] == 1) {
          target_position_array[target_position_array.length] = [count, other, row];
        }
      } else if (this_opts.viewer.orientation === 'sagital') {
        if (paint_map[row][count] == 1) {
          target_position_array[target_position_array.length] = [other, count, row];
        }
      }
    }
  }

console.log(target_position_array);

//  var map = this_obj.getPaintPosition(position, paint_map);

       /*バケツフィル機能ここまで*/

       // バケツによって塗りつぶすべき座標群をarrayで作って下さい
       // 形式 [[X1,Y1,Z1],[X2,Y2,Z3]......]

      console.log('格納情報'+target_position_array);
       //コンテナに積む
       this_opts.control.container.updateVoxel(
      	series_id,
      	label_id,
			'pen',
			target_position_array
		);

       //ヒストリに積む
       this_opts.control.container.addHistory(
   		 series_id,
       	label_id,
 			'pen',
 			target_position_array
        );

     //自分自身、同じボクセルを共用するビューアーに対してコンテナとの同期を促す
		var tmp_this_id = this_elm.attr('id');
		for (var i = this_opts.control.container.data.member.length - 1; i >= 0; i--) {
		  $('#' + this_opts.control.container.data.member[i]).imageViewer('syncVoxel');
		}

    },

    getSeriesObjectById: function (series_id) {
      //描画対象ラベルのチェック
      var this_opts = this.options;
      for (var i = this_opts.viewer.draw.series.length - 1; i >= 0; i--) {
        if (this_opts.viewer.draw.series[i].id == series_id) {
          return this_opts.viewer.draw.series[i];
        }
      }
    },


    _getStopover: function (start_x, start_y, goal_x, goal_y) {
      //始点・終点座標を渡すと、その中間を埋める座標群をarrayで返す
      var dist_x = Math.abs(goal_x - start_x);
      var dist_y = Math.abs(goal_y - start_y);
      var tmp_base = dist_x;

      if (dist_y > dist_x) {//縦の移動が大きければ縦を基準に中間点を作成していく
        tmp_base = dist_y;
      }

      var tmp_x = (goal_x - start_x) / tmp_base;
      var tmp_y = (goal_y - start_y) / tmp_base;

      var rtn_ary = new Array();
      for (var i = tmp_base - 1; i >= 0; i--) {
        var ary_x = start_x + i * tmp_x;
        var ary_y = start_y + i * tmp_y;
        rtn_ary.push([ary_x, ary_y]);
      }
      return rtn_ary;
    },


    historyBack: function () {
      //ひとつ手前の手順に戻る
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      //コンテナ内部をひとつ手前に戻す
      this_opts.control.container.historyBack();

      //自分自身、同じボクセルを共用するビューアーに対してコンテナとの同期を促す
      var tmp_this_id = this_elm.attr('id');
      for (var i = this_opts.control.container.data.member.length - 1; i >= 0; i--) {
        $('#' + this_opts.control.container.data.member[i]).imageViewer('syncVoxel');
      }
    },


    historyRedo: function () {
      //戻る手順を１つ取消
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      //コンテナ内部の戻るを取消
      this_opts.control.container.historyRedo();

      //自分自身、同じボクセルを共用するビューアーに対してコンテナとの同期を促す
      var tmp_this_id = this_elm.attr('id');
      for (var i = this_opts.control.container.data.member.length - 1; i >= 0; i--) {
        $('#' + this_opts.control.container.data.member[i]).imageViewer('syncVoxel');
      }
    },


    //	初期化・イベント設置
    _init: function (insert_object) {

      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      if (insert_object) {
        this_opts = $.extend(true, this_opts, insert_object);
      }

      //連動用コンテナに自分の要素idを登録
      var this_id = this_elm.attr('id')
      this_opts.control.container.data.member.push(this_id);
      delete    this_id;

      //ある分だけシリーズサイズをコンテナに送り込む
      for (var i = 0; i < this_opts.viewer.draw.series.length; i++) {
        var tmp_series = this_opts.viewer.draw.series[i];
        this_opts.control.container.setSize(
          tmp_series.id,
          tmp_series.voxel.x,
          tmp_series.voxel.y,
          tmp_series.voxel.z
        );
      }


      //キャンバス整形
      this_obj.setCanvasSize();

      //以下各種イベント群
      this_elm.bind('changeImageSrc', function () {
        this_obj._changeImgSrc();
      })
        .bind('getOptions', function () {
          var return_obj = this_obj.getOptions();
          return return_obj;
        })
        .bind('sync', function () {
          this_obj.syncVoxel();
        });

      var mousewheelevent = 'onwheel' in    document ? 'wheel' : 'onmousewheel' in    document ? 'mousewheel' : 'DOMMouseScroll';

      //マウスによるパン・描画関連
      this_elm.find('.mouse_cover')
        .bind('mousedown', function (e) {
          this_obj._mousedownFunc(e);
        })
        .bind('mousemove', function (e) {
          this_obj._mousemoveFunc(e);
        })
        .bind('mouseout', function (e) {
          this_obj._mouseoutFunc(e);
        })
        .bind('mouseup', function (e) {
          this_obj._mouseupFunc(e);
        })
        .bind(mousewheelevent, function (e) {
          this_obj._mouseWheelFunc(e);
        });

      //表示シリーズ変更
      this_elm.bind('changeSeries', function (e, series_id) {
        this_obj.changeSeries(series_id);
      });

      //ラベル追加
      this_elm.bind('addLabelObject', function (e, series_id, label_id) {
        this_obj.addLabelObject(series_id, label_id);
      });

      //ラベル削除
      this_elm.bind('deleteLabelObject', function (e, series_id, label_id) {
        this_obj.deleteLabelObject(series_id, label_id);
      });

      //オプション情報の書き換え
      this_elm.bind('setOptions', function (e, tmpSetValues) {
        this_obj._setOptions(tmpSetValues);
      });


      //枚数送り関連要素
      if (this_opts.control.slider == true) {
        //スライダー
        this_elm.find('.slider_elm').slider({
          value: this_opts.viewer.number.current,
          orientation: 'horizontal',
          min: this_opts.viewer.number.minimum,
          max: this_opts.viewer.number.maximum,
          range: 'min',
          animate: false,
          slide: function (event, ui) {
            this_opts.viewer.number.current = ui.value;
            var tmp_disp_num = this_opts.viewer.number.current + 1;
            this_elm.find('.disp_num').text(tmp_disp_num); //画像右上の枚数表示
            this_obj._changeImgSrc();
            this_elm.imageViewer('syncVoxel');
            //next/prevボタン押下時に発火させるchangeイベント
          }, change: function (event, ui) {
            this_opts.viewer.number.current = ui.value;
            var tmp_disp_num = this_opts.viewer.number.current + 1;
            this_elm.find('.disp_num').text(tmp_disp_num); //画像右上の枚数表示
            this_obj._changeImgSrc();
            this_elm.imageViewer('syncVoxel');
          }
        });

        //画像No戻るボタン
        this_elm.find('.btn_prev').click(function () {
          var tmp_num = this_opts.viewer.number.current;
          tmp_num = Number(tmp_num);
          if (tmp_num > 0) {	//0番より手前は無い
            tmp_num--;
            var tmp_disp_num = tmp_num + 1;
            this_elm.find('.disp_num').text(tmp_disp_num); //画像右上の枚数表示
            this_obj._changeImgSrc();
          }
          //レバー追従
          this_elm.find('.slider_elm').slider({
            value: tmp_num
          });
          this_elm.imageViewer('syncVoxel');
        });

        //画像No進むボタン
        this_elm.find('.btn_next').click(function () {
          var tmp_num = this_opts.viewer.number.current;
          tmp_num = Number(tmp_num);
          if (tmp_num < this_opts.viewer.number.maximum) {	//上限枚数の制限
            tmp_num++;
            var tmp_disp_num = tmp_num + 1;
            this_elm.find('.disp_num').text(tmp_disp_num); //画像右上の枚数表示
            this_obj._changeImgSrc();
          }
          //レバー追従
          this_elm.find('.slider_elm').slider({
            value: tmp_num
          });
          this_elm.imageViewer('syncVoxel');
        });

        this_elm.find('.btn_prev,.btn_next').mousedown(function () {
          return false;
        });
      }

      //ウインドウレベル・幅関係のイベント設置
      if (this_opts.viewer.elements.window.panel == true) {

        var the_win_controller = this_elm.find('.image_window_controller');
        //パネルの表示・非表示操作
        the_win_controller.click(function (e) {
          e.stopPropagation();
        });

        //パネルを出す
        this_elm.find('.image_window_controller_wrap').find('.btn_open').click(function (e) {
          this_elm.imageViewer('changeMode', 'window');
        });

        //パネルを消す
        this_elm.find('.image_window_controller_wrap').find('.btn_close').click(function (e) {
          this_elm.imageViewer('changeMode', 'pan');
        });

        //ウインドウサイズ・レベル操作
        //input
        the_win_controller.find('input').change(function () {
          windowValuesChange();
        });

        //プリセット
        the_win_controller.find('.image_window_preset_select').change(function () {
          var tmp_value = $(this).val();
          if (tmp_value != 'blank') {
            the_win_controller.find('.image_window_level').val(tmp_value.split(',')[0]);
            the_win_controller.find('.image_window_width').val(tmp_value.split(',')[1]);
            windowValuesChange();
          }
        });

        //input,selectから呼び出す共通関数
        var windowValuesChange = function () {

          //ウインドウレベル
          var tmp_level = the_win_controller.find('.image_window_level').val();
          tmp_level = Number(tmp_level);
          if (isFinite(tmp_level) == true) {
            //数値であれば上限値・下限値との比較をしてcontrollerを書き換える
            //数値でないときは書き換えが走らないので操作前の値に戻る
            tmp_level = Math.min(tmp_level, this_opts.viewer.window.level.maximum);
            tmp_level = Math.max(tmp_level, this_opts.viewer.window.level.minimum);
            this_opts.viewer.window.level.current = tmp_level;
          }

          //ウインドウサイズ
          var tmp_width = the_win_controller.find('.image_window_width').val();
          tmp_width = Number(tmp_width);
          if (isFinite(tmp_width) == true) {
            //数値であれば上限値・下限値との比較
            //数値でないときは書き換えが走らないので操作前の値に戻る
            tmp_width = Math.min(tmp_width, this_opts.viewer.window.level.maximum);
            tmp_width = Math.max(tmp_width, this_opts.viewer.window.level.minimum);
            this_opts.viewer.window.width.current = tmp_width;
          }
          this_obj._changeImgSrc();
        }//windowValuesChange
      }//ウインドウレベル・幅関係のイベント設置ここまで


      //ズーム機能
      if (this_opts.control.zoom == true) {
        //拡大・縮小

        this_elm.find('.ico_detail_sprite_resize_large,.ico_detail_sprite_resize_short').click(function () {
          if (this_opts.viewer.position.zoom <= 32 && 1 <= this_opts.viewer.position.zoom) {

            var resize_value = 0.5; //todo確認	１回のプッシュでどの程度ズームインアウトするかの度合の変数はウィジェットの共通変数で持つ方が良い？
            if ($(this).hasClass('ico_detail_sprite_resize_large')) {
              //拡大
              this_opts.viewer.position.zoom += resize_value;
              this_opts.viewer.position.zoom = Math.min(this_opts.viewer.position.zoom, 32);
            } else if ($(this).hasClass('ico_detail_sprite_resize_short')) {
              //縮小
              this_opts.viewer.position.zoom -= resize_value;
              this_opts.viewer.position.zoom = Math.max(this_opts.viewer.position.zoom, 1);
            }

            var tmp_pre_w = this_opts.viewer.position.sw; //拡大処理前のトリミング幅
            var tmp_pre_h = this_opts.viewer.position.sh; //拡大処理前のトリミング高さ

            this_opts.viewer.position.sw = this_opts.viewer.position.ow / this_opts.viewer.position.zoom;
            this_opts.viewer.position.sh = this_opts.viewer.position.oh / this_opts.viewer.position.zoom;

            var diff_x = (this_opts.viewer.position.sw - tmp_pre_w) / 2;
            var diff_y = (this_opts.viewer.position.sh - tmp_pre_h) / 2;

            this_opts.viewer.position.sx = this_opts.viewer.position.sx - diff_x;
            this_opts.viewer.position.sy = this_opts.viewer.position.sy - diff_y;

            //画像右下のズーム表示
            this_elm.find('.current_size').text(100 * Number(this_opts.viewer.position.zoom)); //初期発火用

            this_obj._changeImgSrc();
            this_elm.imageViewer('changeMode', 'pan');
            this_elm.imageViewer('syncVoxel');

            //パンモードに戻すのでウインドウ情報パネルは隠す
            if (this_opts.viewer.elements.window.panel == true) {
              this_elm.find('.image_window_controller_wrap').find('.btn_close').trigger('click');
            }
          }
        });

        this_elm.find('.ico_detail_sprite_resize_large,.ico_detail_sprite_resize_short').mousedown(function () {
          return false;
        });
      }//ズーム機能ここまで
      this_elm.find('.current_size').text(100 * Number(this_opts.viewer.position.zoom)); //初期発火用

      //諸々のデータ群のセットが終わったところで描画機能発火
      this_obj._changeImgSrc();

    }/*_init*/,


    insertLabelData: function (insert_obj) {
      //すでに描いているラベルがあったらコンテナに先に追加しておく
      //引数がわたってきたらそれを書き込むが、引数が無ければviewerが今現在持っているoptions series の中身を渡す
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      var put_data = this_opts.viewer.draw.series;
      if (typeof insert_obj != 'undefined') {
        put_data = insert_obj;
      }
      this_opts.control.container.insertLabelData(put_data);
    },


    _mousedownFunc: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      e.preventDefault();

      this_obj._tmpInfo.cursor.touch_flg = 1;

      //マウスの初期位置取得
      this_obj._tmpInfo.cursor.start.X = e.clientX;
      this_obj._tmpInfo.cursor.start.Y = e.clientY;

      if (this_opts.control.mode == 'pan') {
        //トリミング領域の初期位置取得
        this_obj._tmpInfo.elementParam.start.X = this_opts.viewer.position.sx;
        this_obj._tmpInfo.elementParam.start.Y = this_opts.viewer.position.sy;
      } else if (this_opts.control.mode == 'pen' || this_opts.control.mode == 'erase' || this_opts.control.mode == 'bucket') {

        //ラベルを描くcanvas要素のオブジェクト
        var tmp_ctx = this_elm.find('.canvas_main_elm').get(0).getContext('2d');
        //重ね合わせの表現のため一時的に現在の(orientation,奥行)ですでに描かれているラベル座標群を確保する
        this_obj._tmpInfo.label_buffer = this_opts.control.container.getCurrentLabel(
          this_opts.viewer.orientation,
          this_opts.viewer.number.current
        );

			var the_active_series = this_obj.getSeriesObjectById(this_opts.viewer.draw.activeSeriesId);

        //マウス位置
        this_obj._tmpInfo.elementParam.start.X = this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left;
        this_obj._tmpInfo.elementParam.start.Y = this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top;
        this_obj._tmpInfo.elementParam.start.X = Math.round(this_obj._tmpInfo.elementParam.start.X);
        this_obj._tmpInfo.elementParam.start.Y = Math.round(this_obj._tmpInfo.elementParam.start.Y);

        //canvas要素の左端を起点としたときのマウス位置(ズーム解除状態でのXY値)
        this_obj._tmpInfo.cursor.current.X = (e.clientX - this_obj._tmpInfo.elementParam.start.X) / this_opts.viewer.position.zoom;
        this_obj._tmpInfo.cursor.current.Y = (e.clientY - this_obj._tmpInfo.elementParam.start.Y) / this_opts.viewer.position.zoom;

        //画像トリミング分の補正
        this_obj._tmpInfo.cursor.current.X = this_obj._tmpInfo.cursor.current.X + this_opts.viewer.position.sx * this_opts.viewer.position.dw / this_opts.viewer.position.ow;
        this_obj._tmpInfo.cursor.current.Y = this_obj._tmpInfo.cursor.current.Y + this_opts.viewer.position.sy * this_opts.viewer.position.dh / this_opts.viewer.position.oh;

				if (this_opts.control.mode == 'pen' || this_opts.control.mode == 'erase' ){
					//太さを加味
					var tmp_array = this_obj._applyBoldness([[this_obj._tmpInfo.cursor.current.X, this_obj._tmpInfo.cursor.current.Y]]);

					//ボクセル座標に変換
					this_obj._tmpInfo.label = this_obj._exchangePositionCtoV(tmp_array);

					this_opts.control.container.updateVoxel(
						this_opts.viewer.draw.activeSeriesId,
						the_active_series.activeLabelId,
						this_opts.control.mode,
						this_obj._tmpInfo.label
					);
					this_elm.imageViewer('syncVoxel');
					this_obj._disableImageAlias(tmp_ctx, false);

					}else{
						//バケツ発動
						var tmp_point_position = this_obj._exchangePositionCtoV([[this_obj._tmpInfo.cursor.current.X,this_obj._tmpInfo.cursor.current.Y]]);
						this_obj._getBucketFillPositions(
								this_opts.viewer.draw.activeSeriesId,
								the_active_series.activeLabelId,
								tmp_point_position[0]
						);

				}

      } else if (this_opts.control.mode == 'window') {

        //ウインドウ情報の初期値
        this_obj._tmpInfo.elementParam.start.X = this_opts.viewer.window.width.current;
        this_obj._tmpInfo.elementParam.start.Y = this_opts.viewer.window.level.current;
      }

    }/*_mousedownFunc*/,


    _mousemoveFunc: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      //手のひらツール
      if (this_opts.control.mode == 'pan') {
        if (this_obj._tmpInfo.cursor.touch_flg == 1) {

          //シリーズ画像表示要素のオブジェクト
          var series_image_elm_ctx = this_elm.find('.series_image_elm').get(0).getContext('2d');

          //手のひらツール
          var tmp_x = (e.clientX - this_obj._tmpInfo.cursor.start.X) / this_opts.viewer.position.zoom;
          var tmp_y = (e.clientY - this_obj._tmpInfo.cursor.start.Y) / this_opts.viewer.position.zoom;

          tmp_x = this_obj._tmpInfo.elementParam.start.X - tmp_x * this_opts.viewer.position.ow / this_opts.viewer.position.dw;
          tmp_y = this_obj._tmpInfo.elementParam.start.Y - tmp_y * this_opts.viewer.position.oh / this_opts.viewer.position.dh;

          this_opts.viewer.position.sx = Math.round(tmp_x);
          this_opts.viewer.position.sy = Math.round(tmp_y);
          this_obj._changeImgSrc();
          this_elm.imageViewer('syncVoxel');
        }
      } else if (this_opts.control.mode == 'pen' || this_opts.control.mode == 'erase') {
        if (this_obj._tmpInfo.cursor.touch_flg == 1) {

          if (this_obj._tmpInfo.cursor.out_flg == 0) {

            //ラベルを描くcanvas要素のオブジェクト
            var tmp_ctx = this_elm.find('.canvas_main_elm').get(0).getContext('2d');

            //新しいマウス位置(ズーム解除状態に換算した際のXY値)
            var tmp_x = (e.clientX - this_obj._tmpInfo.elementParam.start.X) / this_opts.viewer.position.zoom;
            var tmp_y = (e.clientY - this_obj._tmpInfo.elementParam.start.Y) / this_opts.viewer.position.zoom;

            //トリミング分の補正
            tmp_x = tmp_x + this_opts.viewer.position.sx * this_opts.viewer.position.dw / this_opts.viewer.position.ow;
            tmp_y = tmp_y + this_opts.viewer.position.sy * this_opts.viewer.position.dh / this_opts.viewer.position.oh;

            var tmp_array = new Array();
            //中間点を埋める
            if (Math.abs(this_obj._tmpInfo.cursor.current.X - tmp_x) > 1 || Math.abs(this_obj._tmpInfo.cursor.current.Y - tmp_y) > 1) {
              //スキマがあるとき
              tmp_array = this_obj._getStopover(this_obj._tmpInfo.cursor.current.X, this_obj._tmpInfo.cursor.current.Y, tmp_x, tmp_y);
            } else {
              //スキマがない、中間点を埋める必要が無いとき
              tmp_array.push([tmp_x, tmp_y]);
              tmp_array.push([this_obj._tmpInfo.cursor.current.X, this_obj._tmpInfo.cursor.current.Y]);
            }

            //次のmousemoveイベントに備えて	_tmpInfo.cursor.current	更新
            this_obj._tmpInfo.cursor.current.X = tmp_x;
            this_obj._tmpInfo.cursor.current.Y = tmp_y;

            //太さを加味
            tmp_array = this_obj._applyBoldness(tmp_array);

            //ボクセル座標に変換
            tmp_array = this_obj._exchangePositionCtoV(tmp_array);

            this_obj._tmpInfo.label = this_obj._tmpInfo.label.concat(tmp_array);

            var the_active_series = this_obj.getSeriesObjectById(this_opts.viewer.draw.activeSeriesId);

            this_opts.control.container.updateVoxel(
              this_opts.viewer.draw.activeSeriesId,
              the_active_series.activeLabelId,
              this_opts.control.mode,
              this_obj._tmpInfo.label
            );

            this_elm.imageViewer('syncVoxel');

            this_obj._disableImageAlias(tmp_ctx, false);
            //本来はここで手前にあるラベルを描く

          } else {

            //新しいマウス位置(ズーム解除状態に換算した際のXY値)
            var tmp_x = (e.clientX - this_obj._tmpInfo.elementParam.start.X) / this_opts.viewer.position.zoom;
            var tmp_y = (e.clientY - this_obj._tmpInfo.elementParam.start.Y) / this_opts.viewer.position.zoom;

            //トリミング分の補正
            tmp_x = tmp_x + this_opts.viewer.position.sx * this_opts.viewer.position.dw / this_opts.viewer.position.ow;
            tmp_y = tmp_y + this_opts.viewer.position.sy * this_opts.viewer.position.dh / this_opts.viewer.position.oh;

            //次のmousemoveイベントに備えて	{_tmpInfo.cursor.current}	更新
            this_obj._tmpInfo.cursor.current.X = tmp_x;
            this_obj._tmpInfo.cursor.current.Y = tmp_y;
            this_obj._tmpInfo.cursor.out_flg = 0;
          }
        }
      } else if (this_opts.control.mode == 'window') {
        if (this_obj._tmpInfo.cursor.touch_flg == 1) {
          //ウインドウ情報書き換えモード
          var tmp_x = this_obj._tmpInfo.elementParam.start.X + (e.clientX - this_obj._tmpInfo.cursor.start.X) * 10;
          var tmp_y = this_obj._tmpInfo.elementParam.start.Y - (e.clientY - this_obj._tmpInfo.cursor.start.Y) * 10;

          //最大最小のハミダシ防止
          //width
          tmp_x = Math.max(this_opts.viewer.window.width.minimum, tmp_x);
          tmp_x = Math.min(this_opts.viewer.window.width.maximum, tmp_x);

          //level
          tmp_y = Math.max(this_opts.viewer.window.level.minimum, tmp_y);
          tmp_y = Math.min(this_opts.viewer.window.level.maximum, tmp_y);

          this_opts.viewer.window.width.current = Math.round(tmp_x);
          this_opts.viewer.window.level.current = Math.round(tmp_y);

          this_obj._setOptions();
          this_obj._changeImgSrc();
        }
      }
    }/*_mousemoveFunc*/,


    _mouseoutFunc: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      this_obj._tmpInfo.cursor.out_flg = 1;

      //手のひらツール
      if (this_opts.control.mode == 'pan') {
        this_obj._tmpInfo.cursor.touch_flg = 0;
      } else if (this_opts.control.mode == 'pen') {

      } else if (this_opts.control.mode == 'window') {
        this_obj._tmpInfo.cursor.touch_flg = 0;
      }
    }/*_mouseoutFunc*/,


    _mouseupFunc: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      this_obj._tmpInfo.cursor.touch_flg = 0;
      if (this_opts.control.mode == 'pan') {
        //手のひらツール

      } else if (this_opts.control.mode == 'pen' || this_opts.control.mode == 'erase') {
        //ペンまたは消しゴムモード
        //ボクセル上での座標に変換

        this_obj._tmpInfo.label = this_obj._reduceOverlap(this_obj._tmpInfo.label);

        //コンテナ書き込み
        if (this_obj._tmpInfo.label.length > 0) {

          //ヒストリ
          var the_active_series = this_obj.getSeriesObjectById(this_opts.viewer.draw.activeSeriesId);
          this_opts.control.container.addHistory(
            this_opts.viewer.draw.activeSeriesId,
            the_active_series.activeLabelId,
            this_opts.control.mode,
            this_obj._tmpInfo.label
          );

          //描画
          this_opts.control.container.updateVoxel(
            this_opts.viewer.draw.activeSeriesId,
            the_active_series.activeLabelId,
            this_opts.control.mode,
            this_obj._tmpInfo.label
          );
        }

        //メモリ解放のため配列消去
        this_obj._tmpInfo.label = new Array(0);

        //同じコンテナを共用するビューアーに対して同期を促す
        //自分自身も含む
        var tmp_this_id = this_elm.attr('id');
        for (var i = this_opts.control.container.data.member.length - 1; i >= 0; i--) {
          $('#' + this_opts.control.container.data.member[i]).imageViewer('syncVoxel');
        }

        //ペンまたは消しゴムで触れられたことを他に伝えるためにイベント発行
        if (typeof this_opts.viewer.draw.activeSeriesId != 'undefined' && typeof the_active_series != 'undefined') {
          var the_target_label = this_obj.getLabelObjectById(the_active_series.activeLabelId, this_opts.viewer.draw.activeSeriesId);
          this_elm.trigger('onWritten', [the_active_series.activeLabelId, this_opts.viewer.draw.activeSeriesId]);
        }

      }
    }/*_mouseupFunc*/,


    _mouseWheelFunc: function (e) {
      e.preventDefault();
      //ホイール
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      var delta = e.originalEvent.deltaY ? -(e.originalEvent.deltaY) : e.originalEvent.wheelDelta ? e.originalEvent.wheelDelta : -(e.originalEvent.detail);
      var tmp_change_ammount = delta * 0.01;
      tmp_change_ammount = Math.round(tmp_change_ammount);
      var tmp_current = this_opts.viewer.number.current;

      tmp_current = tmp_current - tmp_change_ammount;
      tmp_current = Math.min(tmp_current, this_opts.viewer.number.maximum);
      tmp_current = Math.max(tmp_current, this_opts.viewer.number.minimum);
      this_opts.viewer.number.current = tmp_current;

      this_elm.find('.slider_elm').slider({
        value: this_opts.viewer.number.current
      });

      this_elm.imageViewer('syncVoxel');
      return false;
    }/*_mouseWheelFunc*/,


    /*重複座標を除去する*/
    //処理凍結中
    _reduceOverlap: function (insert_array) {

      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      var tmp_orientation = this_opts.viewer.orientation;

      /*
       for(var i=insert_array.length-1; i>=0; i--){
       for(var j=i-1; j>1; j--){
       if(insert_array[j][0][1][2] ==	insert_array[i][0][1][2]){
       insert_array.splice(j,1);
       break;
       }
       }
       }
       */
      return insert_array;
    },


    _setOptions: function (tmpSetValues) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      $.extend(true, this_opts, tmpSetValues);

      //ウインドウレベル・サイズ領域に値を入れ込む
      if (this_opts.viewer.elements.window.panel == true) {
        this_elm.find('.image_window_level').val(this_opts.viewer.window.level.current);
        this_elm.find('.label_level_min').val(this_opts.viewer.window.level.minimum);
        this_elm.find('.label_level_max').val(this_opts.viewer.window.level.maximum);
        this_elm.find('.image_window_width').val(this_opts.viewer.window.width.current);
        this_elm.find('.label_width_min').val(this_opts.viewer.window.width.minimum);
        this_elm.find('.label_width_max').val(this_opts.viewer.window.width.maximum);

        var tmp_preset_array = this_opts.viewer.window.preset;
        if (this_opts.viewer.window.preset.length == 0) {
          this_elm.find('.image_window_preset_select').empty().append();
        } else {
          var tmp_elm = '<option	value="blank">select	setting</option>';
          for (var i = tmp_preset_array.length - 1; i >= 0; i--) {
            tmp_elm = tmp_elm + '<option	value="' + tmp_preset_array[i].level + ',' + tmp_preset_array[i].width + '">' + tmp_preset_array[i].label + '</option>';
          }
          this_elm.find('.image_window_preset_select').empty().append(tmp_elm);
        }
      }
    }/*_setOptions*/,


    setCanvasSize: function () {
      /*シリーズ追加時・初期表示時にビューアーの大きさを再調整・コンテナにサイズ定義*/
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      var tmp_w = 512;
      var tmp_h = 512;
      var tmp_ow = 512;
      var tmp_oh = 512;
      var tmp_num = 512;

      var active_series = this_obj.getSeriesObjectById(this_opts.viewer.draw.activeSeriesId);

      if (this_opts.viewer.orientation == 'axial') {
        tmp_w = active_series.voxel.x;
        tmp_h = active_series.voxel.y * active_series.voxel.voxel_y / active_series.voxel.voxel_x;
        tmp_ow = active_series.voxel.x;
        tmp_oh = active_series.voxel.y;
        tmp_num = active_series.voxel.z - 1;
      } else if (this_opts.viewer.orientation == 'sagital') {
        tmp_w = active_series.voxel.y * active_series.voxel.voxel_y / active_series.voxel.voxel_x;
        tmp_h = active_series.voxel.z * active_series.voxel.voxel_z / active_series.voxel.voxel_x;
        tmp_ow = active_series.voxel.y;
        tmp_oh = active_series.voxel.z;
        tmp_num = active_series.voxel.x - 1;
      } else if (this_opts.viewer.orientation == 'coronal') {
        tmp_w = active_series.voxel.x;
        tmp_h = active_series.voxel.z * active_series.voxel.voxel_z / active_series.voxel.voxel_x;
        tmp_ow = active_series.voxel.x;
        tmp_oh = active_series.voxel.z;
        tmp_num = active_series.voxel.y - 1;
      }

      this_opts.viewer.position.ow = tmp_ow;
      this_opts.viewer.position.oh = tmp_oh;
      this_opts.viewer.position.sw = tmp_ow;
      this_opts.viewer.position.sh = tmp_oh;
      this_opts.viewer.position.dw = tmp_w;
      this_opts.viewer.position.dh = tmp_h;
      this_opts.viewer.number.maximum = tmp_num;

      if (this_opts.viewer.number.current > tmp_num) {
        this_opts.viewer.number.current = tmp_num;
      }


      this_elm.find('.slider_elm').slider({
        value: this_opts.viewer.number.current,
        orientation: 'horizontal',
        min: this_opts.viewer.number.minimum,
        max: this_opts.viewer.number.maximum
      });

      //キャンバスのサイズ定義
      this_elm.find('.series_image_elm,.canvas_main_elm').attr({
        width: this_opts.viewer.position.dw,
        height: this_opts.viewer.position.dh
      });

    },


    syncVoxel: function () {
      //ボクセル情報を取得して現在のキャンバスを更新する
      var this_obj = this;
      var this_opts = this.options;

      this_obj._clearCanvas();//初期化
      //全シリーズ・ラベルについて現在の [オリエンテーション・奥行] を渡して塗るべき座標を戻してもらう
      for (var i = this_opts.control.container.data.series.length - 1; i >= 0; i--) {
        var tmp_the_series = this_opts.control.container.data.series[i];

        //現在のシリーズのラベルだけ表示
        if (tmp_the_series.id == this_opts.viewer.draw.activeSeriesId) {
          for (var j = tmp_the_series.label.length - 1; j >= 0; j--) {
            var tmp_the_label = tmp_the_series.label[j];
            var tmp_array = this_opts.control.container.returnSlice(
              tmp_the_series.id,
              tmp_the_label.id,
              this_opts.viewer.orientation,
              this_opts.viewer.number.current
            );
            if (tmp_array.length > 0) {
              this_obj.drawLabel(
                tmp_the_series.id,
                tmp_the_label.id,
                tmp_array
              );
            }
          }
        }
      }
    }/*syncVoxel*/,


    //動作時に一時的に要素の状態やマウス状態等を保持したいときに格納するオブジェクト
    _tmpInfo: {
      cursor: {	//移動・拡大時のマウス座標格納用オブジェクト
        start: {X: 0, Y: 0},
        current: {X: 0, Y: 0},
        touch_flg: 0, //マウス押下状態を示すフラグ,1が押された状態
        out_flg: 1	//マウスがキャンバス領域の外に居るかどうかのフラグ。１が外
      },
      elementParam: {	//マウスで何かを動かす際の初期値格納用変数
        start: {X: 0, Y: 0},
        current: {X: 0, Y: 0}
      },
      imgCache: [],
      label: [], //ペンモードでマウスが一度触れてから離れるまでの描画内容の保存用
      label_buffer: []	//今の自分のorientation,枚数で既に描かれているラベルの情報、重複防止に活用
    }/*_tmpInfo*/
  });

})(jQuery);