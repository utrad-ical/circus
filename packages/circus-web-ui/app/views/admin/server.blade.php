@extends('common.layout')
@section('title')
	DICOM Server (CIRCUS RS) Management
@stop

@section('head')
	<script>
		$(function() {
			$('#status, #start, #stop').on('click', clicked);
			$('#status').click();

			function clicked(event)
			{
				var operation = $(event.target).prop('id');
				$('#forever-list').text('Loading...');
				$('#rs-status').text('');
				$.ajax({
					url: '/api/server/' + operation,
					method: 'POST'
				}).then(function(data) {
					$('#forever-list').text(data);
					if (/Forever processes running/i.test(data)) {
						$.ajax({
							url: dicomImageServerUrl() + 'status',
							method: 'GET',
							dataType: 'JSON',
							success: function(data) {
								$('#rs-status').text(JSON.stringify(data, null, '  '));
							},
							error: function() {
								$('#rs-status').text('Error');
							}
						});
					}
				});
			}
		});
	</script>
	<style>
		#forever-list, #rs-status { background-color: #ddd; line-height: 1em; overflow-x: auto; word-wrap: normal; }
		#panel { margin: 1em; }
		#panel li { display: inline-block; margin-left: 10px; }
	</style>
@stop

@section('content')

	<div id="panel">
		<ul>
			<li>
				<button class="common_btn" id="start">Start</button>
			</li>
			<li>
				<button class="common_btn" id="stop">Stop</button>
			</li>
			<li>
				<button class="common_btn" id="status">Refresh</button>
			</li>
		</ul>
	</div>
	<div id="status_pane">
		<p>Current server running:</p>
		<pre id="forever-list">Pending...</pre>
		<p>CIRCUS RS status:</p>
		<pre id="rs-status">Pending...</pre>
	</div>

@stop