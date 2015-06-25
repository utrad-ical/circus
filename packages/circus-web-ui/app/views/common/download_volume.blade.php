<div id="dialog" title="Downloading..." style="display: none;">
  <p class="mar_10">
      Preparing for download ...
  </p>
  <div id="progress"><div id="progress-label"></div></div>
  <div id="task-watcher"></div>
</div>
{{Form::open(['url' => asset('download/volume'), 'method' => 'post', 'id' => 'frmDownload'])}}
	{{Form::hidden('file_name', '')}}
	{{Form::hidden('dir_name', '')}}
{{Form::close()}}