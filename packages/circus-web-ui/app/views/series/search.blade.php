@extends('common.layout')

@if(Auth::user()->isAccessibleSeries())
@section('head')
{{HTML::script('js/jquery.cookie.js')}}
<script>
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
			var order_by = $("select[name='order_by']").val();
			//display_num または Sort Order指定時は検索は行わない
			if (sort.length && disp.length) {
				setHiddenParams('form_search', 'sort', sort);
				setHiddenParams('form_search', 'disp', disp);
				setHiddenParams('form_search', 'order_by', order_by);
				//Event firing
				$('#btn_submit').trigger('click');
			}
			return false;
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
			var ret = prompt('Please display the save label name.', 'User set condition');
			if (ret == null){
				alert('Please display the save label name.');
			} else {
				var post_data = setAjaxSearchVal({"name":"save_label","value":ret});


				api("preference", {
					data: {seriesSearchPresets:post_data},
					success: function () {
						showMessage('Saved search criteria.');
					}
				});
			}
			return false;
		});

		//I want to create a data for Ajax communication
		function setAjaxSearchVal() {
			var form_data = $('#form_search').serializeArray();
			//Get search mode
			var search_mode = $('#search_mode').val();
			//Option
			if (arguments[0]) {
				var tmp_ary_data = [arguments[0]];
			}

			var tmp_data = $.extend(true,form_data, tmp_ary_data);

			var tmp_ajax_data = {};
			$.each(tmp_data, function(key, val) {
				if (val.name != 'btnSave')
					tmp_ajax_data[val.name] = val.value;
			});
			return tmp_ajax_data;
		}

		//Ajax communication
		function sendAjax(post_url, post_data) {
			var target_elm = arguments[2] ? arguments[2] : "";

			api("", {
				url: post_url,
				type: 'POST',
				data: post_data,
				dataType: 'json',
				success: function(res){
					if (target_elm) {
						target_elm.empty();
						target_elm.append(res.response);
					} else {
						showMessage('Saved search criteria.');
					}
				}
			});
		}
	});
</script>
@stop
@endif

@section('title')
Series Search
@stop

@section('content')
@if (isset($error_msg))
<script>
showMessage("{{{$error_msg}}}", true);
</script>
@endif

@if(Auth::user()->isAccessibleSeries())
{{Form::open(['url' => asset('series/search'), 'id' => 'form_search', 'method' => 'post', 'class' => 'mar_b_20'])}}
	<div class="al_l mar_b_10">
		{{HTML::link(asset('series/import'), 'Series Import', array('class' => 'common_btn'))}}
	</div>
	<div class="search_form_wrap">
		<h2 class="subsection_title">Search Condition</h2>
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
					{{Form::hidden('dummy', '')}}
					{{Form::text('seriesUID', isset($inputs['seriesUID']) ? $inputs['seriesUID'] : '', array('class' => 'common_input_text w_150'))}}
				</td>
				<th>Series Description</th>
				<td>
					{{Form::text('seriesDescription', isset($inputs['seriesDescription']) ? $inputs['seriesDescription'] : '', array('class' => 'common_input_text w_150'))}}
				</td>
			</tr>
		@if(Auth::user()->hasPrivilege(Group::PERSONAL_INFO_VIEW))
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
						{{Form::radio('sex', 'M', isset($inputs['sex']) && $inputs['sex'] == 'M' ? true : false)}}
						male
					</label>
					<label>
						{{Form::radio('sex', 'F', isset($inputs['sex']) && $inputs['sex'] == 'F' ? true : false)}}
						female
					</label>
					<label>
						{{Form::radio('sex', 'O', isset($inputs['sex']) && $inputs['sex'] == 'O' ? true : false)}}
						other
					</label>
					<label>
						{{Form::radio('sex', 'all', isset($inputs['sex']) && $inputs['sex'] == 'all' ? true : false)}}
						all
					</label>
				</td>
			</tr>
		@endif
		</table>
		<p class="al_c">
			{{Form::button('Reset', array('class' => 'common_btn common_btn_green', 'id' => 'btn_reset'))}}
			{{Form::button('Search', array('class' => 'common_btn', 'type' => 'button', 'id' => 'btn_submit'))}}
			{{Form::button('Save settings', array('class' => 'common_btn common_btn_gray', 'type' => 'button', 'id' => 'save-button'))}}
		</p>
	</div>
{{Form::close()}}
<div id="messages"></div>
@if ($search_flg)
	{{Form::open(['url' => asset('case/input'), 'method' => 'post', 'id' => 'form_edit_new_case'])}}
		{{Form::hidden('back_url', 'series_search')}}
		<div class="w_900 fl_l">
			<ul class="common_pager clearfix">
				@if(isset($list_pager))
					{{$list_pager->links()}}
				@endif
				<li class="pager_sort_order_by">
					{{Form::select('order_by', Config::get('const.search_sort'), isset($inputs['order_by']) ? $inputs['order_by'] : '', array('class' => 'w_max change_select'))}}
				</li>
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
			">
			@if ($edit_case_flg)
			Edit Case
			@else
			Add New Case
			@endif
			</button>
		</p>
		<div class="clear">&nbsp;</div>
		<div class="w_max pad_tb_5">
			<table class="result_table common_table">
				<colgroup>
				@if(Auth::user()->hasPrivilege(Group::PERSONAL_INFO_VIEW))
					<col width="10%">
					<col width="16%">
					<col width="5%">
					<col width="10%">
					<col width="19%">
					<col width="13%">
					<col width="13%">
					<col width="7%">
					<col width="7%">
				@else
					<col width="25%">
					<col width="25%">
					<col width="30%">
					<col width="10%">
					<col width="10%">
				@endif
				</colgroup>
				<tr>
				@if(Auth::user()->hasPrivilege(Group::PERSONAL_INFO_VIEW))
					<th>patientID</th>
					<th>patientName</th>
					<th>age</th>
					<th>sex</th>
				@endif
					<th>seriesDate</th>
					<th>modality</th>
					<th>seriesDescription</th>
					<th colspan="2"></th>
				</tr>
				@if (count($list) > 0)
					@foreach ($list as $rec)
						<tr>
						@if(Auth::user()->hasPrivilege(Group::PERSONAL_INFO_VIEW))
							<td>{{$rec->patientInfo['patientID']}}</td>
							<td>{{$rec->patientInfo['patientName']}}</td>
							<td>{{$rec->patientInfo['age']}}</td>
							<td>{{CommonHelper::getSex($rec->patientInfo['sex'])}}</td>
						@endif
							<td>{{date('Y/m/d', $rec->seriesDate->sec)}}</td>
							<td>{{$rec->modality}}</td>
							<td>{{$rec->seriesDescription}}</td>
							<td class="al_c">
								{{HTML::link(asset('series/detail'), 'View', array('class' => 'common_btn link_series_detail'))}}
								{{Form::hidden('seriesUID', $rec->seriesUID, array('class' => 'seriesUID'))}}
							</td>
							<td class="al_c">
								{{Form::checkbox('chk_series', $rec->seriesUID, false, array('class' => 'chk_series'))}}
							</td>
						</tr>
					@endforeach
				@else
					<tr>
						<td colspan="9">Search results 0.</td>
					</tr>
				@endif
			</table>
		</div>
	{{Form::close()}}
	{{Form::open(['url' => asset('series/detail'), 'method' => 'post', 'class' => 'frm_series_detail'])}}
		{{Form::hidden('seriesUID', '', array('class' => 'series_detail_seriesUID'))}}
		{{Form::hidden('mode', 'detail')}}
	{{Form::close()}}
@endif
@endif
@stop