@extends('common.layout')

@section('page_css')
{{HTML::style('css/ui-lightness/jquery-ui-1.10.4.custom.min.css')}}
{{HTML::style('css/page_lib.css')}}
@stop

@section('page_js')
{{HTML::script('js/jquery.cookie.js')}}
{{HTML::script('js/jquery-ui.min.js')}}
{{HTML::script('js/canvastool.pngencoder.min.js')}}
{{HTML::script('js/voxelContainer.js')}}
{{HTML::script('js/imageViewer.js')}}
{{HTML::script('js/imageViewerController.js')}}
{{HTML::script('js/export-common.js')}}

@if (!isset($error_msg))
<script>
var series_slider_max = 0;
//Project-specific feature set to control the controller viewer widget
$(function(){
	//Data group to pass when you ignite the controller immediately after page load
	//The controller 1 per group to be linked to multiple viewers
	var	voxel_container	=	new voxelContainer();	//Label information storage object (three sides shared)
	voxel_container.name	=	'my_voxel';

	var	initInfo	=	[
		{
			baseUrl : "{{{Helper\ConfigHelper::getServerConfig('dicom_img_base_url')}}}",
			series : {{$series_list}},
			control : {
				window : {
					panel : false
				}
			},
			elements : {
				parent : 'page_series_detail',
				panel : 'the_panel_inner',
				label : 'the_panel_inner'
			},
			control: {
			      boldness: {
			        active: false,
			        value: 1
			      }, //太さ変更
			      bucket: {
			        active: false,
			        value: 1
			      }, //太さ変更
			      measure: {
			        active: true, //定規機能の有効・無効
			        panel: true //定規表示パネルの有無
			      },
			      color: {
			        control: false //カラーピッカーの有無
			      },
			      pan: true, //手のひらツール
			      window: {
			        active: true,
			        panel: true
			      },
			      pen: {
			        active: false, //描画機能の有効・無効
			        panel: false, //ラベル情報表示パネルの有無
			      },
			      show: true, //そもそもコントロールパネルを置くかどうか
			      undo: false //戻す・やり直す一括
			},
			viewer : [
				{//First sheet
					elementId : 'img_area_axial',
					orientation : 'axial',
					container : voxel_container,
					number:{
						maximum : 260, //What sheets cross section is stored
						current : 0	//Initial display number
					},
					window: {
						level: {current : 1000, maximum : 50000, minimum : -5000},
						width: {current : 6000, maximum : 9000, 	minimum : 1},
						preset : [
							 {label: 'Apply from the source only to axial'	, level: 0000	, width : 2000},
						]
					}
				}
			]
		}
	];

	//accept a series information from node.js by performing a number worth of ajax of series
	var ajax_cnt = 0;
	var initAjax= function(){
		var tmp_series = initInfo[0].series[ajax_cnt];
		$.ajax({
			url: '{{{Helper\ConfigHelper::getServerConfig("series_path")}}}',
			type: 'GET',
			data: {
				mode : 'metadata',
				series : tmp_series.id
			},//Transmitted data
			dataType: 'json',
			error: function(){
				alert('I failed to communicate');
			},
			success: function(response){

				if(typeof response.allow_mode != 'undefined'){
					tmp_series.allow_mode = 	$.extend(true,tmp_series.allow_mode ,response.allow_mode);
				}

				if(typeof tmp_series.voxel != 'object'){
					tmp_series.voxel =  new Object();
				}

				if(typeof response.voxel_x == 'number'){
					tmp_series.voxel.voxel_x = response.voxel_x;
				};

				if(typeof response.voxel_y == 'number'){
					tmp_series.voxel.voxel_y = response.voxel_y;
				};

				if(typeof response.voxel_z == 'number'){
					tmp_series.voxel.voxel_z = response.voxel_z;
				};

				if(typeof response.x == 'number'){
					tmp_series.voxel.x = response.x;
				};

				if(typeof response.y == 'number'){
					tmp_series.voxel.y = response.y;
				};

				if(typeof response.z == 'number'){
					tmp_series.voxel.z = response.z;
				};

				if(typeof response.window_level == 'number'){
					tmp_series.window.level.current = response.y;
				};

				if(typeof response.window_width == 'number'){
					tmp_series.window.width.current = response.window_width;
				};

				if(ajax_cnt==initInfo[0].series.length-1){
					controllerRun();
				}else{
					ajax_cnt++;
					initAjax();
				}
			}
		});
	};
	initAjax();//ajax firing

	var	controllerRun	=	function(){
		//Controller issue interlocking series one per one
		for(var j=0;	j<initInfo.length;	j++){
			$('#'+initInfo[j].wrapElementId).imageViewerController('init',initInfo[j]);
		}
	};

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
@endif
@stop

@section('title')
	Series Detail
@stop

@section('page_title')
	Series Detail
@stop

@section('page_id')
id="page_series_detail"
@stop

@section('content')

<div class="al_l">
	{{HTML::link(asset('series/search'), 'Back to Series Search Result', array('class' => 'common_btn mar_r_10', 'id' => 'btnBack'))}}
	@if(!isset($error_msg))
		{{HTML::link(asset('case/input'), 'Add New Case', array('class' => 'common_btn fl_l link_new_case mar_r_10'))}}
		{{HTML::link(asset('series/export'), 'Export', array('class' => 'common_btn btn_export mar_r_10'))}}
		{{Form::open(['url' => asset('case/input'), 'method' => 'post', 'id' => 'form_edit_new_case'])}}
			{{Form::hidden('back_url', 'series_detail')}}
		{{Form::close()}}
	@endif
</div>

@if (isset($error_msg))
	<p class="txt_alert">{{$error_msg}}</p>
@else

	<div class="export_area" style="display:none;">
		<div class="pad_20">
			@include('series.export')
		</div>
	</div>
	<div class="control_panel mar_tb_10" id="the_panel">
		<div class="control_panel_inner" id="the_panel_inner">
		</div>
	</div>
	<div class=" img_view_area">
		<div class="img_area fl_l mar_b_20" id="img_area_axial"></div>
		<div class="img_area fl_r mar_b_20" id="">
			<div class="info_area">
					<div  class="pad_10">
							<ul>
									<li>
											<p class="elm_name">Patient Name</p>
											<p class="elm_value">{{$series_detail->patientInfo['patientName']}}</p>
									</li>
									<li>
											<p class="elm_name">Patient ID</p>
											<p class="elm_value">{{$series_detail->patientInfo['patientID']}}</p>
									</li>
									<li>
											<p class="elm_name">Birth Date</p>
											<p class="elm_value">{{$series_detail->patientInfo['birthDate']}}</p>
									</li>
									<li>
											<p class="elm_name">Sex</p>
											<p class="elm_value">{{CommonHelper::getSex($series_detail->patientInfo['sex'])}}</p>
									</li>
							</ul>
					</div>
		</div>
		</div>
		<div class="clear">&nbsp;</div>
	</div>
@endif
@stop