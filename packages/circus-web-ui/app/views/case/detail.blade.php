@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	//コントローラ・ビューアーウィジェットをコントロールするための案件固有の機能群
	$(function(){
		//ページロード直後にコントローラを発火させるときに渡すデータ群
		//複数ビューアーを連動させる１グループにつき１コントローラ
		var	voxel_container	=	new voxelContainer();	//ラベル情報格納用オブジェクト(3面共用)
		voxel_container.name	=	'my_voxel';

		//var	the_domain	=	'http://todai/';
		//var the_domain = 'http://{{$_SERVER["SERVER_NAME"]}}:3000/';
		//var	the_domain	=	'http://ndp.spiritek.co.jp/';
		var the_domain = 'http://160.16.56.191:3000/';
		var	initInfo	=	[
			{
				baseUrl : 'http://160.16.56.191:3000/', //画像格納ディレクトリ
				//baseUrl : 	'http://ndp.spiritek.co.jp/insight/todai_img', //外用でinsight参照の場合
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
					{//1枚目
						elementId : 'img_area_axial',
						orientation : 'axial',
						container : voxel_container,
						number:{
							maximum : 260, //何枚の断面が格納されているか
							current : 44	//初期の表示番号
						},
						window: {
							level: {current : 1000, maximum : 50000, minimum : -5000},
							width: {current : 6000, maximum : 9000, 	minimum : 1},
							preset : [
								{label: 'ソースからaxialだけに適用'	, level: 0000	, width : 2000},
							]
						},
					},
					{//2枚目
						elementId : 'img_area_sagital',
						orientation : 'sagital',
						container : voxel_container,
						number:{
							maximum : 511, //何枚の断面が格納されているか
							current : 90	//初期の表示番号
						}
					},
					{//3枚目
						elementId : 'img_area_coronal',
						orientation : 'coronal',
						container : voxel_container,
						number:{
							maximum : 511, //何枚の断面が格納されているか
							current : 90	//初期の表示番号
						}
					}
				]
			}
		];

		//seriesの個数分のajaxを行ってnode.jsからseries情報をもらう
		var ajax_cnt = 0;
		var initAjax= function(){
			var tmp_series = initInfo[0].series[ajax_cnt];
			$.ajax({
				//url: the_domain+'insight/todai_img',
				//url: the_domain,
				url: "{{asset('series/get_series')}}",
				type: 'GET',
				data: {
					mode : 'metadata',
					target:60,
					series : tmp_series.image.id
				},//送信データ
				dataType: 'json',
				error: function(){
					alert('I failed to communicate.');
				},
				success: function(response){

					if(typeof response.allow_mode != 'undefined'){
						tmp_series.allow_mode = $.extend(true,tmp_series.allow_mode ,response.allow_mode);
					}

					if(typeof tmp_series.image.voxel != 'object'){
						tmp_series.image.voxel = new Object();
					}

					if(typeof response.voxel_x == 'number'){
						tmp_series.image.voxel.voxel_x = response.voxel_x;
					};

					if(typeof response.voxel_y == 'number'){
						tmp_series.image.voxel.voxel_y = response.voxel_y;
					};

					if(typeof response.voxel_z == 'number'){
						tmp_series.image.voxel.voxel_z = response.voxel_z;
					};

					if(typeof response.x == 'number'){
						tmp_series.image.voxel.x = response.x;
					};

					if(typeof response.y == 'number'){
						tmp_series.image.voxel.y = response.y;
					};

					if(typeof response.z == 'number'){
						tmp_series.image.voxel.z = response.z;
					};

					if(typeof response.window_level == 'number'){
						tmp_series.image.window.level.current = response.y;
					};

					if(typeof response.window_width == 'number'){
						tmp_series.image.window.width.current = response.window_width;
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
		initAjax();//ajax発火

		var	controllerRun	=	function(){
			//連動シリーズ１つにつき１つずつコントローラ発行
			for(var j=0;	j<initInfo.length;	j++){
				$('#'+initInfo[j].wrapElementId).imageViewerController('init',initInfo[j]);
			}
		}

	});
</script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique" id="page_case_detail">
			<h1 class="page_ttl">Case Detail ({{$case_detail['revisionNo']}})</h1>
			@if (isset($error_msg))
				<div class="al_l mar_b_10 w_600 fl_l">
					{{HTML::link(asset('/case/search'), 'Back to Case Search Result', array('class' => 'common_btn', 'id' => 'btnBack'))}}
				</div>
				<span class="text_alert">{{$error_msg}}</span>
			@else
				<div class="al_l mar_b_10 w_600 fl_l">
					{{HTML::link(asset('/case/search'), 'Back to Case Search Result', array('class' => 'common_btn', 'id' => 'btnBack'))}}
				</div>
				<div class="al_r mar_b_10 w_300 fl_r">
					{{Form::select('revision', $revision_no_list, $case_detail['revisionNo'], array('class' => 'select w_180'))}}
					{{HTML::link(asset('/case/detail#revision'), 'Revision List', array('class' => 'common_btn'))}}
				</div>
				<div class="clear">&nbsp;</div>
				<table class="common_table al_l mar_b_10">
					<colgroup>
						<col width="20%">
						<col width="30%">
						<col width="20%">
						<col width="30%">
					</colgroup>
					<tr>
						<th>Case ID</th>
						<td colspan="3">{{$case_detail['caseID']}}</td>
					</tr>
					<tr>
						<th>Project ID</th>
						<td>{{$case_detail['projectID']}}</td>
						<th>Project Name</th>
						<td>{{$case_detail['projectName']}}</td>
					</tr>
				</table>
				<div class="w_400 fl_l">
					<label class="common_btn" for="img_mode_view">
						{{Form::radio('img_mode', 1, $mode == 'detail' ? true : false, array('class' => 'img_mode', 'id' => 'img_mode_view'))}}
						View
					</label>
					<label class="common_btn" for="img_mode_draw">
						{{Form::radio('img_mode', 1, $mode == 'edit' ? true : false, array('class' => 'img_mode', 'id' => 'img_mode_draw'))}}
						Draw
					</label>
					<button type='submit' class='common_btn' name='btnSave'>
						<span style="background:url({{asset('/img/common/ico_save.png')}}) no-repeat; width:22px; height:22px; display:inline-block; margin-bottom:-7px; margin-right:4px;"></span>
						Save
					</button>
				</div>
				<div class="w_500 fl_r">
					<div class="info_area">
						<p class="pad_10">
							{{$case_detail['patientName']}} ({{$case_detail['patientID']}})
							<br>{{$case_detail['birthday']}} {{$case_detail['sex']}}
						</p>
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
					<ul class="common_pager clearfix">
						{{$list_pager->links()}}
						<li class="pager_sort_order">
							{{Form::select('sort', Config::get('const.search_revision_sort'), isset($inputs['sort']) ? $inputs['sort'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'sort_order_down', 'id' => 'sort_order_up'))}}
						</li>
						<li class="pager_disp_num">
							{{Form::select('disp', Config::get('const.search_display'), isset($inputs['disp']) ? $inputs['disp'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'display_num_down', 'id' => 'display_num_up'))}}
						</li>
					</ul>
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
										<td class="">
											{{Form::open(['url' => asset('/case/detail'), 'method' => 'post', 'class' => 'form_case_detail'])}}
												{{Form::hidden('mode', $mode)}}
												{{Form::hidden('caseID', $case_detail['caseID'])}}
												{{Form::hidden('revisionNo', $rec['revisionNo'])}}
												{{Form::button('View', array('class' => 'common_btn link_case_detail'))}}
												{{HTML::link(asset('/case/detail'), 'Edit', array('class' => 'common_btn mar_t_5 link_case_detail'))}}
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
					<ul class="common_pager clearfix">
						{{$list_pager->links()}}
						<li class="pager_sort_order">
							{{Form::select('sort', Config::get('const.search_revision_sort'), isset($inputs['sort']) ? $inputs['sort'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'sort_order_up', 'id' => 'sort_order_down'))}}
						</li>
						<li class="pager_disp_num">
							{{Form::select('disp', Config::get('const.search_display'), isset($inputs['disp']) ? $inputs['disp'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'display_num_up', 'id' => 'display_num_down'))}}
						</li>
					</ul>
				</div>
				{{Form::open(['url' => asset('/case/detail'), 'method' => 'post', 'id' => 'form_search'])}}
					{{Form::hidden('revisionNo', $case_detail['revisionNo'])}}
					{{Form::hidden('caseID', $case_detail['caseID'])}}
					{{Form::hidden('mode', $mode)}}
				{{Form::close()}}
			@endif
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')