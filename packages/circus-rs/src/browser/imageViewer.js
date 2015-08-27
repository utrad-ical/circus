;// imageViewer
(function ($) {

  //  プラグインメイン
  $.widget('ui.imageViewer', {
    options: {
      container: '', //指定必須,ラベル情報の格納用オブジェクト
      mode: 'pan',
      mode_array: ['bucket', 'erase', 'guide', 'measure', 'rotate', 'pan', 'pen', 'window'], //selectable mode
      viewer: { //中身の情報群
        orientation: '', //断面
        src: '', //baseURL
        window: {  //todo  今回ははコントローラから電波
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
          preset: []  //sample  {label: 'your  preset  label' , level: 1000 , width : 4000}
        },
        cut : {
          angle : 0,
          center_x : 0,
          center_y : 0,
          center_z : 0,
          orientation : 'axial'
        },
        number: {
          current: 0,
          maximum: 512,
          minimum: 0
        },
        elements: {
          slider: {    //枚数送りのスライダーと枚数表示
            active: true,
            panel: true, //スライダーの表示有無
            display: true //枚数表示の表示有無
          },
          zoom: {  //虫眼鏡と拡大率表示
            active: true,
            panel: true,
            display: true
          },
          window: {  //windowレベル・幅の操作パネル
            panel: true    //todo  これがtrueならパネルを表示させる
          }
        },
        position: {
          dx: 0,
          dy: 0, //display position
          dw: 512,
          dh: 512, //display size
          ow: 512,
          oh: 512, //original size
          sx: 0,
          sy: 0,   //trimming poisition (original scale)
          sw: 512,
          sh: 512, //trimming size (original scale)
          zoom: 1
        },
        activeSeriesId: '',
        boldness: 1,
        series: [
          {
            activeLabelId: '', //現在の描画対象ラベル
            id: '',
            token: '',
            label: [] //sample { id : 'label_1', rgba : rgba(0,0,0,1), position:[] ,visible : true}
          }
        ],
        guide : {
          lines : [
            {show : false, number: 0, color: 'FF7F7F', name : 'axial'},
            {show : false, number: 0, color: '7FFF7F', name : 'coronal'},
            {show : false, number: 0, color: '7F7FFF', name : 'sagittal'}
          ],
          grid_range : 5,
          hall_rate : 0.1
        },
        measure : {
          active : true,
          start_x : 0,
          start_y : 0,
          goal_x: 0,
          goal_y: 0
        },
        rotate : {
          angle : 0.25 * Math.PI, //init radian
          arrow_x : 0,
          arrow_y : 0,
          color : 'ffa500',
          point_width : 8,
          visible : false
        },
        voxel: {
          x: 512,
          y: 512,
          z: 512,
          voxel_x: 1,
          voxel_y: 1,
          voxel_z: 1
        }
      },
      _tmpInfo: {
        cursor: {  //移動・拡大時のマウス座標格納用オブジェクト
          start: {X: 0, Y: 0},
          current: {X: 0, Y: 0},
          touch_flg: 0, //マウス押下状態を示すフラグ,1が押された状態
          out_flg: 1  //マウスがキャンバス領域の外に居るかどうかのフラグ。１が外
        },
        elementParam: {  //マウスで何かを動かす際の初期値格納用変数
          start: {X: 0, Y: 0},
          current: {X: 0, Y: 0}
        },
        lastQue: '',
        imgCache: [],
        loadFlg: 0,
        mode_backup: '',
        label: [] //ペンモードでマウスが一度触れてから離れるまでの描画内容の保存用
      }//_tmpInfo
    },


    addLabelObject: function (series_id, label_obj) {

      //ラベル追加
      var this_obj = this;
      var this_opts = this.options;
      var tmp_add_label_obj = {
        id: label_obj.id,
        position: [],
        rgba: label_obj.rgba,
        visible: label_obj.visible
      };

      var target_series = this_obj.getSeriesObjectById(series_id);
      if (typeof target_series.label !== 'object') {
        target_series.label = [];
        target_series.activeLabelId = tmp_add_label_obj.id;
      }

      target_series.label.push(tmp_add_label_obj);
      if (target_series.label.length === 1) {
        target_series.activeLabelId = tmp_add_label_obj.id;
      }

      this_opts.container.addLabel(series_id, label_obj.id,[]);
    },



    _applyBoldness: function (insert_array) {
      //ペンで描いた状態の座標群と現時点での太さ指定を踏まえ,塗るべきマス目の集合に変換する
      var this_obj = this,
        this_opts = this.options,
        rtn_array = [],
        bold_arround = Math.floor(this_opts.viewer.boldness / 2),
        the_boldness = this_opts.viewer.boldness,
        i,
        k,
        l,
        tmp_x,
        tmp_y;

      for (i = insert_array.length - 1; i >= 0; i -= 1) {
        for (k = the_boldness - 1; k >= 0; k -= 1) { //x軸
          for (l = the_boldness - 1; l >= 0; l -= 1) { //y軸
            tmp_x = insert_array[i][0] - bold_arround + k;
            tmp_y = insert_array[i][1] - bold_arround + l;
            if (tmp_x < 0) {
              tmp_x = 0;
            }
            if (tmp_y < 0) {
              tmp_y = 0;
            }
            rtn_array.push([tmp_x, tmp_y]);
          }
        }
      }
      return rtn_array;
    },



    _calculateRotatePoint: function (the_angle, center_x, center_y) {
      //return the positions at both ends of a line segment passing through the center point
      //the_angle: radian
      //center_x: position X of the center point
      //center_y: position Y of the center point

      var this_opts = this.options;
      var return_obj = [
        [0, 0],
        [0, 0],
        [0, 0]
      ];
      //first array : start of the line
      //second array : arrow point XY
      //third array : end of line

      // normalize over 360 deg
      var tmp_pi = Math.PI;
      if(the_angle < 0 ){
        the_angle = the_angle + tmp_pi * 2;
      }
      the_angle = the_angle % (2 * tmp_pi);

      //start & end point of line
      var this_tan = Math.tan(the_angle);
      return_obj[0] = [ 0, center_y + center_x * this_tan];
      return_obj[2] = [ this_opts.viewer.position.dw, center_y - (this_opts.viewer.position.dw - center_x) * this_tan];

      //arrow point
      var tmp_margin = this_opts.viewer.rotate.point_width * 8;

      //check the angle is which area of radian
      if(the_angle < tmp_pi / 2 ){
        //the first quadrant
        var point_y = center_y - (this_opts.viewer.position.dw - center_x) * this_tan;
        if(point_y < 0){
          //top
          return_obj[1][0] = center_x + (center_y - tmp_margin) / this_tan;
          return_obj[1][1] = tmp_margin;
        }else{
          //right
          return_obj[1][0] = this_opts.viewer.position.dw -tmp_margin;
          return_obj[1][1] = center_y - (this_opts.viewer.position.dw - center_x - tmp_margin) * this_tan;
        }
      } else if (the_angle < tmp_pi){
        //the second quadrant
        var point_y = center_y + center_x * this_tan;
        if(point_y < 0){
          //top
          return_obj[1][0] = center_x + (center_y - tmp_margin) / this_tan;
          return_obj[1][1] = tmp_margin;
        }else{
          //left
          return_obj[1][0] = tmp_margin;
          return_obj[1][1] = center_y + (center_x - tmp_margin) * this_tan;
        }

      } else if (the_angle < tmp_pi * 3 / 2){
        //the third quadrant
        var point_y = center_y + center_x * this_tan;
        if(point_y < this_opts.viewer.position.dh){
          //left
          return_obj[1][0] = tmp_margin;
          return_obj[1][1] = center_y + (center_x - tmp_margin) * this_tan;
        }else{
          //bottom
          return_obj[1][0] = center_x - (this_opts.viewer.position.dh - tmp_margin -center_y) / this_tan;
          return_obj[1][1] = this_opts.viewer.position.dh -tmp_margin;
        }
      } else {
        //the fourth quadrant
        var point_y = center_y - (this_opts.viewer.position.dw - center_x) * this_tan;
        if(point_y < this_opts.viewer.position.dh){
          //right
          return_obj[1][0] = this_opts.viewer.position.dw -tmp_margin;
          return_obj[1][1] = center_y - (this_opts.viewer.position.dw - tmp_margin -center_x) * this_tan;
        }else{
          //bottom
          return_obj[1][0] = center_x - (this_opts.viewer.position.dh - tmp_margin - center_y) / this_tan;
          return_obj[1][1] = this_opts.viewer.position.dh -tmp_margin;
        }
      }
      return return_obj;
    },



    _changeImageSrc: function () {

      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      //disp info text
      this_elm.find('.image_window_controller_wrap').find('.win_lv_label').text(this_opts.viewer.window.level.current);
      this_elm.find('.image_window_controller_wrap').find('.win_width_label').text(this_opts.viewer.window.width.current);
      this_elm.find('.image_window_controller_wrap').find('.image_window_controller').find('.image_window_level').val(this_opts.viewer.window.level.current);
      this_elm.find('.image_window_controller_wrap').find('.image_window_controller').find('.image_window_width').val(this_opts.viewer.window.width.current);
      this_elm.find('.disp_measure').removeClass('active');

      var changeMain = function (image_obj) {
        var tmp_ctx = this_elm.find('.series_image_elm').get(0).getContext('2d');
        var tmp_canvas_w = this_elm.find('.series_image_elm').width();
        var tmp_canvas_h = this_elm.find('.series_image_elm').height();
        tmp_ctx.clearRect(0, 0, tmp_canvas_w, tmp_canvas_h);

        var tmp_sw = this_opts.viewer.position.sw;
        var tmp_sh = this_opts.viewer.position.sh;
        var tmp_dw = this_opts.viewer.position.dw;
        var tmp_dh = this_opts.viewer.position.dh;

        if(this_opts.viewer.orientation === 'oblique'){
        //  var tmp_zoom_rate = 20;
        //  tmp_sw = this_opts.viewer.position.sw * tmp_zoom_rate;
        //  tmp_sh = this_opts.viewer.position.sh * tmp_zoom_rate;
        //  tmp_dw = this_opts.viewer.position.dw * tmp_zoom_rate;
        //  tmp_dh = this_opts.viewer.position.dh * tmp_zoom_rate;
        }

        tmp_ctx.drawImage(
          image_obj,
          this_opts.viewer.position.sx,
          this_opts.viewer.position.sy,
          tmp_sw,
          tmp_sh,
          this_opts.viewer.position.dx,
          this_opts.viewer.position.dy,
          tmp_dw,
          tmp_dh
        );
        this_obj._disableImageAlias(tmp_ctx, false);
      };//changeMain

      var src_url = this_obj._createImageUrl();

      //check the image is in Cache.
      if(typeof this_opts._tmpInfo.imgCache[src_url] !== 'undefined'){
        changeMain(this_opts._tmpInfo.imgCache[src_url].image);
        return false;
      }


      //the image is not in cache
      //if other image is loading, prevent new loading.
      //updating only Que
      this_opts._tmpInfo.lastQue = src_url;
      if (this_opts._tmpInfo.loadFlg === 0) {

        var loadImg = function(load_target_url){
          this_opts._tmpInfo.lastQue = null;
          this_opts._tmpInfo.loadFlg = 1;

          var the_active_series = this_obj.getSeriesObjectById(this_opts.viewer.activeSeriesId);
          var tmp_token_str = 'Bearer ' + the_active_series.token;

          var myWindowURL = window.URL || window.webkitURL;  // Take care of vendor prefixes.
          var xhr = new XMLHttpRequest();
          xhr.onload = function(e) {
            if (this.status == 200) {
              var blob = this.response;
              var tmp_img = new Image();
              tmp_img.onload = function(e) {

                if(this_opts.viewer.orientation === 'oblique'){
                  var tmp_Pixel_Columns = xhr.getResponseHeader('X-Circus-Pixel-Columns');
                  var tmp_Pixel_Rows = xhr.getResponseHeader('X-Circus-Pixel-Rows');
                  var tmp_Pixel_Size = xhr.getResponseHeader('X-Circus-Pixel-Size');
                  var tmp_Center = xhr.getResponseHeader('X-Circus-Center');
                  this_obj.setObliqueResponse(tmp_Pixel_Columns,tmp_Pixel_Rows,tmp_Pixel_Size,tmp_Center);
                  this_obj.syncVoxel();
                }

                changeMain(tmp_img);
                this_opts._tmpInfo.loadFlg = 0;
                myWindowURL.revokeObjectURL(tmp_img.src); // Clean up after yourself.

                this_opts._tmpInfo.imgCache[load_target_url] = {
                  'image' : tmp_img
                } // add loaded img into Cache

                //if new image is required, re-start new loading.
                if(this_opts._tmpInfo.lastQue !== null) {
                  loadImg(this_opts._tmpInfo.lastQue);
                }
              };
              tmp_img.src = myWindowURL.createObjectURL(blob);
            }
          };
          xhr.open('GET',load_target_url, true);
          xhr.setRequestHeader('Authorization', tmp_token_str);
          xhr.responseType = 'blob';
          xhr.send(); //run the request
          this_opts._tmpInfo.loadFlg = 1;
        }  //loadImg
        loadImg(src_url);
      }

    },



    changeMode: function (new_mode) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      var change_flg = false;
      var i = 0;

      if (typeof new_mode !== 'undefined') {
        for (i = 0; i < this_opts.mode_array.length; i += 1) {
          if (this_opts.mode_array[i] === new_mode) {
            change_flg = true;
          }
        }
      }

      if (change_flg === true) {
        //カーソルcss用クラス変更
        this_elm.removeClass(function (index, css) {
          return (css.match(/\bmode_\S+/g) || []).join(' ');
        });
        this_elm.addClass('mode_' + this_opts.mode);
        this_elm.find('.disp_measure').removeClass('active');
        if (this_opts.mode !== new_mode) {
          this_opts.mode = new_mode;
          this_elm.trigger('onModeChange', [this_opts.viewer.id, new_mode]);
          //ここでは変更のあったビューアーのidと適用後のモードを生成して外から取れる状態にするだけ
          //具体的な処理はコントローラ側
          var the_win_controller = this_elm.find('.image_window_controller');
          if (this_opts.mode === 'window') {
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

          if (this_opts.mode === 'rotate') {
            this_obj.syncVoxel();
          }

        }
      }

    },



    changeSeries: function (seriesId) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      this_opts.viewer.activeSeriesId = seriesId;
      var tmp_the_series = this_obj.getSeriesObjectById(seriesId);

      //set window info
      this_opts.viewer.window = {};
      this_opts.viewer.window = $.extend(true,this_opts.viewer.window,tmp_the_series.window);

      this_elm.find('.image_window_level').val(this_opts.viewer.window.level.current);
      this_elm.find('.label_level_min').val(this_opts.viewer.window.level.minimum);
      this_elm.find('.label_level_max').val(this_opts.viewer.window.level.maximum);
      this_elm.find('.image_window_width').val(this_opts.viewer.window.width.current);
      this_elm.find('.label_width_min').val(this_opts.viewer.window.width.minimum);
      this_elm.find('.label_width_max').val(this_opts.viewer.window.width.maximum);

      var tmp_preset_array = this_opts.viewer.window.preset;
      this_elm.find('.image_window_preset_select').empty();
      if (typeof this_opts.viewer.window.preset !== 'object' || this_opts.viewer.window.preset.length === 0) {
        this_elm.find('.window_preset_wrap').addClass('hidden');
      } else {
        var tmp_elm = '<option value="blank">select setting</option>';
        for (var i = 0; i < tmp_preset_array.length; i++) {
          var isSelected = '';
          if(this_opts.viewer.window.level.current === tmp_preset_array[i].level && this_opts.viewer.window.width.current === tmp_preset_array[i].width) {
            isSelected = 'selected';
          }
          tmp_elm = tmp_elm + '<option value="' + tmp_preset_array[i].level + ', ' + tmp_preset_array[i].width + '" '+isSelected+'>' + tmp_preset_array[i].label + '</option>';
        }
        this_elm.find('.window_preset_wrap').removeClass('hidden');
        this_elm.find('.image_window_preset_select').append(tmp_elm);
      }

      //set active label
      if(typeof tmp_the_series.activeLabelId === 'undefined' || tmp_the_series.activeLabelId === '' ) {
        if(typeof tmp_the_series.label === 'object' && tmp_the_series.label.length > 0 ) {
          tmp_the_series.activeLabelId = tmp_the_series.label[0].id;
        }
      }

      this_opts.viewer.voxel = $.extend(true,this_opts.viewer.voxel,tmp_the_series.voxel);
      this_obj.setCanvasSize();
    },



    changeZoom: function (inout) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      var resize_value = 0.5;

      if (inout === '+') {
        if(this_opts.viewer.position.zoom < 1){
          resize_value = 0.1;
        }
        this_opts.viewer.position.zoom = this_opts.viewer.position.zoom + resize_value;
        if(this_opts.viewer.position.zoom > 32 ) {
          this_opts.viewer.position.zoom = 32;
        }
        this_opts.viewer.position.zoom = Math.ceil(this_opts.viewer.position.zoom*10) / 10;

      } else if ( inout === '-') {
        if(this_opts.viewer.position.zoom <= 1){
          resize_value = 0.1;
        }

        this_opts.viewer.position.zoom = this_opts.viewer.position.zoom - resize_value;
        if(this_opts.viewer.position.zoom < 0.1 ) {
          this_opts.viewer.position.zoom = 0.1;
        }
        this_opts.viewer.position.zoom = Math.floor(this_opts.viewer.position.zoom * 10) / 10;
      }

      //trimming size before zoom-change
      var tmp_pre_w = this_opts.viewer.position.sw; //拡大処理前のトリミング幅
      var tmp_pre_h = this_opts.viewer.position.sh; //拡大処理前のトリミング高さ

      //trimming size after zoom-change
      this_opts.viewer.position.sw = this_opts.viewer.position.ow / this_opts.viewer.position.zoom;
      this_opts.viewer.position.sh = this_opts.viewer.position.oh / this_opts.viewer.position.zoom;

      this_opts.viewer.position.sx = this_opts.viewer.position.sx - (this_opts.viewer.position.sw - tmp_pre_w) * 0.5;
      this_opts.viewer.position.sy = this_opts.viewer.position.sy - (this_opts.viewer.position.sh - tmp_pre_h) * 0.5;

    },//changeZoom



    _CheckGuideOver : function (e, range) {
      //mousedownから呼び出し
      //マウス位置とガイドが重なっているかを調査して
      //重なっていたら 1 を、そうでなければ 0 を返す

      var the_return = '';
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      var mouse_range = this_opts.viewer.guide.grid_range;

      var guide_horizontal = this_obj.getGuide('horizontal');
      var guide_vertical =  this_obj.getGuide('vertical');

      var hall_x = this_opts.viewer.guide.hall_rate * this_opts.viewer.position.dw / this_opts.viewer.position.zoom;
      var hall_y = this_opts.viewer.guide.hall_rate * this_opts.viewer.position.dh / this_opts.viewer.position.zoom;

      if (typeof range === 'number') {
        mouse_range = range;
      }

      //マウス位置取得
      var tmp_cursor_x = (e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left) / this_opts.viewer.position.zoom;
      var tmp_cursor_y = (e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top) / this_opts.viewer.position.zoom;

      //初期位置(ズーム解除状態でのXY値)
      tmp_cursor_x = (tmp_cursor_x + this_opts.viewer.position.sx) * this_opts.viewer.position.ow / this_opts.viewer.position.dw;
      tmp_cursor_y = (tmp_cursor_y + this_opts.viewer.position.sy) * this_opts.viewer.position.oh / this_opts.viewer.position.dh;

      if (guide_horizontal.number - mouse_range < tmp_cursor_x && guide_horizontal.number + mouse_range > tmp_cursor_x) {
        //around cross point
        if (guide_vertical.number - hall_x > tmp_cursor_y || guide_vertical.number + hall_x < tmp_cursor_y) {
          the_return = 'horizontal';
        }
      } else if (guide_vertical.number - mouse_range < tmp_cursor_y && guide_vertical.number + mouse_range > tmp_cursor_y) {
        //around cross point
        if (guide_horizontal.number - hall_y > tmp_cursor_x || guide_horizontal.number + hall_y < tmp_cursor_x) {
          the_return = 'vertical';
        }
      }

      return the_return; // horizontal or vertical

    },//_CheckGuideOver



    _CheckRotateOver : function (e,range) {
      //check the Cursor is on Rotate handle.

      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      var the_return = 0; //return : 1 or 0
      var rotate_params = this_opts.viewer.rotate;

      var tmp_range = rotate_params.point_width;
      if(typeof range == 'number') {
        tmp_range = range;
      }

      var cursor_x = e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left;
      var cursor_y = e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top;

      if(
          rotate_params.arrow_x - tmp_range < cursor_x &&
          rotate_params.arrow_x + tmp_range > cursor_x &&
          rotate_params.arrow_y - tmp_range < cursor_y &&
          rotate_params.arrow_y + tmp_range > cursor_y
      ){
        the_return = 1;
      }

      return the_return;

    },//_CheckRotateOver



    _clearCanvas: function () {
      var this_obj = this;
      var this_elm = this.element;
      var tmp_w = this_elm.width();
      var tmp_h = this_elm.height();
      this_elm.find('.canvas_main_elm').get(0).getContext('2d').clearRect(0, 0, tmp_w, tmp_h);
    },



    _create: function (insert_obj) {

      //ウィジェット発動時に一番最初に走る
      //optionsに応じて要素生成
      //設置した要素へのイベント発行は  _setEventsにて
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      //キャンバス要素群生成
      var createCanvas = function () {
        var tmp_elm = '';
        tmp_elm = tmp_elm + '<div class="img_wrap">'; //画像枠,入れ子を作るので開始タグのみ
        tmp_elm = tmp_elm + '<canvas class="canvas_elm series_image_elm"></canvas>';//dicom img
        tmp_elm = tmp_elm + '<canvas class="canvas_elm canvas_main_elm"></canvas>';//draw label
        tmp_elm = tmp_elm + '<div class="mouse_cover"></div>';//マウス挙動キャッチ用要素
        tmp_elm = tmp_elm + '</div>';//画像枠,閉じタグ
        this_elm.append(tmp_elm);
        delete tmp_elm;
      }
      createCanvas();
      //キャンバス要素群生成ここまで

      //ウインドウレベル・サイズ変更パネル
      if (this_opts.viewer.elements.window.panel === true) {
        var tmp_elm = '<div class="image_window_controller_wrap"><p class="btn_open">L:<span  class="win_lv_label">' + this_opts.viewer.window.level.current + '</span>\
          /  W:<span  class="win_width_label">' + this_opts.viewer.window.width.current + '</span></p>\
          <p class="btn_close"></p><ul class="image_window_controller">';

        //レベル
        tmp_elm = tmp_elm + '<li class="window_level_wrap"><span  class="image_window_controller_label">window  level</span>\
          <input  type="text"  class="image_window_level"  value="' + this_opts.viewer.window.level.current + '">\
          <span  class="label_level_min">' + this_opts.viewer.window.level.minimum + '</span>  ～  \
          <span  class="label_level_max">' + this_opts.viewer.window.level.maximum + '</span></li>';

        //幅
        tmp_elm = tmp_elm + '<li class="window_width_wrap"><span  class="image_window_controller_label">window  width</span>\
          <input type="text" class="image_window_width"  value="' + this_opts.viewer.window.width.current + '">\
          <span  class="label_width_min">' + this_opts.viewer.window.width.minimum + '</span>  -  \
          <span  class="label_width_max">' + this_opts.viewer.window.width.maximum + '</span></li>';

        //プリセット
        tmp_elm = tmp_elm + '<li class="window_preset_wrap hidden"><select  class="image_window_preset_select"></select></li>';

        tmp_elm = tmp_elm + '</ul></div>';
        this_elm.find('.img_wrap').append(tmp_elm);

        delete tmp_elm;
      }


      //枚数送り関連要素
      if (this_opts.viewer.orientation !== 'oblique' && this_opts.viewer.elements.slider.panel === true) {
        //slider UI
        var tmp_elm = '<div class="btn_prev  common_btn">Prev</div><div class="slider_outer">\
        <div class="slider_elm"></div></div><div class="btn_next common_btn">Next</div><div class="clear">&nbsp;</div>';
        this_elm.prepend(tmp_elm);
        delete tmp_elm;
      }
      if (this_opts.viewer.orientation !== 'oblique' && this_opts.viewer.elements.slider.display === true) {
        //display number
        var tmp_disp_num = this_opts.viewer.number.current + 1;
        var tmp_elm = '<p class="disp_num">' + this_opts.viewer.number.current + '</p>';
        this_elm.find('.img_wrap').append(tmp_elm);
        delete tmp_elm;
      }

    if (this_opts.viewer.measure.active === true) {
        //定規
        var tmp_elm = '<p class="disp_measure"><span class="measure_num"></span><span class="measure_label">mm</span></p>';
        this_elm.find('.img_wrap').append(tmp_elm);
        delete tmp_elm;
      }

      //ズーム機能関連要素
      if (this_opts.viewer.elements.zoom.panel === true) {
        var tmp_elm = '<div class="img_toolbar_wrap"><ul class="img_toolbar">\
                      <li class="toolbar_btn  ico_detail_sprite ico_detail_sprite_resize_large"></li>\
                      <li class="toolbar_btn  ico_detail_sprite ico_detail_sprite_resize_short"></li>\
                    </ul></div>';
        this_elm.find('.img_wrap').prepend(tmp_elm);
        delete tmp_elm;
      }

      if (this_opts.viewer.elements.zoom.display === true) {
        //ズーム表示枠
        this_elm.find('.img_wrap').append('<p class="disp_size"><span class="current_size"></span>%</p>');
      }

      //枠線の色をつける
      for(var i=0; i<this_opts.viewer.guide.lines.length; i++) {
        if(this_opts.viewer.guide.lines[i].name === this_opts.viewer.orientation) {
          this_elm.find('.img_wrap').css('borderColor', '#'+this_opts.viewer.guide.lines[i].color);
        }
      }

    },//_create




    _createGuideHall : function(){
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      var tmp_ctx = this_elm.find('.canvas_main_elm').get(0).getContext('2d');

      var position_params = this_opts.viewer.position;
      var hall_r = position_params.dw * this_opts.viewer.guide.hall_rate;

      var guide_horizontal = this_obj.getGuide('horizontal');
      var guide_vertical =  this_obj.getGuide('vertical');

      //fit to zoom and trim
      var center_x = (guide_horizontal.number - position_params.sx) * position_params.dw / position_params.sw || 0;
      var center_y = (guide_vertical.number - position_params.sy) * position_params.dh / position_params.sh || 0;

      tmp_ctx.beginPath();
      tmp_ctx.arc(center_x, center_y, hall_r, 0, 2 * Math.PI, false);
      tmp_ctx.save();
      tmp_ctx.globalCompositeOperation = 'destination-out';
      tmp_ctx.fillStyle = 'black';
      tmp_ctx.fill();
      tmp_ctx.restore();
    },



    _createImageUrl : function(){
      var this_opts = this.options;

      var return_url = this_opts.viewer.src + '?series=' + this_opts.viewer.activeSeriesId;
      return_url = return_url + '&wl=' +this_opts.viewer.window.level.current;
      return_url = return_url + '&ww=' + this_opts.viewer.window.width.current;
      if ( this_opts.viewer.orientation === 'axial' || this_opts.viewer.orientation === 'sagittal' || this_opts.viewer.orientation === 'coronal') {
        return_url = return_url + '&mode=' + this_opts.viewer.orientation  + '&target=' + this_opts.viewer.number.current;
      } else {
        return_url = return_url + '&a=' + this_opts.viewer.cut.angle;
        return_url = return_url + '&b=' + this_opts.viewer.cut.orientation;
        return_url = return_url + '&c=' + this_opts.viewer.cut.center_x + ','+ this_opts.viewer.cut.center_y + ','+ this_opts.viewer.cut.center_z;
      }
      return return_url;
    },



    createSaveData: function (series_id, label_id) {
      //保存用データを作成する
      var return_data = this.options.container.createSaveData(series_id, label_id);
      return return_data;
    },//createSaveData





    deleteLabelObject: function (series_id, label_id) {
      var this_obj = this;
      var this_opts = this.options;
      var target_series = this_obj.getSeriesObjectById(series_id);
      for (var i = 0; i < target_series.label.length; i++) {
        if (target_series.label[i].id === label_id) {
          target_series.label.splice(i, 1);
          this_opts.container.deleteLabelObject(series_id, label_id);
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





    drawGuide : function () {

      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      var tmp_ctx = this_elm.find('.canvas_main_elm').get(0).getContext('2d');

      var guide_horizontal = this_obj.getGuide('horizontal');
      var guide_vertical =  this_obj.getGuide('vertical');



      var guide_start_x = (guide_horizontal.number + 0.5 - this_opts.viewer.position.sx) * this_opts.viewer.position.dw / this_opts.viewer.position.sw || 0;
      var guide_start_y = (guide_vertical.number + 0.5 - this_opts.viewer.position.sy) * this_opts.viewer.position.dh / this_opts.viewer.position.sh || 0;

      guide_start_x = Math.floor(guide_start_x);
      guide_start_y = Math.floor(guide_start_y);

      //draw horizontal position (vertical line)
      if (guide_horizontal.show === true && guide_horizontal.number - this_opts.viewer.position.sx >= 0) {
        tmp_ctx.beginPath();
        tmp_ctx.fillStyle = '#' + guide_horizontal.color;
        tmp_ctx.rect(
          guide_start_x,
          0,
          1,
          this_opts.viewer.position.dh
        );
        tmp_ctx.fill();
        tmp_ctx.closePath();
      }

      //draw vertical position (horizontal line)
      if (guide_vertical.show === true && guide_vertical.number - this_opts.viewer.position.sy >= 0) {
        tmp_ctx.beginPath();
        tmp_ctx.fillStyle = '#' + guide_vertical.color;
        tmp_ctx.rect(
           0,
           guide_start_y,
           this_opts.viewer.position.dw,
           1
        );
        tmp_ctx.fill();
        tmp_ctx.closePath();

      }
      this_obj._disableImageAlias(tmp_ctx, false);

    },//drawGuide





    drawLabel: function (series_id, label_id, positions_array) {
      //塗り機能
      //第1引数 : 対象ラベル
      //第2引数 : 塗る点の集合の配列  [x,y,z],[x2,y2,z2]...

      var this_obj = this;
      var this_elm = this_obj.element;
      var this_opts = this_obj.options;
      //描画対象ラベルのチェック
      var target_label = this_obj.getLabelObjectById(label_id, series_id);

      if (target_label.visible === true) {
        var tmp_ctx = this_elm.find('.canvas_main_elm').get(0).getContext('2d');
        var tmp_orientation = this_opts.viewer.orientation;
        var tmp_sx = this_opts.viewer.position.sx;
        var tmp_sy = this_opts.viewer.position.sy;
        var bold_width = this_opts.viewer.position.zoom * this_opts.viewer.position.dw / this_opts.viewer.position.ow;
        var bold_height = this_opts.viewer.position.zoom * this_opts.viewer.position.dh / this_opts.viewer.position.oh;

        tmp_ctx.beginPath();
        for (var i = positions_array.length - 1; i >= 0; i--) {
          var tmp_x = 0;
          var tmp_y = 0;
          if (tmp_orientation === 'axial') {
            tmp_x = positions_array[i][0];
            tmp_y = positions_array[i][1];
          } else if (tmp_orientation === 'coronal') {
            tmp_x = positions_array[i][0];
            tmp_y = positions_array[i][2];
          } else if (tmp_orientation === 'sagittal') {
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
    },//drawLabel





    drawMeasure : function () {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      var tmp_ctx = this_elm.find('.canvas_main_elm').get(0).getContext('2d');
      tmp_ctx.beginPath();
      tmp_ctx.strokeStyle = 'rgb(155, 187, 89)';
      tmp_ctx.fillStyle = 'rgb(155, 187, 89)';
      tmp_ctx.moveTo(this_opts.viewer.measure.start_x, this_opts.viewer.measure.start_y);
      tmp_ctx.lineTo(this_opts.viewer.measure.goal_x, this_opts.viewer.measure.goal_y);
      tmp_ctx.stroke();
      tmp_ctx.fillRect(this_opts.viewer.measure.start_x-2, this_opts.viewer.measure.start_y-2, 4, 4);
      tmp_ctx.fillRect(this_opts.viewer.measure.goal_x-2, this_opts.viewer.measure.goal_y-2, 4, 4);
      tmp_ctx.closePath();
    },//drawMeasure



    drawRotate : function () {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      //ポッチ座標算出
      var rotate_params = this_opts.viewer.rotate;
      var position_params = this_opts.viewer.position;
      var tmp_ctx = this_elm.find('.canvas_main_elm').get(0).getContext('2d');
      tmp_ctx.strokeStyle = '#' + rotate_params.color;
      tmp_ctx.fillStyle = '#' + rotate_params.color;

      if(typeof rotate_params.visible === 'undefined' || rotate_params.visible !== true) {
        return;
      }

      var guide_horizontal = this_obj.getGuide('horizontal');
      var guide_vertical =  this_obj.getGuide('vertical');

      //fit to zoom and trim
      var center_x = (guide_horizontal.number - position_params.sx) * position_params.dw / position_params.sw || 0;
      var center_y = (guide_vertical.number - position_params.sy) * position_params.dh / position_params.sh || 0;

      var the_points = this_obj._calculateRotatePoint(rotate_params.angle, center_x, center_y);

      //line
      tmp_ctx.beginPath();
      tmp_ctx.moveTo(the_points[0][0],the_points[0][1]);
      tmp_ctx.lineTo(the_points[2][0],the_points[2][1]);
      tmp_ctx.stroke();
      tmp_ctx.closePath();

      //handle arrow
      tmp_ctx.beginPath();
      tmp_ctx.arc(the_points[1][0], the_points[1][1], rotate_params.point_width, 0, Math.PI*2, false);
      tmp_ctx.fill();
      tmp_ctx.closePath();

      rotate_params.arrow_x = the_points[1][0];
      rotate_params.arrow_y = the_points[1][1];

    },//drawRotate



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

    },//eraseLabel





    _exchangePositionCtoV: function (insert_array) {
      //ある方向・ある面で描画された座標情報群の値をボクセル上での座標に変換
      //第一引数: 現在の  No.  orientation  でのXY座標群

      var this_opts = this.options;
      var rtn_array = [];
      var tmp_orientation = this_opts.viewer.orientation;
      var tmp_number_index = this_opts.viewer.number.current;

      for (var i = insert_array.length - 1; i >= 0; i--) {
        var tmp_obj = new Array(); //ボクセル上での座標を格納するオブジェクト
        if (tmp_orientation === 'axial') {
          //真上から見た断面
          tmp_obj[0] = Math.floor(insert_array[i][0]);
          tmp_obj[1] = Math.floor(insert_array[i][1]);
          tmp_obj[2] = tmp_number_index;
        } else if (tmp_orientation === 'coronal') {
          //正面からみた断面
          tmp_obj[0] = Math.floor(insert_array[i][0]);
          tmp_obj[1] = tmp_number_index;
          tmp_obj[2] = Math.floor(insert_array[i][1]);
        } else if (tmp_orientation === 'sagittal') {
          //正面から見て右側面からみた断面
          tmp_obj[0] = tmp_number_index;
          tmp_obj[1] = Math.floor(insert_array[i][0]);
          tmp_obj[2] = Math.floor(insert_array[i][1]);
        }
        rtn_array.push(tmp_obj);
      }

      return rtn_array;
    },



    _getBucketFillPositions: function (series_id,label_id,pointed_position) {
      //バケツ発動用関数
      // 第一引数: 対象シリーズid
      // 第二引数: 対象ラベルid
      // クリックされたポイントの縮尺ナシXYZ座標 [X,Y,Z]

      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      //今の向き・奥行ですでに描画・格納されている情報をコンテナから取得
      var the_painted_positions_in_target_slice = this_opts.container.returnSlice(
        series_id,
        label_id,
        this_opts.viewer.orientation,
        this_opts.viewer.number.current
      );

      var max_x = 0;
      var max_y = 0;

      if (this_opts.viewer.orientation === 'axial') {
        max_x = this_opts.viewer.voxel.x;
        max_y = this_opts.viewer.voxel.y;
      } else if (this_opts.viewer.orientation === 'coronal') {
        max_x = this_opts.viewer.voxel.x;
        max_y = this_opts.viewer.voxel.z;
      } else if (this_opts.viewer.orientation === 'sagittal') {
        max_x = this_opts.viewer.voxel.y;
        max_y = this_opts.viewer.voxel.z;
      }

      var paint_map = new Array(max_y);
      for (var count = paint_map.length-1; count >= 0; count--) {
        paint_map[count] = new Uint8Array(max_x);
      }
      //3次元座標を2次元のマップに変換
      for (var count = the_painted_positions_in_target_slice.length-1; count >= 0; count--) {
        if (this_opts.viewer.orientation === 'axial') {
          paint_map[the_painted_positions_in_target_slice[count][1]][the_painted_positions_in_target_slice[count][0]] = 1;
        } else if (this_opts.viewer.orientation === 'coronal') {
          paint_map[the_painted_positions_in_target_slice[count][2]][the_painted_positions_in_target_slice[count][0]] = 1;
        } else if (this_opts.viewer.orientation === 'sagittal') {
          paint_map[the_painted_positions_in_target_slice[count][2]][the_painted_positions_in_target_slice[count][1]] = 1;
        }
      }

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
      } else if (this_opts.viewer.orientation === 'sagittal') {
        position_x = pointed_position[1];
        position_y = pointed_position[2];
        other = pointed_position[0];
      }

      var point = new Array();
      point.push(position_x);
      point.push(position_y);

      var position = new Array();
      position.push(point);

      while (position.length !== 0) {
        //調査ポイントを取得
        var point = position.shift();
        //ポイントから右
        if (point[0]+1 < paint_map[point[1]].length) {
          if (paint_map[point[1]][point[0]+1] === 0) {
            paint_map[point[1]][point[0]+1] = 1;
            var next_point = [point[0]+1,point[1]];
            position.push(next_point);
          }
        } else {
          return 0;
        }
        //ポイントから上
        if (point[1]+1 < paint_map.length) {
          if (paint_map[point[1]+1][point[0]] === 0) {
            paint_map[point[1]+1][point[0]] = 1;
            var next_point = [point[0],point[1]+1];
            position.push(next_point);
          }
        } else {
          return 0;
        }
        //ポイントから左
        if (point[0]-1 >= 0) {
          if (paint_map[point[1]][point[0]-1] === 0) {
            paint_map[point[1]][point[0]-1] = 1;
            var next_point = [point[0]-1,point[1]];
            position.push(next_point);
          }
        } else {
          return 0;
        }
        //ポイントから下
        if (point[1]-1 >= 0) {
          if (paint_map[point[1]-1][point[0]] === 0) {
            paint_map[point[1]-1][point[0]] = 1;
            var next_point = [point[0],point[1]-1];
            position.push(next_point);
          }
        } else {
          return 0;
        }
      }
      var target_position_array = new Array();
      //2次元マップを3次元座標に変換
      for (var row = paint_map.length-1; row >= 0; row--) {
        for (var count = paint_map[row].length-1; count >= 0; count--) {
          if (this_opts.viewer.orientation === 'axial') {
            if (paint_map[row][count] === 1) {
              target_position_array[target_position_array.length] = [count, row, other];
            }
          } else if (this_opts.viewer.orientation === 'coronal') {
            if (paint_map[row][count] === 1) {
              target_position_array[target_position_array.length] = [count, other, row];
            }
          } else if (this_opts.viewer.orientation === 'sagittal') {
            if (paint_map[row][count] === 1) {
              target_position_array[target_position_array.length] = [other, count, row];
            }
          }
        }
      }

      this_opts.container.updateVoxel(series_id,label_id, 'pen',target_position_array);

      //ヒストリに積む
      this_opts.container.addHistory(series_id,label_id, 'pen',target_position_array);

      this_elm.trigger('onWritten',[label_id,series_id]);
      this_obj.syncOtherViewers();
    },//_getBucketFillPositions



    getLabelObjectById: function (label_id, series_id) {
      var this_obj = this;
      var this_opts = this.options;
      var tmp_the_series = this_obj.getSeriesObjectById(series_id);

      for (var i = tmp_the_series.label.length - 1; i >= 0; i--) {
        if (tmp_the_series.label[i].id === label_id) {
          return tmp_the_series.label[i];
          break;
        }
      }
    },//getLabelObjectById



    getGuide: function (target_direction) {
      //ビューアー内での別ビューアー断面の表示用ガイドを取得する

      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      var guide_horizontal = {};
      var guide_vertical = {};
      var i = 0;
      var return_obj = null;

      for (i = this_opts.viewer.guide.lines.length-1; i >= 0; i -= 1) {
        if (this_opts.viewer.orientation === 'axial' && this_opts.viewer.guide.lines[i].name === 'sagittal') {
          guide_horizontal = this_opts.viewer.guide.lines[i];
          guide_horizontal.maximum = this_opts.viewer.voxel.x;
        } else if (this_opts.viewer.orientation === 'axial' && this_opts.viewer.guide.lines[i].name === 'coronal') {
          guide_vertical = this_opts.viewer.guide.lines[i];
        } else if (this_opts.viewer.orientation === 'coronal' && this_opts.viewer.guide.lines[i].name === 'sagittal') {
          guide_horizontal = this_opts.viewer.guide.lines[i];
        } else if (this_opts.viewer.orientation === 'coronal' && this_opts.viewer.guide.lines[i].name === 'axial') {
          guide_vertical = this_opts.viewer.guide.lines[i];
        } else if (this_opts.viewer.orientation === 'sagittal' && this_opts.viewer.guide.lines[i].name === 'coronal') {
          guide_horizontal = this_opts.viewer.guide.lines[i];
        } else  if (this_opts.viewer.orientation === 'sagittal' && this_opts.viewer.guide.lines[i].name === 'axial') {
          guide_vertical = this_opts.viewer.guide.lines[i];
        }else if (this_opts.viewer.orientation === 'oblique' && this_opts.viewer.guide.lines[i].name === 'oblique_x') {
          guide_horizontal = this_opts.viewer.guide.lines[i];
        } else  if (this_opts.viewer.orientation === 'oblique' && this_opts.viewer.guide.lines[i].name === 'oblique_y') {
          guide_vertical = this_opts.viewer.guide.lines[i];
        }
      }

      if(target_direction === 'vertical') {
        return_obj = guide_vertical;
      } else if (target_direction === 'horizontal') {
        return_obj = guide_horizontal;
      }
      return return_obj;

    },//getGuide



    getSeriesObjectById: function (series_id) {
      //描画対象ラベルのチェック
      var this_opts = this.options;
      for (var i = this_opts.viewer.series.length - 1; i >= 0; i--) {
        if (this_opts.viewer.series[i].id === series_id) {
          return this_opts.viewer.series[i];
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
      this_opts.container.historyBack();
      this_obj.syncOtherViewers();
      $(this_elm).imageViewer('syncVoxel');
    },





    historyRedo: function () {
      //戻る手順を１つ取消
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      //コンテナ内部の戻るを取消
      this_opts.container.historyRedo();
      this_obj.syncOtherViewers();
      $(this_elm).imageViewer('syncVoxel');
    },





    //  初期化・イベント設置
    _init: function (insert_object) {

      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      if (insert_object) {
        this_opts = $.extend(true, this_opts, insert_object);
      }

      //連動用コンテナに自分の要素idを登録
      var this_id = this_elm.attr('id');
      this_opts.container.data.member.push(this_id);

      //ある分だけシリーズサイズをコンテナに送り込む
      for (var i = 0; i < this_opts.viewer.series.length; i++) {
        var tmp_series = this_opts.viewer.series[i];
        this_opts.container.setSize(
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
        this_obj._changeImageSrc();
      })
      .bind('sync', function () {
        this_obj.syncVoxel();
      }).bind('changeSeries', function (e, series_id) {
        this_obj.changeSeries(series_id);//表示シリーズ変更
      }).bind('addLabelObject', function (e, series_id, label_id) {
        this_obj.addLabelObject(series_id, label_id);//ラベル追加
      }).bind('deleteLabelObject', function (e, series_id, label_id) {
        this_obj.deleteLabelObject(series_id, label_id);//ラベル削除
      }).bind('setOptions', function (e, tmpSetValues) {
        this_obj._setOptions(tmpSetValues);//オプション情報の書き換え
      }).bind('drawGuide',function () {
        this_obj.drawGuide();
      });

      // Disable to display context menu
      this_elm.bind('contextmenu', function (e) {
        return false;
      });

      var mousewheelevent = 'onwheel' in document ? 'wheel' : 'onmousewheel' in    document ? 'mousewheel' : 'DOMMouseScroll';

      //about mouse event
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
      .bind('mouseover', function (e) {
        this_obj._mouseoverFunc(e);
      })
      .bind('mouseup', function (e) {
        this_obj._mouseupFunc(e);
      })
      .bind(mousewheelevent, function (e) {
        this_obj._mouseWheelFunc(e);
      });

      //枚数送り関連要素
      if (this_opts.viewer.elements.slider.active === true) {
        //スライダー

        this_elm.find('.slider_elm').slider({
          value: this_opts.viewer.number.current,
          orientation: 'horizontal',
          min: this_opts.viewer.number.minimum,
          max: this_opts.viewer.number.maximum,
          range: 'min',
          animate: false,
          slide: function (event, ui) {
            this_elm.addClass('isSlide');
            this_opts.viewer.number.current = ui.value;
            var tmp_disp_num = this_opts.viewer.number.current + 1;
            this_elm.find('.disp_num').text(tmp_disp_num); //画像右上の枚数表示
            this_obj._changeImageSrc();
            this_obj.syncVoxel();
            this_elm.trigger('onNumberChange',[this_opts.viewer.orientation,this_opts.viewer.number.current]);
          }, change: function (event, ui) {
            if(this_elm.hasClass('isSlide') === false){
              this_opts.viewer.number.current = ui.value;
              var tmp_disp_num = this_opts.viewer.number.current + 1;
              this_elm.find('.disp_num').text(tmp_disp_num); //画像右上の枚数表示
              this_obj._changeImageSrc();
              this_obj.syncVoxel();
              this_elm.trigger('onNumberChange',[this_opts.viewer.orientation,this_opts.viewer.number.current]);
            }else{
              this_elm.removeClass('isSlide')
            }
          }
        });

        //画像No戻るボタン
        this_elm.find('.btn_prev').click(function () {
          var tmp_num = this_opts.viewer.number.current;
          tmp_num = Number(tmp_num);
          if (tmp_num > 0) {  //0番より手前は無い
            tmp_num--;
            var tmp_disp_num = tmp_num + 1;
            this_elm.find('.disp_num').text(tmp_disp_num); //画像右上の枚数表示
          }
          //レバー追従
          this_elm.find('.slider_elm').slider({
            value: tmp_num
          });
        });

        //画像No進むボタン
        this_elm.find('.btn_next').click(function () {
          var tmp_num = this_opts.viewer.number.current;
          tmp_num = Number(tmp_num);
          if (tmp_num < this_opts.viewer.number.maximum) {  //上限枚数の制限
            tmp_num++;
            var tmp_disp_num = tmp_num + 1;
            this_elm.find('.disp_num').text(tmp_disp_num); //画像右上の枚数表示
          }
          //レバー追従
          this_elm.find('.slider_elm').slider({
            value: tmp_num
          });
        });

        this_elm.find('.btn_prev,.btn_next').mousedown(function () {
          return false;
        });

      }

      //ウインドウレベル・幅関係のイベント設置
      if (this_opts.viewer.elements.window.panel === true) {

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
          if (tmp_value !== 'blank') {
            the_win_controller.find('.image_window_level').val(tmp_value.split(', ')[0]);
            the_win_controller.find('.image_window_width').val(tmp_value.split(', ')[1]);
            windowValuesChange();
          }
        });

        //input,selectから呼び出す共通関数
        var windowValuesChange = function () {

          //ウインドウレベル
          var tmp_level = the_win_controller.find('.image_window_level').val();
          tmp_level = Number(tmp_level);
          if (isFinite(tmp_level) === true) {
            //数値であれば上限値・下限値との比較をしてcontrollerを書き換える
            //数値でないときは書き換えが走らないので操作前の値に戻る
            tmp_level = Math.min(tmp_level, this_opts.viewer.window.level.maximum);
            tmp_level = Math.max(tmp_level, this_opts.viewer.window.level.minimum);
            this_opts.viewer.window.level.current = tmp_level;
          }

          //ウインドウサイズ
          var tmp_width = the_win_controller.find('.image_window_width').val();
          tmp_width = Number(tmp_width);
          if (isFinite(tmp_width) === true) {
            //数値であれば上限値・下限値との比較
            //数値でないときは書き換えが走らないので操作前の値に戻る
            tmp_width = Math.min(tmp_width, this_opts.viewer.window.level.maximum);
            tmp_width = Math.max(tmp_width, this_opts.viewer.window.level.minimum);
            this_opts.viewer.window.width.current = tmp_width;
          }
          this_obj._changeImageSrc();
        }//windowValuesChange
      }//ウインドウレベル・幅関係のイベント設置ここまで


      //ズーム機能
      if (this_opts.viewer.elements.zoom.active === true) {
        //拡大・縮小

        this_elm.find('.ico_detail_sprite_resize_large,.ico_detail_sprite_resize_short').click(function () {
          this_elm.imageViewer('changeMode', 'pan');
          if (this_opts.viewer.position.zoom <= 32 && 0.1 <= this_opts.viewer.position.zoom) {

            if ($(this).hasClass('ico_detail_sprite_resize_large')) {
              this_obj.changeZoom('+');
            } else if ($(this).hasClass('ico_detail_sprite_resize_short')) {
              this_obj.changeZoom('-');
            }

            //display text
            this_elm.find('.current_size').text(100 * Number(this_opts.viewer.position.zoom));

            //sync some lines
            this_obj._limitImagePosition();
            this_obj._changeImageSrc();
            this_obj.syncVoxel();

            //changemode to Pan mode.
            if (this_opts.viewer.elements.window.panel === true) {
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
      this_obj.changeSeries(this_opts.viewer.activeSeriesId);//表示シリーズ変更

    },//_init





    insertLabelData: function (insert_obj) {

      //add label data written before page load
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      var put_data = this_opts.viewer.series;
      if (typeof insert_obj !== 'undefined') {
        put_data = insert_obj;
      }
      this_opts.container.insertLabelData(put_data);
    },//insertLabelData



    _limitImagePosition: function(){

      var this_obj = this;
      var this_opts = this.options;
      if(this_opts.viewer.orientation === 'oblique'){
        return;
      }

      //right side
      if (this_opts.viewer.position.sx + this_opts.viewer.position.sw > this_opts.viewer.position.ow) {
        this_opts.viewer.position.sx = this_opts.viewer.position.ow - this_opts.viewer.position.sw;
      }

      //bottom
      if (this_opts.viewer.position.sy + this_opts.viewer.position.sh > this_opts.viewer.position.oh) {
        this_opts.viewer.position.sy = this_opts.viewer.position.oh - this_opts.viewer.position.sh;
      }

      //left side
      if(this_opts.viewer.position.sx < 0 ){
        this_opts.viewer.position.sx = 0;
      }

      //top
      if (this_opts.viewer.position.sy < 0 ){
        this_opts.viewer.position.sy = 0;
      }

    },



    _mousedownFunc: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      this_opts._tmpInfo.cursor.start.X = e.clientX;
      this_opts._tmpInfo.cursor.start.Y = e.clientY;

      e.preventDefault();
      if (e.which !== 1) {
        return;
      }
      this_opts._tmpInfo.cursor.touch_flg = 1;

      //check the cursor is on Rotate-hadle or Guide-Line
      var target_guide_direction = this_obj._CheckGuideOver(e);
      var is_on_rotate  = this_obj._CheckRotateOver(e);

      if (this_opts.mode === 'rotate' && is_on_rotate === 1) {
        this_opts._tmpInfo.mode_backup = this_opts.mode;
        this_opts.mode = 'rotate_active';
      } else if (is_on_rotate !== 1 && target_guide_direction !== '') {
        this_opts._tmpInfo.mode_backup = this_opts.mode;
        this_opts.mode = 'guide_single';
      } else if (this_opts._tmpInfo.mode_backup !== '') {
        this_opts.mode = this_opts._tmpInfo.mode_backup;
        this_opts._tmpInfo.mode_backup = '';
      }

      if (this_opts.mode === 'bucket') {
        this_obj._mousedownFuncBucket(e);
      } else if (this_opts.mode === 'erase') {
        this_obj._mousedownFuncErase(e);
      } else if (this_opts.mode === 'guide') {
        this_obj._mousedownFuncGuide(e);
      } else if (this_opts.mode === 'measure') {
        this_obj._mousedownFuncMeasure(e);
      } else if (this_opts.mode === 'pan') {
        this_obj._mousedownFuncPan(e);
      } else if (this_opts.mode === 'pen') {
        this_obj._mousedownFuncPen(e);
      } else if (this_opts.mode === 'rotate_active') {
        this_obj._mousedownFuncRotate(e);
      } else if (this_opts.mode === 'window') {
        this_obj._mousedownFuncWindow(e);
      }

    },//_mousedownFunc





    _mousedownFuncPan : function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      this_opts._tmpInfo.cursor.start.X = e.clientX;
      this_opts._tmpInfo.cursor.start.Y = e.clientY;

      //get init position info of the image trimming
      this_opts._tmpInfo.elementParam.start.X = this_opts.viewer.position.sx;
      this_opts._tmpInfo.elementParam.start.Y = this_opts.viewer.position.sy;

    },//_mousedownFuncPan





    _mousedownFuncPen: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

       //一度外に出て戻ってきた場合に再び触った場合にコンテナ書き込み
       if (this_opts._tmpInfo.label.length > 0) {
       //ヒストリ
         var the_active_series = this_obj.getSeriesObjectById(this_opts.viewer.activeSeriesId);
         this_opts.container.addHistory(
           this_opts.viewer.activeSeriesId,
           the_active_series.activeLabelId,
           this_opts.mode,
           this_opts._tmpInfo.label
         );

         //描画
         this_opts.container.updateVoxel(
           this_opts.viewer.activeSeriesId,
           the_active_series.activeLabelId,
           this_opts.mode,
           this_opts._tmpInfo.label
         );

         this_opts._tmpInfo.label = [];
       }else{
         //通常のペン挙動
          //ラベルを描くcanvas要素のオブジェクト
          var tmp_ctx = this_elm.find('.canvas_main_elm').get(0).getContext('2d');

          //mouse position (on canvas , image original scale)
          var tmp_x = (e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left) / this_opts.viewer.position.zoom;
          var tmp_y = (e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top) / this_opts.viewer.position.zoom;

          //画像トリミング分の補正 , 画像原寸の位置
          tmp_x= this_opts.viewer.position.sx + tmp_x * this_opts.viewer.position.ow / this_opts.viewer.position.dw;
          tmp_y = this_opts.viewer.position.sy + tmp_y * this_opts.viewer.position.oh / this_opts.viewer.position.dh;

          this_opts._tmpInfo.cursor.current.X = tmp_x;
          this_opts._tmpInfo.cursor.current.Y = tmp_y;

         //太さを加味
          var tmp_array = this_obj._applyBoldness([[this_opts._tmpInfo.cursor.current.X, this_opts._tmpInfo.cursor.current.Y]]);

          //ボクセル座標に変換
          this_opts._tmpInfo.label = this_obj._exchangePositionCtoV(tmp_array);
          var the_active_series = this_obj.getSeriesObjectById(this_opts.viewer.activeSeriesId);
          this_opts.container.updateVoxel(
            this_opts.viewer.activeSeriesId,
            the_active_series.activeLabelId,
            this_opts.mode,
            this_opts._tmpInfo.label
          );
          this_obj.syncVoxel();
          this_obj._disableImageAlias(tmp_ctx, false);
       }

    },//_mousedownFuncPen



    _mousedownFuncErase: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
       //一度外に出て戻ってきた場合に再び触った場合にコンテナ書き込み
       if (this_opts._tmpInfo.label.length > 0) {

         //history
         var the_active_series = this_obj.getSeriesObjectById(this_opts.viewer.activeSeriesId);
         this_opts.container.addHistory(
           this_opts.viewer.activeSeriesId,
           the_active_series.activeLabelId,
           this_opts.mode,
           this_opts._tmpInfo.label
         );

         //drawing buffer
         this_opts.container.updateVoxel(
           this_opts.viewer.activeSeriesId,
           the_active_series.activeLabelId,
           this_opts.mode,
           this_opts._tmpInfo.label
         );

         this_opts._tmpInfo.label = [];
       }else{
          //通常のペン挙動
          //ラベルを描くcanvas要素のオブジェクト
          //mouse position (on canvas , image original scale)
          var tmp_x = (e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left) / this_opts.viewer.position.zoom;
          var tmp_y = (e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top) / this_opts.viewer.position.zoom;

          //画像トリミング分の補正 , 画像原寸の位置
          tmp_x= this_opts.viewer.position.sx + tmp_x * this_opts.viewer.position.ow / this_opts.viewer.position.dw;
          tmp_y = this_opts.viewer.position.sy + tmp_y * this_opts.viewer.position.oh / this_opts.viewer.position.dh;

          this_opts._tmpInfo.cursor.current.X = tmp_x;
          this_opts._tmpInfo.cursor.current.Y = tmp_y;

         //太さを加味
          var tmp_array = this_obj._applyBoldness([[this_opts._tmpInfo.cursor.current.X, this_opts._tmpInfo.cursor.current.Y]]);

          //ボクセル座標に変換
          this_opts._tmpInfo.label = this_obj._exchangePositionCtoV(tmp_array);
          var the_active_series = this_obj.getSeriesObjectById(this_opts.viewer.activeSeriesId);
          this_opts.container.updateVoxel(
            this_opts.viewer.activeSeriesId,
            the_active_series.activeLabelId,
            this_opts.mode,
            this_opts._tmpInfo.label
          );
          this_obj.syncVoxel();
          var tmp_ctx = this_elm.find('.canvas_main_elm').get(0).getContext('2d');
          this_obj._disableImageAlias(tmp_ctx, false);
       }
    },//_mousedownFuncErase





    _mousedownFuncBucket: function (e) {
       var this_obj = this;
       var this_elm = this.element;
       var this_opts = this.options;

       //通常のペン挙動
       //ラベルを描くcanvas要素のオブジェクト
       var tmp_ctx = this_elm.find('.canvas_main_elm').get(0).getContext('2d');

       //マウス位置
       this_opts._tmpInfo.elementParam.start.X = this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left;
       this_opts._tmpInfo.elementParam.start.Y = this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top;

       //canvas要素の左端を起点としたときのマウス位置(ズーム解除状態でのXY値)
       this_opts._tmpInfo.cursor.current.X = (e.clientX - this_opts._tmpInfo.elementParam.start.X) / this_opts.viewer.position.zoom;
       this_opts._tmpInfo.cursor.current.Y = (e.clientY - this_opts._tmpInfo.elementParam.start.Y) / this_opts.viewer.position.zoom;

       //画像トリミング分の補正 , 画像原寸の位置
       this_opts._tmpInfo.cursor.current.X = this_opts.viewer.position.sx + this_opts._tmpInfo.cursor.current.X * this_opts.viewer.position.ow / this_opts.viewer.position.dw;
       this_opts._tmpInfo.cursor.current.Y = this_opts.viewer.position.sy + this_opts._tmpInfo.cursor.current.Y * this_opts.viewer.position.oh / this_opts.viewer.position.dh;

       var the_active_series = this_obj.getSeriesObjectById(this_opts.viewer.activeSeriesId);
       if (typeof the_active_series.label !== 'undefined' &&  the_active_series.label.length > 0) {
         var tmp_point_position = this_obj._exchangePositionCtoV([[this_opts._tmpInfo.cursor.current.X, this_opts._tmpInfo.cursor.current.Y]]);
           this_obj._getBucketFillPositions(
           this_opts.viewer.activeSeriesId,
           the_active_series.activeLabelId,
           tmp_point_position[0]
         );
       }
    },//_mousedownFuncBucket



    _mousedownFuncMeasure : function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      this_opts.viewer.measure.start_x = e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left;
      this_opts.viewer.measure.start_y = e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top;

    },//_mousedownFuncMeasure



    _mousedownFuncGuide: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      //定規モード
      //マウス位置取得
      var tmp_cursor_x = (e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left) / this_opts.viewer.position.zoom;
      var tmp_cursor_y = (e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top) / this_opts.viewer.position.zoom;

      //初期位置(ズーム解除状態でのXY値)
      this_opts._tmpInfo.cursor.start.X = tmp_cursor_x + this_opts.viewer.position.sx * this_opts.viewer.position.dw / this_opts.viewer.position.ow;
      this_opts._tmpInfo.cursor.start.Y = tmp_cursor_y + this_opts.viewer.position.sy * this_opts.viewer.position.dh / this_opts.viewer.position.oh;

    },//_mousedownFuncGuide





    _mousedownFuncWindow: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      //get init info of window Level&width
      this_opts._tmpInfo.elementParam.start.X = this_opts.viewer.window.width.current;
      this_opts._tmpInfo.elementParam.start.Y = this_opts.viewer.window.level.current;
    },//_mousedownFuncWindow




    _mousemoveFunc: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      if (this_opts._tmpInfo.cursor.touch_flg === 1) {
        //drugging

        if (this_opts.mode === 'pan') {
          this_obj._mousemoveFuncPan(e);
        } else if (this_opts.mode === 'pen' || this_opts.mode === 'erase') {
          this_obj._mousemoveFuncDraw(e);
        } else if (this_opts.mode === 'window') {
          this_obj._mousemoveFuncWindow(e);
        } else if (this_opts.mode === 'measure') {
          this_obj._mousemoveFuncMeasure(e);
        }else if (this_opts.mode === 'rotate_active') {
          this_obj._mousemoveFuncRotate(e);
        }else if (this_opts.mode === 'guide') {
          this_obj._mousemoveFuncGuide(e);
        }else if (this_opts.mode === 'guide_single') {
          var target_guide_direction = this_obj._CheckGuideOver(e,100);
          this_obj._mousemoveFuncGuideSingle(e,target_guide_direction);
        }

      } else {
        //before drugging, just move on canvas

        if(this_opts.mode === 'rotate'){
          if( this_obj._CheckRotateOver(e) === 1 ){
            this_elm.addClass('mode_rotate_active');
            return;
          } else {
            this_elm.removeClass('mode_rotate_active');
          }

        }

        var target_guide_direction = this_obj._CheckGuideOver(e);
        if(target_guide_direction !== ''){
          this_opts._tmpInfo.mode_backup = this_opts.mode + '';
          this_elm.removeClass(function (index, css) {
            return (css.match(/\bmode_\S+/g) || []).join(' ');
          });
          this_elm.addClass('mode_guide_'+target_guide_direction);
          return;
        } else if (this_opts._tmpInfo.mode_backup !== ''){
          this_opts.mode = this_opts._tmpInfo.mode_backup;
          this_opts._tmpInfo.mode_backup = '';
          this_elm.removeClass(function (index, css) {
            return (css.match(/\bmode_\S+/g) || []).join(' ');
          });
          this_elm.removeClass('mode_guide_horizontal');
          this_elm.removeClass('mode_guide_vertical');
          this_elm.addClass('mode_' + this_opts.mode);
        }
      }

    },//_mousemoveFunc





    _mousemoveFuncPan : function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      var tmp_position_params = this_opts.viewer.position;

      var tmp_x = (e.clientX - this_opts._tmpInfo.cursor.start.X) / tmp_position_params.zoom;
      var tmp_y = (e.clientY - this_opts._tmpInfo.cursor.start.Y) / tmp_position_params.zoom;

      tmp_x = this_opts._tmpInfo.elementParam.start.X - tmp_x * tmp_position_params.ow / tmp_position_params.dw;
      tmp_y = this_opts._tmpInfo.elementParam.start.Y - tmp_y * tmp_position_params.oh / tmp_position_params.dh;

      tmp_position_params.sx = Math.round(tmp_x);
      tmp_position_params.sy = Math.round(tmp_y);

      if(this_opts.viewer.orientation !== 'oblique'){
        this_obj._limitImagePosition();
      }

     this_obj._changeImageSrc();
      this_obj.syncVoxel();
    },//_mousemoveFuncPan





    _mousemoveFuncDraw : function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      //mouse position (on canvas , image original scale)
      var tmp_x = (e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left) / this_opts.viewer.position.zoom;
      var tmp_y = (e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top) / this_opts.viewer.position.zoom;

      //画像トリミング分の補正 , 画像原寸の位置
      tmp_x= this_opts.viewer.position.sx + tmp_x * this_opts.viewer.position.ow / this_opts.viewer.position.dw;
      tmp_y = this_opts.viewer.position.sy + tmp_y * this_opts.viewer.position.oh / this_opts.viewer.position.dh;

      if (this_opts._tmpInfo.cursor.out_flg === 0) {

        //ラベルを描くcanvas要素のオブジェクト
        var tmp_ctx = this_elm.find('.canvas_main_elm').get(0).getContext('2d');

        var tmp_array = [];
        //中間点を埋める
        if (Math.abs(this_opts._tmpInfo.cursor.current.X - tmp_x) > 1 || Math.abs(this_opts._tmpInfo.cursor.current.Y - tmp_y) > 1) {
          //スキマがあるとき
          tmp_array = this_obj._getStopover(this_opts._tmpInfo.cursor.current.X, this_opts._tmpInfo.cursor.current.Y, tmp_x, tmp_y);
        } else {
          //スキマがない、中間点を埋める必要が無いとき
          tmp_array.push([tmp_x, tmp_y]);
          tmp_array.push([this_opts._tmpInfo.cursor.current.X, this_opts._tmpInfo.cursor.current.Y]);
        }

        //次のmousemoveイベントに備えて  _tmpInfo.cursor.current  更新
        this_opts._tmpInfo.cursor.current.X = tmp_x;
        this_opts._tmpInfo.cursor.current.Y = tmp_y;

        //太さ加味
        tmp_array = this_obj._applyBoldness(tmp_array);

        //ボクセル座標に変換
        tmp_array = this_obj._exchangePositionCtoV(tmp_array);
        this_opts._tmpInfo.label = this_opts._tmpInfo.label.concat(tmp_array);

        var the_active_series = this_obj.getSeriesObjectById(this_opts.viewer.activeSeriesId);

        this_opts.container.updateVoxel(
          this_opts.viewer.activeSeriesId,
          the_active_series.activeLabelId,
          this_opts.mode,
          this_opts._tmpInfo.label
        );

        this_obj.syncVoxel();
        this_obj._disableImageAlias(tmp_ctx, false);

      } else {

        //次のmousemoveイベントに備えて  {_tmpInfo.cursor.current}  更新
        this_opts._tmpInfo.cursor.current.X = tmp_x;
        this_opts._tmpInfo.cursor.current.Y = tmp_y;
        this_opts._tmpInfo.cursor.out_flg = 0;
      }

    },//_mousemoveFuncPen





    _mousemoveFuncWindow : function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      //ウインドウ情報書き換えモード
      var tmp_x = this_opts._tmpInfo.elementParam.start.X + (e.clientX - this_opts._tmpInfo.cursor.start.X) * 10;
      var tmp_y = this_opts._tmpInfo.elementParam.start.Y - (e.clientY - this_opts._tmpInfo.cursor.start.Y) * 10;

      //fix the limit (window width)
      tmp_x = Math.max(this_opts.viewer.window.width.minimum, tmp_x);
      tmp_x = Math.min(this_opts.viewer.window.width.maximum, tmp_x);

      //fix the limit (window level)
      tmp_y = Math.max(this_opts.viewer.window.level.minimum, tmp_y);
      tmp_y = Math.min(this_opts.viewer.window.level.maximum, tmp_y);

      this_opts.viewer.window.width.current = Math.round(tmp_x);
      this_opts.viewer.window.level.current = Math.round(tmp_y);

      this_obj._changeImageSrc();

    },//_mousemoveFuncWindow





    _mousemoveFuncMeasure : function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      this_opts.viewer.measure.goal_x = e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left;
      this_opts.viewer.measure.goal_y = e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top;

      this_obj.syncVoxel();
      this_elm.imageViewer('drawMeasure');

      //distant (canvas pixel scale)
      var dist_w = (this_opts.viewer.measure.goal_x - this_opts.viewer.measure.start_x) * this_opts.viewer.position.dw / this_opts.viewer.position.ow;
      var dist_h = (this_opts.viewer.measure.goal_y - this_opts.viewer.measure.start_y) * this_opts.viewer.position.dh / this_opts.viewer.position.oh;

      dist_w = dist_w / this_opts.viewer.position.zoom;
      dist_h = dist_h / this_opts.viewer.position.zoom;

      //fix to milli meter scale
      if(this_opts.viewer.orientation === 'axial') {
        dist_w = dist_w * this_opts.viewer.voxel.voxel_x;
        dist_h = dist_h * this_opts.viewer.voxel.voxel_y;
      }else if(this_opts.viewer.orientation === 'coronal') {
        dist_w = dist_w * this_opts.viewer.voxel.voxel_x;
        dist_h = dist_h * this_opts.viewer.voxel.voxel_z;
      }else if(this_opts.viewer.orientation === 'sagittal') {
        dist_w = dist_w * this_opts.viewer.voxel.voxel_y;
        dist_h = dist_h * this_opts.viewer.voxel.voxel_z;
      }

      var disp_txt = Math.sqrt( dist_w*dist_w + dist_h*dist_h );
      disp_txt = disp_txt.toFixed(2);
      this_elm.find('.disp_measure').addClass('active').find('.measure_num').text(disp_txt);

    },//_mousemoveFuncMeasure





    _mousemoveFuncGuide : function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      //ガイドモード
      //マウス位置取得(ズーム解除状態でのXY値)
      var tmp_cursor_x = (e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left) / this_opts.viewer.position.zoom;
      var tmp_cursor_y = (e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top) / this_opts.viewer.position.zoom;

      tmp_cursor_x = this_opts.viewer.position.sx + tmp_cursor_x * this_opts.viewer.position.ow / this_opts.viewer.position.dw;
      tmp_cursor_y = this_opts.viewer.position.sy + tmp_cursor_y * this_opts.viewer.position.oh / this_opts.viewer.position.dh;

      tmp_cursor_x = Math.ceil(tmp_cursor_x);
      tmp_cursor_y = Math.ceil(tmp_cursor_y);

      var guide_horizontal = this_obj.getGuide('horizontal');
      var guide_vertical =  this_obj.getGuide('vertical');

      guide_horizontal.number =tmp_cursor_x;
      guide_vertical.number = tmp_cursor_y;

      this_elm.trigger('onGuideChange',[this_opts.viewer.orientation,guide_horizontal.number,guide_vertical.number]);

    },//_mousemoveFuncGuide





    _mousemoveFuncGuideSingle : function (e,direction) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      var guide_horizontal = this_obj.getGuide('horizontal');
      var guide_vertical =  this_obj.getGuide('vertical');

      if( direction == 'horizontal' ){
         var tmp_cursor_x = (e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left) / this_opts.viewer.position.zoom;
         tmp_cursor_x = this_opts.viewer.position.sx + tmp_cursor_x * this_opts.viewer.position.ow / this_opts.viewer.position.dw;
         tmp_cursor_x = Math.ceil(tmp_cursor_x);
         guide_horizontal.number =tmp_cursor_x;
      } else {
         var tmp_cursor_y = (e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top) / this_opts.viewer.position.zoom;
         tmp_cursor_y = this_opts.viewer.position.sy + tmp_cursor_y * this_opts.viewer.position.oh / this_opts.viewer.position.dh;
         tmp_cursor_y = Math.ceil(tmp_cursor_y);
         guide_vertical.number = tmp_cursor_y;
      }
      this_obj.syncVoxel();
      this_elm.trigger('onGuideChange',[this_opts.viewer.orientation,guide_horizontal.number,guide_vertical.number]);

    },//_mousemoveFuncGuide



    _mousedownFuncRotate: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

    },//_mousedownFuncRotate



    _mousemoveFuncRotate : function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      var tmp_cursor_x = (e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left);
      var tmp_cursor_y = (e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top);

      var center_x = (this_obj.getGuide('horizontal').number - this_opts.viewer.position.sx ) * this_opts.viewer.position.zoom * this_opts.viewer.position.dw / this_opts.viewer.position.ow;
      var center_y = (this_obj.getGuide('vertical').number - this_opts.viewer.position.sy ) * this_opts.viewer.position.zoom * this_opts.viewer.position.dh / this_opts.viewer.position.oh;

      var new_angle = Math.atan( (center_y - tmp_cursor_y) / (tmp_cursor_x - center_x) );
      if(tmp_cursor_x < center_x){
        //the second & third quadrant
        new_angle = new_angle + Math.PI;
      }

      new_angle = Math.ceil( new_angle * 100 ) / 100;

      this_opts.viewer.rotate.angle = new_angle;
      this_obj.syncVoxel();
      this_elm.trigger('onRotateChange', [this_opts.viewer.orientation,new_angle]);
    },//_mousemoveFuncRotate




    _mouseoutFunc: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      this_opts._tmpInfo.cursor.out_flg = 1;

      //手のひらツール
      if (this_opts.mode === 'pan' || this_opts.mode === 'window') {
        this_opts._tmpInfo.cursor.touch_flg = 0;
      }

      if(this_opts._tmpInfo.mode_backup !== ''){
        this_opts.mode = this_opts._tmpInfo.mode_backup;
        this_opts._tmpInfo.mode_backup = '';
      }
    },//_mouseoutFunc





    _mouseupFunc: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      this_opts._tmpInfo.cursor.touch_flg = 0;

      if (this_opts.mode === 'pen' || this_opts.mode === 'erase') {
        this_obj._mouseupFuncDraw(e);
      } else if (this_opts.mode === 'bucket') {
        this_obj.syncVoxel();
      } else if (this_opts.mode === 'guide') {
        this_obj._mouseupFuncGuide(e);
      } else if (this_opts.mode === 'guide_single') {
        this_obj._mouseupFuncGuideSingle(e);
      }

    },//_mouseupFunc





    _mouseupFuncDraw: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      //exchange positions data to VOXEL 3D
      if (this_opts._tmpInfo.label.length > 0) {
        //put into history
        var the_active_series = this_obj.getSeriesObjectById(this_opts.viewer.activeSeriesId);
        this_opts.container.addHistory(
          this_opts.viewer.activeSeriesId,
          the_active_series.activeLabelId,
          this_opts.mode,
          this_opts._tmpInfo.label
        );

        //update voxel buffer
        this_opts.container.updateVoxel(
          this_opts.viewer.activeSeriesId,
          the_active_series.activeLabelId,
          this_opts.mode,
          this_opts._tmpInfo.label
        );
      }

      //clear memory
      this_opts._tmpInfo.label = [];
      this_obj.syncOtherViewers();

      //trigger the Event for some controllers
      if (typeof this_opts.viewer.activeSeriesId !== 'undefined' && typeof the_active_series !== 'undefined') {
        this_elm.trigger('onWritten', [the_active_series.activeLabelId, this_opts.viewer.activeSeriesId]);
      }
    },//_mouseupFuncDraw





    _mouseupFuncGuide: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      //ガイドモード
      //マウス位置取得(ズーム解除状態でのXY値)
      var tmp_cursor_x = (e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left) / this_opts.viewer.position.zoom;
      var tmp_cursor_y = (e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top) / this_opts.viewer.position.zoom;

      tmp_cursor_x = this_opts.viewer.position.sx + tmp_cursor_x * this_opts.viewer.position.ow / this_opts.viewer.position.dw;
      tmp_cursor_y = this_opts.viewer.position.sy + tmp_cursor_y * this_opts.viewer.position.oh / this_opts.viewer.position.dh;

      //画像トリミング分の補正
      this_opts._tmpInfo.cursor.current.X = tmp_cursor_x + this_opts.viewer.position.sx;
      this_opts._tmpInfo.cursor.current.Y = tmp_cursor_y + this_opts.viewer.position.sy;

      tmp_cursor_x = Math.ceil(tmp_cursor_x);
      tmp_cursor_y = Math.ceil(tmp_cursor_y);

      var guide_horizontal = this_obj.getGuide('horizontal');
      var guide_vertical =  this_obj.getGuide('vertical');

      guide_horizontal.number =tmp_cursor_x;
      guide_vertical.number = tmp_cursor_y;

      this_elm.trigger('onGuideChange',[this_opts.viewer.orientation,guide_horizontal.number,guide_vertical.number]);

    },//_mouseupFuncGuide





    _mouseupFuncGuideSingle: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      if(this_opts._tmpInfo.mode_backup !== ''){
        this_opts.mode = this_opts._tmpInfo.mode_backup;
        this_opts._tmpInfo.mode_backup = '';
      }
    },//_mouseupFuncGuideSingle





    _mouseoverFunc: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      this_opts._tmpInfo.cursor.out_flg = 0;
    },//_mouseoverFunc





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

      this_obj.syncVoxel();
      return false;
    },//_mouseWheelFunc





    _setOptions: function (tmpSetValues) {
       var this_obj = this;
       var this_elm = this.element;
       var this_opts = this.options;

       $.extend(true, this_opts, tmpSetValues);

       //ウインドウレベル・サイズ領域に値を入れ込む
      if (this_opts.viewer.elements.window.panel === true) {
        this_elm.find('.image_window_level').val(this_opts.viewer.window.level.current);
        this_elm.find('.label_level_min').val(this_opts.viewer.window.level.minimum);
        this_elm.find('.label_level_max').val(this_opts.viewer.window.level.maximum);
        this_elm.find('.image_window_width').val(this_opts.viewer.window.width.current);
        this_elm.find('.label_width_min').val(this_opts.viewer.window.width.minimum);
        this_elm.find('.label_width_max').val(this_opts.viewer.window.width.maximum);
        this_elm.find('.image_window_preset_select').empty();

        var tmp_preset_array = this_opts.viewer.window.preset;
        var tmp_elm = '<option value="blank">select setting</option>';
        var selected_opt = '';
        if (typeof this_opts.viewer.window.preset === 'object' && this_opts.viewer.window.preset.length > 0) {
          for (var i = 0; i < tmp_preset_array.length; i++) {
            if (this_opts.viewer.window.level.current === tmp_preset_array[i].level && this_opts.viewer.window.level.current === tmp_preset_array[i].level) {
              selected_opt = tmp_preset_array[i].level + ', ' + tmp_preset_array[i].width;
            }
            tmp_elm = tmp_elm + '<option  value="' + tmp_preset_array[i].level + ', ' + tmp_preset_array[i].width + '">' + tmp_preset_array[i].label + '</option>';
          }
       }
       this_elm.find('.image_window_preset_select').append(tmp_elm);
       if (selected_opt !== '') {
         this_elm.find('.image_window_preset_select').val(selected_opt);
       }
      }
    }, //_setOptions





    setCanvasSize: function () {
      //シリーズ追加時・初期表示時にビューアーの大きさを再調整・コンテナにサイズ定義
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      var tmp_w = 512;
      var tmp_h = 512;
      var tmp_ow = 512;
      var tmp_oh = 512;
      var tmp_num = 512;

      var active_series = this_obj.getSeriesObjectById(this_opts.viewer.activeSeriesId);

      if (this_opts.viewer.orientation === 'axial') {
        tmp_w = active_series.voxel.x;
        tmp_h = active_series.voxel.y * active_series.voxel.voxel_y / active_series.voxel.voxel_x;
        tmp_ow = active_series.voxel.x;
        tmp_oh = active_series.voxel.y;
        tmp_num = active_series.voxel.z - 1;
      } else if (this_opts.viewer.orientation === 'sagittal') {
        tmp_w = active_series.voxel.y * active_series.voxel.voxel_y / active_series.voxel.voxel_x;
        tmp_h = active_series.voxel.z * active_series.voxel.voxel_z / active_series.voxel.voxel_x;
        tmp_ow = active_series.voxel.y;
        tmp_oh = active_series.voxel.z;
        tmp_num = active_series.voxel.x - 1;
      } else if (this_opts.viewer.orientation === 'coronal') {
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
        min: this_opts.viewer.number.minimum,
        max: this_opts.viewer.number.maximum
      });



      var tmp_voxel_zoom = 512 / this_opts.viewer.voxel.x;
      this_opts.viewer.position.dw =this_opts.viewer.position.dw * tmp_voxel_zoom;
      this_opts.viewer.position.dh =this_opts.viewer.position.dh * tmp_voxel_zoom;

      //キャンバスのサイズ定義
      this_elm.find('.series_image_elm,.canvas_main_elm').attr({
        width: this_opts.viewer.position.dw,
        height: this_opts.viewer.position.dh
      })
      .css({
        width: this_opts.viewer.position.dw + 'px',
        height: this_opts.viewer.position.dh + 'px'
      });
    },//setCanvasSize



    setObliqueResponse: function (tmp_Pixel_Columns,tmp_Pixel_Rows,tmp_Pixel_Size,tmp_Center) {


      //キャッシュから画像を読んだ時もこれが発動するようにしよう

      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      this_opts.viewer.voxel.x = this_opts.viewer.position.ow = Number(tmp_Pixel_Columns);
      this_opts.viewer.voxel.y = this_opts.viewer.position.oh = Number(tmp_Pixel_Rows);
      this_opts.viewer.voxel.voxel_x = this_opts.viewer.voxel.voxel_y = Number(tmp_Pixel_Size);

      this_opts.viewer.position.dw = this_opts.viewer.position.ow * this_opts.viewer.position.zoom;
      this_opts.viewer.position.dh = this_opts.viewer.position.oh * this_opts.viewer.position.zoom;

      this_opts.viewer.position.sw = this_opts.viewer.position.ow / this_opts.viewer.position.zoom;
      this_opts.viewer.position.sh = this_opts.viewer.position.oh / this_opts.viewer.position.zoom;

      this_opts.viewer.position.sw = Math.floor(this_opts.viewer.position.sw);
      this_opts.viewer.position.sh = Math.floor(this_opts.viewer.position.sh);

      var guide_x = tmp_Center.split(',')[0];
      var guide_y = tmp_Center.split(',')[1];

      var guide_horizontal = this_obj.getGuide('horizontal');
      var guide_vertical =  this_obj.getGuide('vertical');

      guide_horizontal.number = Number(guide_x);
      guide_vertical.number = Number(guide_y);

    },



    syncOtherViewers: function () {

      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      var tmp_this_id = this_elm.attr('id');
      for (var i = this_opts.container.data.member.length - 1; i >= 0; i--) {
        if(tmp_this_id !== this_opts.container.data.member[i]) {
          $('#' + this_opts.container.data.member[i]).imageViewer('syncVoxel');
        }
      }
    },//syncOtherViewers



    syncVoxel: function () {

      //update voxel & guide
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      this_obj._clearCanvas();
      this_obj.drawGuide();

      if( this_opts.viewer.rotate.visible === true){
        this_obj.drawRotate();
      }
      this_obj._createGuideHall();

      //get all position for Drawing of all Labels of all Seies.
      for (var i = this_opts.container.data.series.length - 1; i >= 0; i--) {
        var tmp_the_series = this_opts.container.data.series[i];

        //現在のシリーズのラベルだけ表示
        if (tmp_the_series.id === this_opts.viewer.activeSeriesId) {
          for (var j = tmp_the_series.label.length - 1; j >= 0; j--) {
            var tmp_the_label = tmp_the_series.label[j];
            var tmp_array = this_opts.container.returnSlice(
              tmp_the_series.id,
              tmp_the_label.id,
              this_opts.viewer.orientation,
              this_opts.viewer.number.current
            );

            if (tmp_array.length > 0) {
              this_obj.drawLabel(tmp_the_series.id,tmp_the_label.id,tmp_array);
            }
          }
        }
      }
    } //syncVoxel
  });

})(jQuery);