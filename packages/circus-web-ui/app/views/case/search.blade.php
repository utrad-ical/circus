@extends('common.layout')

@section('head')
{{HTML::style('css/jquery-ui.css')}}
{{HTML::style('css/jquery.flexforms.css')}}

{{HTML::script('js/jquery-ui.min.js')}}
{{HTML::script('js/jquery.multiselect.min.js')}}
{{HTML::script('js/jquery.formserializer.js')}}
{{HTML::script('js/case-tag.js')}}
{{HTML::script('js/jquery.flexforms.js')}}

@if (isset($inputs['mongo_search_data']))
<script>
	var detail_keys = {{$inputs['mongo_search_data']}};
	var filter_set_flag = false;
	var keys = {{$inputs['case_attributes']}};
</script>
@endif
<script>
	var filter = $('#search_condition').filtereditor();
	var multi_selected_item = {{$inputs['project']}};
	@if (isset($inputs['tags']))
		var multi_selected_tag = {{$inputs['tags']}};
		multi_selected_item = multi_selected_item.concat(multi_selected_tag);
	@endif

	var getSelectedProjectIds = function() {
		var selected_project_id;
		var selected_cnt = 0;
		var project_ids = $(".select_project option:selected");
		for (var i = 0; i < project_ids.length; i++) {
			if (project_ids[i].value !== '') {
				selected_project_id = project_ids[i].value;
				selected_cnt++;
			}
		}
		return {'cnt':selected_cnt, 'id':selected_project_id};
	}

	$(function() {
		// Initialization parameter
		if (typeof keys !== "undefined") {
			filter = $('#search_condition')
			.filtereditor({keys: keys})
			.on('filterchange', function () {
				var data;
				if (typeof detail_keys != 'undefined') {
					data = filter.filtereditor('option', 'filter', detail_keys);
				} else {
					data = filter.filtereditor('option', 'filter');
					var node = JSON.stringify(data, null, '');
				}
			});
			filter.trigger('filterchange');
		}

		//Save Settings depression during treatment
		$('#save-button').click(function(){
			var ret = prompt('Please display the save label name.', 'User set condition');
			if (ret == null){
				alert('Please display the save label name.');
			} else {
				sendAjax("{{asset('case/save_search')}}", setAjaxSearchVal("btnSave", {"name":"save_label","value":ret}));
			}
			return false;
		});

		$('#btn_submit').click(function(){
			@if ($export_mode)
				$('#export_err').empty();
				var select_projects = getSelectedProjectIds();
				if (select_projects['cnt'] !== 1) {
					$('#export_err').append('Please specify the project ');
					return false;
				}
			@endif
			//Ajax
			var target_elm = $('#result_case_list');
			var btnName = arguments[1] ? arguments[1] : "btnSearch";
			var sendData = setAjaxSearchVal(btnName);
			sendAjax("{{asset($prefix.'/search_result')}}", sendData, target_elm);
			$('#temporaly_form').remove();
			return false;
		});
		//I want to create a data for Ajax communication
		function setAjaxSearchVal(btnName) {
			$('#export_err').empty();
			var form_data = $('#form_case_search').serializeArray();
			//Condition generation of project ID
			var project_id_ary = new Array();
			$('.select_project option:selected').each(function(){
				if ($(this).val() !== '')
					project_id_ary.push($(this).val());
			});

			//Tag
			var tag_ary = new Array();
			$('.search_select_tags option:selected').each(function(){
				tag_ary.push($(this).val());
			});

			var project_set_flg = false;
			var tag_set_flg = false;
			form_data.some(function(v, i) {
				if(v.name=="project") {
					form_data[i].value = JSON.stringify(project_id_ary);
					project_set_flg = true;
				}
				if(v.name=="tags") {
					form_data[i].value = JSON.stringify(tag_ary);
					tag_set_flg = true;
				}
			});
			if (!project_set_flg) {
				var tmp_project_ary = new Array();
				tmp_project_ary["name"] = "project";
				tmp_project_ary["value"] = JSON.stringify(project_id_ary);
				form_data.push(tmp_project_ary);
			}
			if (!tag_set_flg) {
				var tmp_tag_ary = new Array();
				tmp_tag_ary["name"] = "tags";
				tmp_tag_ary["value"] = JSON.stringify(tag_ary);
				form_data.push(tmp_tag_ary);
			}

			//Get search mode
			var search_mode = $('#search_mode').val();
			var tmp_ary_data = [];
			var tmp_action_btn_data = {"name":btnName, "value":btnName};
			var tmp_search_mode_data = {"name":"search_mode", "value":search_mode};

			//Advanced Search
			if (search_mode == 1) {
				var mongo_val = filter.filtereditor('exportMongo');
				var tmp_mongo_data = {"name":"mongo_data","value" : JSON.stringify(mongo_val)};
				var mongo_search_val = filter.filtereditor('option', 'filter');
				var tmp_mongo_search_data = {"name":"mongo_search_data","value" : JSON.stringify(mongo_search_val)};
				tmp_ary_data= [tmp_mongo_data, tmp_action_btn_data,tmp_search_mode_data, tmp_mongo_search_data];

				$.each(form_data, function(key, val) {
					if (val["name"] == "sort" || val["name"] == "disp" || val["name"] == "project")
						tmp_ary_data.push(val);
				});
			} else {
				var tmp_data = [tmp_action_btn_data,tmp_search_mode_data];
				tmp_ary_data = $.extend(true,form_data, tmp_data);
			}

			//Option
			if (arguments[1]) {
				tmp_ary_data.push(arguments[1]);
			}
			return tmp_ary_data;
		}


		$('#btn_reset').click(function(){
			//Event firing
			$('#btn_submit').trigger('click', "btnReset");
			//初期化
			$('#form_case_search').find('select, :text').val('').end().find(':checked').prop('checked',false);
			$('.multi_select').multiselect('refresh');
		});
		//Ajax通信
		function sendAjax(post_url, post_data, target_elm) {
			$.ajax({
				url: post_url,
				type: 'POST',
				data: post_data,
				dataType: 'json',
				error: function(){
					alert('I failed to communicate.');
				},
				success: function(res){
					if (typeof target_elm != "undefined") {
						target_elm.empty();
						target_elm.append(res.response);
					} else {
						showMessage('Saved search criteria.');
					}
				}
			});
		}

		$('.select_project').change(function(){
			filter_set_flag = false;
			$('#search_condition').empty();
			var select_projects = getSelectedProjectIds();

			//選択されているプロジェクトが1つの場合のみプロジェクトに設定されているケースAttribute情報を取得する
			if (select_projects['cnt'] === 1) {
				var post_data = {'projectID':select_projects['id']};
				api("",
				{
					url : "{{{asset('get_case_attribute')}}}",
					type: 'POST',
					data: post_data,
					dataType: 'json',
					success: function(res){
						if (res.status === "OK") {
							var keys = res.case_attr;
							if (keys != "") {
								filter_set_flag = true;
								filter = $('#search_condition')
								.filtereditor({keys: keys})
								.on('filterchange', function () {
									var data;
									if (typeof detail_keys != 'undefined') {
										data = filter.filtereditor('option', 'filter', detail_keys);
									} else {
										data = filter.filtereditor('option', 'filter');
										var node = JSON.stringify(data, null, '');
									}
								});
								filter.trigger('filterchange');
							}
						} else {
							$('#search_condition').append(res.message);
						}
					}
				});

				tag.fetchProjectTags(select_projects.id, function(tags) {
					$('.search_select_tags').empty();
					$('.export_select_tags').empty();
					var search_parent = $('.search_select_tags');
					var export_parent = $('.export_select_tags');
					tags.forEach(function(tag) {
						var option = $('<option>').text(tag.name).val(tag.name);
						search_parent.append(option.clone());
						export_parent.append(option.clone());
					});
					refreshMultiTags(false);
					$('.tags_message').empty();
				});
			} else if (select_projects['cnt'] > 1) {
				$('#search_condition').append('Detail Search selection of the project can only when one .');
				$('.tags_message').append('Detail Search selection of the project can only when one .');
				refreshMultiTags(true);
			} else {
				$('#search_condition').append('Please specify the project .');
				$('.tags_message').append('Please specify the project .');
				refreshMultiTags(true);
			}
		});
	});

	var refreshMultiTags = function(empty) {
		if (empty) {
			$('.search_select_tags').empty();
			$('.export_select_tags').empty();
		}
		$('.search_select_tags').multiselect('refresh');
		$('.export_select_tags').multiselect('refresh');
	}

	function more_search(){
		//Various elements object available
		var search_mode = document.getElementById('search_mode');
		var more_inputs = $('#easy_search').find('input');
		var s_mode = $('#search_mode').val();

		//切替
		s_mode = s_mode == 1 ? 0 : 1;
		$('#search_detail').text(s_mode == 1 ? 'Hide More Options' : 'Show More Options');

		$('#search_condition').toggleClass('hidden');
		$('#easy_search').toggleClass('hidden');
		$('#search_mode').val(s_mode);
	}
