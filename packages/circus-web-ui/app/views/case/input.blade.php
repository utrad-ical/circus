@extends('common.layout')

@section('head')
{{HTML::style('css/jquery-ui.css')}}
{{HTML::style('css/page.css')}}
{{HTML::style('css/page_lib.css')}}

{{HTML::script('js/jquery-ui.min.js')}}
<script>
	$(function(){
		$('#btnBack').click(function(){
			$(this).closest('div').find('.frmBack').submit();
			return false;
		});
	});
</script>
@stop

@section('title')
{{{Session::get('mode')}}} Case
@stop

@section('page_title')
{{{Session::get('mode')}}} Case
@stop

@section('page_id')
id="page_case_input"
@stop

@section('content')
<div class="al_l mar_b_10">
	{{HTML::link(asset($back_url), $back_label, array('class' => 'common_btn', 'id' => 'btnBack'))}}
	{{Form::open(['url' => asset($back_url), 'method' => 'post', 'class' => 'frmBack'])}}
		{{Form::hidden('btnBack', 'btnBack')}}
	{{Form::close()}}
</div>
@if (isset($error_msg))
	<span class="font_red">{{nl2br($error_msg)}}</span>
@else
	{{Form::open(['url' => asset('case/confirm'), 'method' => 'post'])}}
		<table class="common_table mar_b_10">
			<colgroup>
				<col width="10%">
				<col width="10%">
				<col width="40%">
				<col width="10%">
				<col width="30%">
			</colgroup>
			<tr>
				<th colspan="2">Case ID</th>
				<td colspan="3">{{$inputs['caseID']}}
					<span class="font_red">(ID is automatically generated by the system side)</span>
					@if (isset($errors) && $errors->has('caseID'))
						<br><span class="font_red">{{$errors->first('caseID')}}</span>
					@endif
				</td>
			</tr>
			<tr>
				<th colspan="2">Project ID</th>
				<td colspan="3">
					{{Form::select('projectID', $project_list, isset($inputs['projectID']) ? $inputs['projectID'] : '', array('common_input_select w_300'))}}
					@if (isset($errors) && $errors->has('projectID'))
						<br><span class="font_red">{{$errors->first('projectID')}}</span>
					@endif
				</td>
			</tr>
		@if(User::hasPrivilege(Group::PERSONAL_INFO_VIEW))
			<tr>
				<th rowspan="2">Patient</th>
				<th>ID</th>
				<td>
					{{$inputs['patientInfoCache']['patientID']}}
					@if (isset($errors) && $errors->has('patientInfoCache_patientID'))
						<br><span class="font_red">{{$errors->first('patientInfoCahce_patientID')}}</span>
					@endif
				</td>
				<th>Age</th>
				<td>
					{{$inputs['patientInfoCache']['age']}}
					@if (isset($errors) && $errors->has('patientInfoCache_age'))
						<br><span class="font_red">{{$errors->first('patientInfoCache_age')}}</span>
					@endif
				</td>
			</tr>
			<tr>
				<th>Name</th>
				<td>
					{{$inputs['patientInfoCache']['patientName']}}
					@if (isset($errors) && $errors->has('patientInfoCache_patientName'))
						<br><span class="font_red">{{$errors->first('patientInfoCache_patientName')}}</span>
					@endif
				</td>
				<th>Sex</th>
				<td>
					{{CommonHelper::getSex($inputs['patientInfoCache']['sex'])}}
					@if (isset($errors) && $errors->has('patientInfoCache_sex'))
						<br><span class="font_red">{{$errors->first('patientInfoCache_sex')}}</span>
					@endif
				</td>
			</tr>
		@endif
			<tr>
				<th colspan="2">Series</th>
				<td colspan="3">
					<p>Please correct the order of the series.</p>
					<div id="series_order_wrap" class="w_500">
						<ul class="ui-sortable disp_series_list">
							@foreach($series_list as $key => $value)
								<li class="ui-state-dafault">{{$value}}
									<input type="hidden" value="{{$key}}" name="series[]" class="series_labels">
								</li>
							@endforeach
						</ul>
					</div>
					@if (isset($errors) && $errors->has('series'))
						<br><span class="font_red">{{$errors->first('series')}}</span>
					@endif
				</td>
			</tr>
		</table>
		<p class="al_c">
			{{Form::button('Confirmation', array('type' => 'submit', 'class' => 'common_btn'))}}
		</p>
	{{Form::close()}}
@endif
@stop