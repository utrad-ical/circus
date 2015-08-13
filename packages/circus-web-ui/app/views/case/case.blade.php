@if ($search_flg)

@if ($export_mode)
	<script>
		var COOKIE_NAME = "exportCookie";
		$(document).ready(function(){

			if(typeof $.cookie(COOKIE_NAME) === "undefined"){
				var first_array = [];
				$.cookie(COOKIE_NAME , first_array , { expires: 1 });
			}
			var export_array = [];

			$(".all_check_parent").click(function () {
				if($(this).prop('checked')){
					// チェックが入れられた場合に、表示されている全てをクッキーに追加
					var multiNums = [];
					$(".export_case").each(function(){
						multiNums.push($(this).val());
						$(this).attr('checked','checked');
					});
					for(i = 0; i < multiNums.length; i++){
						if($.inArray(multiNums[i] , export_array) == -1){
							export_array.push(multiNums[i]);
							$.cookie(COOKIE_NAME , export_array.join("_") , { expires: 1 });
						}
					}

					$.cookie(COOKIE_NAME , export_array.join("_"));
				} else {
					// チェックが外された場合に、表示されている全てをクッキーから削除
					var multiNums = [];
					$(".export_case").each(function(){
						multiNums.push($(this).val());
						$(this).removeAttr('checked');
					});
					for(i = 0; i < multiNums.length; i++){
						if($.inArray(multiNums[i] , export_array) != -1){
							export_array.splice($.inArray(multiNums[i] , export_array) , 1);
							$.cookie(COOKIE_NAME , export_array.join("_") , { expires: 1 });
						}
					}
				}
			});

			$(".export_case").click(function () {
				var target_number = $(this).val();
				var num_idx = $.inArray(target_number , export_array);

				if($(this).prop('checked')){
					// チェックが入れられた場合に、Export対象としてクッキーに追加
					if(num_idx == -1){
						export_array.push(target_number);
						$.cookie(COOKIE_NAME , export_array.join("_") , { expires: 1 });
					}

				} else {
					// チェックが外された場合に、Export対象外としてクッキーから削除
					if(num_idx != -1){
						export_array.splice(num_idx , 1);
						$.cookie(COOKIE_NAME , export_array.join("_") , { expires: 1 });
					}
				}
			});

			$("#dialog").dialog({
				autoOpen: false,
				closeOnEscape: false,
				closeText:"",
				//height:80,
				width:500,
				maxwidth:false,
				modal:true
			});
		});
		var closeExportOptionDialog = function(error) {

			$("#dialog").dialog('close');
			$('#export_err').append(error);
			//ボタンEnableにする
			$('.btn_export').removeClass('disabled');

		}


		var createExportOptionDialog = function() {
			$('#dialog').slideDown();
			$('#progressbar').progressbar({
				value:0
			});
			$('#dialog').dialog('open');
		}

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
		var validateExport = function() {
			var export_type = $('.frm_share_export').find('input[name="export_type"]').val();

			var COOKIE_NAME = "exportCookie";

			var tmpCookie = $.cookie(COOKIE_NAME);
			var len = tmpCookie.length;
			if (len == 0)
				return false;

			return true;
		}
		var validateOptExport = function() {
			var error = [];

			var parent_form = $('.frm_share_export');
			//個人情報出力有無未選択
			var personal = parent_form.find('input[name=personal]:checked').val();
			if (personal != 0 && personal != 1)
				error.push('Please select the output existence of personal information .');
			//タグ未選択
			var tag = parent_form.find('.tags').val();
			if (tag == "undefined")
				error.push('Please select a tag .');
			return error;
		}

		var isExportRun = function(validate_flag) {
			$('.btn_export').addClass('disabled');

			$('#export_err').empty();

			if (validate_flag) {
				var export_type = $('.frm_share_export').find('input[name="export_type"]').val();

				if (export_type != 'btnExportAll' && !validateExport() ) {
					closeExportOptionDialog('Please select at least one case.');
					return false;
				}
				var error = validateOptExport();
				if (error.length > 0) {
					closeExportOptionDialog(error.join(','));
					return false;
				}
			}
			return true;
		}
		$(function(){
			$('.btn_export').click(function () {
				$('#export_err').empty();
				//全件出力でない場合はExport対象のケース選択Validateチェックを行う
				if ($(this).attr('name') != 'btnExportAll' && !validateExport()) {
					$('#export_err').append('Please the Export target of the case and select one or more .');
					return false;
				}
				createExportOptionDialog();
				$('.btn_export').addClass('disabled');
				$('.frm_share_export').find('input[name="export_type"]').val($(this).attr('name'));
				return false;
			});

			$('.ui-icon-closethick').click(function() {
				//ボタンEnableにする
				$('.btn_export').removeClass('disabled');
			});
		});
	</script>
	@include('case.export_dialog')
