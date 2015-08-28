@extends('common.layout')

@section('head')
{{HTML::style('css/jquery-ui.css')}}
{{HTML::script('js/jquery-ui.min.js')}}
{{HTML::script('js/jquery.formserializer.js')}}
{{HTML::script('js/jquery.multiselect.min.js')}}
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

<div id="dialog" title="Setting import tag options" style="display: none;">
    <p class="mar_10">
        {{Form::open(array('url' => asset('case/save_tags'), 'method' => 'post', 'class' => 'frm_share_tag'))}}
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
        {{Form::close()}}
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
		            $('.frm_share_tag').find('input[name="taskID"]').val(data.taskID);
		            $.ajax({
						url:"{{{asset('task')}}}"+"/"+data.taskID,
						dataType: 'json',
						error: function(){
							alert('I failed to communicate.');
						},
						success: function(res){
							taskData = res;
							if (taskData.logs[0]['result'] === false) {
								alert(res.logs['errorMsg']);
								return false;
							}
							var projectID = taskData.logs[0]['projectID'];
							$.ajax({
								url:"{{{asset('api/project')}}}"+"/"+projectID,
								dataType: 'json',
								error: function(){
									alert('I failed to communicate.');
								},
								success: function(res, status, xhr){
									if (xhr.status === 200) {
										$('.import_select_tags').empty();
										var import_tag_parent = $('.import_select_tags');
										$.each(res.tags, function(key, val) {
											var tag_opt = '<option value="'+key+'">'+val["name"]+'</option>';
											import_tag_parent.append(tag_opt);
										});
										refreshMultiTags(false);
										$('.tags_message').empty();
									} else {
										$('.tags_message').append(res.message);
									}
								}
							});
							createExportOptionDialog();
						}
					});
	                busy(false);
	            });
	        },
            error: function (data) {
                alert(data.responseJSON.errorMessage);
                busy(false);
            }
	    });
	});

	$('#btn_add_tag').click(function(){
		var form_data = $(this).closest('form').serializeArray();

		var tag_ary = new Array();
	    $('.import_select_tags option:selected').each(function(){
	        tag_ary.push($(this).val());
	    });

		var tag_set_flg = false;
		form_data.some(function(v, i) {
			if(v.name=="tags") {
				form_data[i].value = JSON.stringify(tag_ary);
				tag_set_flg = true;
			}
		});

		if (!tag_set_flg) {
			var tmp_tag_ary = new Array();
			tmp_tag_ary["name"] = "tags";
			tmp_tag_ary["value"] = JSON.stringify(tag_ary);
			form_data.push(tmp_tag_ary);
		}
		form_data.push({"name":"caseID", "value":taskData.logs[0].caseIds});
		$.ajax({
			url:  $(this).closest('form').attr('action'),
			type: "post",
			data: form_data,
			dataType: 'json',
			error: function(){
				alert('I failed to communicate.');
			},
			success: function(res, status, xhr){
				console.log(res);
			}
		});
	});
});
var refreshMultiTags = function(empty) {
	if (empty) {
		$('.import_select_tags').empty();
	}
	$('.import_select_tags').multiselect('refresh');
}
var closeExportOptionDialog = function(error) {
	$("#dialog").dialog('close');
	$('#export_err').append(error);
}
var createExportOptionDialog = function() {
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