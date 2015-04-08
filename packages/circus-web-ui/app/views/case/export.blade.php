Export volume data (Series: <span id="exportSeriesUID"></span>, Revision: <span id="exportRevisionNo">{{{$revisionNo}}}</span>)
<hr>
{{Form::open(['url' => asset('case/export'), 'method' => 'post', 'id' => 'frm_export'])}}
	{{Form::hidden('caseID', $case_detail->caseID)}}
	{{Form::hidden('revisionNo', $revisionNo, array('class' => 'exportRevisionNo'))}}
	{{Form::hidden('seriesUID', '', array('class'=>'exportSeriesUID'))}}

	(Data type)
	<ul>
		<li>
			{{Form::radio('data_type', ClinicalCase::DATA_TYPE_ORIGINAL, $inputs['data_type'] == ClinicalCase::DATA_TYPE_ORIGINAL ? true : false, array('id' => 'data_type_original', 'class' => 'data_type'))}}
			{{Form::label('data_type_original', 'Original volume only')}}
		</li>
		<li>
			{{Form::radio('data_type', ClinicalCase::DATA_TYPE_LABEL, $inputs['data_type'] == ClinicalCase::DATA_TYPE_LABEL ? true : false, array('id' => 'data_type_label', 'class' => 'data_type'))}}
			{{Form::label('data_type_label', 'Labeled volume only')}}
		</li>
		<li>
			{{Form::radio('data_type', ClinicalCase::DATA_TYPE_ORIGINAL_LABEL, $inputs['data_type'] == ClinicalCase::DATA_TYPE_ORIGINAL_LABEL ? true : false, array('id' => 'data_type_both', 'class' => 'data_type'))}}
			{{Form::label('data_type_both', 'Original volume + Labeled volume')}}
		</li>
	</ul>

	<div class="input_form_area label_options_area">
		<h2 class="con_ttl">Label Options</h2>
		<table class="common_table mar_b_10"">
			<tr>
				<th>Type:</th>
				<td>
					<ul>
						<li>
							{{Form::radio('output_type', ClinicalCase::OUTPUT_TYPE_SEPARATE, $inputs['output_type'] == ClinicalCase::OUTPUT_TYPE_SEPARATE ? true : false, array('id' => 'output_type_separate'))}}
							{{Form::label('output_type_separate', 'Separated')}}
						</li>
						<li>
							{{Form::radio('output_type', ClinicalCase::OUTPUT_TYPE_COMBI, $inputs['output_type'] == ClinicalCase::OUTPUT_TYPE_COMBI ? true : false, array('id' => 'output_type_combi'))}}
							{{Form::label('output_type_combi', 'Combined')}}
						</li>
					</ul>
				</td>
			</tr>
			<tr>
				<td colspan="2">
					<div id="series_order_wrap" class="w_500">
						<ul class="ui-sortable disp_label_list">
						</ul>
					</div>
				</td>
			</tr>
		</table>
	</div>
	<div class="al_r">
		{{Form::button('Download', array('class' => 'common_btn al_r', 'id' => 'btnCaseDownload'))}}
		{{Form::button('Cancel', array('class' => 'common_btn al_r', 'id' => 'btnExportCancel'))}}
	</div>
	<span id="export_err" class="font_red"></span>
{{Form::close()}}
<div id="dialog" title="Downloading..." style="display:none;">
  <p>
      ダウンロードしています。<br>
      もうしばらくお待ちください。
  </p>
  <div id="progressbar"></div>
</div>
<form action="{{asset('case/download')}}" method="POST" id="frmDownload">
	<input type="hidden" name="file_name" value="">
	<input type="hidden" name="dir_name" value="">
</form>
<script>
//var fileTimer;
$(function(){
	$('#btnCaseDownload').click(function() {
		if($(this).hasClass('disabled') == false){
			$('#dialog').slideDown();
			$('#progressbar').progressbar();
			$("#dialog").dialog({
				closeText:""
			});
			$(this).addClass('disabled');

			$('#export_err').empty();
			var export_data_type = $('.data_type:checked').val();

			if (export_data_type == {{{ClinicalCase::DATA_TYPE_LABEL}}} ||
				export_data_type == {{{ClinicalCase::DATA_TYPE_ORIGINAL_LABEL}}}) {
				if ($('.export_labels:checked').length == 0) {
					closeDuringExportDialog('Please select the label one or more .');
					return false;
				}
			}
			var export_data = $('#frm_export').serializeArray();
			$.ajax({
				url: "{{{asset('case/export')}}}",
				type: 'post',
				data: export_data,//送信データ
				dataType: 'json',
				xhr : function(){
		        	XHR = $.ajaxSettings.xhr();
		            XHR.addEventListener('progress',function(evt){
		            	var percentComplete = parseInt(evt.loaded/evt.total*10000)/100;
		            	$('#progressbar').progressbar({value:percentComplete});
			        })
		       		return XHR;
		      	},
				error: function () {
					closeDuringExportDialog('通信に失敗しました');
				},
				success: function (res) {
					closeDuringExportDialog();
					//create zip fail success
					if (res.status === "OK") {
						downloadVolume(res.response);
						return false;
					}
					//create zip file failed
					alert(res.messsage);
				}
			});
		}
		return false;
	});

	$('#btnExportCancel').click(function() {
		$('.export_area').slideUp();
	});

	$('.data_type').click(function() {
		var export_data_type = $('.data_type:checked').val();

		if (export_data_type == {{{ClinicalCase::DATA_TYPE_ORIGINAL}}})
			$('.label_options_area').hide();
		else
			$('.label_options_area').show();
	});
});

var downloadVolume = function(data) {
	var parent = $('#frmDownload');
	parent.find('input[name="file_name"]').val(data.file_name);
	parent.find('input[name="dir_name"]').val(data.dir_name);
	parent.submit();
}

var closeDuringExportDialog = function() {
	if (arguments[0])
		$('#export_err').append(arguments);
	$('#btnCaseDownload').removeClass('disabled');
	$("#dialog").dialog('close');
}
</script>
