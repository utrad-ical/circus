@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function(){
		$('#btn_submit').click(function(){
			var btnName = arguments[1] ? arguments[1] : "btnSearch";
			console.log(btnName);
			var elm = $("<input>", {type:"hidden", name:btnName, value:btnName});
			$('#form_search').append(elm);

			$('body').append('<form id="temporaly_form" class="hidden"></form>');
			$('#search_condition_outer').find('input,select,textarea').clone().appendTo('#temporaly_form');

			var form_data	=	$('#temporaly_form').serializeArray();
			$('#temporaly_form').remove();

			//本来はシリアライズした検索条件群をサーバーに渡して必要な項目をロードする
			//モック状態での暫定的な結果画面遷移
			$('#form_search').submit();
		});

		$('.change_select').change(function(){
			// 変更するコンボIDを取得
			var change_select = $(this).attr('data-target-dom');
			// selectedにするvalueを取得
			var select_value = $("select[name='"+$(this).attr('name')+"']").val();
			// コンボのselectedを変更
			$('#'+change_select).find('option').each(function(){
				var this_num = $(this).val();
				if(this_num == select_value){
					$(this).attr('selected','selected');
				}
			});

			//検索を行うのでhidden要素を追加する
			var sort = $("select[name='sort']").val();
			var disp = $("select[name='disp']").val();
			var sort_elm = $("<input>", {type:"hidden", name:"sort", value:sort});
			$('#form_search').append(sort_elm);
			var disp_elm = $("<input>", {type:"hidden", name:"disp", value:disp});
			$('#form_search').append(disp_elm);
			//イベント発火
			$('#btn_submit').trigger('click');
		});

		$('.link_series_detail').click(function(){
			//送信するフォームIDを取得
			$(this).closest('tr').find('.form_series_detail').submit();
			return false;
		});

		$('#btn_reset').click(function(){
			//イベント発火
			$('#btn_submit').trigger('click', ['btnReset']);
		});

		//CheckboxCookie処理
		var COOKIE_NAME = "seriesCookie";
		if(typeof $.cookie(COOKIE_NAME) === "undefined"){
			var first_array = [];
			$.cookie(COOKIE_NAME , first_array , { expires: 1 });
		}
		var series_num_array = [];

		$(".chk_series").click(function () {
			alert("Cookie積むよ");
			var target_number = $(this).val();
			var num_idx = $.inArray(target_number , series_num_array);

			if($(this).prop('checked')){
				// チェックが外された場合に、印刷対象としてクッキーに追加
				if(num_idx == -1){
					series_num_array.push(target_number);
					$.cookie(COOKIE_NAME , series_num_array.join("_") , { expires: 1 });
				}
			} else {
				// チェックが入れられた場合に、印刷対象外としてクッキーから削除
				if(num_idx != -1){
					series_num_array.splice(num_idx , 1);
					$.cookie(COOKIE_NAME , series_num_array.join("_") , { expires: 1 });
				}
			}
		});
	});
