<div id="dialog" title="Downloading..." style="display:none;">
  <p>
      ダウンロードしています。<br>
      もうしばらくお待ちください。
  </p>
  <div id="progressbar"></div>
</div>
{{Form::open(['url' => asset('download/volume'), 'method' => 'post', 'id' => 'frmDownload'])}}
	{{Form::hidden('file_name', '')}}
	{{Form::hidden('dir_name', '')}}
{{Form::close()}}