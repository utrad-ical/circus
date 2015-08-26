@extends('common.layout')

@section('head')
{{HTML::style('css/jquery-ui.css')}}
{{HTML::script('js/jquery-ui.min.js')}}
{{HTML::script('js/jquery.formserializer.js')}}
@stop

@section('title')
Import Data
@stop

@section('content')
<div class="search_form_wrap mar_b_20">
	<h2 class="con_ttl">Import</h2>
	{{Form::open(array('url' => asset('share/register'), 'method' => 'post', 'files' => true))}}
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
<script>
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
$(function() {
	var tmpfile = document.getElementById('files');
	$('.upload_btn').click(function(){
		var form_data = $(this).closest('form').serializeArray();
		var fd = new FormData();
		fd.append("import_file", tmpfile.files[0]);
		for(var i = 0; i < form_data.length; i++) {
			fd.append(form_data[i].name, form_data[i].value);
		}

		busy(true);
	    var xhr = $.ajax({
	    	url:  $(this).closest('form').attr('action'),
			type: "post",
			data: fd,
			dataType: 'json',
			xhr: myXhr,
			processData: false,
			contentType: false,
			async:true,
	        success: function (data) {
	            $('#task-watcher').taskWatcher(data.taskID).on('finish', function() {
	                busy(false);
	            });
	        },
            error: function (data) {
                alert(data.responseJSON.errorMessage);
                busy(false);
            }
	    });
	});
});
</script>
@stop