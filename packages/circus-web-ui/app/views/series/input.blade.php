@extends('common.layout')

@section('head')
{{HTML::style('css/jquery-ui.css')}}

<style>
	#task-watcher { margin: 1em; }
</style>

{{HTML::script('js/jquery-ui.min.js')}}
<script>
	var max_file_uploads = {{{$max_file_uploads}}};

	$(function () {
		var fileInput = document.getElementById('files');
		var form = document.getElementById('form');

		$('#confirm').click(function () {
			upload(fileInput.files);
		});

		var progress = $('#progress').progressbar().hide();
		var progressLabel = $('#progress-label');

		jQuery.event.props.push('dataTransfer');
		$('.droppable_area')
			.on('drop', function (event) {
				event.preventDefault();
				$(event.target).removeClass('active');
				upload(event.dataTransfer.files);
			})
			.on('dragover', false)
			.on('dragenter', function (event) {
				event.preventDefault();
				$(event.target).addClass('active');
			}).on('dragleave dragend', function (event) {
				$(event.target).removeClass('active');
				event.preventDefault();
			});

		function busy(bool) {
			if (bool) $('#message').hide();
			$('#form .common_btn, #form input:file').prop('disabled', bool);
			progress.toggle(bool);
			progressLabel.text('');
		}

		function myXhr() {
			var xhr = new XMLHttpRequest();
			xhr.upload.addEventListener('progress', function (event) {
				if (event.lengthComputable) {
					var percentComplete = Math.round((event.loaded * 100) / event.total);
					progress.progressbar('value', percentComplete);
					if (event.loaded == event.total) {
						progress.hide();
						progressLabel.hide();
					}
				}
			}, false);
			return xhr;
		}

		function upload(files) {
			var num = files && files.length;
			if (typeof num != 'number' || num <= 0) {
				return;
			}

			var fd = new FormData();
			var size = 0;

			for (var i = 0; i < files.length; i++) {
				fd.append('files[]', files[i]);
				size += files[i].size;
			}

			var prompt = num >= 2 ? 'these ' + num + ' files?' : 'this file?';
			if (num > max_file_uploads) {
				alert('Sorry, you can not upload more than ' + max_file_uploads + ' files at the same time.\n' +
					'Use a zipped file, or consult the server administrator if they can modify the current limitation.');
				return;
			}
			if (!confirm('Do you want to upload ' + prompt + ' (' + size + ' bytes)')) {
				return;
			}

			fd.append('domain', $(".select_domain option:selected").val());

			busy(true);
			var xhr = $.ajax({
				url: $('#form').attr('action'),
				type: "POST",
				data: fd,
				processData: false,
				contentType: false,
				dataType: 'json',
				xhr: myXhr,
				success: function (data) {
					$('#task-watcher').taskWatcher(data.taskID).on('finish', function() {
						form.reset();
						busy(false);
					});
				},
				error: function (data) {
					alert(data.responseJSON.errorMessage);
					busy(false);
				}
			});
		}

	});
</script>
@stop

@section('title')
Series Import
@stop

@section('page_id')
id="page_series_import"
@stop

@section('content')
	{{HTML::link(asset('series/search'), 'Back to Series Search', array('class' => 'common_btn mar_b_20'))}}
	{{Form::open(['url' => asset('series/register'), 'id' => 'form', 'method' => 'POST', 'files' => true])}}
	<p>Choose DICOM files to upload (Maximum size: {{{$max_filesize}}}, up to {{{$max_file_uploads}}} files).<br>
		You can select more than one file at a time.<br>
		Zipped DICOM files are also supported.</p>
	<p class="al_c mar_b_40">
		domain:{{Form::select('domain', $domains, $default_domain, array('class' => 'select w_180 select_domain'))}}<br>
		{{Form::file('', array('multiple' => 'multiple', 'id' => 'files'))}}
		{{Form::button('Upload', array('id' => 'confirm', 'class' => 'common_btn'))}}
		{{Form::reset('Reset', array('class' => 'common_btn'))}}
	</p>
	{{Form::close()}}
	<div class="droppable_area" draggable="true">
		You can also drag and drop files on this box to start uploading.
	</div>
	<div id="progress"><div id="progress-label"></div></div>
	<div id="task-watcher"></div>
	<p id="message" class="ui-state-highlight" style="display: none;"></p>
@stop