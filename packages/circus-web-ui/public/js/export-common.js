//タスク管理用
var progress = $('#progress').progressbar().hide();
var progressLabel = $('#progress-label');

var busy = function(bool) {
	if (bool) $('#message').hide();
	$('#form .common_btn, #form input:file').prop('disabled', bool);
	progress.toggle(bool);
	progressLabel.text('');
}

var myXhr = function() {
	var xhr = new XMLHttpRequest();
	xhr.upload.addEventListener('progress', function (event) {
		if (event.lengthComputable) {
			var percentComplete = Math.round((event.loaded * 100) / event.total);
			progress.progressbar('value', percentComplete);
			if (event.loaded == event.total) {
				progress.hide();
				progressLabel.hide();
			}
		}
	}, false);
	return xhr;
}

var downloadVolume = function(data) {
	var parent = $('#frmDownload');
	parent.find('input[name="file_name"]').val(data.file_name);
	parent.find('input[name="dir_name"]').val(data.dir_name);
	parent.submit();
}

var closeDuringExportDialog = function() {
	if (arguments[0])
		$('#export_err').append(arguments[0]);
	$('.btn_download').removeClass('disabled');
	$("#dialog").dialog('close');
}


var createDownloadDialog = function() {
	$('#dialog').slideDown();
	$('#progressbar').progressbar({
		value:0
	});
	$('#dialog').dialog('open');
}


var exportRun = function (export_url, validate_flag) {
	//エラーがあるのでExport処理を行わない
	if (!isExportRun(validate_flag))
		return;

	var export_data = $('#frm_export').serializeArray();
	busy(true);
	var xhr = $.ajax({
		url: export_url,
		type: 'post',
		data: export_data,
		dataType: 'json',
		async:true,
		xhr: myXhr,
		success: function (data) {
			downloadVolume(data.response);
			$('#task-watcher').taskWatcher(data.taskID).on('finish', function() {
				closeDuringExportDialog();
				busy(false);
			});

		},
		error: function (data) {
			closeDuringExportDialog();
			alert(data.responseJSON.errorMessage);
			busy(false);

		}
	});
}

var isExportRun = function(validate_flag) {
	createDownloadDialog();
	$('.btn_download').addClass('disabled');

	$('#export_err').empty();

	if (validate_flag) {
		if (!validateExport()) {
			closeDuringExportDialog('Please select at least one label.');
			return false;
		}
	}
	return true;
}

$(function() {
	$('.btn_export_cancel').click(function() {
		$('.export_area').slideUp();
	});

	$("#dialog").dialog({
		autoOpen: false,
		closeOnEscape: false,
		closeText:"",
		//height:80,
		maxWidth:false
	});
});