@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
$(function(){
	$('.user_confirm').click(function(){
		$(this).closest('div').find('form').submit();
		return false;
	});
});
</script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Edit Preferences</h1>
			@if (isset($error_msg))
				<span class="txt_alert">{{$error_msg}}</span>
			@else
				{{Form::open(['url' => asset('/preferences/confirm'), 'method' => 'POST'])}}
					<table class="common_table mar_b_10">
						<colgroup>
							<col width="20%">
							<col width="80%">
						</colgroup>
						<tr>
							<th>Theme</th>
							<td>
								<label>
									{{Form::radio('preferences_theme', 'mode_white', isset($inputs['preferences_theme']) && $inputs['preferences_theme'] == 'mode_white' ? true : false)}}
									mode_white
								</label>
								<label>
									{{Form::radio('preferences_theme', 'mode_black', isset($inputs['preferences_theme']) && $inputs['preferences_theme'] == 'mode_black' ? true : false)}}
									mode_black
								</label>
								@if (isset($errors) && $errors->has('preferences_theme'))
									<br><span class="txt_alert">{{$errors->first('preferences_theme')}}</span>
								@endif
							</td>
						</tr>
						<tr>
							<th>Personal View</th>
							<td>
								{{Form::checkbox('preferences_personalView', "true", isset($inputs['preferences_personalView']) && $inputs['preferences_personalView'] == "true" ? true : false)}}
								@if (isset($errors) && $errors->has('preferences_personalView'))
									<br><span class="txt_alert">{{$errors->first('preferences_personalView')}}</span>
								@endif
							</td>
						</tr>
					</table>
					<p class="al_c">
						{{Form::button('Confirmation', array('class' => 'common_btn user_confirm'))}}
					</p>
				{{Form::close()}}
			@endif
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')