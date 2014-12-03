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
			$('#search_condition_outer').find('input,select,textarea').clone().appendTo('#temporaly_form')

			var form_data	=	$('#temporaly_form').serializeArray();
			console.log(form_data);
			$('#temporaly_form').remove();

			//本来はシリアライズした検索条件群をサーバーに渡して必要な項目をロードする
			//モック状態での暫定的な結果画面遷移
			$('#form_search').submit();
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
					{{Form::open(['url' => '/case/search', 'method' => 'POST', 'class' => 'common_form'])}}
					<table class="common_table al_l mar_b_10">
						<colgroup>
							<col width="15%">
							<col width="35%">
							<col width="15%">
							<col width="35%">
						</colgroup>
						<tr>
							<th>
								{{Form::label('project ID')}}
							</th>
							<td>
								{{Form::select('project[]', array('Project1' => 'Project1', 'Project2' => 'Project2', 'Project3' => 'Project3'), '', array("class" => "multi_select", "multiple" => "multiple"))}}
							</td>
							<th>
								{{Form::label('Case ID')}}
							</th>
							<td>
								{{Form::text('caseID', isset($caseID) ? $caseID : '', array("class" => "common_input_text w_200"))}}
							</td>
						</tr>
						<tr>
							<th>
								{{Form::label('Patient ID')}}
							</th>
							<td>
								{{Form::text('patientID', isset($patientID) ? $patientID : '', array("class" => "common_input_text w_200"))}}
							</td>
							<th>
								{{Form::label('Patient Name')}}
							</th>
							<td>
								{{Form::text('patientName', isset($patientName) ? $patientName : '', array("class" => "common_input_text w_200"))}}
							</td>
						</tr>
						<tr>
							<th>
								{{Form::label('Inspection date')}}
							</th>
							<td colspan="3">
								{{Form::text('insepctionDate', isset($insepctionDate) ? $insepctionDate : '', array("class" => "common_input_text w_200 datepicker"))}}
							</td>
						</tr>
					</table>
					{{Form::button('Show More Options', array("class" => "common_btn mar_b_10", "onClick" => "$('#search_condition').toggleClass('hidden');"))}}
					<div id="search_condition" class="hidden">
					</div>
						<p class="submit_area">
							{{Form::button('reset', array("class" => "common_btn common_btn_green"))}}
							{{Form::button('Search', array("class" => "common_btn common_btn_gray", "id" => "btn_submit"))}}
							{{Form::button('Save settings', array("class" => "common_btn common_btn_gray", "id" => "save-button"))}}
						</p>
					{{Form::close()}}
				</div>
			</div>
			<!-- ページングいったん放置 -->
		<ul class="common_pager clearfix">
			<li class="pager_btn pager_previous">
				<a href="#">Prev</a>
			</li>
			<li class="pager_btn ">
				<a href="#">1</a>
			</li>
			<li class="pager_btn pager_omission">
				…
			</li>
			<li class="pager_btn current_page">
				10
			</li>
			<li class="pager_btn ">
				<a href="#">11</a>
			</li>
			<li class="pager_btn active">
				<a href="#">12</a>
			</li>
			<li class="pager_btn ">
				<a href="#">13</a>
			</li>
			<li class="pager_btn ">
				<a href="#">14</a>
			</li>
			<li class="pager_btn pager_omission">
				…
			</li>
			<li class="pager_btn ">
				<a href="#">81</a>
			</li>
			<li class="pager_btn pager_next">
				<a href="#">Next</a>
			</li>
			<li class="pager_sort_order">
				{{Form::select('sort', array('' => 'Sort Order', 'lastUpdate' => 'Last Update', 'id' => 'ID'), array("class" => "w_max"))}}
			</li>
			<li class="pager_disp_num">
				{{Form::select('disp', array('' => 'display num', '10' => 10, '50' => 50, '100' => 100, 'all' => 'all'), array("class" => "w_max"))}}
			</li>
		</ul><!-- #EndLibraryItem -->
		<div class="search_result pad_tb_5">
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
					<th>
						{{Form::label('Case')}}
					</th>
					<th>
						{{Form::label('Project')}}
					</th>
					<th>
						{{Form::label('Patient Id')}}
						<br>
						{{Form::label('Patient Name')}}
					</th>
					<th>
						{{Form::label('Inspection Date')}}
					</th>
					<th>
						{{Form::label('Latest Revision')}}
					</th>
					<th></th>
				</tr>
				<tr>
					<td>12345 - Case AAA</td>
					<td>98567 - ？？病</td>
					<td>
						173962<br>Yokoyama Yuichi
					</td>
					<td>2014/08/05</td>
					<td>
						<a href="{{{asset('/revision/detail')}}}">
							2014/07/11(金)10:11<br>野村行弘
						</a>
					</td>
					<td class="al_c">
						<a href="{{{asset('/case/detail')}}}">
							View
						</a>
					</td>
				</tr>
				<tr>
					<td>54321 - Case BBB</td>
					<td>658997 - ？？症</td>
					<td>173962<br>Anonymous</td>
					<td>2014/08/02</td>
					<td>
						<a href="{{{asset('/revision/detail')}}}">
							2014/07/10(木)21:36<br>三木聡一郎
						</a>
					</td>
					<td class="al_c">
						<a href="{{{asset('/revision/detail')}}}" class="common_btn">
							View
						</a>
					</td>
				</tr>
			</table>
			<ul class="common_pager clearfix">
				<li class="pager_btn pager_previous">
					<a href="#">Prev</a>
				</li>
				<li class="pager_btn ">
					<a href="#">1</a>
				</li>
				<li class="pager_btn pager_omission">
					…
				</li>
				<li class="pager_btn current_page">
					10
				</li>
				<li class="pager_btn ">
					<a href="#">11</a>
				</li>
				<li class="pager_btn active">
					<a href="#">12</a>
				</li>
				<li class="pager_btn ">
					<a href="#">13</a>
				</li>
				<li class="pager_btn ">
					<a href="#">14</a>
				</li>
				<li class="pager_btn pager_omission">
					…
				</li>
				<li class="pager_btn ">
					<a href="#">81</a>
				</li>
				<li class="pager_btn pager_next">
					<a href="#">Next</a>
				</li>
				<li class="pager_sort_order">
					<select class="w_max">
						<option>Sort Order</option>
						<option>Last Update</option>
						<option>ID</option>
					</select>
				</li>
				<li class="pager_disp_num">
					<select class="w_max">
						<option>display num</option>
						<option>10</option>
						<option>50</option>
						<option>100</option>
						<option>all</option>
					</select>
				</li>
			</ul><!-- #EndLibraryItem -->
		</div>

		</div><!--/.search_result--><!-- #BeginLibraryItem "/Library/pager.lbi" -->

	</div>
@include('common.navi')
</div><!--/.page_unique-->
<div class="clear">&nbsp;</div>

@stop
@include('common.footer')