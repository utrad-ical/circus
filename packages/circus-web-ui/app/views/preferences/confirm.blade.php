@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function(){
		$('.link_user_input').click(function(){
			$('.frm_back').submit();
		});

		$('.user_complete').click(function(){
			$('.frm_complete').submit();
		});
	});
</script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Edit Preferences Confirmation</h1>
			{{Form::open(['url' => asset('/preferences/complete'), 'method' => 'post', 'class' => 'frm_complete'])}}
				<table class="common_table al_l mar_b_10">
					<colgroup>
						<col width="20%">
						<col width="80%">
					</colgroup>
					<tr>
						<th>Theme</th>
						<td>{{$inputs['preferences_theme']}}</td>
					</tr>
					<tr>
						<th>Personal View</th>
						<td>
							@if ($inputs['preferences_personalView'] == "true")
								true
							@else
								false
							@endif
						</td>
					</tr>
				</table>
				<p class="submit_area">
					{{Form::button('Back to Edit', array('class' => 'common_btn link_user_input'))}}
					{{Form::button('Save', array('class' => 'common_btn user_complete'))}}
				</p>
			{{Form::close()}}
			{{Form::open(['url' => asset('/preferences/input'), 'method' => 'POST', 'class' => 'frm_back'])}}
				{{Form::hidden('btnBack', 'btnBack')}}
			{{Form::close()}}
		</div>
	</div>
	@include('common.navi')
</div>
<div class="clear">&nbsp;</div>
@stop
@include('common.footer')