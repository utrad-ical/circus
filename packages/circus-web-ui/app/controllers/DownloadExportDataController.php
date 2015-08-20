<?php
/**
 * ExportしたものをDownload
 */
class DownloadExportDataController extends BaseController {

	public function download($download_url) {
		if (!$download_url)
			throw new Exception('Invalid download Url');

		$tgz_path = storage_path('transfer').'/'.$download_url;

		$headers = array(
			'Content-Type' => 'application/zip',
			'Content-Disposition' => 'attachment; filename="'.basename($tgz_path).'"',
			'Content-Length' => filesize($tgz_path)
		);
		return Response::stream(
	   			function() use ($tgz_path){
	   				$fp = fopen($tgz_path, 'rb');
					while(!feof($fp)) {
						$buf = fread($fp, 1048576);
						echo $buf;
						ob_flush();
						flush();
					}
					fclose($fp);
	   			}
				, 200
				, $headers);
	}
}
