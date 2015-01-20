@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function(){
		$(".load_label").click(function() {
			var data = {"caseId":$("#caseId").val()};
			console.log(data);
			$.ajax({
				url: "{{asset('case/load_label')}}",
				type: 'POST',
				data: {"data":data},
				dataType: 'json',
				error: function(){
					alert('I failed to communicate.');
				},
				success: function(res){
					console.log(res);
					if (res.response == "") {
						alert(res.message);
					} else {

						var res_str = jQuery.parseJSON(res.response);
						console.log(res_str);
						$('#result').val(res.response);
					}
				}
			});
			return false;
		});
	});
</script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Label Save Sample</h1>
			<div class="al_l mar_b_10">
				{{Form::open(['url' => asset('case/load_label'), 'method' => 'POST', 'files' => true, 'id' => 'frmSample'])}}
					<table class="common_table mar_b_10">
						<tr>
							<th>caseID</th>
							<td>{{Form::text('caseId', 'e3b8af3f79e3af403d0cbbab0fb632bc276970c2768ca6b8716e75958c136faa', array('id' => 'caseId', 'class' => 'w_500'))}}</td>
						</tr>
					</table>
					<p class="al_c">
						{{Form::button('Load Label', array('class' => 'common_btn load_label mar_t_20'))}}
					</p>
				{{Form::close()}}
				{{Form::textarea('result', '', array('id' => 'result'))}}
			</div>
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')