</script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Series Search</h1>
			{{Form::open(['url' => asset('/series/search'), 'id' => 'form_search', 'method' => 'post', 'class' => 'mar_b_20'])}}
				<div class="al_l mar_b_10">
					{{HTML::link(asset('/series/import'), 'Series Import', array('class' => 'common_btn'))}}
				</div>
				<div class="search_form_wrap">
					<h2 class="con_ttl">Search Condition</h2>
					<table class="common_table al_l mar_b_10">
						<colgroup>
							<col width="25%">
							<col width="25%">
							<col width="25%">
							<col width="25%">
						</colgroup>
						<tr>
							<th>Series ID</th>
							<td>
								{{Form::text('seriesUID', isset($inputs['seriesUID']) ? $inputs['seriesUID'] : '', array('class' => 'common_input_text w_150'))}}
							</td>
							<th>Series Name</th>
							<td>
								{{Form::text('seriesName', isset($inputs['seriesName']) ? $inputs['seriesName'] : '', array('class' => 'common_input_text w_150'))}}
							</td>
						</tr>
						<tr>
							<th>Patient ID</th>
							<td>
								{{Form::text('patientID', isset($inputs['patientID']) ? $inputs['patientID'] : '', array('class' => 'common_input_text w_150'))}}
							</td>
							<th>Patient Name</th>
							<td>
								{{Form::text('patientName', isset($inputs['patientName']) ? $inputs['patientName'] : '', array('class' => 'common_input_text w_150'))}}
							</td>
						</tr>
						<tr>
							<th>Age</th>
							<td>
								{{Form::text('minAge', isset($inputs['minAge']) ? $inputs['minAge'] : '', array('class' => 'common_input_text w_80'))}}
								—
								{{Form::text('maxAge', isset($inputs['maxAge']) ? $inputs['maxAge'] : '', array('class' => 'common_input_text w_80'))}}
							</td>
							<th>Sex</th>
							<td>
								<label>
									{{Form::radio('sex', 'm', $inputs['sex'] == 'm' ? true : false)}}
									male
								</label>
								<label>
									{{Form::radio('sex', 'f', $inputs['sex'] == 'f' ? true : false)}}
									female
								</label>
								<label>
									{{Form::radio('sex', 'all', $inputs['sex'] == 'all' ? true : false)}}
									all
								</label>
							</td>
						</tr>
					</table>
					<p class="al_c">
						{{Form::button('Reset', array('class' => 'common_btn common_btn_green', 'id' => 'btn_reset'))}}
						{{Form::button('Search', array('class' => 'common_btn', 'type' => 'submit', 'id' => 'btn_submit'))}}
						{{Form::button('Save settings', array('class' => 'common_btn common_btn_gray', 'type' => 'submit', 'id' => 'btnSave'))}}
					</p>
				</div>
			{{Form::close()}}

			@if ($search_flg)
				{{Form::open(['url' => asset('/case/input'), 'method' => 'post', 'id' => 'form_edit_new_case'])}}
					<div class="w_900 fl_l">
						<ul class="common_pager clearfix">
							{{$list_pager->links()}}
							<li class="pager_sort_order">
								{{Form::select('sort', Config::get('const.search_series_sort'), isset($inputs['sort']) ? $inputs['sort'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'sort_order_down', 'id' => 'sort_order_up'))}}
							</li>
							<li class="pager_disp_num">
								{{Form::select('disp', Config::get('const.search_display'), isset($inputs['disp']) ? $inputs['disp'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'display_num_down', 'id' => 'display_num_up'))}}
							</li>
						</ul>
					</div>
					<p class="fl_r">
						<button type="button" value="" name="" class="common_btn" onClick="
							var checked_num	=	$('#form_edit_new_case').find('input:checkbox:checked').length;
							if(checked_num==0){
								alert('Case creation will be possible to select from a series of one at least.');
							}else{
								$('#form_edit_new_case').submit();
							}
						">Add New Case</button>
					</p>
					<div class="clear">&nbsp;</div>
					<div class="w_max pad_tb_5">
						<table class="result_table common_table">
							<colgroup>
								<col width="20%">
								<col width="20%">
								<col width="45%">
								<col width="10%">
								<col width="5%">
							</colgroup>
							<tr>
								<th>Series ID</th>
								<th>SeriesName</th>
								<th>Patient</th>
								<th colspan="2"></th>
							</tr>
							@if (count($list) > 0)
								@foreach ($list as $rec)
									<tr>
										<td>{{$rec['seriesID']}}</td>
										<td>{{$rec['seriesName']}}</td>
										<td>
											{{$rec['patientName']}} ({{$rec['patientID']}})
											<br>{{$rec['patientBirthday']}} {{$rec['patientSex']}}
										</td>
										<td class="al_c">
											{{HTML::link(asset('/series/detail'), 'View', array('class' => 'common_btn link_series_detail'))}}
										</td>
										<td class="al_c">
											{{Form::checkbox('chk_series', $rec['seriesID'], false, array('class' => 'chk_series'))}}
										</td>
										{{Form::open(['url' => asset('/series/detail'), 'method' => 'post', 'class' => 'form_series_detail'])}}
											{{Form::hidden('seriesUID', $rec['seriesID'])}}
											{{Form::hidden('mode', 'detail')}}
										{{Form::close()}}
									</tr>
								@endforeach
							@else
								<tr>
									<td colspan="5">検索結果は0件です。</td>
								</tr>
							@endif
						</table>
					</div>
					<ul class="common_pager clearfix">
						{{$list_pager->links()}}
						<li class="pager_sort_order">
							{{Form::select('sort', Config::get('const.search_series_sort'), isset($inputs['sort']) ? $inputs['sort'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'sort_order_up', 'id' => 'sort_order_down'))}}
						</li>
						<li class="pager_disp_num">
							{{Form::select('disp', Config::get('const.search_display'), isset($inputs['disp']) ? $inputs['disp'] : '', array('class' => 'w_max change_select', 'data-target-dom' => 'display_num_up', 'id' => 'display_num_down'))}}
						</li>
					</ul>
				{{Form::close()}}
			@endif
		</div>
	</div>
@include('common.navi')
</div>
<div class="clear">&nbsp;</div>
@stop
@include('common.footer')