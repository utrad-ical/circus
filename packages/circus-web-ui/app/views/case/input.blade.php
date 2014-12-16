@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function() {
		$('#btnBack').click(function() {
			var back_url = this.attr('action');
			$('body').append('<form action="'+back_url+'" method="POST" class="hidden" id="frm_back"></form>');
			$('#frm_back').append('<input type="hidden" name="btnBack" value="">');
			$('#frm_back').submit();
			return false;
		});
	});
</script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique" id="page_case_input">
			<h1 class="page_ttl">Add new Case</h1>
			<div class="al_l mar_b_10">
				{{HTML::link(asset($back_url), 'Back to Case Search', array('class' => 'common_btn', 'id' => 'btnBack'))}}
			</div>
			{{Form::open(['url' => asset('/case/confirm'), 'method' => 'post'])}}
				<table class="common_table mar_b_10">
					<colgroup>
						<col width="10%">
						<col width="10%">
						<col width="40%">
						<col width="10%">
						<col width="30%">
					</colgroup>
					<tr>
						<th colspan="2">Case ID</th>
						<td colspan="3">{{$inputs['caseID']}}
							<span class="font_red">(IDはシステム側で自動生成)</span>
						</td>
					</tr>
					<tr>
						<th colspan="2">Project ID</th>
						<td colspan="3">
							{{Form::select('projectID', $project_list, isset($inputs['projectID']) ? $inputs['projectID'] : '', array('common_input_select w_300'))}}
						</td>
					</tr>
					<tr>
						<th rowspan="2">Patient</th>
						<th>ID</th>
						<td>{{$patientInfo['patientID']}}</td>
						<th>Age</th>
						<td>{{$patientInfo['age']}}</td>
					</tr>
					<tr>
						<th>Name</th>
						<td>{{$patientInfo['patientName']}}</td>
						<th>Sex</th>
						<td>{{$patientInfo['sex']}}</td>
					</tr>
					<tr>
						<th colspan="2">Series</th>
						<td colspan="3">
							<p>Please correct the order of the series.</p>
							<div id="series_order_wrap" class="w_500">
								<ul class="ui-sortable">
									@foreach($series_list as $key => $value)
										<li class="ui-state-dafault">{{$value}}
											<input type="hidden" value="{{$key}}" name="series[]">
										</li>
									@endforeach
								</ul>
							</div>
						</td>
					</tr>
				</table>
				<p class="al_c">
					{{Form::button('Confirmation', array('type' => 'submit', 'class' => 'common_btn'))}}
				</p>
			{{Form::close()}}
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')