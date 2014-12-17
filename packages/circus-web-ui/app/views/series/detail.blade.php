@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique" id="page_revision_input">
			<h1 class="page_ttl">{{$series_detail->seriesDescription}}</h1>
			{{HTML::link(asset('series/search'), 'Back to Sereis list', array('class' => 'common_btn fl_l mar_r_10 disp_b'))}}
			@if (isset($error_msg))
				<span class="text_alert">{{$error_msg}}</span>
			@else
				{{HTML::link(asset('case/input'), 'Edit New Case', array('class' => 'common_btn fl_l disp_b'))}}
				<div class="info_area w_500 fl_r mar_b_10">
					<p class="pad_10">
						Patient: {{$series_detail->patientInfo['patientName']}} ({{$series_detail->patientInfo['patientID']}}) {{$series_detail->patientInfo['birthday']}} {{$series_detail->patientInfo['sex']}}
						<br>Last Update: <span class="bold">{{$series_detail->updateTime}}</span> by <span class="bold">{{$series_detail->receiveMethod}}</span>
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
						<div class="btn_next common_btn common_btn_green"data-target-elm="slider_axial">
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