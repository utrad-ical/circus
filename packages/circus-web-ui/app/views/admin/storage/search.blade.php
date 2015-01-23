@extends('common.layout')
@include('common.header')
@section('content')

<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Storage</h1>
			<div class="al_l mar_b_10">
				{{HTML::link('', 'Add new Storage', array('class' => 'common_btn frm_storage_enable'))}}
			</div>
			<h2 class="con_ttl">DICOM Storage</h2>
			<table class="result_table common_table">
				<colgroup>
					<col width="10%">
					<col width="50%">
					<col width="20%">
					<col width="20%">
				</colgroup>
				<tr>
					<th>Storage ID</th>
					<th>Path</th>
					<th>Current use</th>
					<th></th>
				</tr>
				@if (count($dicom_storage_list) > 0)
					@foreach ($dicom_storage_list as $rec)
						<tr>
							<td>{{$rec->storageID}}</td>
							<td>{{$rec->path}}</td>
							<td>
								@if ($rec->active == true)
									true
								@else
									false
								@endif
							</td>
							<td class="al_c">
								{{HTML::link('', 'Delete', array('class' => 'common_btn disabled'))}}
								{{HTML::link('', 'Set a current', array('class' => 'common_btn disabled'))}}
							</td>
						</tr>
					@endforeach
				@else
					<tr>
						<td colspan="4">Dicom Storage has not been registered.</td>
					</tr>
				@endif
			</table>
			<br>
			<h2 class="con_ttl">Label Storage</h2>
			<table class="result_table common_table">
				<colgroup>
					<col width="10%">
					<col width="50%">
					<col width="20%">
					<col width="20%">
				</colgroup>
				<tr>
					<th>Storage ID</th>
					<th>Path</th>
					<th>Current use</th>
					<th></th>
				</tr>
				@if (count($label_storage_list) > 0)
					@foreach ($label_storage_list as $rec)
						<tr>
							<td>{{$rec->storageID}}</td>
							<td>{{$rec->path}}</td>
							<td>
								@if ($rec->active == true)
									true
								@else
									false
								@endif
							</td>
							<td class="al_c">
								{{HTML::link('', 'Delete', array('class' => 'common_btn disabled'))}}
								{{HTML::link('', 'Set a current', array('class' => 'common_btn disabled'))}}
							</td>
						</tr>
					@endforeach
				@else
					<tr>
						<td colspan="4">Label Storage has not been registered.</td>
					</tr>
				@endif
			</table>

			<div class="frm_storage_input" style="display:none;">
			</div>
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
<script tyep="text/javascript">
	$(function() {
		$('.link_storage_edit').click(function(){
			//Get the form ID to be sent
			var post_data = $(this).closest('td').find('.frm_storage_id').serializeArray();
			var target_elm = $('.frm_storage_input');

			$.ajax({
				url: "{{asset('/admin/storage/input')}}",
				type: 'POST',
				data: post_data,
				dataType: 'json',
				error: function(){
					alert('I failed to communicate.');
				},
				success: function(res){
					target_elm.empty();
					target_elm.append(res.response);
					target_elm.attr('style', 'display:inline;');
				}
			});
			return false;
		});
	});

	//When new registration button is pressed
	$('.frm_storage_enable').click(function(){
		var post_data = '{"mode":"register"}';
		post_data = JSON.parse(post_data);
		var target_elm = $('.frm_storage_input');

		$.ajax({
			url: "{{asset('/admin/storage/input')}}",
			type: 'POST',
			data: post_data,
			dataType: 'json',
			error: function(){
				alert('I failed to communicate.');
			},
			success: function(res){
				target_elm.empty();
				target_elm.append(res.response);
				target_elm.attr('style', 'display:inline;');
			}
		});
		return false;
	});
</script>
@stop
@include('common.footer')