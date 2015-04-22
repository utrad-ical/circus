$(function () {

  // Temporarily changes the color theme
  var color_select = $('#btn_area .color_select');
  color_select.change(function () {
    var mode = color_select.filter(':checked').val();
    $('body').removeClass('mode_white mode_black')
      .addClass(mode == 1 ? 'mode_black' : 'mode_white');
  });

  /* Run jQuery UI widgets */

  // datepicker
  if ($('.datepicker').length > 0) {
    $('.datepicker').datepicker({
      dateFormat: "yy/mm/dd"
    });
  }

  // droppable area
  if ($('.droppable_area').length > 0) {

    jQuery.event.props.push('dataTransfer');
    $('.droppable_area').each(function () {

      var droppable_area = $(this);
      var the_form = $(this).closest('form');
      var input_elm = $(this).find('.upload_file_input_elm');

      // ファイル選択フォームからの入力
      input_elm.bind("change", function () {
        // 選択されたファイル情報を取得
        var files = this.files;

        // アップロード処理
        uploadAjax(files);
      });

      // ドラッグドロップからの入力
      droppable_area.bind("drop", function (event) {
        event.stopPropagation();
        event.preventDefault();

        var dt = event.dataTransfer;
        var ajax_files = dt.files[0];
        var the_url = the_form.attr('action');
        uploadAjax(the_url, ajax_files);

      }).bind("dragenter dragover", false);

    });

  }

  // UI multiple select
  if ($('.multi_select').length > 0) {
	  if (typeof multi_selected_item !== undefined) {
    	$('.multi_select').find('option').each(function(){
    		if ($.inArray($(this).val(), multi_selected_item) !== -1) {
    			$(this).attr('selected', 'selected');
    		}
    	});
    }

    $('.multi_select').not('.active').multiselect({
      header: false,
      noneSelectedText: '(all)',
      selectedList: 10
    }).addClass('active');
  }

  // UI sortable
  if ($('.ui-sortable').length > 0) {
	  $('.ui-sortable').sortable({
		  axis: "y"
	  });
  }

});

//ファイルアップロード時ajax
var uploadAjax = function (ajax_url, files) {

  var fd = new FormData();// FormData オブジェクトを用意

  // ファイル情報を追加する
  for (var i = 0; i < files.length; i++) {
    fd.append("files", files[i]);
  }

  alert('本来はここでAjax');	//開発用,本来はこのアラートはない

  // XHR で送信
  $.ajax({
    url: ajax_url,
    type: "POST",
    data: fd,
    processData: false,
    contentType: false
  });
};

// Pads '0' at the left of the given string
var zeroFormat = function (input, width) {
  var n = String(input).length;
  if (width > n) {
    return (new Array(width - n + 1)).join(0) + input;
  } else {
    return input;
  }
};


var setHiddenParams = function (parent_id, elm_name, val) {
	var elm = $('#'+parent_id).find("input[name='"+elm_name+"']");

	if (!elm[0]) {
		elm = $("<input>", {type:"hidden", name:elm_name, value:val});
		$('#'+parent_id).append(elm);
	} else {
		$('#'+parent_id).find("input[name='"+elm_name+"']").val(val);
	}
};