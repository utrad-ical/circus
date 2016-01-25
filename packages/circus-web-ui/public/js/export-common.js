var busy = function(bool) {
	if (bool) $('#message').hide();
	$('#frm_export .common_btn, #frm_export input:file').prop('disabled', bool);
}

var exportRun = function (export_url, validate_flag) {
	if (!isExportRun(validate_flag))
		return;

	var export_data = $('#frm_export').serializeArray();

	var post_data = {};
	$.each(export_data, function(key, val) {
		if(val.name == 'labels[]') {
			if(post_data['labels'] == undefined) {
				post_data['labels'] = [val.value];
			} else {
				post_data['labels'].push(val.value);
			}
		} else {
			post_data[val.name] = val.value;
		}
	});

	busy(true);

	api("",{
		url: export_url,
		type: 'post',
		data: post_data,
		dataType: 'json',
		success: function (data) {
			$.taskWatcherDialog(data.taskID, {
				title: 'Creating Volume',
				finish: function() { busy(false); }
			});
		},
		complete:function(data) {
			var res = JSON.parse(data.responseText);
            if (!res.taskID) {
            	busy(false);
            	$('.btn_download').prop('disabled', false);
            }
		}
	});
}

var isExportRun = function(validate_flag) {
	$('.btn_download').prop('disabled', true);
	$('#export_err').empty();
	if (validate_flag) {
		if (!validateExport()) {
			showMessage('Please select at least one label.', true);
			$('.btn_download').prop('disabled', false);
			return false;
		}
	}
	return true;
}

$(function() {
	$('.btn_export_cancel').click(function() {
		$('.export_area').slideUp();
	});
});