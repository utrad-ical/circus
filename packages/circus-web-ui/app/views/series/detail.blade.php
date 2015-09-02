@extends('common.layout')

@section('head')
{{HTML::style('css/jquery-ui.css')}}
{{HTML::style('css/imageViewer.css')}}

{{HTML::script('js/jquery.cookie.js')}}
{{HTML::script('js/jquery-ui.min.js')}}
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
        var	voxel_container	= new voxelContainer();	//Label information storage object (three sides shared)
        voxel_container.name = 'my_voxel';
				
				var dicomServerHost = dicomImageServerUrl();
				var metadata_url = dicomServerHost + 'metadata';
				var dicom_image_url = dicomServerHost + 'mpr';

        var	initInfo = [
            {
                baseUrl :dicom_image_url,
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
                        active: true,
                        panel: true
                      },
                      guide:false,
                      rotate:false,
                      color: {
                        control: false
                      },
                      pan: true,
                      window: {
                        active : true,
                        panel: false
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
												guide : {
													lines : [
														{show : false, number: 0, color: 'FF7F7F', name : 'axial'},
														{show : false, number: 0, color: '7FFF7F', name : 'coronal'},
														{show : false, number: 0, color: '7F7FFF', name : 'sagittal'}
													]
												},

                        window: {
                            level: {current : 1000, maximum : 50000, minimum : -5000},
                            width: {current : 6000, maximum : 9000, minimum : 1},
                            preset : []
                        }
                    }
                ]
            }
        ];

        //accept a series information from node.js by performing a number worth of ajax of series

        var initAjax= function(){
            var tmp_series = initInfo[0].series[0];
            $.ajax({
                url: metadata_url,
								headers: {
									Authorization: 'Bearer ' + tmp_series.token
								},

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
                            tmp_series.allow_mode = $.extend(true,tmp_series.allow_mode ,response.allow_mode);
                        }

                        //set 3D length settings

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


                        //set window settings
                        if(typeof tmp_series.window != 'object'){
                            tmp_series.window = new Object();
                        }

                        if(typeof tmp_series.window.level != 'object'){
                            tmp_series.window.level = new Object();
                        }

                        if(typeof tmp_series.window.width != 'object'){
                            tmp_series.window.width = new Object();
                        }

                    if(typeof response.window_level == 'number'){
                            tmp_series.window.level.current = response.window_level;
                        };

                        if(typeof response.window_width == 'number'){
                            tmp_series.window.width.current = response.window_width;
                        };

                        tmp_series.window.preset = new Array(0);

                        //set dicom-written-info into the last of Preset array.
                        if(typeof response.window_level_dicom == 'number' && typeof response.window_width_dicom == 'number'){
                            var tmp_preset_dicom = {
                                label: 'dicom' ,
                                level: response.window_level_dicom ,
                                width: response.window_width_dicom
                            }
                            tmp_series.window.preset.push(tmp_preset_dicom);
                        };

                        //set auto-info into the last of Preset array.
                        if(typeof response.window_level == 'number' && typeof response.window_width == 'number'){
                            var tmp_preset_auto = {
                                label: 'auto' ,
                                level: response.window_level ,
                                width: response.window_width
                            }
                            tmp_series.window.preset.push(tmp_preset_auto);
                        };

                        if(typeof response.window_level_max == 'number'){
                            tmp_series.window.level.maximum = response.window_level_max;
                        };

                        if(typeof response.window_level_min == 'number'){
                            tmp_series.window.level.minimum = response.window_level_min;
                        };

                        if(typeof response.window_width_max == 'number'){
                            tmp_series.window.width.maximum = response.window_width_max;
                        };

                        if(typeof response.window_width_min == 'number'){
                            tmp_series.window.width.minimum = response.window_width_min;
                        };
												
												var tmp_viewer = initInfo[0].viewer[0];
												if(tmp_viewer.orientation == 'axial'){
													tmp_viewer.number.maximum = response.z;
													tmp_viewer.number.current = Math.ceil(tmp_viewer.number.maximum / 2);
												}

                        controllerRun();
                }
            });
        };
        initAjax();//ajax firing

        var	controllerRun	=	function(){
            //Controller issue interlocking series one per one
            for(var j=0; j<initInfo.length; j++){
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
	<p class="font_red">{{$error_msg}}</p>
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
		@if(Auth::user()->hasPrivilege(Group::PERSONAL_INFO_VIEW))
			<div class="info_area">
				<div class="pad_10">
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
			@endif
		</div>
		<div class="clear">&nbsp;</div>
	</div>
@endif
@stop