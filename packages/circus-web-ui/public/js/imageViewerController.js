//コントローラ・ビューアーウィジェットをコントロールする
//この案件固有の機能群

(function ($) {

  //連動のために確保する情報群(デフォルト値)
  //コントローラ発動時にサーバーからもらった情報をマージして格納する
  //変更時にはこれを書き換えて、以降の処理時に参照する
  var controllerInfo = {
    activeSeriesId: '', //参照するシリーズid
    baseUrl: 'http://your-website/', //画像格納ディレクトリ
    color_marker: 0,
    defaultColorSet: ['#FF0000', '#FFCC00', '#0033FF', '#0099FF', '#00CCFF', '#00FFFF', '#00FF00', '#00CC00', '#009900', '#006600', '#FF6600', '#FF3300', '#3333CC', '#CC3399', '#CC6666', '#FF9999'],
    mode: 'pan', //pan,pen,erase,window
    series: [
      {
        activeLabelId: '',
        //ウインドウレベル・幅はシリーズに紐づかせるか否かはユーザー定義
        id: '',
        description: 'series name', //シリーズ名,今は特に使っていない
        number: 512, //何枚の断面が格納されているか
        thickness: 1, //断面１枚あたりの厚さ todo 名前を要確認
        window: {
          level: {
            current: 1000,
            maximum: 4000,
            minimum: 0
          },
          width: {
            current: 4000,
            maximum: 2000,
            minimum: 1
          },
          preset: [
            {label: 'your preset label', level: 1000, width: 4000}
          ]
        },
        voxel: {
          x: 512, //series画像での横ピクセル数
          y: 512, //series画像での縦ピクセル数
          z: 512, //seriesに含まれる画像の枚数
          voxel_x: 1, //ボクセルの幅
          voxel_y: 1, //ボクセルの奥行き
          voxel_z: 1 //ボクセルの高さ
        }
        //todo xyzの方向によって表示するときの縮尺が違うようなことがある場合には,その縮尺に相当するパラメータを用意しよう
      } //series１個分の情報群
    ],
    control: {
      boldness: {
        active: true,
        value: 1
      }, //太さ変更
      bucket: {
        active: true,
        value: 1
      }, //太さ変更
      measure: {
        active: true, //定規機能の有効・無効
        panel: true, //定規表示パネルの有無
      },
      color: {
        control: true //カラーピッカーの有無
      },
      pan: true, //手のひらツール
      window: {
        active: true,
        panel: true
      },
      pen: {
        active: true, //描画機能の有効・無効
        panel: true, //ラベル情報表示パネルの有無

      },
      show: true, //そもそもコントロールパネルを置くかどうか
      undo: true //戻す・やり直す一括
    },
    elements: {
      parent: '', //複数のビューアーを全て囲う親要素id
      panel: '', //操作パネルを入れ込む要素id
      label: '' //ラベルの操作ボタン等を入れ込む要素id
    },
    viewer: [ //展開するビューアーの情報
      {
        id: 'viewer_',//内部的にビューアーに名前を付けておく
        elementId: '',
        orientation: 'axial',
        window: {}, //ひな形の中身は active_series.window と共通
        number: {
          maximum: 512, //何枚の断面が格納されているか
          minimum: 0, //何枚の断面が格納されているか
          current: 0 //初期の表示番号
        }
      }
    ]
  }


  //3枚連動のためのメソッド群
  var controller_methods = {


    addLabelObject: function () {
      //ラベルの新規追加
      var this_elm = this;
      var active_series = this_elm.imageViewerController('getSeriesObjectById', [controllerInfo.activeSeriesId]);
      if (typeof active_series != 'object') {
        active_series = controllerInfo.series[0];
        controllerInfo.activeSeriesId = active_series.id;
      }
      //まだactiveSeriesにラベルオブジェクトが無い場合
      if (typeof active_series.label != 'object') {
        active_series.label = new Array();
      }
      var tmp_label_obj = new Object();
      var tmp_color_index_num = active_series.label.length;

      var label_default = this_elm.imageViewerController('getLabelDefault', tmp_color_index_num);
      tmp_label_obj = $.extend(true, tmp_label_obj, label_default);

      active_series.label.push(tmp_label_obj);
      //activeLabelが空白のままなら、一番手前のものをactiveLabelとする
      if (active_series.activeLabelId == '') {
        active_series.activeLabelId = tmp_id;
      }

      //配下ビューアーオプション情報を書き換えて再描画を発火させる
      for (var i = controllerInfo.viewer.length - 1; i >= 0; i--) {
        var elmId = '#' + controllerInfo.viewer[i].elementId;
        $(elmId).trigger('addLabelObject', [controllerInfo.activeSeriesId, tmp_label_obj]);
      }
    },


    changeActiveSeries: function (active_series_id) {
      var this_elm = this;
      controllerInfo.activeSeriesId = active_series_id;
      this_elm.find('#' + active_series_id).addClass('active');
      this_elm.imageViewerController('updateLabelElements');

      //モードがペンで、対象シリーズにラベルがまだない場合
      this_elm.imageViewerController('changeMode', 'pan');

      //紐づくビューアーたちに伝播
      for (var i = 0; i < controllerInfo.viewer.length; i++) {
        var elmId = '#' + controllerInfo.viewer[i].elementId;
        $(elmId).trigger('changeSeries', active_series_id);
        $(elmId).trigger('sync');
      }
    },


    checkUpdateLabel: function () {
      //書き換えがあったラベルのidを差し替える
      var this_elm = this;

      for (var i = 0; i < controllerInfo.series.length; i++) {
        var tmp_the_controller_series = controllerInfo.series[i];

        for (var j = 0; j < tmp_the_controller_series.label.length; j++) {
          var tmp_the_label = tmp_the_controller_series.label[j];
          var tmp_current_label_id = tmp_the_label.id + '';	//更新前のラベルid


          if (typeof tmp_the_label.update_flg != 'undefined' && tmp_the_label.update_flg == true) {
            var tmp_new_label_id = this_elm.imageViewerController('getLabelDefault').id;

            //ビューアー内のラベルオブジェクトid書き換え
            for (var k = 0; k < controllerInfo.viewer.length; k++) {
              var tmp_the_viewer = controllerInfo.viewer[k];
              var the_viewer_options = $('#' + tmp_the_viewer.elementId).imageViewer('option', 'viewer');
              for (var l = 0; l < the_viewer_options.draw.series.length; l++) {
                var the_viewer_series = the_viewer_options.draw.series[l];
                if (the_viewer_series.activeLabelId == tmp_current_label_id) {
                  the_viewer_series.activeLabelId = tmp_new_label_id;
                }

                for (var m = 0; m < the_viewer_series.label.length; m++) {
                  var the_viewer_label = the_viewer_series.label[m];
                  if (the_viewer_label.id == tmp_current_label_id) {
                    the_viewer_label.id = tmp_new_label_id;
                  }
                }
              }
            }

            //コンテナ内部のラベルidを差し替え
            var container_object = controllerInfo.viewer[0].container;
						container_object.changeLabelName(tmp_current_label_id, tmp_the_controller_series.id,tmp_new_label_id);

            //コントローラのラベルオブジェクトid書き換え
            tmp_the_label.id = tmp_new_label_id;
            if (tmp_the_controller_series.activeLabelId == tmp_current_label_id) {
              tmp_the_controller_series.activeLabelId = tmp_new_label_id;
            }

            tmp_the_label.update_flg = false;

          }
        }
      }

      this_elm.imageViewerController('updateLabelElements');

      //紐づくビューアーたちに伝播
      for (var i = 0; i < controllerInfo.viewer.length; i++) {
        var elmId = '#' + controllerInfo.viewer[i].elementId;
        $(elmId).trigger('sync');
      }

    }/*checkUpdateLabel*/,


    //モード変更
    changeMode: function (new_mode) {

      controllerInfo.mode = new_mode;
      var this_elm = this;
      var active_series = this_elm.imageViewerController('getSeriesObjectById', [controllerInfo.activeSeriesId]);
      if (typeof active_series != 'object') {
        active_series = controllerInfo.series[0];
        controllerInfo.activeSeriesId = active_series.id;
      }

      var tmp_panel_elm = 'body';
      if (controllerInfo.elements.panel.length > 0) {
        tmp_panel_elm = '#' + controllerInfo.elements.panel;
      }
      tmp_panel_elm = $(tmp_panel_elm);

      if (controllerInfo.mode == 'bucket') {
        //バケツ塗りつぶしモード
        tmp_panel_elm.find('.ico_detail_sprite_bucket').addClass('active')
          .siblings().removeClass('active');
      } else if (controllerInfo.mode == 'erase') {
        //消しゴムモード
        tmp_panel_elm.find('.ico_detail_sprite_erase').addClass('active')
          .siblings().removeClass('active');
      } else if (controllerInfo.mode == 'pan') {
        //手のひら・ズーム
        tmp_panel_elm.find('.ico_detail_sprite_pan').addClass('active')
          .siblings().removeClass('active');

        if (typeof active_series.label != 'object') {
          //ペンモードにしたときにそのシリーズにまだラベルが紐づいていないときは新規作成
          this_elm.imageViewerController('addLabelObject');
          this_elm.imageViewerController('updateLabelElements');
        }

      } else if (controllerInfo.mode == 'pen') {
        //ペン
        tmp_panel_elm.find('.ico_detail_sprite_pen').addClass('active')
          .siblings().removeClass('active');

        if (active_series.label.length == 0) {
          tmp_panel_elm.find('.add_label').trigger('click');
        }
        ;

      } else if (controllerInfo.mode == 'window') {
        //ウインドウ調整
        tmp_panel_elm.find('.ico_detail_sprite_image_window').addClass('active')
          .siblings().removeClass('active');
      } else if (controllerInfo.mode == 'measure') {
        //定規調整
        tmp_panel_elm.find('.ico_detail_sprite_measure').addClass('active')
          .siblings().removeClass('active');
      }
      ;

      //紐づくビューアーたちにモード変更を伝播
      for (var i = 0; i < controllerInfo.viewer.length; i++) {
        var elmId = '#' + controllerInfo.viewer[i].elementId;
        $(elmId).imageViewer('changeMode', controllerInfo.mode);
      }

    },


    //各種操作ボタン等の設置
    //jQuery UI widget とは異なり、initの中から呼ぶ
    create: function () {

      var this_elm = this;
      var active_series = this_elm.imageViewerController('getSeriesObjectById', [controllerInfo.activeSeriesId]);
      if (typeof active_series != 'object') {
        active_series = controllerInfo.series[0];
        controllerInfo.activeSeriesId = active_series.id;
      }

      var tmp_panel_elm = 'body';
      if (controllerInfo.elements.panel.length > 0) {
        tmp_panel_elm = '#' + controllerInfo.elements.panel;
      }
      tmp_panel_elm = $(tmp_panel_elm);

      if (controllerInfo.control.show == true) { //コントロールパネル有無
        tmp_panel_elm.prepend('<div class="img_toolbar_wrap"><ul class="img_toolbar"></ul><div class="clear">&nbsp;</div></div>');
        var tmp_panel_wrap = tmp_panel_elm.find('.img_toolbar');

        //ウインドウサイズ・レベル
        if (controllerInfo.control.window.active == true) {

          if (controllerInfo.control.window.panel == true) {

            var tmp_elments = '<li class="toolbar_btn ico_detail_sprite ico_detail_sprite_image_window">\
				   <ul class="image_window_controller"><li><p class="btn_open"></p><p class="btn_close"></p></li></ul>\
				   </li>';
            tmp_panel_wrap.append(tmp_elments);

            tmp_panel_wrap.find('.image_window_controller').append('<li class="window_level_wrap"></li><li class="window_width_wrap"></li>');

            var tmp_elments_window_level = '<span class="image_window_controller_label">window level</span><input type="text" class="image_window_level" value="">';
            var tmp_elments_window_width = '<span class="image_window_controller_label">window width</span><input type="text" class="image_window_width" value="">';

            tmp_panel_wrap.find('.image_window_controller').find('.window_level_wrap').append(tmp_elments_window_level);
            tmp_panel_wrap.find('.image_window_controller').find('.window_width_wrap').append(tmp_elments_window_width);

            tmp_panel_wrap.find('.image_window_level').val(active_series.window.level.current);
            tmp_panel_wrap.find('.image_window_width').val(active_series.window.width.current);

            tmp_elments_window_level = active_series.window.level.minimum + ' ～ ' + active_series.window.level.maximum;
            tmp_elments_window_width = active_series.window.width.minimum + ' ～ ' + active_series.window.width.maximum;

            tmp_panel_wrap.find('.image_window_controller').find('.window_level_wrap').append(tmp_elments_window_level);
            tmp_panel_wrap.find('.image_window_controller').find('.window_width_wrap').append(tmp_elments_window_width);

            //プリセット
            if (active_series.window.preset.length > 0) {
              tmp_panel_wrap.find('.image_window_controller').append('<li class="window_preset_wrap"><select class="image_window_preset_select"></select></li>');
              var tmp_elments_window_preset = '<option value="blank">select setting</option>';
              for (var i = 0; i < active_series.window.preset.length; i++) {
                tmp_elments_window_preset = tmp_elments_window_preset + '<option value="' + active_series.window.preset[i].level + ',' + active_series.window.preset[i].width + '">' + active_series.window.preset[i].label + ' ' + active_series.window.preset[i].level + ',' + active_series.window.preset[i].width + '</option>';
              }
              tmp_panel_wrap.find('.image_window_preset_select').append(tmp_elments_window_preset);
            } //プリセット
            delete tmp_elments;
          } else {
            var tmp_elments = '<li class="toolbar_btn ico_detail_sprite ico_detail_sprite_image_window"></li>';
            tmp_panel_wrap.append(tmp_elments);
          }
        }

        //ペンツールボタン
        if (controllerInfo.control.pen.active == true) {
          //パン切替
          var tmp_elments = '<li class="toolbar_btn ico_detail_sprite ico_detail_sprite_pan"></li>';

          //ペン切替
          tmp_elments = tmp_elments + '<li class="toolbar_btn ico_detail_sprite ico_detail_sprite_pen"></li>';

          //消しゴム
          tmp_elments = tmp_elments + '<li class="toolbar_btn ico_detail_sprite ico_detail_sprite_erase"></li>';

          //太さ変更
          if (controllerInfo.control.boldness.active == true) {
            var tmp_boldness_elm = '<li class="toolbar_param toolbar_weight_wrap"><select class="toolbar_weight">';
            for (var i = 1; i < 9; i++) {
              tmp_boldness_elm = tmp_boldness_elm + '<option value="' + [i] + '">' + [i] + 'px</option>';
            }
            tmp_elments = tmp_elments + tmp_boldness_elm + '</select></li>';
            delete tmp_boldness_elm;
          }

          //手前に戻す・繰り返す(セット)
          if (controllerInfo.control.undo == true) {
            tmp_elments = tmp_elments + '<li class="toolbar_btn ico_detail_sprite draw_back"></li><li class="toolbar_btn ico_detail_sprite draw_redo"></li>';
          }

          tmp_panel_wrap.append(tmp_elments);
          delete tmp_elments;
          delete tmp_panel_wrap;
        }

        if (controllerInfo.control.measure.active == true) {
          var tmp_elments = '<li class="toolbar_btn ico_detail_sprite ico_detail_sprite_measure"></li>';
          tmp_panel_wrap.append(tmp_elments);
        }

        if (controllerInfo.control.bucket.active == true) {
          var tmp_elments = '<li class="toolbar_btn ico_detail_sprite ico_detail_sprite_bucket"></li>';
          tmp_panel_wrap.append(tmp_elments);
        }

        /*ラベル表示領域*/
        if (controllerInfo.control.pen.panel == true) {
          //各ラベル項目はsetEventsの後に発動するのでここは外枠と追加ボタンだけ
          $('#' + controllerInfo.elements.label).append('<div class="label_select_wrap"><div class="add_label">新規ラベル追加</div></div>');

          if (typeof active_series.label != 'object' || active_series.label.length == 0) {
            //ロード時にラベルがなければ一番手前のシリーズに１つだけデフォルトラベル生成
            //ただしここではオブジェクトに追加するだけ。要素生成は別
            this_elm.imageViewerController('addLabelObject');
          }
          this_elm.imageViewerController('updateLabelElements');

          //アクティブラベルの指定が無ければラベル配列の１番目を有効化
          if (active_series.activeLabelId == '') {
            active_series.activeLabelId = active_series.label[0].id;
          }

          var tmp_info_elm = '<div class="label_info_wrap"><div class="label_info">\
				  <span class="common_btn edit_activate">Edit</span>\
				  <span class="common_btn edit_finish disabled">OK</span>\
				  <input type="hidden" value="" class="label_id">\
				  <input type="text" value="" class="label_title readonly>\
				  <textarea value="" class="label_description" readonly></textarea>\
				  </div></div><div class="clear">&nbsp;</div>';

          $('#' + controllerInfo.elements.label).append(tmp_info_elm);
        }//ラベル関連


      }//control

      //要素設置が済んだらイベント設置
      this_elm.imageViewerController('setEvents');

    },//create


    createRandomStr: function (insert_array) {
      var n = insert_array[0];	//桁数
      var b = insert_array[1] || '';
      var a = 'abcdefghijklmnopqrstuvwxyz'
        + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        + '0123456789'
        + b;
      a = a.split('');
      var s = '';
      for (var i = 0; i < n; i++) {
        s += a[Math.floor(Math.random() * a.length)];
      }
      return s;
    },


    deleteLabelObject: function (series_id, label_id) {
      //ラベルオブジェクトから該当項目を削除
      var this_elm = this;
      var tmp_target_series = this_elm.imageViewerController('getSeriesObjectById', [controllerInfo.activeSeriesId]);

      for (var j = 0; tmp_target_series.label.length; j++) {
        if (tmp_target_series.label[j].id == label_id) {
          tmp_target_series.label.splice(j, 1);
          break;
        }
      }

      //ラベルが無かったら手のひらモードに切り替える
      if (tmp_target_series.label.length == 0) {
        this_elm.imageViewerController('changeMode', 'pan');
      }

      //要素に反映
      this_elm.imageViewerController('updateLabelElements');


      for (var i = controllerInfo.viewer.length - 1; i >= 0; i--) {
        var elmId = '#' + controllerInfo.viewer[i].elementId;

        //ビューアー内部のオブジェクト削除
        $(elmId).trigger('deleteLabelObject', [series_id, label_id]);

        //配下ビューアー表示を同期
        $(elmId).trigger('sync');
      }

    },


    getSeriesObjectById: function (series_id) {
      //series ID を渡して,そのseriesのオブジェクトを返す
      //第一引数は1項目の配列, jQuery widget の呼び出しの都合上,配列で渡している

      var rtn_obj = '';
      for (var i = controllerInfo.series.length - 1; i >= 0; i--) {
        if (controllerInfo.series[i].id == series_id[0]) {
          rtn_obj = controllerInfo.series[i];
          break;
        }
      }

      return rtn_obj;
    },



    //３面共用のコントローラー情報の取り出し
    getValues: function () {
      return controllerInfo;
    },



    init: function (insert_obj) {

      //コントローラ呼び出し時の初期挙動
      //insert_obj はhtmlからinit のvalue値で渡された情報json
      var this_elm = this;

      //入力データ内でウィンドウ情報をマージ
      //シリーズ全体の適用とビューアごとの適応があるため

      var active_series = this_elm.imageViewerController('getSeriesObjectById', [controllerInfo.activeSeriesId]);
      if (typeof active_series != 'object') {
        active_series = controllerInfo.series[0];
        controllerInfo.activeSeriesId = active_series.id;
      }

      for (var i = 0; i < insert_obj.viewer.length; i++) {
        var tmp_win_obj = new Object;
        var insert_obj_active_series = this_elm.imageViewerController('getSeriesObjectById', [controllerInfo.activeSeriesId]);
        tmp_win_obj = $.extend(true, tmp_win_obj, insert_obj_active_series.window);
        tmp_win_obj = $.extend(true, tmp_win_obj, insert_obj.viewer[i].window);
        insert_obj.viewer[i].window = tmp_win_obj;
      }

      //ビューアーオブジェクトは個別に整形
      //デフォルトでviewer配列の個数が判断付かないため,デフォルト配列を複製してviewer個数分配置しておく
      var tmp_viewer_param_array = new Array;
      for (var i = 0; i < insert_obj.viewer.length; i++) {

        tmp_viewer_param_array[i] = new Object;
        tmp_viewer_param_array[i].id = controllerInfo.viewer[0].id + i;
        tmp_viewer_param_array[i].elementId = controllerInfo.viewer[0].elementId;
        tmp_viewer_param_array[i].orientation = controllerInfo.viewer[0].orientation;
        tmp_viewer_param_array[i].number = {
          current: controllerInfo.viewer[0].number.current,
          maximum: controllerInfo.viewer[0].number.maximum,
          minimum: controllerInfo.viewer[0].number.minimum
        }

        tmp_viewer_param_array[i].elements = {
          slider: {
            panel: true,
            display: true
          },
          zoom: {
            panel: true,
            display: true
          },
          window: {
            panel: true,
          }
        }
        tmp_viewer_param_array[i].window = {
          level: {
            current: active_series.window.level.current,
            maximum: active_series.window.level.maximum,
            minimum: active_series.window.level.minimum
          },
          width: {
            current: active_series.window.width.current,
            maximum: active_series.window.width.maximum,
            minimum: active_series.window.width.minimum
          },
          preset: $.extend(true, '', active_series.window.preset)
        }
      }
      controllerInfo.viewer = tmp_viewer_param_array;

      //呼び出し時に渡されたオプション情報をマージ
      $.extend(true, controllerInfo, insert_obj);

      if (controllerInfo.activeSeriesId == '') {
        controllerInfo.activeSeriesId = controllerInfo.series[0].id;
      }

      //前回描かれていたラベル情報の読み込み
      //コントローラのデフォルトのオブジェクトとマージ

      if (typeof controllerInfo.series == 'object') {
        var tmp_color_index_num = 0;

        for (var i = 0; i < controllerInfo.series.length; i++) {
          var tmp_series = controllerInfo.series[i];
          if (typeof tmp_series.label == 'object') {
            for (var j = 0; j < tmp_series.label.length; j++) {
              var tmp_the_label = tmp_series.label[j];
              var label_default = this_elm.imageViewerController('getLabelDefault', tmp_color_index_num);
              tmp_series.label[j] = $.extend(true, label_default, tmp_the_label);
              tmp_color_index_num++;
            }
          }
        }
      }

      //コントローラ関連の要素生成発動
      this_elm.imageViewerController('create');

      var viewerRun = function () {
        //ビューアーオブジェクトの数だけビューアライブラリ発火
        for (var i = 0; i < controllerInfo.viewer.length; i++) {

          var elmId = '#' + controllerInfo.viewer[i].elementId;
          var tmp_orientation = controllerInfo.viewer[i].orientation;
          var tmp_w = 512;
          var tmp_h = 512;
          var tmp_ow = 512;
          var tmp_oh = 512;

          if (tmp_orientation == 'axial') {
            tmp_w = active_series.voxel.x;
            tmp_h = active_series.voxel.y * active_series.voxel.voxel_y / active_series.voxel.voxel_x;
            tmp_ow = active_series.voxel.x;
            tmp_oh = active_series.voxel.y;

          } else if (tmp_orientation == 'sagital') {
            tmp_w = active_series.voxel.y * active_series.voxel.voxel_y / active_series.voxel.voxel_x;
            tmp_h = active_series.voxel.z * active_series.voxel.voxel_z / active_series.voxel.voxel_x;
            tmp_ow = active_series.voxel.y;
            tmp_oh = active_series.voxel.z;
          } else if (tmp_orientation == 'coronal') {
            tmp_w = active_series.voxel.x;
            tmp_h = active_series.voxel.z * active_series.voxel.voxel_z / active_series.voxel.voxel_x;
            tmp_ow = active_series.voxel.x;
            tmp_oh = active_series.voxel.z;
          }

          tmp_w = Math.floor(tmp_w);
          tmp_h = Math.floor(tmp_h);

          //シリーズ・ラベル情報を用意
          var init_label_info = {
            activeSeriesId: controllerInfo.activeSeriesId,
            series: new Array(0)
          }
          init_label_info.series = $.extend(true, init_label_info.series, controllerInfo.series);

          $(elmId).imageViewer({
            'viewer': {
              'id': controllerInfo.viewer[i].id,
              'orientation': controllerInfo.viewer[i].orientation,
              'src': controllerInfo.baseUrl,
              'window': controllerInfo.viewer[i].window,
              'elements': controllerInfo.viewer[i].elements,
              'number': controllerInfo.viewer[i].number,
              'position': {
                ow: tmp_ow,
                oh: tmp_oh,
                sw: tmp_ow,
                sh: tmp_oh,
                dw: tmp_w,
                dh: tmp_h
              },
              'draw': init_label_info,
              'voxel': {
                x: active_series.voxel.x,
                y: active_series.voxel.y,
                z: active_series.voxel.z,
                voxel_x: active_series.voxel.voxel_x,
                voxel_y: active_series.voxel.voxel_y,
                voxel_z: active_series.voxel.voxel_z,
              }
            },

            'control': {
              'container': controllerInfo.viewer[i].container
            }

          });
          /*.imageViewer()*/
        }

      }
      /*viewerRun*/

      viewerRun();

      //ビューアー発火後に生成された要素にイベント設置
      this_elm.imageViewerController('setViewerInnerEvents');

      //初期のモード設定
      this_elm.imageViewerController('changeMode', controllerInfo.mode);

      //ビューアーを介してコンテナに対して前回リビジョンの画像を格納するように指示

      //操作対象のビューアを格納しておく
      //連動シリーズの1個目だけ発動でよい
      $('#' + controllerInfo.viewer[0].elementId).imageViewer('insertLabelData');


      for (var i = controllerInfo.viewer.length - 1; i >= 0; i--) {
        var elmId = '#' + controllerInfo.viewer[i].elementId;
        //配下ビューアー表示を同期
        $(elmId).trigger('sync');
      }
      /*
       //Attribute描画
       //console.log("Attribute描画");
       //console.log(insert_obj);
       //var attribute_prop = $('#prop');
       attribute_prop.propertyeditor({properties: attribute_properties});
       attribute_prop.on('valuechange', function () {

       attribute_prop.propertyeditor('option', 'value');
       //    $('#value').val(JSON.stringify(value));
       });
       */
    }/*init*/,



    //各種イベント設置
    setEvents: function () {

      var this_elm = this;
      var active_series = this_elm.imageViewerController('getSeriesObjectById', [controllerInfo.activeSeriesId]);
      if (typeof active_series != 'object') {
        active_series = controllerInfo.series[0];
        controllerInfo.activeSeriesId = active_series.id;
      }

      //操作対象のビューアを格納しておく
      //ビューアーオブジェクトの数だけビューアライブラリ発火
      for (var i = 0; i < controllerInfo.viewer.length; i++) {
        var elmId = '#' + controllerInfo.viewer[i].elementId;
      }

      var tmp_options_elm = '';
      for (var i = controllerInfo.series.length - 1; i >= 0; i--) {
        tmp_options_elm = tmp_options_elm + '<option value="' + controllerInfo.series[i].id + '">' + controllerInfo.series[i].description + '</option>';
      }
      $('.series_selector').html(tmp_options_elm);

      if (controllerInfo.control.show == true) {

        var tmp_panel_elm = 'body';
        if (controllerInfo.elements.panel.length > 0) {
          tmp_panel_elm = '#' + controllerInfo.elements.panel;
        }
        tmp_panel_elm = $(tmp_panel_elm);

        //ウインドウサイズ・レベル
        if (controllerInfo.control.window.active == true) {

          //パネルの表示・非表示操作
          tmp_panel_elm.find('.ico_detail_sprite_image_window').click(function (e) {
            $(this).find('.image_window_controller').show(300);
            this_elm.imageViewerController('changeMode', 'window');
          });

          tmp_panel_elm.find('.btn_close').click(function (e) {
            tmp_panel_elm.find('.image_window_controller').hide(300);
            this_elm.imageViewerController('changeMode', 'pan');
            e.stopPropagation();
          });

          tmp_panel_elm.find('.image_window_controller').click(function (e) {
            e.stopPropagation();
          });

          //ウインドウサイズ・レベル操作
          //input
          tmp_panel_elm.find('.img_toolbar_wrap').find('input').change(function () {
            chgWinValCtrl();
          });

          //select
          tmp_panel_elm.find('.image_window_preset_select').change(function () {
            var tmp_value = $(this).val();  //value="32000,2000"
            if (tmp_value != 'blank') {
              $(this).closest('.image_window_controller').find('.image_window_level').val(tmp_value.split(',')[0]);
              $(this).closest('.image_window_controller').find('.image_window_width').val(tmp_value.split(',')[1]);
              chgWinValCtrl();
            }
          });

          //input,selectから呼び出す共通関数
          var chgWinValCtrl = function () {
            //ウインドウレベル
            var tmp_level = tmp_panel_elm.find('.image_window_level').val();
            tmp_level = Number(tmp_level);
            if (isFinite(tmp_level) == true) {
              //数値であれば上限値・下限値との比較をしてcontrollerを書き換える
              //数値でないときは書き換えが走らないので操作前の値に戻る
              tmp_level = Math.min(tmp_level, active_series.window.level.maximum);
              tmp_level = Math.max(tmp_level, active_series.window.level.minimum);
              active_series.window.level.current = tmp_level;
            }
            tmp_panel_elm.find('.image_window_level').val(active_series.window.level.current);

            //ウインドウサイズ
            var tmp_width = tmp_panel_elm.find('.image_window_width').val();
            tmp_width = Number(tmp_width);
            if (isFinite(tmp_width) == true) {
              //数値であれば上限値・下限値との比較をしてcontrollerを書き換える
              //数値でないときは書き換えが走らないので操作前の値に戻る
              tmp_width = Math.min(tmp_width, active_series.window.level.maximum);
              tmp_width = Math.max(tmp_width, active_series.window.level.minimum);
              active_series.window.width.current = tmp_width;
            }
            tmp_panel_elm.find('.image_window_width').val(active_series.window.width.current);

            //配下ビューアーオプション情報を書き換えて再描画を発火させる
            //まず挿入用ウインドウ情報を用意
            var tmp_win_values = {
              viewer: {
                window: { //todo 今回ははコントローラから伝播
                  level: {
                    current: active_series.window.level.current,
                    maximum: active_series.window.level.maximum,
                    minimum: active_series.window.level.minimum
                  },
                  width: {
                    current: active_series.window.width.current,
                    maximum: active_series.window.width.maximum,
                    minimum: active_series.window.width.minimum
                  },
                  preset: active_series.window.preset
                }
              }
            }
            //ビューアーに伝播
            for (var i = 0; i < controllerInfo.viewer.length; i++) {
              var elmId = '#' + controllerInfo.viewer[i].elementId;
              $(elmId).trigger('setOptions', [tmp_win_values])
                .trigger('changeImageSrc');
            }
          }//chgWinValCtrl
        }
      }

      //ペンツールボタン
      if (controllerInfo.control.pen.active == true) {

        //パン切替
        tmp_panel_elm.find('.ico_detail_sprite_pan').click(function () {
          this_elm.imageViewerController('changeMode', 'pan');
        });

        //ペン切替
        tmp_panel_elm.find('.ico_detail_sprite_pen').click(function () {
          this_elm.imageViewerController('changeMode', 'pen');
        });

        //消しゴム
        tmp_panel_elm.find('.ico_detail_sprite_erase').click(function () {
          this_elm.imageViewerController('changeMode', 'erase');
        });

        //バケツ
        tmp_panel_elm.find('.ico_detail_sprite_bucket').click(function () {
          this_elm.imageViewerController('changeMode', 'bucket');
        });

        //太さ変更
        tmp_panel_elm.find('.toolbar_weight').change(function (e) {
          var the_boldness = $(this).val();
          //配下ビューアーのモードをまとめて変更する
          for (var h = 0; h < controllerInfo.viewer.length; h++) {
            var elmId = '#' + controllerInfo.viewer[h].elementId;
            $(elmId).trigger('setOptions', {viewer: {draw: {boldness: the_boldness}}});
          }
        });

        //手前に戻す
        tmp_panel_elm.find('.draw_back').click(function () {
          for (var i = 0; i < 1; i++) {
            var elmId = '#' + controllerInfo.viewer[i].elementId;
            if (i == 0) {
              //最初のビューアーを介してhistorybackを行う
              $(elmId).imageViewer('historyBack');
            }
          }
        });

        //戻すの取消
        tmp_panel_elm.find('.draw_redo').click(function () {
          for (var i = 0; i < controllerInfo.viewer.length; i++) {
            var elmId = '#' + controllerInfo.viewer[i].elementId;
            if (i == 0) {
              //最初のビューアーを介してhistorybackを行う
              $(elmId).imageViewer('historyRedo');
            }
          }
        });
      }

      /*定規モード*/
      if (controllerInfo.control.measure.panel == true) {
        $('.ico_detail_sprite_measure').click(function () {
          this_elm.imageViewerController('changeMode', 'measure');
        });
      }


      /*ラベル表示領域*/
      if (controllerInfo.control.pen.panel == true) {
        $('#' + controllerInfo.elements.label).find('.add_label').click(function () {

          this_elm.imageViewerController('addLabelObject');
          this_elm.imageViewerController('updateLabelElements');
        });

        //現在フォーカス中ラベルの情報表示・書き換え
        $('#' + controllerInfo.elements.label).find('.label_title,.label_description').change(function () {
          var tmp_label_id = $(this).closest('.label_info_wrap').find('.label_id').val();

          for (var i = 0; i < active_series.label.length; i++) {
            var tmp_the_label = active_series.label[i];
            if (tmp_the_label.id == tmp_label_id) {
              tmp_the_label.name = $('#' + controllerInfo.elements.label).find('.label_title').val();
              tmp_the_label.description = $('#' + controllerInfo.elements.label).find('.label_description').val();
              break;
            }
          }
          this_elm.imageViewerController('updateLabelElements');
        });
      }


      //保存
      $('.btn_save').click(function () {
        this_elm.imageViewerController('saveData');
        return false;
      });
    },


    //color,alphaの値からRGBA値を計算する
    getRgba: function (color_num, alpha_num) {
      var tmp_color = color_num.replace('#', '');
      var tmp_alpha = alpha_num * 0.01;
      var tmp_color_r = Number('0x' + tmp_color[0]) * Number('0x' + tmp_color[0]) + Number('0x' + tmp_color[1]);
      var tmp_color_g = Number('0x' + tmp_color[2]) * Number('0x' + tmp_color[2]) + Number('0x' + tmp_color[3]);
      var tmp_color_b = Number('0x' + tmp_color[4]) * Number('0x' + tmp_color[4]) + Number('0x' + tmp_color[5]);
      var return_txt = 'rgba(' + tmp_color_r + ',' + tmp_color_g + ',' + tmp_color_b + ',' + tmp_alpha + ')';
      return return_txt;
    },


    getLabelDefault: function (color_index) {

      //ラベル新規生成
      var this_elm = this;
      var tmp_id = new Date();
      var the_random = Math.random();

      var the_month = 1 + tmp_id.getMonth();
      the_month = this_elm.imageViewerController('zeroFormat', [the_month, 2]);

      var the_Date = tmp_id.getDate();
      the_Date = this_elm.imageViewerController('zeroFormat', [the_Date, 2]);

      var the_Hours = tmp_id.getHours();
      the_Hours = this_elm.imageViewerController('zeroFormat', [the_Hours, 2]);

      var the_Minutes = 1 + tmp_id.getMinutes();
      the_Minutes = this_elm.imageViewerController('zeroFormat', [the_Minutes, 2]);

      var the_Seconds = 1 + tmp_id.getSeconds();
      the_Seconds = this_elm.imageViewerController('zeroFormat', [the_Seconds, 2]);

      var the_Milliseconds = 1 + tmp_id.getMilliseconds();
      the_Milliseconds = this_elm.imageViewerController('zeroFormat', [the_Milliseconds, 3]);

      var the_random = this_elm.imageViewerController('createRandomStr', [10]);

      tmp_id = tmp_id.getFullYear() + the_month + the_Date + the_Hours + the_Minutes + the_Seconds + the_Milliseconds + '_' + the_random;

      var index_number = 0;
      if (color_index) {
        index_number = color_index;
      }
      var tmp_color = controllerInfo.defaultColorSet[index_number];
      var tmp_rgba = this_elm.imageViewerController('getRgba', tmp_color, 100);

      var return_obj = {
        //ラベル生成時のデフォルト
        id: tmp_id,
        alpha: 100,
        attribute: '',
        color: tmp_color, //todo初期は他のラベルで使われてない色をランダムで選ぶ
        description: '',
        name: '名称未設定',
        rgba: tmp_rgba, //color/alphaを併せてcanvas適用用の値を作る
        visible: true
      }
      return return_obj;
    },


    getLabelObjectById: function (label_id, series_id) {

      //描画対象ラベルのチェック
      var this_elm = this;

      if (series_id) {
        var tmp_the_series = this_elm.imageViewerController('getSeriesObjectById', [series_id]);
        for (var i = tmp_the_series.label.length - 1; i >= 0; i--) {
          if (tmp_the_series.label[i].id == label_id) {
            return tmp_the_series.label[i];
            break;
          }
        }

      } else {
        //series指定が無ければ全シリーズを端からみていく
        for (var j = 0; j < controllerInfo.series.length; j++) {
          var tmp_the_series = controllerInfo.series[j];
          for (var i = tmp_the_series.label.length - 1; i >= 0; i--) {
            if (tmp_the_series.label[i].id == label_id) {
              return tmp_the_series.label[i];
              break;
            }
          }
        }
      }
    }/*getLabelObjectById*/,


    saveData: function () {
      //データ保存
      var this_elm = this;
      var saveData = new Object();

      //書き換えが発生していたラベルについてはidを書き換える
      this_elm.imageViewerController('checkUpdateLabel');

      saveData.caseId = controllerInfo.caseId;
      saveData.series = new Array(0);
      //console.log(revision_attributes);
      var revision_attributes = $('#the_panel_case_attribute').propertyeditor('option', 'value');
      saveData.attribute = JSON.stringify(revision_attributes);
      try {
        for (var i = 0; i < controllerInfo.series.length; i++) {
          var tmp_the_series = controllerInfo.series[i];
          var tmp_insert_obj = new Object();
          tmp_insert_obj.id = tmp_the_series.id;
          tmp_insert_obj.label = new Array(0);

          if (typeof tmp_the_series.label == 'object') {
            for (var j = 0; j < tmp_the_series.label.length; j++) {

              var tmp_the_label = tmp_the_series.label[j];
              var container_data = $('#img_area_axial').imageViewer('createSaveData', tmp_the_series.id, tmp_the_label.id);

              tmp_insert_obj.label[j] = new Object();
              tmp_insert_obj.label[j].offset = container_data.offset;
              tmp_insert_obj.label[j].sizes = container_data.size;

              if (container_data.image.indexOf('data:image') == -1) {
                container_data.image = '';
              }
              ;

              tmp_insert_obj.label[j] = container_data;
              tmp_insert_obj.label[j].id = tmp_the_label.id;

              var tmp_attributes = $('#the_panel_label_attribute_'+i+'_'+j).propertyeditor('option', 'value');
              tmp_insert_obj.label[j].attribute = JSON.stringify(tmp_attributes);
            }
          }
          saveData.series[i] = tmp_insert_obj;
        }
      } catch (e) {
        //console.log(e);
        return false;
      }

      var tmp_input_memo = window.prompt('input Memo', controllerInfo.memo);

      if (tmp_input_memo) {
        saveData.memo = tmp_input_memo;
        //console.log(saveData);
        //console.log("URL::");
        //console.log(controllerInfo.postUrl);

        $.ajax({
          url: controllerInfo.postUrl,
          type: 'post',
          data: {data: saveData},//送信データ
          dataType: 'json',
          error: function () {
            alert('通信に失敗しました');
          },
          success: function (response) {
            //alert('save finished.');
            alert(response.message);
          }
        });

      } else {
        //キャンセル時


      }
      return false;
    },


    setColorToViewer: function () {
      //コントローラの現在のラベル表示情報を、配下ビューアーに適用させる
      //id , rgba , visible を適用させる

      var this_elm = this;
      var tmp_series_array = new Array();
      for (var i = 0; i < controllerInfo.series.length; i++) {
        var tmp_series = controllerInfo.series[i];
        var the_active_label_id = '';

        if (typeof tmp_series.label == 'object' && typeof tmp_series.activeLabelId != 'undefined') {
          the_active_label_id = tmp_series.activeLabelId;
        }

        var tmp_series_obj = {
          activeLabelId: the_active_label_id,
          id: tmp_series.id,
          label: new Array(0)
        }

        if (typeof tmp_series.label == 'object') {
          for (var j = 0; j < tmp_series.label.length; j++) {
            var tmp_array = new Array();
            var tmp_label = $.extend(true, tmp_array, tmp_series.label[j]);
            tmp_series_obj.label.push(tmp_label);
          }
        }
        tmp_series_array.push(tmp_series_obj);
      }

      //配下ビューアーオプション情報を書き換えて再描画を発火させる
      for (var i = controllerInfo.viewer.length - 1; i >= 0; i--) {
        var elmId = '#' + controllerInfo.viewer[i].elementId;
        var tmp_val = {
          viewer: {
            draw: {
              activeSeriesId: controllerInfo.activeSeriesId,
              series: tmp_series_array
            }
          }
        }
        $(elmId).trigger('setOptions', [tmp_val])
          .trigger('sync');
      }
    }/*setColorToViewer*/,


    setViewerInnerEvents: function () {
      //ビューアー内部で生成した要素群へのイベント設置
      //ビューアーが固有で持つ機能はビューアー内部で持たせる
      //ここでは連携のために必要なものを引き出すイベントを設置

      var this_elm = this;
      var tmp_panel_elm = 'body';
      if (controllerInfo.elements.panel.length > 0) {
        tmp_panel_elm = '#' + controllerInfo.elements.panel;
      }
      tmp_panel_elm = $(tmp_panel_elm);

      for (var i = 0; i < controllerInfo.viewer.length; i++) {

        //パネル内の虫眼鏡ボタンの押下を受けて全体のモード追従させる
        //他のビューアもパネル等を追従させる
        var tmp_elm = '#' + controllerInfo.viewer[i].elementId;
        $(tmp_elm).bind('onModeChange', function (e, tmp_id, tmp_mode) {
          controllerInfo.mode = tmp_mode;

          for (var j = 0; j < controllerInfo.viewer.length; j++) {
            var elmId = '#' + controllerInfo.viewer[j].elementId;
            var the_opts = $(elmId).imageViewer('getOptions');
            if (the_opts.viewer.id != tmp_id && the_opts.control.mode != tmp_mode) {
              $(elmId).imageViewer('changeMode', tmp_mode);
            }
          }
          this_elm.imageViewerController('changeMode', controllerInfo.mode);
          //全体用のウインドウ情報パネルの表示切替
          if (tmp_mode != 'window') {
            tmp_panel_elm.find('.image_window_controller').hide(300);
          } else {
            tmp_panel_elm.find('.image_window_controller').show(300);
          }
        });

        //更新が発生した段階でフラグを立てる
        $(tmp_elm).bind('onWritten', function (e, label_id, series_id) {
          var tmp_the_label = this_elm.imageViewerController('getLabelObjectById', label_id, series_id)
          tmp_the_label.update_flg = true;
        });

        //ある面でwindow情報が変更されたらそれを他の面にも適用させる
        $(tmp_elm).find('.mouse_cover').bind('mouseup', function () {
          if (controllerInfo.mode == 'window') {
            var tmp_this_opts = $(this).closest('.img_area').imageViewer('getOptions');
            this_elm.imageViewerController('syncWindowInfo', tmp_this_opts.viewer.window);
          }
        });

        $(tmp_elm).find('.image_window_preset_select,.image_window_level,.image_window_width').change(function () {
          var tmp_this_opts = $(this).closest('.img_area').imageViewer('getOptions');
          this_elm.imageViewerController('syncWindowInfo', tmp_this_opts.viewer.window);
        });

      }

    }/*setViewerInnerEvents*/,


    //３面のウインドウレベル・幅を同期する
    //第一引数：変更されたウインドウの情報
    syncWindowInfo: function (tmp_this_opts) {

      var this_elm = this;
      var active_series = this_elm.imageViewerController('getSeriesObjectById', [controllerInfo.activeSeriesId]);
      if (typeof active_series != 'object') {
        active_series = controllerInfo.series[0];
        controllerInfo.activeSeriesId = active_series.id;
      }


      var tmp_panel_elm = 'body';
      if (controllerInfo.elements.panel.length > 0) {
        tmp_panel_elm = '#' + controllerInfo.elements.panel;
      }
      tmp_panel_elm = $(tmp_panel_elm);

      active_series.window.level.current = tmp_this_opts.level.current + 0;
      active_series.window.width.current = tmp_this_opts.width.current + 0;
      tmp_panel_elm.find('.image_window_level').val(active_series.window.level.current);
      tmp_panel_elm.find('.image_window_width').val(active_series.window.width.current);

      //配下ビューアーオプション情報を書き換えて再描画を発火させる
      //まずは適用させる値を用意
      var tmp_win_values = {
        viewer: {
          window: {
            level: {
              current: active_series.window.level.current,
            },
            width: {
              current: active_series.window.width.current,
            }
          }
        }
      }

      //値を渡してビュワー発火
      for (var i = 0; i < controllerInfo.viewer.length; i++) {
        var elmId = '#' + controllerInfo.viewer[i].elementId;
        $(elmId).trigger('setOptions', [tmp_win_values])
          .trigger('changeImageSrc');
      }
    }/*syncWindowInfo*/,


    updateLabelElements: function () {

      //ラベルオブジェクトの増減を要素に反映する
      //ラベルパネル内のイベントも全てここで生成する

      var this_elm = this;
      var tmp_wrap_elm = $('#' + controllerInfo.elements.label).find('.label_select_wrap');
      var active_series = this_elm.imageViewerController('getSeriesObjectById', [controllerInfo.activeSeriesId]);
      if (typeof active_series != 'object') {
        active_series = controllerInfo.series[0];
        controllerInfo.activeSeriesId = active_series.id;
      }

      var tmp_elm = '';

      //関連要素は初期化
      $('.color-picker').remove();	//bodyの直下に生成されるピッカーの補助要素
      tmp_wrap_elm.find('.series_wrap').remove();
      tmp_wrap_elm.find('.label_info').text('');
      tmp_wrap_elm.find('.label_description').text('');

      //ラベルオブジェクトが無いシリーズがあれば初期セットを生成
      if (typeof active_series.label != 'object') {
        active_series.label = new Array(0);
      }

      //現在のcontrollerInfoオブジェクトの中身に従い全シリーズ・全ラベルの要素生成
      for (var j = 0; j < controllerInfo.series.length; j++) {
        var tmp_the_series = controllerInfo.series[j];

        //描画対象シリーズとラベルにクラス付与
        var the_active_series_class = '';
        if (tmp_the_series.id == controllerInfo.activeSeriesId) {
          the_active_series_class = ' active';
        }

        tmp_elm = tmp_elm + '<div class="series_wrap' + the_active_series_class + '" id="' + tmp_the_series.id + '">';
        tmp_elm = tmp_elm + '<p class="series_name">Series ' + j + '</p>';
        tmp_elm = tmp_elm + '<ul class="label_select_list">';

        if (typeof tmp_the_series.label != 'undefined') {
          for (var i = 0; i < tmp_the_series.label.length; i++) {
            var tmp_the_label = tmp_the_series.label[i];

            var tmp_visible_class = '';
            if (tmp_the_label.visible == true) {
              tmp_visible_class = ' visible';
            }

            var tmp_edit_class = '';
            if (tmp_the_series.id == controllerInfo.activeSeriesId && tmp_the_series.activeLabelId == tmp_the_label.id) {
              tmp_edit_class = ' now_draw';
            }

            tmp_elm = tmp_elm + '<li class="label_select_cell' + tmp_visible_class + tmp_edit_class + '" id="' + tmp_the_label.id + '"><label class="visible_check_wrap"></label>';

            tmp_elm = tmp_elm + '<input type="text" value="' + tmp_the_label.color + '" class="color_picker color_picker_diff_color" \
						style="background-color:' + tmp_the_label.rgba + ';" readonly id="' + tmp_the_label.id + '_cp">\
						<label class="label_txt">Label ' + i + '</label><label class="alpha_label"><input type="text" value="' + tmp_the_label.alpha + '" class="alpha_change">%</label>\
						<label class="now_draw_label"></label><label class="delete_label"></label><div class="clear">&nbsp;</div></li>';

            if (tmp_the_label.id == tmp_the_series.activeLabelId) {
              $('#' + controllerInfo.elements.label).find('.label_id').val(tmp_the_label.id);
              $('#' + controllerInfo.elements.label).find('.label_title').val(tmp_the_label.name);
              $('#' + controllerInfo.elements.label).find('.label_description').val(tmp_the_label.description);
            }
          }
        }
        tmp_elm = tmp_elm + '</ul></div>';
      }
      tmp_wrap_elm.prepend(tmp_elm);


      //イベント設置
      //カラーピッカー
      if (tmp_wrap_elm.find('.color_picker').length > 0) {
        $('.color_picker').simpleColorPicker({
          colors: controllerInfo.defaultColorSet,
          onChangeEvent: true
        });

        //ピッカーで色変更
        tmp_wrap_elm.find('.color_picker').change(function () {
          var the_color = $(this).val();
          $(this).css('background-color', the_color);

          var tmp_series_id = $(this).closest('.series_wrap').attr('id');
          var tmp_label_id = $(this).closest('.label_select_cell').attr('id');
          var the_parent_series = this_elm.imageViewerController('getSeriesObjectById', [tmp_series_id]);
          if (typeof the_parent_series != 'object') {
            the_parent_series = controllerInfo.series[0];
          }

          var target_label = '';
          for (var i = 0; i < the_parent_series.label.length; i++) {
            if (the_parent_series.label[i].id == tmp_label_id) {
              target_label = the_parent_series.label[i];
              break;
            }
          }
          controllerInfo.activeSeriesId = tmp_series_id;
          the_parent_series.activeLabelId = target_label.id;
          target_label.color = the_color;
          target_label.rgba = this_elm.imageViewerController('getRgba', target_label.color, target_label.alpha);
          this_elm.imageViewerController('setColorToViewer');
          this_elm.imageViewerController('updateLabelElements');
          $('.ico_detail_sprite_pen').trigger('click');
        });
      }//coloPicker


      //alpha change
      tmp_wrap_elm.find('.alpha_change').change(function () {
        var the_alpha = $(this).val();
        var tmp_series_id = $(this).closest('.series_wrap').attr('id');
        var tmp_label_id = $(this).closest('.label_select_cell').attr('id');

        var the_parent_series = this_elm.imageViewerController('getSeriesObjectById', [tmp_series_id]);
        var target_label = '';

        for (var i = 0; i < the_parent_series.label.length; i++) {
          if (the_parent_series.label[i].id == tmp_label_id) {
            target_label = the_parent_series.label[i];
            break;
          }
        }
        controllerInfo.activeSeriesId = the_parent_series.id;
        the_parent_series.activeLabelId = target_label.id;

        target_label.alpha = the_alpha;
        target_label.rgba = this_elm.imageViewerController('getRgba', target_label.color, target_label.alpha);
        this_elm.imageViewerController('setColorToViewer');
        this_elm.imageViewerController('updateLabelElements');
        $('.ico_detail_sprite_pen').trigger('click');
      });
      //alpha_change


      //描画対象ラベルの変更
      tmp_wrap_elm.find('.now_draw_label').click(function () {
        var tmp_series_id = $(this).closest('.series_wrap').attr('id');
        controllerInfo.activeSeriesId = tmp_series_id;

        var the_parent_series = this_elm.imageViewerController('getSeriesObjectById', [tmp_series_id]);
        the_parent_series.activeLabelId = $(this).closest('.label_select_cell').attr('id');

        this_elm.imageViewerController('updateLabelElements');
        this_elm.imageViewerController('setColorToViewer');
      });


      //表示・非表示切り替え
      tmp_wrap_elm.find('.visible_check_wrap').click(function () {

        var tmp_series_id = $(this).closest('.series_wrap').attr('id');
        var the_parent_series = this_elm.imageViewerController('getSeriesObjectById', [tmp_series_id]);
        var tmp_label_id = $(this).closest('.label_select_cell').attr('id');

        var tmp_the_label = '';
        for (var i = 0; i < the_parent_series.label.length; i++) {
          tmp_the_label = the_parent_series.label[i];
          if (tmp_the_label.id == tmp_label_id) {
            break;
          }
        }

        if (tmp_the_label.visible == true) {
          //非表示化する
          tmp_the_label.visible = false;
        } else {
          //表示する
          tmp_the_label.visible = true;
        }
        this_elm.imageViewerController('updateLabelElements');
        this_elm.imageViewerController('setColorToViewer');
      });

      //ラベル削除
      tmp_wrap_elm.find('.delete_label').click(function () {
        var tmp_label_id = $(this).closest('.label_select_cell').attr('id');
        var tmp_series_id = $(this).closest('.series_wrap').attr('id');
        var tmp_txt = confirm('Are you sure delete this label?');
        if (tmp_txt == true) {
          this_elm.imageViewerController('deleteLabelObject', tmp_series_id, tmp_label_id);
        }
      });

      //描画対象シリーズ変更
      $('#' + controllerInfo.elements.label).find('.series_name').click(function () {
        var this_series_id = $(this).closest('.series_wrap').attr('id');
        if (controllerInfo.activeSeriesId != this_series_id) {
          this_elm.imageViewerController('changeActiveSeries', this_series_id);
        }
      });

      $('#' + controllerInfo.elements.label).find('.edit_activate').click(function () {
        if ($(this).hasClass('disabled') == false) {
          $(this).addClass('disabled');
          $(this).closest('.label_info_wrap').find('.edit_finish').removeClass('disabled');
          $(this).closest('.label_info_wrap').find('.label_title,.label_description').removeAttr('readonly');
        }
      });

      $('#' + controllerInfo.elements.label).find('.edit_finish').click(function () {
        if ($(this).hasClass('disabled') == false) {
          alert('changed textdata is not saved.\n they willbe saved when the [SAVE] operation.');
          $(this).addClass('disabled');
          $(this).closest('.label_info_wrap').find('.edit_activate').removeClass('disabled');
          $(this).closest('.label_info_wrap').find('.label_title,.label_description').attr('readonly', 'readonly');
        }
      });

    }/*updateLabelElements*/,

    zeroFormat: function (input_array) {
      // input_array = [ num , num ]
      var e = input_array[0];
      var t = input_array[1];
      var n = String(e).length;
      if (t > n) {
        return (new Array(t - n + 1)).join(0) + e
      } else {
        return e
      }
    }/*zeroFormat*/

  }

  // プラグインメイン
  $.fn.imageViewerController = function (method) {
    // メソッド呼び出し部分
    if (controller_methods[method]) {
      return controller_methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === 'object' || !method) {
      return controller_methods.init.apply(this, arguments);
    } else {
      $.error('Method ' + method + ' does not exist on jQuery.tooltip');
    }
  }

})(jQuery);