;// imageViewer
(function ($) {

  $.widget('ui.imageViewer', {
    options: {
      container: '', //required. container for draw labels.
      mode: 'pan',
      mode_array: ['bucket', 'erase', 'guide', 'measure', 'rotate', 'pan', 'pen', 'window'], //selectable mode
      viewer: {
        activeSeriesId: '',
        boldness: 1,
        orientation: '',
        src: '', //baseURL
        window: {
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
          preset: [] //sample  {label: 'your  preset  label' , level: 1000 , width : 4000}
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
          slider: {//slider element & display number
            active: true,
            panel: true, //display slider or no
            display: true //display number or no
          },
          zoom: {  //zoom tool
            active: true,
            display: true
          },
          window: {  //panel element of Window level / size
            panel: true    //display or no
          }
        },
        position: {
          dx: 0,//display image position (canvas pixel scale)
          dy: 0,
          dw: 512, //display image size (canvas pixel scale)
          dh: 512,
          ow: 512, //image original size
          oh: 512,
          zoom: 1
        },
        series: [
          {
            activeLabelId: '', //current drawing label id
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
          point_width : 12,
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
      _tmpInfo: { //temporary datas.
        cursor: {
          start: {X: 0, Y: 0},
          current: {X: 0, Y: 0},
          touch_flg: 0,
          out_flg: 1
        },
        elementParam: {
          start: {X: 0, Y: 0},
          current: {X: 0, Y: 0}
        },
        lastQue: '',
        imgCache: [],
        loadFlg: 0,
        mode_backup: '',
        label: []
      }
    },



    addLabelObject: function (series_id, label_obj) {
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

      for(var i=0; i < target_series.label.length; i++){
        var tmp_label = target_series.label[i];
        if(tmp_label.id === label_obj.id){
          return;   // the label with the ID already exists. not add.
        }
      }

      target_series.label.push(tmp_add_label_obj);

      if (target_series.label.length === 1) {
        target_series.activeLabelId = tmp_add_label_obj.id;
      }

      this_opts.container.addLabel(series_id, label_obj.id, []);
    },



    _applyBoldness: function (insert_array,max_x,max_y) {
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
        for (k = the_boldness - 1; k >= 0; k -= 1) { //x
          for (l = the_boldness - 1; l >= 0; l -= 1) { //y
            tmp_x = insert_array[i][0] - bold_arround + k;
            tmp_y = insert_array[i][1] - bold_arround + l;
            if (tmp_x < 0) {
              tmp_x = 0;
            } else if (tmp_x > max_x){
              tmp_x = max_x
            }
            if (tmp_y < 0) {
              tmp_y = 0;
            } else if (tmp_y > max_y){
              tmp_y = max_y
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

      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      var tmp_w = this_elm.find('.series_image_elm').width();
      var tmp_h = this_elm.find('.series_image_elm').height();

      var return_obj = [
        [0, 0],
        [0, 0],
        [0, 0]
      ];
      //first array : start of the line
      //second array : arrow point XY
      //third array : end of the line

      // normalize over 360 deg
      var tmp_pi = Math.PI;
      if (the_angle < 0) {
        the_angle = the_angle + tmp_pi * 2;
      }
      the_angle = the_angle % (2 * tmp_pi);

      //start & end point of line
      var this_tan = Math.tan(the_angle);
      return_obj[0] = [ 0, center_y + center_x * this_tan];  //start point
      return_obj[2] = [ tmp_w, center_y - (tmp_w - center_x) * this_tan];  //goal point

      //arrow point
      var tmp_margin = this_opts.viewer.rotate.point_width * 4;

      //check the angle is which area of radian
      var point_y = 0;
      if (the_angle < tmp_pi / 2) {
        //the first quadrant
        point_y = center_y - (tmp_w - center_x) * this_tan;
        if (point_y < 0) {
          //top
          return_obj[1][0] = center_x + (center_y - tmp_margin) / this_tan;
          return_obj[1][1] = tmp_margin;
        } else {
          //right
          return_obj[1][0] = tmp_w - tmp_margin;
          return_obj[1][1] = center_y - (tmp_w - center_x - tmp_margin) * this_tan;
        }
      } else if (the_angle < tmp_pi) {
        //the second quadrant
        point_y = center_y + center_x * this_tan;
        if (point_y < 0) {
          //top
          return_obj[1][0] = center_x + (center_y - tmp_margin) / this_tan;
          return_obj[1][1] = tmp_margin;
        } else {
          //left
          return_obj[1][0] = tmp_margin;
          return_obj[1][1] = center_y + (center_x - tmp_margin) * this_tan;
        }

      } else if (the_angle < tmp_pi * 3 / 2) {
        //the third quadrant
        point_y = center_y + center_x * this_tan;
        if (point_y < tmp_h) {
          //left
          return_obj[1][0] = tmp_margin;
          return_obj[1][1] = center_y + (center_x - tmp_margin) * this_tan;
        } else {
          //bottom
          return_obj[1][0] = center_x - (tmp_h - tmp_margin - center_y) / this_tan;
          return_obj[1][1] = tmp_h - tmp_margin;
        }
      } else {
        //the fourth quadrant
        point_y = center_y - (tmp_w - center_x) * this_tan;
        if (point_y < tmp_h) {
          //right
          return_obj[1][0] = tmp_w - tmp_margin;
          return_obj[1][1] = center_y - (tmp_w - tmp_margin - center_x) * this_tan;
        } else {
          //bottom
          return_obj[1][0] = center_x - (tmp_h - tmp_margin - center_y) / this_tan;
          return_obj[1][1] = tmp_h - tmp_margin;
        }
      }
      return return_obj;
    },



    _changeImageSrc: function (fit_center_flg) {

      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      //disp info text
      this_elm.find('.disp_measure').removeClass('active');

      var changeMain = function (image_obj) {
        var tmp_ctx = this_elm.find('.series_image_elm').get(0).getContext('2d');
        var tmp_w = this_elm.find('.series_image_elm').width();
        var tmp_h = this_elm.find('.series_image_elm').height();
        tmp_ctx.clearRect(0, 0, tmp_w, tmp_h);
        if (typeof fit_center_flg !== 'undefined' && fit_center_flg === true) {
          this_obj.fixToCenter();
        }

        this_obj.syncVoxel();
        tmp_ctx.drawImage(
          image_obj,
          0,
          0,
          this_opts.viewer.position.ow,
          this_opts.viewer.position.oh,
          this_opts.viewer.position.dx,
          this_opts.viewer.position.dy,
          this_opts.viewer.position.dw,
          this_opts.viewer.position.dh
       );
        this_obj._disableImageAlias(tmp_ctx, false);
      };//changeMain

      var src_url = this_obj._createImageUrl();

      //check the image is in Cache.
      if (typeof this_opts._tmpInfo.imgCache[src_url] !== 'undefined') {
        if (this_opts.viewer.orientation === 'oblique') {
          this_obj.setObliqueResponse(this_opts._tmpInfo.imgCache[src_url].header_param);
        }
        changeMain(this_opts._tmpInfo.imgCache[src_url].image);
        return false;
      }

      //the image is not in cache
      //if other image is loading, prevent new loading.
      //updating only Que
      this_opts._tmpInfo.lastQue = src_url;
      if (this_opts._tmpInfo.loadFlg === 0) {

        var loadImg = function (load_target_url) {
          this_opts._tmpInfo.lastQue = null;
          this_opts._tmpInfo.loadFlg = 1;

          var the_active_series = this_obj.getSeriesObjectById(this_opts.viewer.activeSeriesId);
          var tmp_token_str = 'Bearer ' + the_active_series.token;

          var myWindowURL = window.URL || window.webkitURL;  // Take care of vendor prefixes.
          var xhr = new XMLHttpRequest();
          xhr.onload = function (e) {
            if (this.status === 200) {
              var blob = this.response;
              var tmp_img = new Image();
              tmp_img.onload = function (e) {
                var header_param = '';
                if (this_opts.viewer.orientation === 'oblique') {
                  header_param = {};
                  header_param.Pixel_Columns = xhr.getResponseHeader('X-Circus-Pixel-Columns');
                  header_param.Pixel_Rows = xhr.getResponseHeader('X-Circus-Pixel-Rows');
                  header_param.Pixel_Size = xhr.getResponseHeader('X-Circus-Pixel-Size');
                  header_param.Center = xhr.getResponseHeader('X-Circus-Center');
                  this_obj.setObliqueResponse(header_param);
                }
                changeMain(tmp_img);
                this_opts._tmpInfo.loadFlg = 0;
                myWindowURL.revokeObjectURL(tmp_img.src); // Clean up after yourself.

                this_opts._tmpInfo.imgCache[load_target_url] = {
                  'image' : tmp_img,
                  'header_param' : header_param
                }; // add loaded img into Cache

                //if new image is required, re-start new loading.
                if (this_opts._tmpInfo.lastQue !== null) {
                  loadImg(this_opts._tmpInfo.lastQue);
                }
              };
              tmp_img.src = myWindowURL.createObjectURL(blob);
            }
          };
          xhr.open('GET', load_target_url, true);
          xhr.setRequestHeader('Authorization', tmp_token_str);
          xhr.responseType = 'blob';
          xhr.send(); //run the request
          this_opts._tmpInfo.loadFlg = 1;
        }; //loadImg
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
        this_elm.removeClass(function (index, css) {
          return (css.match(/\bmode_\S+/g) || []).join(' ');
        });
        this_elm.addClass('mode_' + this_opts.mode);
        this_elm.find('.disp_measure').removeClass('active');
        if (this_opts.mode !== new_mode) {
          this_opts.mode = new_mode;

          // fire the custom Event for outer scripts.
          this_elm.trigger('onModeChange', [this_opts.viewer.id, new_mode]);
          var the_win_controller = this_elm.find('.image_window_controller');
          if (this_opts.mode === 'window') {
            //show panel
            the_win_controller.slideDown(200);
            this_elm.find('.image_window_controller_wrap').find('.btn_close').show();
            this_elm.find('.image_window_controller_wrap').find('.btn_open').hide();
          } else {
            //hide panel
            the_win_controller.slideUp(200);
            this_elm.find('.image_window_controller_wrap').find('.btn_close').hide();
            this_elm.find('.image_window_controller_wrap').find('.btn_open').show();
          }

          if (this_opts.mode === 'rotate') {
            this_obj.syncVoxel();
          }

        }
      }
    }, //changeMode



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
      this_elm.find('.image_window_width').val(this_opts.viewer.window.width.current);

      var tmp_preset_array = this_opts.viewer.window.preset;
      this_elm.find('.image_window_preset_select').empty();
      if (typeof this_opts.viewer.window.preset !== 'object' || this_opts.viewer.window.preset.length === 0) {
        this_elm.find('.window_preset_wrap').addClass('hidden');
      } else {
        var tmp_elm = '<option value="blank">select setting</option>';
        for (var i = 0; i < tmp_preset_array.length; i++) {
          var isSelected = '';
          if (this_opts.viewer.window.level.current === tmp_preset_array[i].level && this_opts.viewer.window.width.current === tmp_preset_array[i].width) {
            isSelected = 'selected';
          }
          tmp_elm = tmp_elm + '<option value="' + tmp_preset_array[i].level + ', ' + tmp_preset_array[i].width + '" '+isSelected+'>' + tmp_preset_array[i].label + '</option>';
        }
        this_elm.find('.window_preset_wrap').removeClass('hidden');
        this_elm.find('.image_window_preset_select').append(tmp_elm);
      }

      //set active label
      if (typeof tmp_the_series.activeLabelId === 'undefined' || tmp_the_series.activeLabelId === '') {
        if (typeof tmp_the_series.label === 'object' && tmp_the_series.label.length > 0) {
          tmp_the_series.activeLabelId = tmp_the_series.label[0].id;
        }
      }

      this_opts.viewer.voxel = $.extend(true,this_opts.viewer.voxel,tmp_the_series.voxel);
      this_obj.setCanvasSize();
    },//changeSeries



    changeWindowInfo : function (new_level,new_width) {
      //the type of both 2 args are "Number"

      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      //level , check Max & Min
      if (new_level > this_opts.viewer.window.level.maximum) {
        new_level = this_opts.viewer.window.level.maximum;
      }

      if (new_level < this_opts.viewer.window.level.minimum) {
        new_level = this_opts.viewer.window.level.minimum;
      }

      this_opts.viewer.window.level.current = new_level;

      //width ,check Max & Min
      if (new_width > this_opts.viewer.window.level.maximum) {
        new_width = this_opts.viewer.window.level.maximum;
      }

      if (new_width < this_opts.viewer.window.level.minimum) {
        new_width = this_opts.viewer.window.level.minimum;
      }

      this_opts.viewer.window.width.current = new_width;
      var the_win_controller = this_elm.find('.image_window_controller_wrap');
      the_win_controller.find('.win_lv_label').text(this_opts.viewer.window.level.current);
      the_win_controller.find('.win_width_label').text(this_opts.viewer.window.width.current);
      the_win_controller.find('.image_window_level').val(this_opts.viewer.window.level.current);
      the_win_controller.find('.image_window_width').val(this_opts.viewer.window.width.current);

      if (typeof preset_text !== 'undefined') {
        the_win_controller.find('.image_window_preset_select').find('option').each(function () {
          var tmp_this = $(this);
          if (tmp_this.html() === preset_text) {
            tmp_this.attr('selected','selected');
          } else {
            tmp_this.removeAttr('selected');
          }
        });
      }
    },//changeWindowInfo



    changeZoom: function (new_zoom) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      var tmp_w = 512;
      var tmp_h = 512;

      var pre_w = this_opts.viewer.position.dw;
      var pre_h = this_opts.viewer.position.dh;

      var dpv_x = Math.min(this_opts.viewer.voxel.voxel_x / this_opts.viewer.voxel.voxel_y, 1);
      var dpv_y = Math.min(this_opts.viewer.voxel.voxel_y / this_opts.viewer.voxel.voxel_x, 1);
      var dpv_z = this_opts.viewer.voxel.voxel_z / Math.min(this_opts.viewer.voxel.voxel_x, this_opts.viewer.voxel.voxel_y);

      if (this_opts.viewer.orientation === 'axial') {
        tmp_w = this_opts.viewer.voxel.x * dpv_x;
        tmp_h = this_opts.viewer.voxel.y * dpv_y;
      } else if (this_opts.viewer.orientation === 'sagittal') {
        tmp_w = this_opts.viewer.voxel.y * dpv_y;
        tmp_h = this_opts.viewer.voxel.z * dpv_z;
      } else if (this_opts.viewer.orientation === 'coronal') {
        tmp_w = this_opts.viewer.voxel.y * dpv_y;
        tmp_h = this_opts.viewer.voxel.z * dpv_z;
      } else {
        tmp_w = this_opts.viewer.voxel.x * dpv_x;
        tmp_h = this_opts.viewer.voxel.y * dpv_y;
      }

      var elm_w = this_elm.find('.series_image_elm').width();
      var elm_h = this_elm.find('.series_image_elm').height();

      //trimming size after zoom-change
      this_opts.viewer.position.dw = tmp_w * new_zoom;
      this_opts.viewer.position.dh = tmp_h * new_zoom;

      this_opts.viewer.position.dx = elm_w * 0.5 - (new_zoom / this_opts.viewer.position.zoom) * (elm_w * 0.5 - this_opts.viewer.position.dx);
      this_opts.viewer.position.dy = elm_h * 0.5 - (new_zoom / this_opts.viewer.position.zoom) * (elm_h * 0.5 - this_opts.viewer.position.dy);

      this_opts.viewer.position.zoom = new_zoom;
      this_elm.find('.current_size').text(100 * Number(new_zoom));//display text
    },//changeZoom



    _CheckGuideOver : function (e, range) {
      //check the cursor is on guide line

      var the_return = ''; // horizontal or vertical
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      var mouse_range = this_opts.viewer.guide.grid_range;
      var position_params = this_opts.viewer.position;
      var guide_horizontal = this_obj.getGuide('horizontal');
      var guide_vertical =  this_obj.getGuide('vertical');
      var hall_r = this_elm.find('.series_image_elm').width() * this_opts.viewer.guide.hall_rate;

      if (typeof range === 'number') {
        mouse_range = range;
      }

      var tmp_cursor_x = e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left;
      var tmp_cursor_y = e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top;

      //guide position (canvas pixel scale)
      var guide_pos_x = guide_horizontal.number * position_params.dw / position_params.ow + position_params.dx;
      var guide_pos_y = guide_vertical.number * position_params.dh / position_params.oh + position_params.dy;

      if (guide_pos_x - mouse_range < tmp_cursor_x && guide_pos_x + mouse_range > tmp_cursor_x) {
        //around cross point
        if (guide_pos_y - hall_r > tmp_cursor_y || guide_pos_y + hall_r < tmp_cursor_y) {
          the_return = 'horizontal'; //vertical line. the number of this line means horizontal-guide.
        }
      } else if (guide_pos_y - mouse_range < tmp_cursor_y && guide_pos_y + mouse_range > tmp_cursor_y) {
        //around cross point
        if (guide_pos_x - hall_r > tmp_cursor_x || guide_pos_x + hall_r < tmp_cursor_x) {
          the_return = 'vertical';  //horizontal line. the number of this line means vertical-guide.
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
      if (typeof range === 'number') {
        tmp_range = range;
      }

      var cursor_x = e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left;
      var cursor_y = e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top;

      if (
          rotate_params.arrow_x - tmp_range < cursor_x &&
          rotate_params.arrow_x + tmp_range > cursor_x &&
          rotate_params.arrow_y - tmp_range < cursor_y &&
          rotate_params.arrow_y + tmp_range > cursor_y
     ) {
        the_return = 1;
      }
      return the_return;

    },//_CheckRotateOver



    _clearCanvas: function () {
      var this_obj = this;
      var this_elm = this.element;
      var tmp_w = this_elm.find('.series_image_elm').width();
      var tmp_h = this_elm.find('.series_image_elm').height();
      this_elm.find('.canvas_main_elm').get(0).getContext('2d').clearRect(0, 0, tmp_w, tmp_h);
    },



    _create: function (insert_obj) {

      //run First (before _init)
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      var tmp_elm;

      var createCanvas = function () {
        var tmp_elm = '';
        tmp_elm = tmp_elm + '<div class="img_wrap">'; //area div
        tmp_elm = tmp_elm + '<canvas class="canvas_elm series_image_elm"></canvas>';//dicom img
        tmp_elm = tmp_elm + '<canvas class="canvas_elm canvas_main_elm"></canvas>';//draw label
        tmp_elm = tmp_elm + '<div class="mouse_cover"></div>';// element for catch event.
        tmp_elm = tmp_elm + '</div>';//close area div
        this_elm.append(tmp_elm);
      };
      createCanvas();

      //window info elements
      if (this_opts.viewer.elements.window.panel === true) {
        tmp_elm = '<div class="image_window_controller_wrap"><p class="btn_open">L:<span class="win_lv_label">' + this_opts.viewer.window.level.current + '</span>\
          /  W:<span class="win_width_label">' + this_opts.viewer.window.width.current + '</span></p>\
          <p class="btn_close"></p><ul class="image_window_controller">';

        //level
        tmp_elm = tmp_elm + '<li class="window_level_wrap"><span class="image_window_controller_label">window level</span>\
          <input type="text"  class="image_window_level" value="' + this_opts.viewer.window.level.current + '"></li>';

        //width
        tmp_elm = tmp_elm + '<li class="window_width_wrap"><span class="image_window_controller_label">window width</span>\
          <input type="text" class="image_window_width" value="' + this_opts.viewer.window.width.current + '"></li>';

        //preset
        tmp_elm = tmp_elm + '<li class="window_preset_wrap hidden"><select  class="image_window_preset_select"></select></li>';

        tmp_elm = tmp_elm + '</ul></div>';
        this_elm.find('.img_wrap').append(tmp_elm);

      }

      //number slider base (jQuery UI RUNs on them.)
      if (this_opts.viewer.orientation !== 'oblique' && this_opts.viewer.elements.slider.panel === true) {
        //slider UI
        tmp_elm = '<div class="btn_prev">Prev</div>';
        tmp_elm += '<div class="slider_outer">';
        tmp_elm += '<div class="slider_elm"></div>';
        tmp_elm += '</div>';
        tmp_elm += '<div class="btn_next">Next</div>';
        tmp_elm += '<div class="clear">&nbsp;</div>';
        this_elm.prepend(tmp_elm);
      }

      if (this_opts.viewer.orientation !== 'oblique' && this_opts.viewer.elements.slider.display === true) {
        //display number
        tmp_elm = '<p class="disp_num">' + this_opts.viewer.number.current + '</p>';
        this_elm.find('.img_wrap').append(tmp_elm);
      }

      if (this_opts.viewer.measure.active === true) {
        //measure
        tmp_elm = '<p class="disp_measure"><span class="measure_num"></span><span class="measure_label">mm</span></p>';
        this_elm.find('.img_wrap').append(tmp_elm);
      }

      //zoom buttons
      if (this_opts.viewer.elements.zoom.display === true) {
        tmp_elm = '<div class="img_toolbar_wrap">';
        tmp_elm  += '<ul class="img_toolbar">';
        tmp_elm  += '<li class="toolbar_btn ico_detail_sprite ico_detail_sprite_resize_large"></li>';
        tmp_elm  += '<li class="toolbar_btn ico_detail_sprite ico_detail_sprite_resize_short"></li>';
        tmp_elm  += '</ul>';
        tmp_elm  += '</div>';

        //element for show Zoom information.
        this_elm.find('.img_wrap').prepend(tmp_elm)
                                    .append('<p class="disp_size"><span class="current_size"></span>%</p>');
      }

      //add color of border
      for(var i=0; i<this_opts.viewer.guide.lines.length; i++) {
        if (this_opts.viewer.guide.lines[i].name === this_opts.viewer.orientation) {
          this_elm.find('.img_wrap').css('borderColor', '#'+this_opts.viewer.guide.lines[i].color);
        }
      }

    },//_create



    _createGuideHall : function () {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      var tmp_ctx = this_elm.find('.canvas_main_elm').get(0).getContext('2d');

      var position_params = this_opts.viewer.position;
      var hall_r = this_elm.find('.series_image_elm').width() * this_opts.viewer.guide.hall_rate;

      var guide_horizontal = this_obj.getGuide('horizontal');
      var guide_vertical =  this_obj.getGuide('vertical');

      //fit to zoom and trim
      var center_x = guide_horizontal.number * (position_params.dw / position_params.ow) + position_params.dx;
      var center_y = guide_vertical.number * (position_params.dh / position_params.oh) + position_params.dy;

      tmp_ctx.beginPath();
      tmp_ctx.arc(center_x, center_y, hall_r, 0, 2 * Math.PI, false);
      tmp_ctx.save();
      tmp_ctx.globalCompositeOperation = 'destination-out';
      tmp_ctx.fillStyle = 'black';
      tmp_ctx.fill();
      tmp_ctx.restore();
    },



    _createImageUrl : function () {
      var this_opts = this.options;
      var return_url = this_opts.viewer.src + '?series=' + this_opts.viewer.activeSeriesId;
      return_url += '&wl=' +this_opts.viewer.window.level.current;
      return_url += '&ww=' + this_opts.viewer.window.width.current;

      if (this_opts.viewer.orientation === 'axial' || this_opts.viewer.orientation === 'sagittal' || this_opts.viewer.orientation === 'coronal') {
        return_url += '&mode=' + this_opts.viewer.orientation
        return_url += '&target=' + this_opts.viewer.number.current;
      } else {
        return_url += '&a=' + this_opts.viewer.cut.angle;
        return_url += '&b=' + this_opts.viewer.cut.orientation;
        return_url += '&c=' + this_opts.viewer.cut.center_x + ','+ this_opts.viewer.cut.center_y + ','+ this_opts.viewer.cut.center_z;
      }
      return return_url;
    },



    createSaveData: function (series_id, label_id) {
      var return_data = this.options.container.createSaveData(series_id, label_id);
      return return_data;
    },//createSaveData



    deleteLabelObject: function (series_id, label_id) {
      var this_obj = this;
      var this_opts = this.options;
      var target_series = this_obj.getSeriesObjectById(series_id);

      for (var i = target_series.label.length -1; i >= 0; i--) {
        if (target_series.label[i].id === label_id) {
          target_series.label.splice(i, 1);
          this_opts.container.deleteLabelObject(series_id, label_id);
          break;
        }
      }
    },



    _disableImageAlias: function (target_context, state) {
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

      var guide_start_x = (guide_horizontal.number + 0.5) * this_opts.viewer.position.dw / this_opts.viewer.position.ow + this_opts.viewer.position.dx;
      var guide_start_y = (guide_vertical.number + 0.5) * this_opts.viewer.position.dh / this_opts.viewer.position.oh + this_opts.viewer.position.dy;

      guide_start_x = Math.floor(guide_start_x);
      guide_start_y = Math.floor(guide_start_y);

      //draw horizontal position (vertical line)
      if (guide_horizontal.show === true) {
        tmp_ctx.beginPath();
        tmp_ctx.fillStyle = '#' + guide_horizontal.color;
        tmp_ctx.rect(
          guide_start_x,
          0,
          1,
          this_elm.find('.series_image_elm').height()
       );
        tmp_ctx.fill();
        tmp_ctx.closePath();
      }

      //draw vertical position (horizontal line)
      if (guide_vertical.show === true) {
        tmp_ctx.beginPath();
        tmp_ctx.fillStyle = '#' + guide_vertical.color;
        tmp_ctx.rect(
           0,
           guide_start_y,
           this_elm.find('.series_image_elm').width(),
           1
       );
        tmp_ctx.fill();
        tmp_ctx.closePath();

      }
      this_obj._disableImageAlias(tmp_ctx, false);

    },//drawGuide



    drawLabel: function (series_id, label_id, positions_array, the_color) {
      //drawing function
      //series ID
      //label ID
      //drawing target positions [ [x,y,z], [x2,y2,z2]...]

      var this_obj = this;
      var this_elm = this_obj.element;
      var this_opts = this_obj.options;
      var tmp_ctx = this_elm.find('.canvas_main_elm').get(0).getContext('2d');
      var tmp_orientation = this_opts.viewer.orientation;
      var tmp_zoom_x = this_opts.viewer.position.dw / this_opts.viewer.position.ow;
      var tmp_zoom_y = this_opts.viewer.position.dh / this_opts.viewer.position.oh;
      var tmp_dx = this_opts.viewer.position.dx;
      var tmp_dy = this_opts.viewer.position.dy;

      tmp_ctx.beginPath();
      tmp_ctx.fillStyle = the_color;
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
        tmp_x = tmp_x * tmp_zoom_x + tmp_dx;
        tmp_y = tmp_y * tmp_zoom_y + tmp_dy;
        tmp_ctx.rect(tmp_x, tmp_y, tmp_zoom_x, tmp_zoom_y);
      }
      tmp_ctx.fill();
      tmp_ctx.closePath();
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

      var rotate_params = this_opts.viewer.rotate;
      var position_params = this_opts.viewer.position;
      var rotate_ico_size = 15;
      var tmp_ctx = this_elm.find('.canvas_main_elm').get(0).getContext('2d');
      tmp_ctx.strokeStyle = '#' + rotate_params.color;
      tmp_ctx.fillStyle = '#' + rotate_params.color;

      var guide_horizontal = this_obj.getGuide('horizontal');
      var guide_vertical =  this_obj.getGuide('vertical');

      //fit to zoom and trim
      var center_x = guide_horizontal.number * (position_params.dw / position_params.ow) + position_params.dx;
      var center_y = guide_vertical.number * (position_params.dh / position_params.oh) + position_params.dy;
      var the_points = this_obj._calculateRotatePoint(rotate_params.angle, center_x, center_y);

      rotate_params.arrow_x = the_points[1][0];
      rotate_params.arrow_y = the_points[1][1];

      //line
      tmp_ctx.beginPath();
      tmp_ctx.moveTo(the_points[0][0], the_points[0][1]);
      tmp_ctx.lineTo(the_points[2][0], the_points[2][1]);
      tmp_ctx.stroke();
      tmp_ctx.closePath();

      //handle arrow
      tmp_ctx.beginPath();
      tmp_ctx.arc(the_points[1][0], the_points[1][1], 0.25 * rotate_ico_size, 0, Math.PI * 2, false);
      tmp_ctx.fill();
      tmp_ctx.closePath();

      //direction arrow
      tmp_ctx.beginPath();
      var direction_arrow_x = the_points[1][0] + 0.25 * rotate_ico_size * Math.cos(rotate_params.angle - Math.PI * 0.5);
      var direction_arrow_y = the_points[1][1] - 0.25 * rotate_ico_size * Math.sin(rotate_params.angle - Math.PI * 0.5);
      tmp_ctx.moveTo(direction_arrow_x, direction_arrow_y);
      tmp_ctx.lineTo(
        direction_arrow_x + 0.75 * rotate_ico_size * Math.cos(rotate_params.angle - Math.PI * 0.375),
        direction_arrow_y - 0.75 * rotate_ico_size * Math.sin(rotate_params.angle - Math.PI * 0.375)
     );
      tmp_ctx.lineTo(
        direction_arrow_x + 0.75 * rotate_ico_size * Math.cos(rotate_params.angle - Math.PI * 0.625),
        direction_arrow_y - 0.75 * rotate_ico_size * Math.sin(rotate_params.angle - Math.PI * 0.625)
     );
      tmp_ctx.lineTo(direction_arrow_x, direction_arrow_y);
      tmp_ctx.fill();
      tmp_ctx.closePath();

    },//drawRotate



    _exchangePositionCtoV: function (insert_array) {
      //exchange 2D position data to 3D
      var this_opts = this.options;
      var rtn_array = [];
      var tmp_orientation = this_opts.viewer.orientation;
      var tmp_number_index = this_opts.viewer.number.current;

      for (var i = insert_array.length - 1; i >= 0; i--) {
        var tmp_obj = []; //array of the 3D positions data.
        if (tmp_orientation === 'axial') {
          tmp_obj[0] = Math.floor(insert_array[i][0]);
          tmp_obj[1] = Math.floor(insert_array[i][1]);
          tmp_obj[2] = tmp_number_index;
        } else if (tmp_orientation === 'coronal') {
          tmp_obj[0] = Math.floor(insert_array[i][0]);
          tmp_obj[1] = tmp_number_index;
          tmp_obj[2] = Math.floor(insert_array[i][1]);
        } else if (tmp_orientation === 'sagittal') {
          tmp_obj[0] = tmp_number_index;
          tmp_obj[1] = Math.floor(insert_array[i][0]);
          tmp_obj[2] = Math.floor(insert_array[i][1]);
        }
        rtn_array.push(tmp_obj);
      }
      return rtn_array;
    },



    fitToCanvas : function () {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      var canvas_w = this_elm.find('.series_image_elm').width();
      var tmp_zoom = canvas_w / this_opts.viewer.position.dw;

      tmp_zoom = Math.floor(tmp_zoom * 10) / 10;
      this_obj.changeZoom(tmp_zoom);
    },



    fixToCenter : function () {

      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      var guide_horizontal = this_obj.getGuide('horizontal');
      var guide_vertical =  this_obj.getGuide('vertical');

      var tmp_w = this_elm.find('.series_image_elm').width();
      var tmp_h = this_elm.find('.series_image_elm').height();

      this_opts.viewer.position.dx = 0.5 * tmp_w - guide_horizontal.number * this_opts.viewer.position.dw / this_opts.viewer.position.ow;
      this_opts.viewer.position.dy = 0.5 * tmp_h - guide_vertical.number * this_opts.viewer.position.dh / this_opts.viewer.position.oh;
    },



    _getBucketFillPositions: function (series_id, label_id, pointed_position) {
      // pointed positions array :  [[X1,Y1,Z1], [X2,Y2,Z2]]

      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      //get the points that already drawn.
      var outer_points = this_opts.container.returnSlice(
        series_id,
        label_id,
        this_opts.viewer.orientation,
        this_opts.viewer.number.current
     );

      var max_x = Math.max(this_opts.viewer.position.ow) || 0;
      var max_y = Math.max(this_opts.viewer.position.oh) || 0;

      var paint_map = new Array(max_y);
      for (var count = max_y - 1; count >= 0; count--) {
        paint_map[count] = new Uint8Array(max_x);
      }

      //exchange from 3D positions to 2D..
      for (var count = outer_points.length - 1; count >= 0; count--) {
        if (this_opts.viewer.orientation === 'axial') {
          paint_map[outer_points[count][1]][outer_points[count][0]] = 1;
        } else if (this_opts.viewer.orientation === 'coronal') {
          paint_map[outer_points[count][2]][outer_points[count][0]] = 1;
        } else if (this_opts.viewer.orientation === 'sagittal') {
          paint_map[outer_points[count][2]][outer_points[count][1]] = 1;
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

      var point = [];
      point.push(position_x);
      point.push(position_y);

      var position = [];
      position.push(point);

      while (position.length !== 0) {
        //get the target point
        var point = position.shift();
        //to right
        if (point[0]+1 < paint_map[point[1]].length) {
          if (paint_map[point[1]][point[0]+1] === 0) {
            paint_map[point[1]][point[0]+1] = 1;
            var next_point = [point[0]+1,point[1]];
            position.push(next_point);
          }
        } else {
          return 0;
        }
        //to top
        if (point[1]+1 < paint_map.length) {
          if (paint_map[point[1]+1][point[0]] === 0) {
            paint_map[point[1]+1][point[0]] = 1;
            var next_point = [point[0],point[1]+1];
            position.push(next_point);
          }
        } else {
          return 0;
        }
        //to left
        if (point[0]-1 >= 0) {
          if (paint_map[point[1]][point[0]-1] === 0) {
            paint_map[point[1]][point[0]-1] = 1;
            var next_point = [point[0]-1,point[1]];
            position.push(next_point);
          }
        } else {
          return 0;
        }
        //to bottom
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
      var target_position_array = [];
      //exhange 2D positiondatas to 3D.
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
      return target_position_array;

    },//_getBucketFillPositions



    getLabelObjectById: function (label_id, series_id) {
      var this_obj = this;
      var this_opts = this.options;
      var tmp_the_series = this_obj.getSeriesObjectById(series_id);

      for (var i = tmp_the_series.label.length - 1; i >= 0; i--) {
        if (tmp_the_series.label[i].id === label_id) {
          return tmp_the_series.label[i];
        }
      }
    },//getLabelObjectById



    getGuide: function (target_direction) {

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

      if (target_direction === 'vertical') {
        return_obj = guide_vertical;
      } else if (target_direction === 'horizontal') {
        return_obj = guide_horizontal;
      }
      return return_obj;

    },//getGuide



    getSeriesObjectById: function (series_id) {
      var this_opts = this.options;
      for (var i = this_opts.viewer.series.length - 1; i >= 0; i--) {
        if (this_opts.viewer.series[i].id === series_id) {
          return this_opts.viewer.series[i];
        }
      }
    },



    _getStopover: function (start_x, start_y, goal_x, goal_y) {
      //input : start point XY & goal point XY
      //return : the array of middle points between start & goal.
      var dist_x = Math.abs(goal_x - start_x);
      var dist_y = Math.abs(goal_y - start_y);
      var tmp_base = dist_x;

      if (dist_y > dist_x) {//fix which is larger distance that Vertical or Horizontal.
        tmp_base = dist_y;
      }

      var tmp_x = (goal_x - start_x) / tmp_base;
      var tmp_y = (goal_y - start_y) / tmp_base;

      var rtn_ary = [];
      for (var i = tmp_base - 1; i >= 0; i--) {
        var ary_x = start_x + i * tmp_x;
        var ary_y = start_y + i * tmp_y;
        rtn_ary.push([ary_x, ary_y]);
      }

      return rtn_ary;
    },



    historyBack: function () {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      this_opts.container.historyBack();
    },



    historyRedo: function () {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      this_opts.container.historyRedo();
    },



    _init: function (insert_object) {

      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      if (insert_object) {
        this_opts = $.extend(true, this_opts, insert_object);
      }

      //save my name in the Container. (for syncro)
      var this_id = this_elm.attr('id');
      this_opts.container.data.member.push(this_id);

      //put series data into Container.
      for (var i = 0; i < this_opts.viewer.series.length; i++) {
        var tmp_series = this_opts.viewer.series[i];
        this_opts.container.setSize(
          tmp_series.id,
          tmp_series.voxel.x,
          tmp_series.voxel.y,
          tmp_series.voxel.z
       );
      }

      this_obj.setCanvasSize();

      this_obj.changeSeries(this_opts.viewer.activeSeriesId);
      this_obj.changeZoom(1); // set default zoom settings

      if(this_opts.viewer.orientation === 'oblique'){
        this_obj._changeImageSrc(true);
      }else{
        this_obj._changeImageSrc();
      }
      this_obj.setEvents();

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



    _limitImagePosition: function () {

      var this_obj = this;
      var this_opts = this.options;
      var this_elm = this.element;
      var tmp_w = this_elm.find('.series_image_elm').width();
      var tmp_h = this_elm.find('.series_image_elm').height();

      //right
      if (tmp_w > this_opts.viewer.position.dw + this_opts.viewer.position.dx) {
        this_opts.viewer.position.dx = tmp_w - this_opts.viewer.position.dw;
      }

      //bottom
      if (tmp_h > this_opts.viewer.position.dh + this_opts.viewer.position.dy) {
        this_opts.viewer.position.dy = tmp_h - this_opts.viewer.position.dh;
      }

      //left
      if (this_opts.viewer.position.dx > 0) {
        this_opts.viewer.position.dx = 0;
      }

      //top
      if (this_opts.viewer.position.dy > 0) {
        this_opts.viewer.position.dy = 0;
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
      var is_on_rotate  = this_obj._CheckRotateOver(e);

      var target_guide_direction = '';
      if (this_opts.viewer.orientation !== 'oblique') {
        target_guide_direction = this_obj._CheckGuideOver(e);
      }

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
      this_opts._tmpInfo.elementParam.start.X = this_opts.viewer.position.dx;
      this_opts._tmpInfo.elementParam.start.Y = this_opts.viewer.position.dy;

    },//_mousedownFuncPan



    _mousedownFuncPen: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

       //input temporary positions. (when the cursor drugging back from outer of canvas.)
       if (this_opts._tmpInfo.label.length > 0) {
         var the_active_series = this_obj.getSeriesObjectById(this_opts.viewer.activeSeriesId);
         this_opts.container.addHistory(
           this_opts.viewer.activeSeriesId,
           the_active_series.activeLabelId,
           this_opts.mode,
           this_opts._tmpInfo.label
        );
         this_opts.container.updateVoxel(
           this_opts.viewer.activeSeriesId,
           the_active_series.activeLabelId,
           this_opts.mode,
           this_opts._tmpInfo.label
        );

         this_opts._tmpInfo.label = [];
       } else {
          //normal pen drawing
          var tmp_ctx = this_elm.find('.canvas_main_elm').get(0).getContext('2d');

          //mouse position (on canvas , image original scale)
          var tmp_x = (e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left - this_opts.viewer.position.dx) * this_opts.viewer.position.ow / this_opts.viewer.position.dw;
          var tmp_y = (e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top - this_opts.viewer.position.dy) * this_opts.viewer.position.oh / this_opts.viewer.position.dh;

          if(tmp_x > this_opts.viewer.position.ow -1){
            tmp_x = this_opts.viewer.position.ow -1;
          }

          if(tmp_y > this_opts.viewer.position.oh -1){
            tmp_y = this_opts.viewer.position.oh -1;
          }

          this_opts._tmpInfo.cursor.current.X = Math.floor(tmp_x);
          this_opts._tmpInfo.cursor.current.Y = Math.floor(tmp_y);

          var tmp_array = this_obj._applyBoldness(
            [[this_opts._tmpInfo.cursor.current.X, this_opts._tmpInfo.cursor.current.Y]],
            this_opts.viewer.position.ow -1,
            this_opts.viewer.position.oh -1
          );

                    console.log(tmp_array.length);
          tmp_array = this_obj._reduceOverlap(tmp_array);
                    console.log(tmp_array.length);

          //exchange canvas positions data to 3D data.
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

      var the_active_series = this_obj.getSeriesObjectById(this_opts.viewer.activeSeriesId);
      var tmp_data = [
       this_opts.viewer.activeSeriesId,
       the_active_series.activeLabelId,
       this_opts.mode,
       this_opts._tmpInfo.label
      ];

      if (this_opts._tmpInfo.label.length > 0) {
        //history
        this_opts.container.addHistory(
          this_opts.viewer.activeSeriesId,
          the_active_series.activeLabelId,
          this_opts.mode,
          this_opts._tmpInfo.label
       );
        this_opts.container.updateVoxel(
          this_opts.viewer.activeSeriesId,
          the_active_series.activeLabelId,
          this_opts.mode,
          this_opts._tmpInfo.label
       );
        this_opts._tmpInfo.label = [];
      } else {
        var tmp_ctx = this_elm.find('.canvas_main_elm').get(0).getContext('2d');
        //mouse position (on canvas , image original scale)

        var tmp_x = (e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left - this_opts.viewer.position.dx) * this_opts.viewer.position.ow / this_opts.viewer.position.dw;
        var tmp_y = (e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top - this_opts.viewer.position.dy) * this_opts.viewer.position.oh / this_opts.viewer.position.dh;

        if(tmp_x > this_opts.viewer.position.ow -1){
          tmp_x = this_opts.viewer.position.ow -1;
        }

        if(tmp_y > this_opts.viewer.position.oh -1){
          tmp_y = this_opts.viewer.position.oh -1;
        }

        this_opts._tmpInfo.cursor.current.X = Math.floor(tmp_x);
        this_opts._tmpInfo.cursor.current.Y = Math.floor(tmp_y);

        var tmp_array =  this_obj._applyBoldness(
          [[this_opts._tmpInfo.cursor.current.X, this_opts._tmpInfo.cursor.current.Y]],
          this_opts.viewer.position.ow -1,
          this_opts.viewer.position.oh -1
        );
        tmp_array = this_obj._reduceOverlap(tmp_array);
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
    },//_mousedownFuncErase



    _mousedownFuncBucket: function (e) {
       var this_obj = this;
       var this_elm = this.element;
       var this_opts = this.options;

       var the_active_series = this_obj.getSeriesObjectById(this_opts.viewer.activeSeriesId);
       if (typeof the_active_series.label !== 'undefined' &&  the_active_series.label.length > 0) {

         //cursor position (in image original scale)
         var tmp_x = (e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left - this_opts.viewer.position.dx) * this_opts.viewer.position.ow / this_opts.viewer.position.dw;
         var tmp_y = (e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top - this_opts.viewer.position.dy) * this_opts.viewer.position.oh / this_opts.viewer.position.dh;

         tmp_x = Math.floor(tmp_x);
         tmp_y = Math.floor(tmp_y);

         if(tmp_x < this_opts.viewer.position.ow -1 && tmp_y < this_opts.viewer.position.oh -1){
          var tmp_point_position = this_obj._exchangePositionCtoV([[tmp_x, tmp_y]]);

          var bucket_fill_positions =  this_obj._getBucketFillPositions(
             this_opts.viewer.activeSeriesId,
             the_active_series.activeLabelId,
             tmp_point_position[0]
          );

          this_opts.container.updateVoxel(this_opts.viewer.activeSeriesId,the_active_series.activeLabelId, 'pen',bucket_fill_positions);
          this_opts.container.addHistory(this_opts.viewer.activeSeriesId,the_active_series.activeLabelId, 'pen',bucket_fill_positions);
          this_elm.trigger('onWritten', [the_active_series.activeLabelId,this_opts.viewer.activeSeriesId]);

         }
       }
    },//_mousedownFuncBucket



    _mousedownFuncMeasure : function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      this_opts.viewer.measure.start_x = e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left;
      this_opts.viewer.measure.start_y = e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top;

    },//_mousedownFuncMeasure



    _mousedownFuncGuide : function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      this_obj._mousemoveFuncGuide(e);
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

        if (this_obj._CheckRotateOver(e) === 1) {
          if(this_opts.mode === 'rotate' ||this_opts.mode === 'rotate_active'){
            this_elm.addClass('mode_rotate_active');
            return;
          } else {
            this_elm.removeClass('mode_rotate_active');
          }
        } else {
          this_elm.removeClass('mode_rotate_active');
        }

        var target_guide_direction = '';
        if (this_opts.viewer.orientation !== 'oblique') {
          target_guide_direction = this_obj._CheckGuideOver(e);
        }

        if (target_guide_direction !== '') {
          this_opts._tmpInfo.mode_backup = this_opts.mode + '';
          this_elm.removeClass(function (index, css) {
            return (css.match(/\bmode_\S+/g) || []).join(' ');
          });
          this_elm.addClass('mode_guide_'+target_guide_direction);
          return;
        } else if (this_opts._tmpInfo.mode_backup !== '') {
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

      tmp_position_params.dx = Math.round(this_opts._tmpInfo.elementParam.start.X + e.clientX - this_opts._tmpInfo.cursor.start.X);
      tmp_position_params.dy = Math.round(this_opts._tmpInfo.elementParam.start.Y + e.clientY - this_opts._tmpInfo.cursor.start.Y);

      this_obj._changeImageSrc();
    },//_mousemoveFuncPan



    _mousemoveFuncDraw : function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      //mouse position (on canvas , image original scale)
      var tmp_x = (e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left - this_opts.viewer.position.dx) * this_opts.viewer.position.ow / this_opts.viewer.position.dw;
      var tmp_y = (e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top - this_opts.viewer.position.dy) * this_opts.viewer.position.oh / this_opts.viewer.position.dh;
      tmp_x = Math.floor(tmp_x);
      tmp_y = Math.floor(tmp_y);

      if(tmp_x > this_opts.viewer.position.ow -1){
        tmp_x = this_opts.viewer.position.ow -1;
      }

      if(tmp_y > this_opts.viewer.position.oh -1){
        tmp_y = this_opts.viewer.position.oh -1;
      }

      if (this_opts._tmpInfo.cursor.out_flg === 0) {

        var tmp_ctx = this_elm.find('.canvas_main_elm').get(0).getContext('2d');
        var tmp_array = [];

        //filling the midpoint
        if (Math.abs(this_opts._tmpInfo.cursor.current.X - tmp_x) > 1 || Math.abs(this_opts._tmpInfo.cursor.current.Y - tmp_y) > 1) {
          //midpoints
          tmp_array = this_obj._getStopover(this_opts._tmpInfo.cursor.current.X, this_opts._tmpInfo.cursor.current.Y, tmp_x, tmp_y);

        } else {
          //no point
          tmp_array.push([tmp_x, tmp_y]);
          tmp_array.push([this_opts._tmpInfo.cursor.current.X, this_opts._tmpInfo.cursor.current.Y]);
        }

        //update _tmpInfo.cursor.current for next mid points
        this_opts._tmpInfo.cursor.current.X = tmp_x;
        this_opts._tmpInfo.cursor.current.Y = tmp_y;

        tmp_array = this_obj._applyBoldness(
          tmp_array,
          this_opts.viewer.position.ow -1,
          this_opts.viewer.position.oh -1
        );

        tmp_array = this_obj._reduceOverlap(tmp_array);
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

        //update _tmpInfo.cursor.current for next mid points
        this_opts._tmpInfo.cursor.current.X = tmp_x;
        this_opts._tmpInfo.cursor.current.Y = tmp_y;
        this_opts._tmpInfo.cursor.out_flg = 0;
      }

    },//_mousemoveFuncPen



    _mousemoveFuncWindow : function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      var tmp_width = this_opts._tmpInfo.elementParam.start.X + (e.clientX - this_opts._tmpInfo.cursor.start.X) * 10;
      var tmp_level = this_opts._tmpInfo.elementParam.start.Y - (e.clientY - this_opts._tmpInfo.cursor.start.Y) * 10;

     // fix the limit (window width)
      if (this_opts.viewer.window.width.minimum > tmp_width) {
        tmp_width = this_opts.viewer.window.width.minimum;
      }
      if (this_opts.viewer.window.width.maximum < tmp_width) {
        tmp_width = this_opts.viewer.window.width.maximum;
      }

      //fix the limit (window level)
      if (this_opts.viewer.window.level.minimum > tmp_level) {
        tmp_level = this_opts.viewer.window.level.minimum;
      }
      if (this_opts.viewer.window.level.maximum < tmp_level) {
        tmp_level = this_opts.viewer.window.level.maximum;
      }

      this_obj.changeWindowInfo(tmp_level, tmp_width);
      this_obj._changeImageSrc();

      this_elm.find('.image_window_preset_select').find('option').removeAttr('selected');
      this_elm.find('.image_window_preset_select').val('blank');

    },//_mousemoveFuncWindow



    _mousemoveFuncMeasure : function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      //calculate goal point
      this_opts.viewer.measure.goal_x = e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left;
      this_opts.viewer.measure.goal_y = e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top;

      //drawing measure objects
      this_obj.syncVoxel();
      this_elm.imageViewer('drawMeasure');

      //distant (canvas pixel scale)
      var dist_w = (this_opts.viewer.measure.goal_x - this_opts.viewer.measure.start_x) * this_opts.viewer.position.ow / this_opts.viewer.position.dw;
      var dist_h = (this_opts.viewer.measure.goal_y - this_opts.viewer.measure.start_y) * this_opts.viewer.position.oh / this_opts.viewer.position.dh;

      //fix to millimeter scale
      if (this_opts.viewer.orientation === 'axial') {
        dist_w = dist_w * this_opts.viewer.voxel.voxel_x;
        dist_h = dist_h * this_opts.viewer.voxel.voxel_y;
      }else if (this_opts.viewer.orientation === 'coronal') {
        dist_w = dist_w * this_opts.viewer.voxel.voxel_x;
        dist_h = dist_h * this_opts.viewer.voxel.voxel_z;
      }else if (this_opts.viewer.orientation === 'sagittal') {
        dist_w = dist_w * this_opts.viewer.voxel.voxel_y;
        dist_h = dist_h * this_opts.viewer.voxel.voxel_z;
      }

      var disp_txt = Math.sqrt(dist_w*dist_w + dist_h*dist_h);
      disp_txt = disp_txt.toFixed(2);
      this_elm.find('.disp_measure').addClass('active').find('.measure_num').text(disp_txt);

    },//_mousemoveFuncMeasure



    _mousemoveFuncGuide : function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      var guide_horizontal = this_obj.getGuide('horizontal');
      var guide_vertical =  this_obj.getGuide('vertical');

      var tmp_cursor_x = e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left;
      var tmp_cursor_y = e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top;

      var guide_x = (tmp_cursor_x - this_opts.viewer.position.dx) * this_opts.viewer.position.ow / this_opts.viewer.position.dw;
      var guide_y = (tmp_cursor_y - this_opts.viewer.position.dy) * this_opts.viewer.position.oh / this_opts.viewer.position.dh;

      guide_horizontal.number = Math.floor(guide_x);
      guide_vertical.number = Math.floor(guide_y);

      this_obj.syncVoxel();
      this_elm.trigger('onGuideChange', [
        this_opts.viewer.orientation,
        guide_horizontal.number,
        guide_vertical.number
      ]);

    },//_mousemoveFuncGuide



    _mousemoveFuncGuideSingle : function (e,direction) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      var guide_horizontal = this_obj.getGuide('horizontal');
      var guide_vertical =  this_obj.getGuide('vertical');

      if (direction === 'horizontal') {
        var tmp_cursor_x = e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left - this_opts.viewer.position.dx;
        guide_horizontal.number = Math.floor(tmp_cursor_x * this_opts.viewer.position.ow / this_opts.viewer.position.dw);
      } else {
        var tmp_cursor_y = e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top - this_opts.viewer.position.dy;
        guide_vertical.number = Math.floor(tmp_cursor_y * this_opts.viewer.position.oh / this_opts.viewer.position.dh);
      }

      this_obj.syncVoxel();
      this_elm.trigger('onGuideChange', [
        this_opts.viewer.orientation,
        guide_horizontal.number,
        guide_vertical.number
      ]);
    },//_mousemoveFuncGuide



    _mousedownFuncRotate: function (e) {

    },//_mousedownFuncRotate



    _mousemoveFuncRotate : function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      var position_params = this_opts.viewer.position;

      var tmp_cursor_x = e.clientX - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().left;
      var tmp_cursor_y = e.clientY - this_elm.find('.canvas_main_elm').get(0).getBoundingClientRect().top;

      var guide_horizontal = this_obj.getGuide('horizontal');
      var guide_vertical =  this_obj.getGuide('vertical');

      var center_x = guide_horizontal.number * (position_params.dw / position_params.ow) + position_params.dx;
      var center_y = guide_vertical.number * (position_params.dh / position_params.oh) + position_params.dy;

      var new_angle = Math.atan((center_y - tmp_cursor_y) / (tmp_cursor_x - center_x));
      if (tmp_cursor_x < center_x) {
        //the second & third quadrant
        new_angle = new_angle + Math.PI;
      }

      new_angle = Math.ceil(new_angle * 100) / 100;
      this_opts.viewer.rotate.angle = new_angle;
      this_obj.syncVoxel();
      this_elm.trigger('onRotateChange', [this_opts.viewer.orientation,new_angle]);
    },//_mousemoveFuncRotate



    _mouseoutFunc: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      this_opts._tmpInfo.cursor.out_flg = 1;

      if (this_opts.mode === 'pan' || this_opts.mode === 'window') {
        this_opts._tmpInfo.cursor.touch_flg = 0;
      }

      if (this_opts._tmpInfo.mode_backup !== '') {
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
      } else if (this_opts.mode === 'window') {
        this_obj._mouseupFuncWindow(e);
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
      this_opts._tmpInfo.label = []; //clear memory

      //trigger the Event for some controllers
      if (typeof this_opts.viewer.activeSeriesId !== 'undefined' && typeof the_active_series !== 'undefined') {
        this_elm.trigger('onWritten', [the_active_series.activeLabelId, this_opts.viewer.activeSeriesId]);
      }
    },//_mouseupFuncDraw



    _mouseupFuncGuide : function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      this_obj._mousemoveFuncGuide(e);
    },//_mouseupFuncGuide



    _mouseupFuncGuideSingle: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      if (this_opts._tmpInfo.mode_backup !== '') {
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



    _mouseupFuncWindow: function (e) {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      this_elm.trigger('onWindowInfoChange');
    },//_mouseoverFunc



    _mouseWheelFunc: function (e) {
      e.preventDefault();
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      var delta = e.originalEvent.deltaY ? -(e.originalEvent.deltaY) : e.originalEvent.wheelDelta ? e.originalEvent.wheelDelta : -(e.originalEvent.detail);
      var tmp_change_ammount = delta * 0.01;
      tmp_change_ammount = Math.round(tmp_change_ammount);
      var tmp_current = this_opts.viewer.number.current;

      tmp_current = tmp_current - tmp_change_ammount;
      if (tmp_current > this_opts.viewer.number.maximum) {
        tmp_current =this_opts.viewer.number.maximum;
      }
      if (tmp_current < this_opts.viewer.number.minimum) {
        tmp_current =this_opts.viewer.number.minimum;
      }
      this_opts.viewer.number.current = tmp_current;
      this_elm.find('.slider_elm').slider({
        value: this_opts.viewer.number.current
      });

      return false;
    },//_mouseWheelFunc




    _reduceOverlap: function (insert_array, input_dimension) {
      var return_array = insert_array;
      var compair_array = {};
      var the_dimension = 2;
      if(typeof dimension ==='number'){
        the_dimension = input_dimension;
      }

      for(var i = return_array.length-1; i >= 0; i--){
        var compair_str = 'id';
        for(var j= 0; j < the_dimension; j++){
          compair_str = compair_str + '-' + return_array[i][j];
        }
        if(typeof compair_array[compair_str] !== 'undefined' || compair_array[compair_str] === 1){
          return_array.splice(i,1);
        } else {
          compair_array[compair_str] = 1;
        }

      }
      return return_array;
    },



    setCanvasSize: function () {
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      var canvas_default = 512;

      var tmp_w = canvas_default;
      var tmp_h = canvas_default;
      var tmp_ow = canvas_default;
      var tmp_oh = canvas_default;
      var tmp_num = canvas_default;
      var canvas_w = canvas_default;
      var canvas_y = canvas_default;

      var dpv_x = Math.min(this_opts.viewer.voxel.voxel_x / this_opts.viewer.voxel.voxel_y, 1);
      var dpv_y = Math.min(this_opts.viewer.voxel.voxel_y / this_opts.viewer.voxel.voxel_x, 1);
      var dpv_z = this_opts.viewer.voxel.voxel_z / Math.min(this_opts.viewer.voxel.voxel_x, this_opts.viewer.voxel.voxel_y);

      if (this_opts.viewer.orientation === 'axial') {
        tmp_w = this_opts.viewer.voxel.x * dpv_x;
        tmp_h = this_opts.viewer.voxel.y * dpv_y;
        canvas_w = Math.min(canvas_default, this_opts.viewer.voxel.x * dpv_x);
        canvas_y = Math.min(canvas_default, this_opts.viewer.voxel.y * dpv_y);
        tmp_ow = this_opts.viewer.voxel.x;
        tmp_oh = this_opts.viewer.voxel.y;
        tmp_num = this_opts.viewer.voxel.z - 1;
      } else if (this_opts.viewer.orientation === 'coronal') {
        tmp_w = this_opts.viewer.voxel.y * dpv_y;
        tmp_h = this_opts.viewer.voxel.z * dpv_z;
        canvas_w = Math.min(canvas_default, this_opts.viewer.voxel.x * dpv_x);
        canvas_y = this_opts.viewer.voxel.z * dpv_z;
        tmp_ow = this_opts.viewer.voxel.x;
        tmp_oh = this_opts.viewer.voxel.z;
        tmp_num = this_opts.viewer.voxel.y - 1;
      } else if (this_opts.viewer.orientation === 'sagittal') {
        tmp_w = this_opts.viewer.voxel.y * dpv_y;
        tmp_h = this_opts.viewer.voxel.z * dpv_z;
        canvas_w = Math.min(canvas_default, this_opts.viewer.voxel.y * dpv_y);
        canvas_y = this_opts.viewer.voxel.z * dpv_z;
        tmp_ow = this_opts.viewer.voxel.y;
        tmp_oh = this_opts.viewer.voxel.z;
        tmp_num = this_opts.viewer.voxel.x - 1;
      }
      this_opts.viewer.position.ow = tmp_ow; //DICOM image original size
      this_opts.viewer.position.oh = tmp_oh;
      this_opts.viewer.position.dw = tmp_w; // initial display size (canvas pixel scale)
      this_opts.viewer.position.dh = tmp_h;
      this_opts.viewer.number.maximum = tmp_num;

      this_opts.viewer.position.dx = (canvas_default - tmp_w) / 2;
      this_opts.viewer.position.dy = (canvas_default - tmp_h) / 2;

      //set canvas element size.
      this_elm.find('.series_image_elm,.canvas_main_elm').attr({width: canvas_default,height: canvas_default})
      .css({width: canvas_default + 'px', height: canvas_default + 'x'});

      //set slider limit
      if (this_opts.viewer.number.current > tmp_num) {
        this_opts.viewer.number.current = tmp_num;
      }

      this_elm.find('.slider_elm').slider({
        value: this_opts.viewer.number.current,
        min: this_opts.viewer.number.minimum,
        max: this_opts.viewer.number.maximum
      });

    },//setCanvasSize



    setEvents: function () {

      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      //set events
      this_elm.bind('changeImageSrc', function (e,fit_center_flg) {
        this_obj._changeImageSrc(fit_center_flg);
      })
      .bind('changeSeries', function (e, series_id) {
        this_obj.changeSeries(series_id);
      })
      .bind('addLabelObject', function (e, series_id, label_id) {
        this_obj.addLabelObject(series_id, label_id);
      })
      .bind('deleteLabelObject', function (e, series_id, label_id) {
        this_obj.deleteLabelObject(series_id, label_id);
      })
      .bind('drawGuide',function () {
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

      //slider UI
      //requiring jQuery UI slider.
      if (this_opts.viewer.elements.slider.active === true) {
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
            this_elm.find('.disp_num').text(tmp_disp_num); //display number
            this_obj._changeImageSrc();
            this_elm.trigger('onNumberChange', [this_opts.viewer.orientation, this_opts.viewer.number.current]);
          }, change: function (event, ui) {
            if (this_elm.hasClass('isSlide') === false) {
              this_opts.viewer.number.current = ui.value;
              var tmp_disp_num = this_opts.viewer.number.current + 1;
              this_elm.find('.disp_num').text(tmp_disp_num); //display number
              this_obj._changeImageSrc();
              this_elm.trigger('onNumberChange', [this_opts.viewer.orientation,this_opts.viewer.number.current]);
            } else {
              this_elm.removeClass('isSlide');
            }
          }
        });

        this_elm.find('.btn_prev').click(function () {
          var tmp_num = this_opts.viewer.number.current;
          tmp_num = Number(tmp_num);
          if (tmp_num > 0) {  //number Zero is the min
            tmp_num--;
            var tmp_disp_num = tmp_num + 1;
            this_elm.find('.disp_num').text(tmp_disp_num); //display number
          }
          //slider sync
          this_elm.find('.slider_elm').slider({
            value: tmp_num
          });
        });

        this_elm.find('.btn_next').click(function () {
          var tmp_num = this_opts.viewer.number.current;
          tmp_num = Number(tmp_num);
          if (tmp_num < this_opts.viewer.number.maximum) {  //maximum
            tmp_num++;
            var tmp_disp_num = tmp_num + 1;
            this_elm.find('.disp_num').text(tmp_disp_num); //display number
          }
          //slider sync
          this_elm.find('.slider_elm').slider({
            value: tmp_num
          });
        });

        this_elm.find('.btn_prev,.btn_next').mousedown(function () {
          return false;
        });

      }

      //window info
      if (this_opts.viewer.elements.window.panel === true) {

        var the_win_controller = this_elm.find('.image_window_controller');
        //panel control
        the_win_controller.click(function (e) {
          e.stopPropagation();
        });

        //show panel
        this_elm.find('.image_window_controller_wrap').find('.btn_open').click(function (e) {
          this_elm.imageViewer('changeMode', 'window');
        });

        //hide panel
        this_elm.find('.image_window_controller_wrap').find('.btn_close').click(function (e) {
          this_elm.imageViewer('changeMode', 'pan');
        });

        //input
        this_elm.find('input').change(function () {
          var tmp_level = this_elm.find('.image_window_level').val();
          var tmp_width = this_elm.find('.image_window_width').val();

          tmp_level = tmp_level.replace(/[^0-9-]/g,'');
          tmp_width = tmp_width.replace(/[^0-9-]/g,'');

          if (tmp_level === '') {tmp_level = 0;}
          if (tmp_width === '') {tmp_width = 0;}

          tmp_level = Number(tmp_level);
          tmp_width = Number(tmp_width);

          this_obj.changeWindowInfo(tmp_level,tmp_width);
          this_obj._changeImageSrc();
          this_elm.trigger('onWindowInfoChange');
        });

        //preset
        the_win_controller.find('.image_window_preset_select').change(function () {
          var tmp_value = $(this).val();
          if (tmp_value !== 'blank') {
            var tmp_level = tmp_value.split(',')[0].replace(/\D/,'');
            var tmp_width = tmp_value.split(',')[1].replace(/\D/,'');

            tmp_level = Number(tmp_level);
            tmp_width = Number(tmp_width);

            this_obj.changeWindowInfo(tmp_level,tmp_width);
            this_obj._changeImageSrc();
          }
          this_elm.trigger('onWindowInfoChange');
        });

      }//window info


      //zoom in-out button
      if (this_opts.viewer.elements.zoom.active === true) {

        this_elm.find('.ico_detail_sprite_resize_large,.ico_detail_sprite_resize_short').click(function () {
          this_elm.imageViewer('changeMode', 'pan');
          if (this_opts.viewer.position.zoom >= 32 && 0.1 >= this_opts.viewer.position.zoom) {
            return false;
          }

          var new_zoom_value = 0.5;
          if ($(this).hasClass('ico_detail_sprite_resize_large')) {
            //zoom in mode

            if (this_opts.viewer.position.zoom < 1) {
              new_zoom_value = 0.1;
            }
            new_zoom_value = this_opts.viewer.position.zoom + new_zoom_value;
            if (new_zoom_value > 32) {
              new_zoom_value = 32;
            }
            new_zoom_value = Math.ceil(new_zoom_value * 10) / 10;

          } else if ($(this).hasClass('ico_detail_sprite_resize_short')) {
            //zoom out mode

            if (this_opts.viewer.position.zoom <= 1) {
              new_zoom_value = 0.1;
            }

            new_zoom_value = this_opts.viewer.position.zoom - new_zoom_value;
            if (new_zoom_value < 0.1) {
              new_zoom_value = 0.1;
            }
            new_zoom_value = Math.floor(new_zoom_value * 10) / 10;

          }
          this_obj.changeZoom(new_zoom_value);

          //sync some lines
          this_obj._changeImageSrc();

        }).mousedown(function () {
          return false;
        });
      }//zoom function set

    },//setEvents



    setObliqueResponse: function (insert_Object) {

      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;
      var position_params = this_opts.viewer.position;

      var before_position = {};
      before_position = $.extend(true,before_position,position_params);

      this_opts.viewer.voxel.x = position_params.ow = Number(insert_Object.Pixel_Columns);
      this_opts.viewer.voxel.y = position_params.oh = Number(insert_Object.Pixel_Rows);
      this_opts.viewer.voxel.voxel_x = this_opts.viewer.voxel.voxel_y = Number(insert_Object.Pixel_Size);

      position_params.dw = this_opts.viewer.voxel.x * position_params.zoom;
      position_params.dh = this_opts.viewer.voxel.y * position_params.zoom;

      var guide_x = insert_Object.Center.split(',')[0];
      var guide_y = insert_Object.Center.split(',')[1];

      var guide_horizontal = this_obj.getGuide('horizontal');
      var guide_vertical =  this_obj.getGuide('vertical');

      before_position.guide_x = guide_horizontal.number;
      before_position.guide_y = guide_vertical.number;

      guide_horizontal.number = Number(guide_x);
      guide_vertical.number = Number(guide_y);

      var tmp_x = before_position.dx + before_position.guide_x * before_position.dw / before_position.ow;
      position_params.dx =  tmp_x - guide_x * (position_params.dw / position_params.ow);

      var tmp_y = before_position.dy + before_position.guide_y * before_position.dh / before_position.oh;
      position_params.dy =  tmp_y - guide_y * (position_params.dh / position_params.oh);

    },//setObliqueResponse



    syncVoxel: function () {

      //update voxel & guide & measure
      var this_obj = this;
      var this_elm = this.element;
      var this_opts = this.options;

      this_obj._clearCanvas();
      this_obj.drawGuide();

      if (typeof this_opts.viewer.rotate.visible !== 'undefined' && this_opts.viewer.rotate.visible === true) {
        this_obj.drawRotate();
      }

      this_obj._createGuideHall();

      //get all position for Drawing of all Labels of all Seies.
      for (var i = this_opts.container.data.series.length - 1; i >= 0; i--) {
        var tmp_the_series = this_opts.container.data.series[i];

        //display only labels of current-active-Series
        if (tmp_the_series.id === this_opts.viewer.activeSeriesId) {
          for (var j = tmp_the_series.label.length - 1; j >= 0; j--) {
            var tmp_the_label = tmp_the_series.label[j];
            var tmp_array = this_opts.container.returnSlice(
              tmp_the_series.id,
              tmp_the_label.id,
              this_opts.viewer.orientation,
              this_opts.viewer.number.current
           );

            var target_label = this_obj.getLabelObjectById(tmp_the_label.id, tmp_the_series.id);
            if (typeof target_label !== 'undefined' && tmp_array.length > 0 && target_label.visible === true) {
              this_obj.drawLabel(tmp_the_series.id,tmp_the_label.id,tmp_array, target_label.rgba);
            }
          }
        }
      }
    } //syncVoxel
  });

})(jQuery);