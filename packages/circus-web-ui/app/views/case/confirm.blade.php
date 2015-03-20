@extends('common.layout')

@section('page_css')
{{HTML::style('css/ui-lightness/jquery-ui-1.10.4.custom.min.css')}}
{{HTML::style('css/page.css')}}
@stop

@section('page_js')
{{HTML::script('js/jquery-ui.min.js')}}
<script type="text/javascript">
	$(function() {
		//Back button is pressed during
		$('.link_case_input').click(function(){
			$('#frmBack').submit();
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

@section('content')
{{Form::open(['url' => asset('case/complete'), 'method' => 'post'])}}
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
			</td>
		</tr>
		<tr>
			<th colspan="2">Project ID</th>
			<td colspan="3">{{$inputs['projectName']}}</td>
		</tr>
		<tr>
			<th rowspan="2">Patient</th>
			<th>ID</th>
			<td>{{$inputs['patientInfo']['patientID']}}</td>
			<th>Age</th>
			<td>{{$inputs['patientInfo']['age']}}</td>
		</tr>
		<tr>
			<th>Name</th>
			<td>{{$inputs['patientInfo']['patientName']}}</td>
			<th>Sex</th>
			<td>{{$inputs['patientInfo']['sex']}}</td>
		</tr>
		<tr>
			<th colspan="2">Series</th>
			<td colspan="3">
				@foreach($series_list as $key => $value)
					<p>{{$value}}</p>
				@endforeach
			</td>
		</tr>
	</table>
	<p class="submit_area">
		{{Form::button('Back to Edit', array('class' => 'common_btn link_case_input'))}}
		{{Form::button('Save', array('class' => 'common_btn case_complete', 'type' => 'submit'))}}
	</p>
{{Form::close()}}
{{Form::open(['url' => asset('case/input'), 'method' => 'POST', 'id' => 'frmBack'])}}
	{{Form::hidden('btnBack', 'btnBack')}}
{{Form::close()}}
@stop