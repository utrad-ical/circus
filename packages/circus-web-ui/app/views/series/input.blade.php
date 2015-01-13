@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function(){
		$('.upload_confirm').click(function(){
			if (window.confirm('Do you want to upload a file?')){
				$('#frmSeriesConfirm').submit();
			}
			return false;
		});

		$('.link_series_search').click(function(){
			$('#frmSeriesSearch').submit();
			return false;
		});
	});
</script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique" id="page_series_import">
			<h1 class="page_ttl">Series Import</h1>
			{{HTML::link(asset('series/search'), 'Back to Series Search', array('class' => 'common_btn mar_b_20 link_series_search'))}}
			{{Form::open(['url' => asset('series/complete'), 'method' => 'POST', 'files' => true, 'id' => 'frmSeriesConfirm'])}}
				<div class="droppable_area" id=""  draggable="true">
					<p class="mar_b_10">Choose files to upload.
						<br>You can select more than one file at a time.
						<br>You can also drag and drop files anywhere on this gray box to start uploading.
					</p>
					{{Form::file('upload_file[]', array('class' => 'upload_file_input_elm', 'multiple' => 'multiple', 'id' => 'form'))}}
				</div>
				<p class="al_c">
					{{Form::button('Save', array('class' => 'common_btn upload_confirm mar_t_20'))}}
				</p>
			{{Form::close()}}
			{{Form::open(['url' => asset('series/search'), 'method' => 'POST', 'id' => 'frmSeriesSearch'])}}
				{{Form::hidden('btnBack', 'btnBack')}}
			{{Form::close()}}
			@if (isset($error_msg))
				<p class="al_c">
					<br><span class="txt_alert">{{$error_msg}}</span>
				</p>
			@endif
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')