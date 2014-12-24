@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function() {
		$('#link_case_edit').click(function(){
			//Get the form ID to be sent
			$(this).closest('div').find('.frm_case_edit').submit();
			return false;
		});

		$('.link_case_detail').click(function(){
			//Set mode
			$(this).closest('td').find('.view_mode').val('view');

			//Get the form ID to be sent
			$(this).closest('td').find('.form_case_detail').submit();
			return false;
		});

		$('.link_revision_list').click(function(){
			$(this).closest('div').find('.frm_revision_list').submit();
			return false;
		});

		$('#btnBack').click(function() {
			$('body').append('<form action="./search" method="POST" class="hidden" id="frm_back"></form>');
			$('#frm_back').append('<input type="hidden" name="btnBack" value="">');
			$('#frm_back').submit();
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
			$('#form_search').append(sort_elm);
			var disp_elm = $("<input>", {type:"hidden", name:"disp", value:disp});
			$('#form_search').append(disp_elm);
			//Event firing
			var post_data = $('#form_search').serializeArray();
			var target_elm = $('.result_revision_list');

			$.ajax({
				url: "{{asset('/case/revision')}}",
				type: 'POST',
				data: post_data,
				dataType: 'json',
				error: function(){
					alert('I failed to communicate.');
				},
				success: function(res){
					target_elm.empty();
					target_elm.append(res.response);
				}
			});
			return false;
		});
	});
