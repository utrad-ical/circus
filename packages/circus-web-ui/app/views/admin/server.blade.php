@extends('common.layout')
@section('title')
	DICOM Server (CIRCUS RS) Management
@stop

@section('head')
	<script>
		$(function() {
			refresh();
			$('#refresh').on('click', refresh);
			$('#start').on('click', start);
			$('#stop').on('click', stop);

			function refresh()
			{
				$('#status').text('Loading...');
				$.ajax({
					url: '/api/server/status',
					method: 'GET',
					cache: false
				}).then(function(data) {
					$('#status').text(data);
				});
			}

			function start()
			{
				//
			}
		});
	</script>
@stop

@section('content')

	<div id="status_pane">
		Current server status:
		<div id="status">Pending...</div>
	</div>
	<div id="panel">
		<ul>
			<li>
				<button class="common_btn" id="start">Start</button>
			</li>
			<li>
				<button class="common_btn" id="stop">Stop</button>
			</li>
			<li>
				<button class="common_btn" id="refresh">Refresh</button>
			</li>
		</ul>
	</div>

@stop