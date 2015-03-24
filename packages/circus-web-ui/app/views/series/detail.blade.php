@extends('common.layout')

@section('page_css')
@stop

@section('page_js')
{{HTML::script('js/jquery.cookie.js')}}
<script>
$(function() {
	//Button is pressed when you return to the series Search
	$('#btnBack').click(function() {
		$('body').append('<form action="./search" method="POST" class="hidden" id="frm_back"></form>');
		$('#frm_back').append('<input type="hidden" name="btnBack" value="">');
		$('#frm_back').submit();
		return false;
	});

	//Case registration button is pressed during
	$('.link_new_case').click(function() {
		var COOKIE_NAME = "seriesCookie";
		if(typeof $.cookie(COOKIE_NAME) === "undefined"){
			var first_array = [];
			$.cookie(COOKIE_NAME , first_array , { expires: 1, path:'/' });
		}
		var series_num_array = [];
		var target_number = "{{$series_detail['seriesUID']}}";
		series_num_array.push(target_number);
		$.cookie(COOKIE_NAME , series_num_array.join('_') , { expires: 1, path:'/'  });

		$('#form_edit_new_case').submit();
		return false;
	});
});
</script>
@stop

@section('title')
@if (isset($error_msg))
	Series Detail
@else
	{{$series_detail->seriesDescription}}
@endif
@stop

@section('page_title')
@if (isset($error_msg))
	Series Detail
@else
	{{$series_detail->seriesDescription}}
@endif
@stop

@section('content')
{{HTML::link(asset('series/search'), 'Back to Sereis list', array('class' => 'common_btn fl_l mar_r_10 disp_b', 'id' => 'btnBack'))}}
@if (isset($error_msg))
	<div class="w_500 mar_b_10">
		<br><br><span class="txt_alert">{{$error_msg}}</span>
	</div>
@else
	{{HTML::link(asset('case/input'), 'Edit New Case', array('class' => 'common_btn fl_l disp_b link_new_case'))}}
	{{Form::open(['url' => asset('case/input'), 'method' => 'post', 'id' => 'form_edit_new_case'])}}
		{{Form::hidden('back_url', 'series_detail')}}
	{{Form::close()}}
	<div class="info_area w_500 fl_r mar_b_10">
		<p class="pad_10">
			Patient: {{$series_detail->patientInfo['patientName']}} ({{$series_detail->patientInfo['patientID']}}) {{$series_detail->patientInfo['birthDate']}} {{$series_detail->patientInfo['sex']}}
			<br>Last Update: <span class="bold">{{date('Y/m/d h:i', strtotime($series_detail->updateTime))}}</span> by <span class="bold">{{$series_detail->receiveMethod}}</span>
		</p>
	</div>
	<div class="clear">&nbsp;</div>
	<div class=" img_view_area">
		<div class="img_area" id="area_axial">
			<div class="btn_prev common_btn common_btn_green" data-target-elm="slider_axial">
				Prev
			</div>
			<div class="slider_outer">
				<div id="slider_axial" class="slider_elm"></div>
			</div>
			<div class="btn_next common_btn common_btn_green" data-target-elm="slider_axial">
				Next
			</div>
			<div class="clear">&nbsp;</div>
			<div id="img_area_axial" class="img_wrap">
				<img src="http://www.spiritek.co.jp/todaitestimg/img.php?id=4&amp;count=001" id="img_axial">
				<p class="al_c disp_num">
					<span id="current_num_txt_axial">1</span>
				</p>
			</div>
		</div>
		<div class="clear">&nbsp;</div>
	</div>
@endif
@stop