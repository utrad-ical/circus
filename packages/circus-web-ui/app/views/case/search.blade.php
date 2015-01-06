@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function() {
		// Initialization parameter
		var keys = {{$detail_search_settings}};
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
			$.ajax({
				url: "{{asset('/case/save_search')}}",
				type: 'POST',
				data:setAjaxSearchVal("btnSave"),
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
			//Ajax
			var target_elm = $('#result_case_list');
			var btnName = arguments[1] ? arguments[1] : "btnSearch";
			var json_data = setAjaxSearchVal(btnName);
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
			return false;
		});

		//Ajax通信用のデータを作成する
		function setAjaxSearchVal(btnName) {
			var form_data = $('#form_search').serializeArray();
			//プロジェクトIDの条件生成
			var project_id_ary = [];
			for (var i = 0; i < form_data.length; i++) {
				if (form_data[i]["name"] == "project") {
					project_id_ary.push(form_data[i]["value"]);
					delete form_data[i];
				}
			}
			//検索モードを取得
			var search_mode = $('#search_mode').val();
			var tmp_ary_data = [];

			var tmp_project_data = {"name":"project", "value" : JSON.stringify(project_id_ary)};
			var tmp_action_btn_data = {"name":btnName, "value":btnName};
			var tmp_search_mode_data = {"name":"search_mode", "value":search_mode};

			//詳細検索
			if (search_mode) {
				console.log("詳細検索");
				var mongo_val = filter.filtereditor('exportMongo');
				//var mongo_val = filter.filtereditor('option', 'filter');
				var tmp_mongo_data = {"name":"mongo_data","value" : JSON.stringify(mongo_val)};
				tmp_ary_data= [tmp_mongo_data, tmp_project_data,tmp_action_btn_data,tmp_search_mode_data];
			} else {
			//簡易検索
				console.log("簡易検索");
				tmp_ary_data = [tmp_project_data,tmp_action_btn_data,tmp_search_mode_data];
			}
			var tmp_data = $.extend(true,form_data, tmp_ary_data);
			return tmp_data;
		}

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
						{{Form::hidden('search_mode', isset($inputs['search_mode']) ? $inputs['search_mode'] : 0, array('id' => 'search_mode'))}}
						<table class="common_table al_l mar_b_10">
							<colgroup>
								<col width="15%">
								<col width="35%">
								<col width="15%">
								<col width="35%">
							</colgroup>
							<tr>
								<th>project ID</th>
								<td colspan="3">
									{{Form::select('project', $project_list, isset($inputs['project']) ? $inputs['project'] : null, array('class' => 'multi_select', 'multiple' => 'multiple'))}}
								</td>
							</tr>
						</table>
						<div id="easy_search">
							<table class="common_table al_l mar_b_10">
								<tr>
									<th>Case ID</th>
									<td>{{Form::text('caseID', isset($inputs['caseID']) ? $inputs['caseID'] : '', array('class' => 'common_input_text w_200'))}}</td>
									<th>Patient ID</th>
									<td>{{Form::text('patientID', isset($inputs['patientID']) ? $inputs['patientID'] : '', array('class' => 'common_input_text w_200'))}}</td>
								</tr>
								<tr>
									<th>Patient Name</th>
									<td>{{Form::text('patientName', isset($inputs['patientName']) ? $inputs['patientName'] : '', array('class' => 'common_input_text w_200'))}}</td>
									<th>Create Date</th>
									<td>{{Form::text('createDate', isset($inputs['createDate']) ? $inputs['createDate'] : '', array('class' => 'common_input_text w_200 datepicker'))}}</td>
								</tr>
								<tr>
									<th>Update Date</th>
									<td>{{Form::text('updateDate', isset($inputs['updateDate']) ? $inputs['updateDate'] : '', array('class' => 'common_input_text w_200 datepicker'))}}</td>
									<th>Case Date</th>
									<td>{{Form::text('caseDate', isset($inputs['caseDate']) ? $inputs['caseDate'] : '', array('class' => 'common_input_text w_200 datepicker'))}}</td>
								</tr>
							</table>
						</div>
						<!--
						{{Form::button('Show More Options', array('class' => 'common_btn mar_b_10', 'onClick' => "$('#search_condition').toggleClass('hidden');"))}}
						-->
						{{Form::button('Show More Options', array('id' => 'search_detail', 'class' => 'common_btn mar_b_10', 'onClick' => "more_search(1);"))}}
						{{Form::button('Hidden More Options', array('id' => 'search_easy', 'class' => 'common_btn mar_b_10', 'onClick' => "more_search(0);", 'style' => "display:none;"))}}
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
			@include('case.case')
		</div>
	</div>
@include('common.navi')
</div>
<div class="clear">&nbsp;</div>
@stop
@include('common.footer')