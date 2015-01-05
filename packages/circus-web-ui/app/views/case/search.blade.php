@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function() {
		// Initialization parameter
		var keys = [
			{
	//			key: 'name',
				key: 'detail_patient_name',
				label: 'Patient name',
				type: 'text',
				spec: {
					default: 'Sample Name'
				}
			},
			{
	//			key: 'age',
				key: 'detail_patient_age',
				label: 'Patient age',
				type: 'number'
			},
			{
	//			key: 'modality',
				key: 'detail_modality',
				label: 'Modality',
				type: 'select',
				spec: {
					options: ['MR', 'CT', 'PT', 'CR', 'XR']
				}
			},
			{
	//			key: 'birthday',
				key: 'detail_birthday',
				label: 'Birthday',
				type: 'date'
			}
		];
		var filter = $('#search_condition')
		.filtereditor({keys: keys})
		.on('filterchange', function () {
			var data = filter.filtereditor('option', 'filter');
			var node = JSON.stringify(data, null, '  ');
			$('#json_value').val(node);
			console.debug(data);
		});
		filter.trigger('filterchange');

		//Save Settings押下時の処理
		$('#save-button').click(function(){
		//	var mongo_data = filter.filtereditor('exportMongo');
			$.ajax({
				url: "{{asset('/case/save_search')}}",
				type: 'POST',
				//data: form_data,
				data:setAjaxSearchVal(),
				dataType: 'json',
				error: function(){
					alert('I failed to communicate.');
				},
				success: function(res){
					alert(res.response);
				}
			});
			return false;
		});

		$('#btn_submit').click(function(){
			/*
			Ajax
			var target_elm = $('#result_case_list');
			var btnName = arguments[1] ? arguments[1] : "btnSearch";
			var json_data = setAjaxSearchVal(btnName);
			//json_data[
			$.ajax({
				url: "{{asset('/case/search_result')}}",
				type: 'POST',
				data: json_data,
				dataType: 'json',
				error: function(){
					alert('I failed to communicate.');
				},
				success: function(res){
					target_elm.empty();
					target_elm.append(res.response);
				}
			});
			$('#temporaly_form').remove();
			*/
			var btnName = arguments[1] ? arguments[1] : "btnSearch";
			//$('#form_search').append("<input>", {type:"hidden", name:btnName, value:btnName});
			var elm = $("<input>", {type:"hidden", name:btnName, value:btnName});
			$('#form_search').append(elm);
			//var form_data = $('#form_search').serializeArray();
			$('#form_search').submit();
			return false;
		});

		function setAjaxSearchVal(btnName) {
			var form_data = $('#form_search').serializeArray();
			console.log("送信データ2");
			console.log(form_data);

			//プロジェクトIDの条件生成
			var project_id_ary = [];
			for (var i = 0; i < form_data.length; i++) {
				if (form_data[i]["name"] == "project") {
					project_id_ary.push(form_data[i]["value"]);
					delete form_data[i];
				}
			}
			//var mongo_val = filter.filtereditor('exportMongo');
			var mongo_val = filter.filtereditor('option', 'filter');
			var tmp_mongo_data = {"name":"mongo_data","value" : JSON.stringify(mongo_val)};
			console.log("Mongo");
			console.log(tmp_mongo_data);
			var tmp_project_data = {"name":"project", "value" : JSON.stringify(project_id_ary)};
			console.log("Project");
			console.log(tmp_project_data);
			var tmp_action_btn_data = {"name":btnName, "value":btnName};

			var tmp_ary_data = [tmp_mongo_data, tmp_project_data,tmp_action_btn_data];
			//var tmp_data = $.extend(true, form_data, tmp_ary_data);
			var tmp_data = $.extend(true,form_data, tmp_ary_data);
/*
			console.log("Mongoデータ1");
			console.log(tmp_mongo_data);

			console.log("送信データ3");
			console.log(tmp_data);
*/
			return tmp_data;
		};

		$('.change_select').change(function(){
			// Get the combo ID you want to change
			var change_select = $(this).attr('data-target-dom');
			// Get the value you want to selected
			var select_value = $("select[name='"+$(this).attr('name')+"']").val();
			// Change selected in the combo
			$('#'+change_select).find('option').each(function(){
				var this_num = $(this).val();
				if(this_num == select_value){
					$(this).attr('selected','selected');
				}
			});

			//Add a hidden element so do a search
			var sort = $("select[name='sort']").val();
			var disp = $("select[name='disp']").val();
			var sort_elm = $("<input>", {type:"hidden", name:"sort", value:sort});
			$('#form_search').append(sort_elm);
			var disp_elm = $("<input>", {type:"hidden", name:"disp", value:disp});
			$('#form_search').append(disp_elm);
			//Event firing
			$('#btn_submit').trigger('click');
		});

		$('.link_detail').click(function(){
			//Get the form ID to be sent
			console.log("呼ばれてはいる");
			$(this).closest('tr').find('.form_case_detail').submit();
			return false;
		});

		$('#btn_reset').click(function(){
			//Event firing
			$('#btn_submit').trigger('click', ["btnReset"]);
		});
	});
