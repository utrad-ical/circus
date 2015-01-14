@if ($search_flg)
	@if (count($list) > 0)
		<ul class="common_pager clearfix">
			{{$list_pager->links()}}
			<li class="pager_sort_order">
				{{Form::select('sort', Config::get('const.search_case_sort'), isset($inputs['sort']) ? $inputs['sort'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'sort_order_down', 'id' => 'sort_order_up'))}}
			</li>
			<li class="pager_disp_num">
				{{Form::select('disp', Config::get('const.search_display'), isset($inputs['disp']) ? $inputs['disp'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'display_num_down', 'id' => 'display_num_up'))}}
			</li>
		</ul>
	@endif
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
	@if (count($list) > 0)
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
<script type="text/javascript">
	$(function() {
		$('.link_detail').click(function(){
			//Get the form ID to be sent
			$(this).closest('tr').find('.form_case_detail').submit();
			return false;
		});
	});
</script>
@endif