@endif
	@if (count($list) > 0)
		<ul class="common_pager clearfix">
			@if (isset($list_pager))
				{{$list_pager->links()}}
			@endif
			<li class="pager_sort_order_by">
				{{Form::select('order_by', Config::get('const.search_sort'), isset($inputs['order_by']) ? $inputs['order_by'] : '', array('class' => 'w_max change_select'))}}
			</li>
			<li class="pager_sort_order">
				{{Form::select('sort', Config::get('const.search_case_sort'), isset($inputs['sort']) ? $inputs['sort'] : '', array('class' => 'w_max change_select'))}}
			</li>
			<li class="pager_disp_num">
				{{Form::select('disp', Config::get('const.search_display'), isset($inputs['disp']) ? $inputs['disp'] : '', array('class' => 'w_max change_select'))}}
			</li>
		</ul>
	@endif
	<table class="result_table common_table">
		<colgroup>
		@if(Auth::user()->hasPrivilege(Group::PERSONAL_INFO_VIEW))
			@if ($export_mode)
				<col width="5%">
			@endif
			<col width="13%">
			<col width="10%">
			<col width="16%">
			<col width="{{{$export_mode ? 5 : 10}}}%">
			<col width="10%">
			<col width="13%">
			<col width="10%">
			<col width="9%">
			<col width="9%">
		@else
			@if ($export_mode)
				<col width="5%">
			@endif
			<col width="25%">
			<col width="25%">
			<col width="20%">
			<col width="5%">
			<col width="{{{$export_mode ? 20 : 25}}}%">
		@endif
		</colgroup>
		<tr>
			@if ($export_mode)
				<th>&nbsp;</th>
			@endif
			<th>projectName</th>
		@if(Auth::user()->hasPrivilege(Group::PERSONAL_INFO_VIEW))
			<th>patientID</th>
			<th>patientName</th>
			<th>age</th>
			<th>sex</th>
		@endif
			<th>update Date</th>
			<th>latest Revision</th>
			<th>tag</th>
			<th></th>
		</tr>
		@if (count($list) > 0)
			@foreach ($list as $rec)
				<tr>
					@if ($export_mode)
						<td>{{Form::checkbox('export_target[]', $rec->caseID, isset($inputs['export_target']) && array_search($rec->caseID, $inputs['export_target']) !== false ? true : false, array('class' => 'export_case'))}}</td>
					@endif
					<td>{{$rec->project->projectName}}</td>
				@if(Auth::user()->hasPrivilege(Group::PERSONAL_INFO_VIEW))
					<td>{{$rec->patientInfoCache['patientID']}}</td>
					<td>{{$rec->patientInfoCache['patientName']}}</td>
					<td>{{$rec->patientInfoCache['age']}}</td>
					<td>{{CommonHelper::getSex($rec->patientInfoCache['sex'])}}</td>
				@endif
					<td>{{date('Y/m/d', strtotime($rec->updateTime))}}</td>
					<td>
						<a href="" class="link_detail">
							{{date('Y/m/d('.CommonHelper::getWeekDay(date('w', $rec->latestRevision['date']->sec)).') H:i', $rec->latestRevision['date']->sec)}}
						</a>
						{{Form::open(['url' => asset('case/detail'), 'method' => 'post', 'class' => 'form_case_detail'])}}
							{{Form::hidden('caseID', $rec->caseID)}}
							{{Form::hidden('mode', 'detail')}}
						{{Form::close()}}
					</td>
					<td>
						{{-- */$tag_list = $rec->project->tags/* --}}
						@foreach ($rec->tags as $tag)
							<div class="tag" style="color: rgb(255, 255, 255); background-color: {{{$tag_list[$tag]['color']}}};">{{{$tag_list[$tag]["name"]}}}</div>
						@endforeach
					</td>
					<td class="al_c">
						{{HTML::link('', 'View', array('class' => 'link_detail common_btn'))}}
					</td>
				</tr>
			@endforeach
		@else
			<tr>
				@if ($export_mode && Auth::user()->hasPrivilege(Group::PERSONAL_INFO_VIEW))
				<td colspan="10">
				@elseif ($export_mode && !Auth::user()->hasPrivilege(Group::PERSONAL_INFO_VIEW))
				<td colspan="6">
				@elseif (!$export_mode && !Auth::user()->hasPrivilege(Group::PERSONAL_INFO_VIEW))
				<td colspan="5">
				@else
				<td colspan="9">
				@endif
					Search results 0.
				</td>
			</tr>
		@endif
	</table>
	<script>
		$(function() {
			$('.link_detail').click(function(){
				//Get the form ID to be sent
				$(this).closest('tr').find('.form_case_detail').submit();
				return false;
			});

			$('.change_select').change(function(){
				//Add a hidden element so do a search
				var sort = $("select[name='sort']").val();
				var disp = $("select[name='disp']").val();
				var order_by = $("select[name='order_by']").val();

				//display_num または Sort Order指定時は検索は行わない
				if (sort.length && disp.length) {
					setHiddenParams('form_case_search', 'sort', sort);
					setHiddenParams('form_case_search', 'disp', disp);
					setHiddenParams('form_case_search', 'order_by', order_by);
					//Event firing
					$('#btn_submit').trigger('click');
				}
				return false;
			});

			$('.pager_btn').find('a').click(function() {
				$.ajax({
					url: $(this).attr('href'),
					type: 'GET',
					dataType: 'json',
					error: function(){
						alert('I failed to communicate.');
					},
					success: function(res){
						$('#result_case_list').empty();
						$('#result_case_list').append(res.response);
					}
				});
				return false;
			});
		});
	</script>
@endif
