@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function() {
		$('#btn_submit').click(function(){
			var btnName = arguments[1] ? arguments[1] : "btnSearch";
			var elm = $("<input>", {type:"hidden", name:btnName, value:btnName});
			$('#form_search').append(elm);
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

		$('.link_series_detail').click(function(){
			//Get the form ID to be sent
			var seriesUID = $(this).closest('td').find('.seriesUID').val();
			$(this).closest('body').find('.series_detail_seriesUID').val(seriesUID);
			$(this).closest('body').find('.frm_series_detail').submit();
			return false;
		});

		$('#btn_reset').click(function(){
			//Event firing
			$('#btn_submit').trigger('click', ['btnReset']);
		});

		//CheckboxCookie processing
		var COOKIE_NAME = "seriesCookie";
		if(typeof $.cookie(COOKIE_NAME) === "undefined"){
			var first_array = [];
			$.cookie(COOKIE_NAME , first_array , { expires: 1, path:'/' });
		}
		var series_num_array = [];

		$(".chk_series").click(function () {
			var target_number = $(this).val();
			var num_idx = $.inArray(target_number , series_num_array);

			if($(this).prop('checked')){
				// If the check was placed, Add to cookies as a case be registered
				if(num_idx == -1){
					series_num_array.push(target_number);
					$.cookie(COOKIE_NAME , series_num_array.join('_') , { expires: 1, path:'/'  });
				}
			} else {
				// If the check is removed, remove from cookie as outside of the case be registered
				if(num_idx != -1){
					series_num_array.splice(num_idx , 1);
					$.cookie(COOKIE_NAME , series_num_array.join('_') , { expires: 1, path:'/'  });
				}
			}
		});

		//Save Settings depression during treatment
		$('#save-button').click(function(){
			//sendAjax("{{asset('/series/save_search')}}", setAjaxSearchVal("btnSave"));
			var ret = prompt('Please display the save label name.', 'User set condition');
			if (ret == null){
				alert('Please display the save label name.');
			} else {
				sendAjax("{{asset('/series/save_search')}}", setAjaxSearchVal("btnSave", {"name":"save_label","value":ret}));
			}
			return false;
		});

		//I want to create a data for Ajax communication
		function setAjaxSearchVal(btnName) {
			var form_data = $('#form_search').serializeArray();
			//Get search mode
			var search_mode = $('#search_mode').val();
			var tmp_action_btn_data = {"name":btnName, "value":btnName};
			var tmp_ary_data = [tmp_action_btn_data];

			//Option
			if (arguments[1]) {
				tmp_ary_data.push(arguments[1]);
			}

			var tmp_data = $.extend(true,form_data, tmp_ary_data);
			return tmp_data;
		}

		//Ajax communication
		function sendAjax(post_url, post_data) {
			var target_elm = arguments[2] ? arguments[2] : "";
			$.ajax({
				url: post_url,
				type: 'POST',
				data: post_data,
				dataType: 'json',
				error: function(){
					alert('I failed to communicate.');
				},
				success: function(res){
					if (target_elm) {
						target_elm.empty();
						target_elm.append(res.response);
					} else {
						alert(res.message);
					}
				}
			});
		}
	});
</script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Series Search</h1>
			{{Form::open(['url' => asset('/series/search'), 'id' => 'form_search', 'method' => 'post', 'class' => 'mar_b_20'])}}
				<div class="al_l mar_b_10">
					{{HTML::link(asset('/series/import'), 'Series Import', array('class' => 'common_btn'))}}
				</div>
				<div class="search_form_wrap">
					<h2 class="con_ttl">Search Condition</h2>
					<table class="common_table al_l mar_b_10">
						<colgroup>
							<col width="25%">
							<col width="25%">
							<col width="25%">
							<col width="25%">
						</colgroup>
						<tr>
							<th>Series ID</th>
							<td>
								{{Form::text('seriesUID', isset($inputs['seriesUID']) ? $inputs['seriesUID'] : '', array('class' => 'common_input_text w_150'))}}
							</td>
							<th>Series Description</th>
							<td>
								{{Form::text('seriesDescription', isset($inputs['seriesDescription']) ? $inputs['seriesDescription'] : '', array('class' => 'common_input_text w_150'))}}
							</td>
						</tr>
						<tr>
							<th>Patient ID</th>
							<td>
								{{Form::text('patientID', isset($inputs['patientID']) ? $inputs['patientID'] : '', array('class' => 'common_input_text w_150'))}}
							</td>
							<th>Patient Name</th>
							<td>
								{{Form::text('patientName', isset($inputs['patientName']) ? $inputs['patientName'] : '', array('class' => 'common_input_text w_150'))}}
							</td>
						</tr>
						<tr>
							<th>Age</th>
							<td>
								{{Form::text('minAge', isset($inputs['minAge']) ? $inputs['minAge'] : '', array('class' => 'common_input_text w_80'))}}
								—
								{{Form::text('maxAge', isset($inputs['maxAge']) ? $inputs['maxAge'] : '', array('class' => 'common_input_text w_80'))}}
							</td>
							<th>Sex</th>
							<td>
								<label>
									{{Form::radio('sex', 'm', $inputs['sex'] == 'm' ? true : false)}}
									male
								</label>
								<label>
									{{Form::radio('sex', 'f', $inputs['sex'] == 'f' ? true : false)}}
									female
								</label>
								<label>
									{{Form::radio('sex', 'all', $inputs['sex'] == 'all' ? true : false)}}
									all
								</label>
							</td>
						</tr>
					</table>
					<p class="al_c">
						{{Form::button('Reset', array('class' => 'common_btn common_btn_green', 'id' => 'btn_reset'))}}
						{{Form::button('Search', array('class' => 'common_btn', 'type' => 'button', 'id' => 'btn_submit'))}}
						{{Form::button('Save settings', array('class' => 'common_btn common_btn_gray', 'type' => 'button', 'id' => 'save-button'))}}
					</p>
				</div>
			{{Form::close()}}

			@if ($search_flg)
				{{Form::open(['url' => asset('/case/input'), 'method' => 'post', 'id' => 'form_edit_new_case'])}}
					{{Form::hidden('back_url', 'series_search')}}
					<div class="w_900 fl_l">
						<ul class="common_pager clearfix">
							{{$list_pager->links()}}
							<li class="pager_sort_order">
								{{Form::select('sort', Config::get('const.search_series_sort'), isset($inputs['sort']) ? $inputs['sort'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'sort_order_down', 'id' => 'sort_order_up'))}}
							</li>
							<li class="pager_disp_num">
								{{Form::select('disp', Config::get('const.search_display'), isset($inputs['disp']) ? $inputs['disp'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'display_num_down', 'id' => 'display_num_up'))}}
							</li>
						</ul>
					</div>
					<p class="fl_r">
						<button type="button" value="" name="" class="common_btn" onClick="
							var checked_num	=	$('#form_edit_new_case').find('input:checkbox:checked').length;
							if(checked_num==0){
								alert('Case creation will be possible to select from a series of one at least.');
							}else{
								$('#form_edit_new_case').submit();
							}
						">Add New Case</button>
					</p>
					<div class="clear">&nbsp;</div>
					<div class="w_max pad_tb_5">
						<table class="result_table common_table">
							<colgroup>
								<col width="10%">
								<col width="16%">
								<col width="5%">
								<col width="5%">
								<col width="24%">
								<col width="13%">
								<col width="13%">
								<col width="10%">
							</colgroup>
							<tr>
								<th>patientID</th>
								<th>patientName</th>
								<th>age</th>
								<th>sex</th>
								<th>seriesDate</th>
								<th>modality</th>
								<th>seriesDescription</th>
								<th colspan="2"></th>
							</tr>
							@if (count($list) > 0)
								@foreach ($list as $rec)
									<tr>
										<td>{{$rec['patientID']}}</td>
										<td>{{$rec['patientName']}}</td>
										<td>{{$rec['age']}}</td>
										<td>{{$rec['patientSex']}}</td>
										<td>{{$rec['seriesDate']}}</td>
										<td>{{$rec['modality']}}</td>
										<td>{{$rec['seriesDescription']}}</td>
										<td class="al_c">
											{{HTML::link(asset('/series/detail'), 'View', array('class' => 'common_btn link_series_detail'))}}
											{{Form::hidden('seriesUID', $rec['seriesID'], array('class' => 'seriesUID'))}}
										</td>
										<td class="al_c">
											{{Form::checkbox('chk_series', $rec['seriesID'], false, array('class' => 'chk_series'))}}
										</td>
									</tr>
								@endforeach
							@else
								<tr>
									<td colspan="5">Search results 0.</td>
								</tr>
							@endif
						</table>
					</div>
					<ul class="common_pager clearfix">
						{{$list_pager->links()}}
						<li class="pager_sort_order">
							{{Form::select('sort', Config::get('const.search_series_sort'), isset($inputs['sort']) ? $inputs['sort'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'sort_order_up', 'id' => 'sort_order_down'))}}
						</li>
						<li class="pager_disp_num">
							{{Form::select('disp', Config::get('const.search_display'), isset($inputs['disp']) ? $inputs['disp'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'display_num_up', 'id' => 'display_num_down'))}}
						</li>
					</ul>
				{{Form::close()}}
				{{Form::open(['url' => asset('/series/detail'), 'method' => 'post', 'class' => 'frm_series_detail'])}}
					{{Form::hidden('seriesUID', '', array('class' => 'series_detail_seriesUID'))}}
					{{Form::hidden('mode', 'detail')}}
				{{Form::close()}}
			@endif
		</div>
	</div>
@include('common.navi')
</div>
<div class="clear">&nbsp;</div>
@stop
@include('common.footer')