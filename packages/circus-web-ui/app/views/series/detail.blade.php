@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
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
			console.log('cookie undefined!!');
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

<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique" id="page_revision_input">
			@if (isset($error_msg))
				<h1 class="page_ttl">Series Detail</h1>
				{{HTML::link(asset('series/search'), 'Back to Sereis list', array('class' => 'common_btn fl_l mar_r_10 disp_b', 'id' => 'btnBack'))}}
				<div class="w_500 mar_b_10">
					<br><br><span class="txt_alert">{{$error_msg}}</span>
				</div>
			@else
				<h1 class="page_ttl">{{$series_detail['seriesDescription']}}</h1>
				{{HTML::link(asset('series/search'), 'Back to Sereis list', array('class' => 'common_btn fl_l mar_r_10 disp_b', 'id' => 'btnBack'))}}

				{{HTML::link(asset('case/input'), 'Edit New Case', array('class' => 'common_btn fl_l disp_b link_new_case'))}}
				{{Form::open(['url' => asset('/case/input'), 'method' => 'post', 'id' => 'form_edit_new_case'])}}
					{{Form::hidden('back_url', 'series_detail')}}
				{{Form::close()}}
				<div class="info_area w_500 fl_r mar_b_10">
					<p class="pad_10">
						Patient: {{$series_detail['patientName']}} ({{$series_detail['patientID']}}) {{$series_detail['patientBirthday']}} {{$series_detail['patientSex']}}
						<br>Last Update: <span class="bold">{{$series_detail['LastUpdate']}}</span> by <span class="bold">{{$series_detail['creator']}}</span>
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
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')