</script>
@stop

@section('title')
{{{ucfirst($prefix)}}} Search
@stop

@section('content')
<div class="search_form_wrap">
	<h2 class="con_ttl">Search Condition</h2>
	<div id="search_condition_outer">
		{{Form::open(['url' => asset('$prefix/search'), 'method' => 'POST', 'class' => 'common_form', 'id' => 'form_case_search'])}}
			{{Form::hidden('search_mode', isset($inputs['search_mode']) ? $inputs['search_mode'] : 0, array('id' => 'search_mode'))}}
			<table class="common_table al_l mar_b_10">
				<colgroup>
					<col width="15%">
					<col width="35%">
					<col width="15%">
					<col width="35%">
				</colgroup>
				<tbody>
					<tr>
						<th>project ID</th>
						<td colspan="3">
							@if ($export_mode)
								{{Form::select('project', array_merge(array('' => '(all)'),$project_list), isset($inputs['project']) ? $inputs['project'][0] : null, array('class' => 'select_project common_input_text w_200'))}}
							@else
								{{Form::select('project', $project_list, isset($inputs['project']) ? $inputs['project'] : null, array('class' => 'multi_select select_project', 'multiple' => 'multiple'))}}
							@endif
						</td>
					</tr>
				</tbody>
			</table>
			@if (!isset($inputs['search_mode']) || (isset($inputs['search_mode']) && $inputs['search_mode'] == 0))
				<div id="easy_search">
			@else
				<div id="easy_search" class="hidden">
			@endif
				<table class="common_table al_l mar_b_10">
					<colgroup>
						<col width="15%">
						<col width="35%">
						<col width="15%">
						<col width="35%">
					</colgroup>
					<tbody>
						<tr>
							<th>Case ID</th>
							<td>
								{{Form::hidden('dummyID', isset($inputs['caseID']) ? $inputs['caseID'] : '')}}
								{{Form::text('caseID', isset($inputs['caseID']) ? $inputs['caseID'] : '', array('class' => 'common_input_text w_200'))}}
							</td>
						@if(Auth::user()->hasPrivilege(Group::PERSONAL_INFO_VIEW))
							<th>Patient ID</th>
							<td>{{Form::text('patientID', isset($inputs['patientID']) ? $inputs['patientID'] : '', array('class' => 'common_input_text w_200'))}}</td>
						</tr>
						<tr>
							<th>Patient Name</th>
							<td>{{Form::text('patientName', isset($inputs['patientName']) ? $inputs['patientName'] : '', array('class' => 'common_input_text w_200'))}}</td>
						@endif
							<th>Create Date</th>
							<td>{{Form::text('createDate', isset($inputs['createDate']) ? $inputs['createDate'] : '', array('class' => 'common_input_text w_200 datepicker'))}}</td>
						</tr>
						<tr>
							<th>Update Date</th>
							<td>{{Form::text('updateDate', isset($inputs['updateDate']) ? $inputs['updateDate'] : '', array('class' => 'common_input_text w_200 datepicker'))}}</td>
							<th>Case Date</th>
							<td>{{Form::text('caseDate', isset($inputs['caseDate']) ? $inputs['caseDate'] : '', array('class' => 'common_input_text w_200 datepicker'))}}</td>
						</tr>
						<tr>
							<th>Tags</th>
							<td colspan="3">
								{{Form::select('tags', isset($tag_list) ? $tag_list : array(), isset($inputs['tags']) ? $inputs['tags'] : null, array('class' => 'multi_select search_select_tags', 'multiple' => 'multiple'))}}
								<span class="tags_message">
									@if(!isset($tag_list))
										Please specify the project .
									@endif
								</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			{{Form::button($inputs['search_mode'] == 0 ? 'Show More Options' : 'Hidden More Options', array('id' => 'search_detail', 'class' => 'common_btn mar_b_10', 'onClick' => "more_search();"))}}
		{{Form::close()}}
		@if (isset($inputs['search_mode']) && $inputs['search_mode'] == 1)
			<div id="search_condition">
		@else
			<div id="search_condition" class="hidden">
		@endif
		</div>
		<p class="submit_area">
			{{Form::button('Reset', array('class' => 'common_btn common_btn_green clearForm', 'type' => 'reset', 'id' => 'btn_reset', 'name' => 'btnReset'))}}
			{{Form::button('Search', array('class' => 'common_btn common_btn_gray', 'id' => 'btn_submit', 'type' => 'button', 'name' => 'btnSubmit'))}}
			{{Form::button('Save settings', array('class' => 'common_btn common_btn_gray', 'id' => 'save-button', 'type' => 'button', 'name' => 'btnSave'))}}
			@if ($export_mode)
				<p class="al_r">
					{{Form::button('Export All Results', array('class' => 'common_btn common_btn_gray btn_export', 'name' => 'btnExportAll'))}}
					{{Form::button('Export Selected Results', array('class' => 'common_btn common_btn_gray btn_export', 'name' => 'btnExportSelect'))}}
				</p>
			@endif
		</p>
	</div>
</div>
{{Form::open(['url' => asset('transfer'), 'method' => 'post', 'id' => 'frmDownload'])}}
{{Form::close()}}
<span id="export_err" class="font_red"></span>
<div id="messages"></div>
<div class="search_result pad_tb_5" id="result_case_list">
@include('case.case')
@include('case.export_dialog')
</div>
<script>
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