</script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Case Search</h1>
			<div class="search_form_wrap">
				<h2 class="con_ttl">Search Condition</h2>
				<div id="search_condition_outer">
					{{Form::open(['url' => '/case/search', 'method' => 'POST', 'class' => 'common_form', 'id' => 'form_search'])}}
						<table class="common_table al_l mar_b_10">
							<colgroup>
								<col width="15%">
								<col width="35%">
								<col width="15%">
								<col width="35%">
							</colgroup>
							<tr>
								<th>project ID</th>
								<td>
									{{Form::select('project', $project_list, isset($inputs['project']) ? $inputs['project'] : null, array('class' => 'multi_select', 'multiple' => 'multiple'))}}
								</td>
								<th>Case ID</th>
								<td>{{Form::text('caseID', isset($inputs['caseID']) ? $inputs['caseID'] : '', array('class' => 'common_input_text w_200'))}}</td>
							</tr>
							<tr>
								<th>Patient ID</th>
								<td>{{Form::text('patientID', isset($inputs['patientID']) ? $inputs['patientID'] : '', array('class' => 'common_input_text w_200'))}}</td>
								<th>Patient Name</th>
								<td>{{Form::text('patientName', isset($inputs['patientName']) ? $inputs['patientName'] : '', array('class' => 'common_input_text w_200'))}}</td>
							</tr>
							<tr>
								<th>Create Date</th>
								<td>{{Form::text('createDate', isset($inputs['createDate']) ? $inputs['createDate'] : '', array('class' => 'common_input_text w_200 datepicker'))}}</td>
								<th>Update Date</th>
								<td>{{Form::text('updateDate', isset($inputs['updateDate']) ? $inputs['updateDate'] : '', array('class' => 'common_input_text w_200 datepicker'))}}</td>
							</tr>
							<tr>
								<th>Case Date</th>
								<td colspan="3">{{Form::text('caseDate', isset($inputs['caseDate']) ? $inputs['caseDate'] : '', array('class' => 'common_input_text w_200 datepicker'))}}</td>
							</tr>
						</table>
						{{Form::button('Show More Options', array('class' => 'common_btn mar_b_10', 'onClick' => "$('#search_condition').toggleClass('hidden');"))}}
						<div id="search_condition" class="hidden">
						</div>
						<p class="submit_area">
							{{Form::button('Reset', array('class' => 'common_btn common_btn_green clearForm', 'type' => 'reset', 'id' => 'btn_reset', 'name' => 'btnReset'))}}
							{{Form::button('Search', array('class' => 'common_btn common_btn_gray', 'id' => 'btn_submit', 'type' => 'button', 'name' => 'btnSubmit'))}}
							{{Form::button('Save settings', array('class' => 'common_btn common_btn_gray', 'id' => 'save-button', 'type' => 'button', 'name' => 'btnSave'))}}
						</p>
					{{Form::close()}}
				</div>
			</div>
		</div>
		<div class="search_result pad_tb_5" id="result_case_list">
			<!-- @include('case.case') -->
			@if ($search_flg)
				<ul class="common_pager clearfix">
					{{$list_pager->links()}}
					<li class="pager_sort_order">
						{{Form::select('sort', Config::get('const.search_case_sort'), isset($inputs['sort']) ? $inputs['sort'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'sort_order_down', 'id' => 'sort_order_up'))}}
					</li>
					<li class="pager_disp_num">
						{{Form::select('disp', Config::get('const.search_display'), isset($inputs['disp']) ? $inputs['disp'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'display_num_down', 'id' => 'display_num_up'))}}
					</li>
				</ul>
				<table class="result_table common_table">
					<colgroup>
						<col width="20%">
						<col width="20%">
						<col width="20%">
						<col width="15%">
						<col width="18%">
						<col width="7%">
					</colgroup>
					<tr>
						<th>Case</th>
						<th>Project</th>
						<th>
							Patient Id<br>
							Patient Name
						</th>
						<th>Update Date</th>
						<th>Latest Revision</th>
						<th></th>
					</tr>
					@if (count($list) > 0)
						@foreach ($list as $rec)
							<tr>
								<td>{{$rec['incrementalID']}} - {{$rec['caseID']}}</td>
								<td>{{$rec['projectID']}} - {{$rec['projectName']}}</td>
								<td>
									{{$rec['patientID']}}
									<br>
									{{$rec['patientName']}}
								</td>
								<td>{{$rec['updateDate']}}</td>
								<td>
									<a href="" class="link_detail">
										{{$rec['latestDate']}}
										<br>{{$rec['creator']}}
									</a>
									{{Form::open(['url' => asset('/case/detail'), 'method' => 'post', 'class' => 'form_case_detail'])}}
										{{Form::hidden('caseID', $rec['caseID'])}}
										{{Form::hidden('mode', 'detail')}}
									{{Form::close()}}
								</td>
								<td class="al_c">
									{{HTML::link('', 'View', array('class' => 'link_detail common_btn'))}}
								</td>
							</tr>
						@endforeach
					@else
						<tr>
							<td colspan="6">Search results 0.</td>
						</tr>
					@endif
				</table>
				<ul class="common_pager clearfix">
					{{$list_pager->links()}}
					<li class="pager_sort_order">
						{{Form::select('sort', Config::get('const.search_case_sort'), isset($inputs['sort']) ? $inputs['sort'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'sort_order_up', 'id' => 'sort_order_down'))}}
					</li>
					<li class="pager_disp_num">
						{{Form::select('disp', Config::get('const.search_display'), isset($inputs['disp']) ? $inputs['disp'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'display_num_up', 'id' => 'display_num_down'))}}
					</li>
				</ul>
			@endif
		</div>
	</div>
@include('common.navi')
</div>
<div class="clear">&nbsp;</div>
@stop
@include('common.footer')