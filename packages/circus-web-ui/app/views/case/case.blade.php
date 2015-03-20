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
			<col width="13%">
			<col width="10%">
			<col width="16%">
			<col width="10%">
			<col width="10%">
			<col width="13%">
			<col width="19%">
			<col width="9%">
		</colgroup>
		<tr>
			<th>projectName</th>
			<th>patientID</th>
			<th>patientName</th>
			<th>age</th>
			<th>sex</th>
			<th>update Date</th>
			<th>latest Revision</th>
			<th></th>
		</tr>
		@if (count($list) > 0)
			@foreach ($list as $rec)
				<tr>
					<td>{{$rec->project->projectName}}</td>
					<td>{{$rec->patientInfoCache['patientID']}}</td>
					<td>{{$rec->patientInfoCache['patientName']}}</td>
					<td>{{$rec->patientInfoCache['age']}}</td>
					<td>{{CommonHelper::getSex($rec->patientInfoCache['sex'])}}</td>
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
					<td class="al_c">
						{{HTML::link('', 'View', array('class' => 'link_detail common_btn'))}}
					</td>
				</tr>
			@endforeach
		@else
			<tr>
				<td colspan="8">Search results 0.</td>
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
				$('#form_case_search').append(sort_elm);
				var disp_elm = $("<input>", {type:"hidden", name:"disp", value:disp});
				$('#form_case_search').append(disp_elm);
				//Event firing
				$('#btn_submit').trigger('click');
			});
		});
	</script>
@endif
