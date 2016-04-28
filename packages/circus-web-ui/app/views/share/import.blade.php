@extends('common.layout')

@section('head')
{{HTML::script('js/jquery-ui.min.js')}}
{{HTML::script('js/jquery.formserializer.js')}}
{{HTML::script('js/jquery.multiselect.min.js')}}
{{HTML::script('js/case-tag.js')}}
@stop

@section('title')
Import Data
@stop

@section('content')
<div class="search_form_wrap mar_b_20">
	<h2 class="subsection_title">Import</h2>
	{{Form::open(array('url' => asset('share/register'), 'method' => 'post', 'files' => true, 'id' => 'frm_import'))}}
		<table class="common_table">
			<tr>
				<th>Import Data Source</th>
				<td>
					<div class="import_type_local">
						{{Form::radio('import_type', 'local', (!isset($inputs['import_type']) ||  $inputs['import_type'] === 'local') ? true : false, array('id' => 'import_type_local'))}}
		                {{Form::label('import_type_local', 'Local')}}
		                {{Form::file('import_file', array('id' => 'files'))}}
	                </div>

					<div class="import_type_url">
		                {{Form::radio('import_type', 'url', isset($inputs['import_type']) && $inputs['import_type'] === 'url' ? true : false, array('id' => 'import_type_url'))}}
		                {{Form::label('import_type_url', 'Remote Server Url')}}
						{{Form::text('import_url', '', array('class' => 'common_input_text'))}}
					</div>
				</td>
			</tr>
			<tr>
				<th>Personal Info</th>
				<td>
					{{Form::radio('personal', 1, (!isset($inputs['personal']) ||  $inputs['personal'] == 1) ? true : false, array('id' => 'personal_include'))}}
	                {{Form::label('personal_include', 'include')}}
	                {{Form::radio('personal', 0, isset($inputs['personal']) && $inputs['personal'] == 0 ? true : false, array('id' => 'personal_not_include'))}}
	                {{Form::label('personal_not_include', 'not include')}}
				</td>
			</tr>
			<tr>
				<th>Password</th>
				<td>
					{{Form::password('tgz_pass', array('class' => 'common_input_text'))}}
				</td>
			</tr>
			<tr>
				<th>Domain</th>
				<td>
					{{Form::select('domain', $domains, $default_domain, array('class' => 'select w_180 select_domain'))}}
				</td>
			</tr>
			<tr>
				<td colspan="2">
					<div class="submit_area">
						{{Form::button('Upload', array('class' => 'common_btn common_btn_gray upload_btn'))}}
					</div>
				</td>
			</tr>
		</table>
	{{Form::close()}}
</div>
<div class="clear">&nbsp;</div>
<div id="progress"><div id="progress-label"></div></div>
<div id="task-watcher"></div>
<p id="message" class="ui-state-highlight" style="display: none;"></p>
<p id="messages"></p>

<div id="dialog" title="Setting import tag options" style="display: none;">
    <p class="mar_10">
        <table class="common_table">
            <tr>
                <th>Tag</th>
                <td>
                    {{Form::select('tags', isset($tag_list) ? $tag_list : array(), null, array('class' => 'multi_select import_select_tags', 'multiple' => 'multiple'))}}
                </td>
            </tr>
        </table>
        <p class="submit_area">
            {{Form::button('Add tags', array('class' => 'common_btn common_btn_gray', 'id' => 'btn_add_tag', 'type' => 'button', 'name' => 'btnAddTag'))}}
        </p>
    </p>
</div>
<script>
//タスク管理用
var progress = $('#progress').progressbar().hide();
var progressLabel = $('#progress-label');
var taskData;

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
$(function() {
	var xhr;
	var tmpfile = document.getElementById('files');

	var deleteTask = function(taskID) {
		api("", {
			url:"{{{asset('delete/task')}}}"+"/"+taskID,
			dataType: 'json',
			method:'get',
			success: function(){
				console.log('success delete task '+taskID);
			}
		});
	}
	var getProjectTags = function(projectID) {
		tag.fetchProjectTags(projectID, function(tags) {
			$('.import_select_tags').empty();
			var import_tag_parent = $('.import_select_tags');
			tags.forEach(function (tag) {
				var option = $('<option>').val(tag.name).text(tag.name);
				import_tag_parent.append(option);
			});
			refreshMultiTags(false);
			createImportOptionDialog();
		});
	}
	var abortConnection = function() {
		if (arguments[0])
			showMessage(arguments[0]);
		xhr.abort();
	}
	var errorConnection = function(message) {
		$('.upload_btn').removeClass('disabled');
		abortConnection(message);
	}
	$('.upload_btn').click(function(){
		if($('.upload_btn').hasClass('disabled') == false){
			importRun();
		}
	});
	var setTagOption = function(taskID) {
		xhr = api("",{
			url:"{{{asset('task')}}}"+"/"+taskID,
			method: 'get',
			dataType: 'json',
			success: function(res){
				taskData = res;
				deleteTask(res.taskID);
				if (!res.logs || res.logs[0]['result'] === false) {
					errorConnection('Failed Acquisition of the task log information.');
				} else {
					getProjectTags(res.logs[0]['projectID']);
					abortConnection();
				}
			}
		});
	}
	var importRun = function() {
		$('.upload_btn').addClass('disabled');
		//Uploadボタンを押下されたら直前の情報は不要なため、初期化する
		taskData = Array();

		var form_data = $('#frm_import').closest('form').serializeArray();
		var fd = new FormData();
		fd.append("import_file", tmpfile.files[0]);
		for(var i = 0; i < form_data.length; i++) {
			fd.append(form_data[i].name, form_data[i].value);
		}

		busy(true);

		//TODO::ajax→api
	    xhr = $.ajax({
	    	url:  $('#frm_import').closest('form').attr('action'),
			type: "post",
			data: fd,
			dataType: 'json',
			xhr: myXhr,
			processData: false,
			contentType: false,
			cache:false,
			async:true,
	        success: function (res) {
	            $('#task-watcher').taskWatcher(res.taskID).on('finish', function() {
		            busy(false);
					abortConnection();
					setTagOption(res.taskID);
	            });
	        },
            error: function (data) {
	            console.log(data);
                errorConnection(data.responseJSON.errorMessage);
                busy(false);
            }
	    });
	    return false;
	}

	$('#btn_add_tag').click(function(){
		api('save_tags', {
			data: {
				caseID: taskData.logs[0].caseIds,
				mode: 'append',
				tags: $('.import_select_tags').val() || []
			}
		}).then(function(res, status, xhr){
			showMessage('Tags saved successfully.');
			closeImportOptionDialog();
		});
		return false;
	});
});
var refreshMultiTags = function(empty) {
	if (empty) {
		$('.import_select_tags').empty();
	}
	$('.import_select_tags').multiselect('refresh');
}
var closeImportOptionDialog = function(error) {
	$("#dialog").dialog('close');
	$('#export_err').append(error);
	$('.upload_btn').removeClass('disabled');
}
var createImportOptionDialog = function() {
	$('#dialog').slideDown();
	$('#progressbar').progressbar({
		value:0
	});
	$('#dialog').dialog('open');
}
$("#dialog").dialog({
	autoOpen: false,
	closeOnEscape: false,
	closeText:"",
	width:500,
	maxwidth:false,
	modal:true
});
</script>
@stop