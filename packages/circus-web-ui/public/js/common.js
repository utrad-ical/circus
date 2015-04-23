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