</script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique" id="page_case_detail">
			<h1 class="page_ttl">Case Detail (Revision {{$case_detail['revisionNo']}})</h1>
			@if (isset($error_msg))
				<div class="al_l mar_b_10 w_600 fl_l">
					{{HTML::link(asset('/case/search'), 'Back to Case Search Result', array('class' => 'common_btn', 'id' => 'btnBack'))}}
					<span class="text_alert">{{$error_msg}}</span>
				</div>
			@else
				<div class="al_l mar_b_10 w_600 fl_l">
					{{HTML::link(asset('/case/search'), 'Back to Case Search Result', array('class' => 'common_btn', 'id' => 'btnBack'))}}
					@if (isset($edit_flg))
						{{HTML::link('', 'Edit Case', array('class' => 'common_btn', 'id' => 'link_case_edit'))}}
						{{Form::open(['url' => asset('/case/edit'), 'method' => 'POST', 'class' => 'frm_case_edit'])}}
							{{Form::hidden('caseID', $case_detail['caseID'])}}
							{{Form::hidden('revisionNo', $case_detail['revisionNo'])}}
						{{Form::close()}}
					@endif
				</div>
				<div class="al_r mar_b_10 w_300 fl_r">
					{{Form::select('revision', $revision_no_list, $case_detail['revisionNo'], array('class' => 'select w_180'))}}
					{{HTML::link(asset('/case/detail#revision'), 'Revision List', array('class' => 'common_btn'))}}
				</div>
				<div class="clear">&nbsp;</div>
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
				<div class="w_400 fl_l">
					{{Form::select('seriesUID', $series_list, isset($case_detail['seriesUID']) ? $case_detail['seriesUID'] : '')}}
					<label class="common_btn" for="img_mode_view">
						{{Form::radio('img_mode', 1, $mode == 'detail' ? true : false, array('class' => 'img_mode', 'id' => 'img_mode_view'))}}
						View
					</label>
					<label class="common_btn" for="img_mode_draw">
						{{Form::radio('img_mode', 1, $mode == 'edit' ? true : false, array('class' => 'img_mode', 'id' => 'img_mode_draw'))}}
						Draw
					</label>
					{{Form::button('Save', array('type' => 'submit', 'class' => 'common_btn'))}}
				</div>
				<div class="w_500 fl_r">
					<div class="info_area ">
						<p class="pad_10">
							{{$case_detail['patientName']}} ({{$case_detail['patientID']}})
							<br>{{$case_detail['birthday']}} {{$case_detail['sex']}}
						</p>
					</div>
				</div>
				<div class="clear">&nbsp;</div>
				<div class=" img_view_area pad_t_10">
					<div class="img_area fl_l" id="area_axial">
						<div class="btn_prev common_btn common_btn_green" data-target-elm="slider_axial">
							Prev
						</div>
						<div class="slider_outer">
							<div id="slider_axial" class="slider_elm"></div>
						</div>
						<div class="btn_next common_btn common_btn_green"data-target-elm="slider_axial">
							Next
						</div>
						<div class="clear">&nbsp;</div>
						<div id="img_area_axial" class="img_wrap">
							<img src="http://www.spiritek.co.jp/todaitestimg/img.php?id=4&amp;count=001" id="img_axial">
							<p class="al_c disp_num">
								<span id="current_num_txt_axial">1</span>
							</p>
							<div class="img_toolbar_wrap">
								<ul class="img_toolbar" data-target-element="img_axial">
									<li class="toolbar_btn">{{HTML::link('', 'Drawing')}}</li>
									<li class="toolbar_btn">{{HTML::link('', 'Hand')}}</li>
									<li class="toolbar_btn">{{HTML::link('', 'Large')}}</li>
									<li class="toolbar_btn">{{HTML::link('', '小')}}</li>
								</ul>
							</div>
						</div>
					</div>
					<div class="img_area fl_r" id="area_sagital">
						<div class="btn_prev common_btn common_btn_blue" data-target-elm="slider_sagital">
							Prev
						</div>
						<div class="slider_outer">
							<div id="slider_sagital" class="slider_elm"></div>
						</div>
						<div class="btn_next common_btn common_btn_blue" data-target-elm="slider_sagital">
							Next
						</div>
						<div class="clear">&nbsp;</div>
						<div id="img_area_sagital" class="img_wrap">
							<img src="http://www.spiritek.co.jp/todaitestimg/img.php?id=6&amp;count=001" id="img_sagital">
							<p class="al_c disp_num">
								<span id="current_num_txt_sagital">1</span>
							</p>
							<div class="img_toolbar_wrap">
								<ul class="img_toolbar" data-target-element="img_sagital">
									<li class="toolbar_btn">{{HTML::link('', 'Drawing')}}</li>
									<li class="toolbar_btn">{{HTML::link('', 'Hand')}}</li>
									<li class="toolbar_btn">{{HTML::link('', 'Large')}}</li>
									<li class="toolbar_btn">{{HTML::link('', '小')}}</li>
								</ul>
							</div>
						</div>
					</div>
					<div class="clear">&nbsp;</div>
					<div class="img_area fl_l" id="area_coronal">
						<div class="btn_prev common_btn common_btn_pink" data-target-elm="slider_coronal">
							Prev
						</div>
						<div class="slider_outer">
							<div id="slider_coronal" class="slider_elm"></div>
						</div>
						<div class="btn_next common_btn common_btn_pink" data-target-elm="slider_coronal">
							Next
						</div>
						<div class="clear">&nbsp;</div>
						<div id="img_area_coronal" class="img_wrap">
							<img src="http://www.spiritek.co.jp/todaitestimg/img.php?id=5&amp;count=001" id="img_coronal">
							<p class="al_c disp_num">
								<span id="current_num_txt_coronal">1</span>
							</p>
							<div class="img_toolbar_wrap">
								<ul class="img_toolbar" data-target-element="img_coronal">
									<li class="toolbar_btn">{{HTML::link('', 'Drawing')}}</li>
									<li class="toolbar_btn">{{HTML::link('', 'Hand')}}</li>
									<li class="toolbar_btn">{{HTML::link('', '大')}}</li>
									<li class="toolbar_btn">{{HTML::link('', '小')}}</li>
								</ul>
							</div>
						</div>
					</div>
					<div class="img_area fl_r" id="panel_wrap">
						<div id="layer_panel">
							<div class="pad_10">
								<h2 class="layer_panel_ttl">レイヤー情報</h2>
								<p class="layer_panel_switch">
									<span class="switch_main" id="opener">▼</span>
									<span class="switch_main" id="closer">▲</span>
								</p>
								<div class="clear">&nbsp;</div>
								<ul id="layer_list">
									<li class="layer_cell">
										<label class="layer_cell_label">
											{{Form::checkbox('layer', 5, false, array('class' => 'layer_cell_input'))}}
											Layer 5
										</label>
									</li>
									<li class="layer_cell">
										<label class="layer_cell_label">
											{{Form::checkbox('layer', 4, false, array('class' => 'layer_cell_input'))}}
											Layer 4
										</label>
									</li>
									<li class="layer_cell">
										<label class="layer_cell_label">
											{{Form::checkbox('layer', 2, false, array('class' => 'layer_cell_input'))}}
											Layer 2
										</label>
									</li>
									<li class="layer_cell">
										<label class="layer_cell_label">
											{{Form::checkbox('layer', 1, false, array('class' => 'layer_cell_input'))}}
											Layer 1
										</label>
									</li>
									<li class="layer_cell">
										<label class="layer_cell_label">
											{{Form::checkbox('layer', 3, true, array('class' => 'layer_cell_input'))}}
											Layer 3
										</label>
									</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
				<div class="clear">&nbsp;</div>
				<div class="search_result">
					<h2 class="con_ttl"><a name='revision'>Revision</a></h2>
					<ul class="common_pager clearfix">
						{{$list_pager->links()}}
						<li class="pager_sort_order">
							{{Form::select('sort', Config::get('const.search_revision_sort'), isset($inputs['sort']) ? $inputs['sort'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'sort_order_down', 'id' => 'sort_order_up'))}}
						</li>
						<li class="pager_disp_num">
							{{Form::select('disp', Config::get('const.search_display'), isset($inputs['disp']) ? $inputs['disp'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'display_num_down', 'id' => 'display_num_up'))}}
						</li>
					</ul>
					<div class="pad_tb_10 result_revision_list">
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
							@if (count($revision_list))
								@foreach ($revision_list as $rec)
									<tr>
										<td>{{$rec['revisionNo']}}</td>
										<td>
											{{$rec['editDate']}}<br>
											{{$rec['editTime']}}
										</td>
										<td>
											{{$rec['seriesCount']}} series<br>
											{{$rec['labelCount']}} label
										</td>
										<td>{{$rec['creator']}}</td>
										<td class="al_l">{{$rec['memo']}}</td>
										<td class="">
											{{Form::open(['url' => asset('/case/detail'), 'method' => 'post', 'class' => 'form_case_detail'])}}
												{{Form::hidden('mode', $mode)}}
												{{Form::hidden('caseID', $case_detail['caseID'])}}
												{{Form::hidden('revisionNo', $rec['revisionNo'])}}
												{{Form::button('View', array('class' => 'common_btn link_case_detail'))}}
												{{HTML::link(asset('/case/detail'), 'Edit', array('class' => 'common_btn mar_t_5 link_case_detail'))}}
											{{Form::close()}}
										</td>
									</tr>
								@endforeach
							@else
								<tr>
									<td colspan="6">Revision is not registered.</td>
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
				{{Form::open(['url' => asset('/case/detail'), 'method' => 'post', 'id' => 'form_search'])}}
					{{Form::hidden('revisionNo', $case_detail['revisionNo'])}}
					{{Form::hidden('caseID', $case_detail['caseID'])}}
					{{Form::hidden('mode', $mode)}}
				{{Form::close()}}
			@endif
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')