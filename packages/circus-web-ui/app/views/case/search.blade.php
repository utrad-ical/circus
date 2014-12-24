@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function() {
		// Initialization parameter
		var options = {
		  keys: [{value: "modality"}, {value:"manufacturer"}, {value: "model_name"}]
		};

		// Create editor
		var filter = $('#search_condition').filtereditor(options)
		.on('filterchange', function() {
			var data = filter.filtereditor('option', 'filter');
			$('#json').val(JSON.stringify(data, null, '  '));
			var mongo = filter.filtereditor('createMongoCondFromElement');
			$('#mongo').val(JSON.stringify(mongo, null, '  '));
		});
		filter.trigger('filterchange');

		// Textarea to Editor (write)
		$('#write').on('click', function() {
		  var obj = JSON.parse($('#json').val());
		  if (!obj) { alert('Invalid'); return; }
		  filter.filtereditor('option', 'filter', obj);
		});

		$('#btn_submit').click(function(){
			console.log(arguments);
			var btnName = arguments[1] ? arguments[1] : "btnSearch";
			console.log("btnName::");
			console.log(btnName);
			var elm = $("<input>", {type:"hidden", name:btnName, value:btnName});
			$('#form_search').append(elm);

			$('body').append('<form id="temporaly_form" class="hidden"></form>');
			$('#search_condition_outer').find('input,select,textarea').clone().appendTo('#temporaly_form');

			var form_data	=	$('#temporaly_form').serializeArray();
			$('#temporaly_form').remove();

			$('#form_search').submit();
		});

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
								{{Form::select('project[]', $project_list, isset($inputs['project']) ? $inputs['project'] : null, array('class' => 'multi_select', 'multiple' => 'multiple'))}}
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
		@if ($search_flg)
			<div class="search_result pad_tb_5">
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
									<a href=""  class="link_detail">
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
			</div>
		@endif
	</div>
@include('common.navi')
</div>
<div class="clear">&nbsp;</div>
@stop
@include('common.footer')