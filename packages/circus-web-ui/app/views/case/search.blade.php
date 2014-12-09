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
			$('body').append('<form id="temporaly_form" class="hidden"></form>');
			$('#search_condition_outer').find('input,select,textarea').clone().appendTo('#temporaly_form');

			var form_data	=	$('#temporaly_form').serializeArray();
			$('#temporaly_form').remove();

			//本来はシリアライズした検索条件群をサーバーに渡して必要な項目をロードする
			//モック状態での暫定的な結果画面遷移
			$('#form_search').submit();
		});

		$('.change_select').change(function(){
			// 変更するコンボIDを取得
			var change_select = $(this).attr('data-target_dom');
			// selectedにするvalueを取得
			var select_value = $("select[name='"+$(this).attr('name')+"']").val();
			// コンボのselectedを変更
			$('#'+change_select).find('option').each(function(){
					var this_num = $(this).val();
					if(this_num==select_value){
						$(this).attr('selected','selected');
					}
			});
		});

		$('.link_detail').click(function(){
			alert("飛ぶで!");
			//送信するフォームIDを取得
			var target_form = $(this).attr('target_elm');
			alert(target_form);
			$('#'+target_form).submit();
		});

		$('#btn_reset').click(function(){
			 $(".clearForm").closest("#search_condition_outer").find("textarea,:text,select").val("").end().find(":checked").prop("checked",false);
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
								{{Form::select('project[]', $project_list, isset($inputs["project"]) ? $inputs["project"] : null, array("class" => "multi_select", "multiple" => "multiple"))}}
							</td>
							<th>Case ID</th>
							<td>{{Form::text('caseID', isset($inputs["caseID"]) ? $inputs["caseID"] : '', array("class" => "common_input_text w_200"))}}</td>
						</tr>
						<tr>
							<th>Patient ID</th>
							<td>{{Form::text('patientID', isset($inputs["patientID"]) ? $inputs["patientID"] : '', array("class" => "common_input_text w_200"))}}</td>
							<th>Patient Name</th>
							<td>{{Form::text('patientName', isset($inputs["patientName"]) ? $inputs["patientName"] : '', array("class" => "common_input_text w_200"))}}</td>
						</tr>
						<tr>
							<th>Create Date</th>
							<td>{{Form::text('createDate', isset($inputs["createDate"]) ? $inputs["createDate"] : '', array("class" => "common_input_text w_200 datepicker"))}}</td>
							<th>Update Date</th>
							<td>{{Form::text('updateDate', isset($inputs["updateDate"]) ? $inputs["updateDate"] : '', array("class" => "common_input_text w_200 datepicker"))}}</td>
						</tr>
						<tr>
							<th>Case Date</th>
							<td colspan="3">{{Form::text('caseDate', isset($inputs["caseDate"]) ? $inputs["caseDate"] : '', array("class" => "common_input_text w_200 datepicker"))}}</td>
						</tr>
					</table>
					{{Form::button('Show More Options', array("class" => "common_btn mar_b_10", "onClick" => "$('#search_condition').toggleClass('hidden');"))}}
					<div id="search_condition" class="hidden">
					</div>
						<p class="submit_area">
							{{Form::button('Reset', array("class" => "common_btn common_btn_green clearForm", "type" => "reset", "id" => "btn_reset", "name" => "btnReset"))}}
							{{Form::button('Search', array("class" => "common_btn common_btn_gray", "id" => "btn_submit", "type" => "button", "name" => "btnSubmit"))}}
							{{Form::button('Save settings', array("class" => "common_btn common_btn_gray", "id" => "save-button", "type" => "button", "name" => "btnSave"))}}
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
						{{Form::select('sort', array('' => 'Sort Order', 'lastUpdate' => 'Last Update', 'caseID' => 'ID'), isset($sort) ? $sort : '', array('class' => 'w_max change_select', 'data-target_dom' => 'sort_order_down', 'id' => 'sort_order_up'))}}
					</li>
					<li class="pager_disp_num">
						{{Form::select('disp', array('' => 'display num', 10 => 10, 50 => 50, 100 => 100, 'all' => 'all'), isset($disp) ? $disp : '', array('class' => 'w_max change_select', 'data-target_dom' => 'display_num_down', 'id' => 'display_num_up'))}}
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
						<th>{{Form::label('Case')}}</th>
						<th>{{Form::label('Project')}}</th>
						<th>
							{{Form::label('Patient Id')}}<br>
							{{Form::label('Patient Name')}}
						</th>
						<th>{{Form::label('Inspection Date')}}</th>
						<th>{{Form::label('Latest Revision')}}</th>
						<th></th>
					</tr>
					@if (count($list) > 0)
						@foreach ($list as $rec)
							<tr>
								<td>{{$rec["incrementalID"]}} - {{$rec["caseID"]}}</td>
								<td>{{$rec["projectID"]}} - {{$rec["projectName"]}}</td>
								<td>
									{{$rec["patientID"]}}
									<br>
									{{$rec["patientName"]}}
								</td>
								<td>2014/08/02</td>
								<td>
									<a href=""  target_elm="form_detail_{{$rec['caseID']}}" class='link_detail'>
										{{$rec["latest_date"]}}
										<br>
										{{$rec["creator"]}}
									</a>
									{{Form::open(['url' => asset('/case/detail'), 'method' => 'post', 'id' => 'form_detail_'.$rec["caseID"]])}}
										{{Form::hidden('caseID', $rec["caseID"])}}
										{{Form::hidden('revisionNo', '')}}
									{{Form::close()}}
								</td>
								<td class="al_c">
									{{HTML::link('', 'View', array("target_elm" => "form_detail_".$rec["caseID"], "class" => "link_detail"))}}
								</td>
							</tr>
						@endforeach
					@else
						<tr>
							<td colspan="6">検索結果は0件です。</td>
						</tr>
					@endif
				</table>
				<ul class="common_pager clearfix">
					{{$list_pager->links()}}
					<li class="pager_sort_order">
						{{Form::select('sort', array('' => 'Sort Order', 'lastUpdate' => 'Last Update', 'caseID' => 'ID'), isset($sort) ? $sort : '', array('class' => 'w_max change_select', "data-target_dom" => "sort_order_up", "id" => "sort_order_down"))}}
					</li>
					<li class="pager_disp_num">
						{{Form::select('disp', array('' => 'display num', 10 => 10, 50 => 50, 100 => 100, 'all' => 'all'), isset($disp) ? $disp : '', array('class' => 'w_max change_select', "data-target_dom" => "display_num_up", "id" => "display_num_down"))}}
					</li>
				</ul>
			</div>
		@endif
	</div>
@include('common.navi')
</div><!--/.page_unique-->
<div class="clear">&nbsp;</div>

@stop
@include('common.footer')