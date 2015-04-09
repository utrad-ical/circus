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
	$("#dialog").dialog({
		closeText:""
	});
}

var exportRun = function (export_url, validate_flag) {
	//エラーがあるのでExport処理を行わない
	if (!isExportRun(validate_flag))
		return;

	var export_data = $('#frm_export').serializeArray();
	$.ajax({
		url: export_url,
		type: 'post',
		data: export_data,
		dataType: 'json',
		async:true,
		xhr : function(){
        	XHR = $.ajaxSettings.xhr();
            XHR.addEventListener('progress',function(evt){
            	var percentComplete = parseInt(evt.loaded/evt.total*10000)/100;
            	$('#progressbar').progressbar({value:percentComplete});
	        })
       		return XHR;
      	},
		error: function () {
			closeDuringExportDialog('I failed to communicate.');
		},
		success: function (res) {
			closeDuringExportDialog();
			//create zip fail success
			if (res.status === "OK") {
				downloadVolume(res.response);
				return false;
			}
			//create zip file failed
			alert(res.message);
		}
	});
}

var isExportRun = function(validate_flag) {
	createDownloadDialog();
	$('.btn_download').addClass('disabled');

	$('#export_err').empty();

	if (validate_flag) {
		if (!validateExport()) {
			closeDuringExportDialog('Please select the label one or more .');
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