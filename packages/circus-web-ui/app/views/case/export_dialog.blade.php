<div id="dialog" title="Setting export options" style="display: none;">
	<p class="mar_10">
		{{Form::open(array('url' => asset('share/export'), 'method' => 'post', 'class' => 'frm_share_export'))}}
			{{Form::hidden('export_type', '')}}
			<table class="common_table">
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
					<th>Tag</th>
					<td>
						<!-- TODO::ここにプロジェクトで設定されているタグコンボ -->
						<select name="tag">
							<option value="">---</option>
							<option value="final">final</option>
							<option value="draft">draft</option>
							<option value="needsfix">needsfix</option>
							<option value="exported_to_institute_B">exported_to_institute_B</option>
							<option value="imported_from_institute_B">imported_from_institute_B</option>
						</select>
					</td>
				</tr>
			</table>
			<p class="submit_area">
				{{Form::button('Export', array('class' => 'common_btn common_btn_gray', 'id' => 'btn_export_case', 'type' => 'button', 'name' => 'btnExport'))}}
			</p>

		{{Form::close()}}
	</p>
	<div id="progress"><div id="progress-label"></div></div>
	<div id="task-watcher"></div>
</div>

<span id="export_err" class="font_red"></span>
<script>


var exportRun = function (validate_flag) {
	//エラーがあるのでExport処理を行わない
	if (!isExportRun(validate_flag))
		return;

	var parent_form = $('.frm_share_export');
	var personal = parent_form.find('input[name="personal"]:checked').val();
	var tag = parent_form.find('select[name="tag"] option:selected').val();
	var export_type = parent_form.find('input[name="export_type"]').val();

	var export_data = {"cases":$.cookie(COOKIE_NAME), "personal":personal,"tags":tag, "export_type":export_type};
	busy(true);
	var xhr = $.ajax({
		url: "{{{asset('share/export')}}}",
		type: 'post',
		data: export_data,
		dataType: 'json',
		async:true,
		xhr: myXhr,
		success: function (data) {
			$('#task-watcher').taskWatcher(data.taskID).on('finish', function() {
				downloadVolume(data.response);
				closeExportOptionDialog();
				busy(false);
			});
		},
		error: function (data) {
			closeExportOptionDialog();
			alert(data.responseJSON.errorMessage);
			busy(false);
		}
	});
}
$(function(){
	$('#btn_export_case').click(function(){
		//ここに実行処理
		exportRun(true);
		return false;
	});
});
</script>