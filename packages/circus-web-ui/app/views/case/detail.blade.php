@extends('common.layout')
@include('common.header')
@section('content')
@if (!isset($error_msg))
<script type="text/javascript">
//Project-specific feature set to control the controller viewer widget
$(function(){
	//Data group to pass when you ignite the controller immediately after page load
	//The controller 1 per group to be linked to multiple viewers
	var	voxel_container	=	new voxelContainer();	//Label information storage object (three sides shared)
	voxel_container.name	=	'my_voxel';

	var the_domain = '{{{$server_url["domain"]}}}';
	var	initInfo	=	[
		{
			baseUrl : "{{{$server_url['dicom_img_base_url']}}}",
			postUrl : "{{asset('case/save_label')}}",	//Enable here if it is different from the image storage server
			caseId : "{{Session::get('caseID')}}",
			attribute : {{$attribute}},
			series : {{$series_list}},
			control : {
				window : {
					panel : false
				}
			},
			elements : {
				parent : 'page_case_detail',
				panel : 'the_panel_inner',
				label : 'the_panel_inner'
			},
			viewer : [
				{//First sheet
					elementId : 'img_area_axial',
					orientation : 'axial',
					container : voxel_container,
					number:{
						maximum : 260, //What sheets cross section is stored
						current : 44	//Initial display number
					},
					window: {
						level: {current : 1000, maximum : 50000, minimum : -5000},
						width: {current : 6000, maximum : 9000, 	minimum : 1},
						preset : [
							 {label: 'Apply from the source only to axial'	, level: 0000	, width : 2000},
						]
					},
				},
				{//2nd sheet
					elementId : 'img_area_sagital',
					orientation : 'sagital',
					container : voxel_container,
					number:{
						maximum : 511, //What sheets cross section is stored
						current : 90	//Initial display number
					}
				},
				{//2rd sheet
					elementId : 'img_area_coronal',
					orientation : 'coronal',
					container : voxel_container,
					number:{
					maximum : 511, //What sheets cross section is stored
					current : 90	//Initial display number
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
			url: '{{{$server_url["series_path"]}}}',
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
	}
	initAjax();//ajax firing

	var	controllerRun	=	function(){
		//Controller issue interlocking series one per one
		for(var j=0;	j<initInfo.length;	j++){
			$('#'+initInfo[j].wrapElementId).imageViewerController('init',initInfo[j]);
		}
	}

	$('#btnBack').click(function() {
		$('body').append('<form action="./search" method="POST" class="hidden" id="frm_back"></form>');
		$('#frm_back').append('<input type="hidden" name="btnBack" value="">');
		$('#frm_back').submit();
		return false;
	});

	$('.link_case_detail').click(function(){
		$(this).closest('td').find("input[name='mode']").val('detail');
		//Get the form ID to be sent
		$(this).closest('td').find('.form_case_detail').submit();
		return false;
	});

	$('.link_case_edit').click(function(){
		$(this).closest('td').find("input[name='mode']").val('edit');
		$(this).closest('td').find('.form_case_detail').submit();
		return false;
	});

	//Attribute information setting of Revision
	var attribute_properties = {{$label_attribute_settings}};
	var attribute_prop = $('#the_panel_attribute');
	if (initInfo[0].attribute) {
		attribute_prop.propertyeditor({properties: attribute_properties, value:initInfo[0].attribute});
	}else {
		attribute_prop.propertyeditor({properties: attribute_properties});
	}
	$('.link_add_series').click(function(){
		$('.frm_add_series').submit();
		return false;
	});

});

</script>
@endif
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique" id="page_case_detail">
			<h1 class="page_ttl">
				@if (isset($error_msg))
					Case Detail
				@else
					Case Detail (Revision {{$case_detail['revisionNo']}})
				@endif
			</h1>
			<div class="al_l mar_b_10 w_600 fl_l">
				{{HTML::link(asset('/case/search'), 'Back to Case Search Result', array('class' => 'common_btn', 'id' => 'btnBack'))}}
			@if (isset($error_msg))
				</div>
				<br><span class="txt_alert">{{$error_msg}}</span>
			@else
					{{HTML::link(asset('/series/search'), 'Add Series', array('class' => 'common_btn link_add_series'))}}
					{{Form::open(['url' => asset('series/search'), 'method' => 'POST', 'class' => 'frm_add_series'])}}
						{{Form::hidden('edit_case_id', $case_detail['caseID'])}}
					{{Form::close()}}
				</div>
				<div class="al_r mar_b_10 w_300 fl_r">
					{{Form::select('revision', $revision_no_list, $case_detail['revisionNo'], array('class' => 'select w_180'))}}
					{{HTML::link(asset('/case/detail#revision'), 'Revision List', array('class' => 'common_btn'))}}
				</div>
				<div class="clear">&nbsp;</div>
				<table class="common_table al_l mar_b_10">
					<colgroup>
						<col width="20%">
						<col width="80%">
					</colgroup>
					<tr>
						<th>Case ID</th>
						<td>{{$case_detail['caseID']}}</td>
					</tr>
					<tr>
						<th>Project Name</th>
						<td>{{$case_detail['projectName']}}</td>
					</tr>
				</table>
				<div class="w_400 fl_l">
					{{Form::open(['url' => asset('case/detail'), 'method' => 'post'])}}
						<label class="common_btn" for="img_mode_view">
							{{Form::radio('img_mode', 1, $mode == 'detail' ? true : false, array('class' => 'img_mode', 'id' => 'img_mode_view'))}}
							View
						</label>
						<label class="common_btn" for="img_mode_draw">
							{{Form::radio('img_mode', 1, $mode == 'edit' ? true : false, array('class' => 'img_mode', 'id' => 'img_mode_draw'))}}
							Draw
						</label>
						<button type='submit' class='common_btn btn_save' name='btnSave'>
							<span style="background:url({{asset('/img/common/ico_save.png')}}) no-repeat; width:22px; height:22px; display:inline-block; margin-bottom:-7px; margin-right:4px;"></span>
							Save
						</button>
					{{Form::close()}}
				</div>
				<div class="w_500 fl_r">
					<div class="info_area">
						<p class="pad_10">
							{{$case_detail['patientName']}} ({{$case_detail['patientID']}})
							<br>{{$case_detail['birthDate']}} {{$case_detail['sex']}}
						</p>
						<div class="control_panel_inner" id="the_panel_attribute"></div>
					</div>
				</div>
				<div class="clear">&nbsp;</div>
				<div class="control_panel mar_tb_10" id="the_panel">
					<div class="control_panel_inner" id="the_panel_inner">
					</div>
				</div>
				<div class=" img_view_area">
					<div class="img_area fl_l mar_b_20" id="img_area_axial"></div>
					<div class="img_area fl_r mar_b_20" id="img_area_sagital"></div>
					<div class="clear">&nbsp;</div>
					<div class="img_area fl_l mar_b_20" id="img_area_coronal"></div>
					<div class="clear">&nbsp;</div>
				</div>
				<div class="search_result">
					<a name="revision"></a>
					<h2 class="con_ttl">Revision</h2>
					<div class="pad_tb_10 result_revision_list">
						<table class="result_table common_table al_c">
							<colgroup>
								<col width="14%">
								<col width="14%">
								<col width="14%">
								<col width="14%">
								<col width="28%">
								<col width="16%">
							</colgroup>
							<tr>
								<th>Revision No.</th>
								<th>Edit Datetime</th>
								<th>Series/Label</th>
								<th>Editor Name</th>
								<th>Editor Memo</th>
								<th></th>
							</tr>
							@if (count($revision_list))
								@foreach ($revision_list as $rec)
									<tr>
										<td>{{$rec['revisionNo']}}</td>
										<td>
											{{$rec['editDate']}}<br>
											{{$rec['editTime']}}
										</td>
										<td>
											{{$rec['seriesCount']}} series<br>
											{{$rec['labelCount']}} label
										</td>
										<td>{{$rec['creator']}}</td>
										<td class="al_l">{{$rec['memo']}}</td>
										<td>
											{{Form::open(['url' => asset('/case/detail'), 'method' => 'post', 'class' => 'form_case_detail'])}}
												{{Form::hidden('mode', $mode)}}
												{{Form::hidden('caseID', $case_detail['caseID'])}}
												{{Form::hidden('revisionNo', $rec['revisionNo'])}}
												{{Form::button('View', array('class' => 'common_btn link_case_detail'))}}
												{{HTML::link(asset('/case/detail'), 'Edit', array('class' => 'common_btn mar_t_5 link_case_edit'))}}
											{{Form::close()}}
										</td>
									</tr>
								@endforeach
							@else
								<tr>
									<td colspan="6">Revision is not registered.</td>
								</tr>
							@endif
						</table>
					</div>
				</div>
			@endif
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')