@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique" id="page_revision_list">
			<h1 class="page_ttl">Revision List</h1>
				<table class="common_table al_l mar_b_10">
					<colgroup>
						<col width="20%">
						<col width="30%">
						<col width="20%">
						<col width="30%">
					</colgroup>
					<tr>
						<th>Case ID</th>
						<td colspan="3">{{$case_detail['caseID']}}</td>
						</tr>
					<tr>
						<th>Project ID</th>
						<td>{{$case_detail['projectID']}}</td>
						<th>Project Name</th>
						<td>{{$case_detail['projectName']}}</td>
					</tr>
				</table>
				<div class="info_area mar_b_20">
					<p class="pad_10">
						{{$case_detail['patientName']}} ({{$case_detail['patientID']}})
						<br>{{$case_detail['birthday']}} {{$case_detail['sex']}}
					</p>
				</div>

				<div class="search_result">
					<h2 class="con_ttl">Revision</h2>
					<ul class="common_pager clearfix">
						{{$list_pager->links()}}
						<li class="pager_sort_order">
							{{Form::select('sort', Config::get('const.search_revision_sort'), isset($inputs['sort']) ? $inputs['sort'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'sort_order_down', 'id' => 'sort_order_up'))}}
						</li>
						<li class="pager_disp_num">
							{{Form::select('disp', Config::get('const.search_display'), isset($inputs['disp']) ? $inputs['disp'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'display_num_down', 'id' => 'display_num_up'))}}
						</li>
					</ul>
					<div class="pad_tb_10">
						<table class="result_table common_table al_c">
							<colgroup>
								<col width="14%">
								<col width="14%">
								<col width="14%">
								<col width="14%">
								<col width="28%">
								<col width="16%">
							</colgroup>
							<tr>
								<th>Revision No.</th>
								<th>Edit Datetime</th>
								<th>Series/Label</th>
								<th>Editor Name</th>
								<th>Editor Memo</th>
								<th></th>
							</tr>
							@if(count($revision_list) > 0)
								@foreach($revision_list as $rec)
									<tr>
										<td>{{$rec['revisionNo']}}</td>
										<td>{{$rec['editDate']}}<br>{{$rec['editTime']}}</td>
										<td>{{$rec['seriesCount']}} series<br>{{$rec['labelCount']}} label</td>
										<td>{{$rec['creator']}}</td>
										<td class="al_l">{{$rec['memo']}}</td>
										<td class="">
											<button type="button" value="" class="common_btn">
												View
											</button>
											<a href="revision_detail.html" class="common_btn mar_t_5">
												Edit
											</a>
										</td>
									</tr>
								@endforeach
							@else
								<tr>
									<td colspan="6">リビジョン情報が登録されていません。</td>
								</tr>
							@endif
						</table>
					</div>
					<ul class="common_pager clearfix">
						{{$list_pager->links()}}
						<li class="pager_sort_order">
							{{Form::select('sort', Config::get('const.search_revision_sort'), isset($inputs['sort']) ? $inputs['sort'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'sort_order_up', 'id' => 'sort_order_down'))}}
						</li>
						<li class="pager_disp_num">
							{{Form::select('disp', Config::get('const.search_display'), isset($inputs['disp']) ? $inputs['disp'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'display_num_up', 'id' => 'display_num_down'))}}
						</li>
					</ul>
				</div>
			</div>
		</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')