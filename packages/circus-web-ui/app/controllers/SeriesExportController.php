<?php
/**
 * シリーズExport
 */
class SeriesExportController extends BaseController {
	/**
	 * Series Export
	 */
	public function export() {
		$result = array();

		//POST data acquisition
		$inputs = Input::all();
		Log::debug('Input Values');
		Log::debug($inputs);
		try {
			//validate check
			self::validate($inputs);

			//create temporary folder
//			$tmp_dir_path = storage_path('cache').'/'.Str::random(32);
			$tmp_dir = Str::random(32);
			$tmp_dir_path = storage_path('cache').'/'.$tmp_dir;

			if (!mkdir($tmp_dir_path))
				throw new Exception('Creating a temporary folder failed');

			//delete trash files
			CommonHelper::deletePastTemporaryFiles(storage_path('cache'));

			//command execution
			$cmd_ary = array(
						'mode' => 'series',
						'output-path' => $tmp_dir_path,
						'targetID' => $inputs['seriesUID'],
						'--compress' => true
					);

			Log::debug('command params::');
			Log::debug($cmd_ary);

			Artisan::call('image:export-volume',$cmd_ary);

			//download zip file
			$zip_file_name = $inputs['seriesUID'].'.zip';
			$zip_file_path = $tmp_dir_path.'/'.$zip_file_name;

			if (!file_exists($zip_file_path))
				throw new Exception('failed create zip file .');

			//ダウンロードに必要な情報の設定
			$res = array(
				'file_name' => $zip_file_name,
				'dir_name' => $tmp_dir
			);
			return Response::json(["status" => "OK", "response" => $res]);
		} catch (Exception $e) {
			Log::debug($e);

			if (isset($tmp_dir_path))
				CommonHelper::deleteTemporaryDirectory($tmp_dir_path);
			//return $e->getMessage();
			return Response::json(["status" => "NG", "message" => $e->getMessage()]);
		}
	}

	function download() {
		try {
			Log::debug('ダウンロード開始!');
			$inputs = Input::all();
			Log::debug($inputs);
			$zip_file_name = $inputs['file_name'];
			$tmp_dir_path = storage_path('cache').'/'.$inputs['dir_name'];
			$zip_file_path = $tmp_dir_path.'/'.$zip_file_name;

			$headers = array(
	            'Content-Type' => 'application/zip',
	            'Content-Disposition' => 'attachment; filename="'.$zip_file_name.'"',
				'Content-Length' => filesize($zip_file_path)
        	);
        	//setcookie('download', true);
        	Log::debug($zip_file_path);
       		return Response::stream(
       			function() use ($zip_file_path, $tmp_dir_path){
       				$fp = fopen($zip_file_path, 'rb');
					while(!feof($fp)) {
					    $buf = fread($fp, 1048576);
						echo $buf;
						ob_flush();
						flush();
					}
					fclose($fp);

					//delete temporary file and folder
					unlink($zip_file_path);
					rmdir($tmp_dir_path);
       			}
                , 200
                , $headers);
		} catch (Exception $e) {
			Log::debug($e);
		}
	}

	/**
	 * validate check
	 * @param $inputs input values
	 */
	function validate($inputs) {
		//seriesUID empty
		if (!isset($inputs['seriesUID']))
			throw new Exception('Please select the seriesUID .');

		//series not found
		$series = Series::find($inputs['seriesUID']);
		if (!$series)
			throw new Exception('The series does not exist .');


		//series image range specification error
		if (!isset($inputs['export_start_img']) || !isset($inputs['export_end_img']))
			throw new Exception('Please specify a series image range .');

		//out of range
		Log::debug('分割前の範囲::');
		Log::debug($series->images);
		$image_range = explode(',',$series->images);
		Log::debug('分割後の範囲::');
		Log::debug($image_range);

		$st_range_flag = false;
		$ed_range_flag = false;

		foreach($image_range as $range) {
			if (strpos($range, '-') !== false)
				list($st_range, $ed_range) = explode('-', $range);
			else
				$st_range = $ed_range = $range;

			Log::debug("開始番号::".$st_range."\t終了番号::".$ed_range);
			Log::debug("指定開始番号::".$inputs['export_start_img']."\t指定終了番号::".$inputs['export_end_img']);

			if (!$st_range_flag) {
				if (intval($inputs['export_start_img']) >= intval($st_range) &&
					intval($inputs['export_start_img']) <= intval($ed_range)) {
					Log::debug('開始番号OK');
					$st_range_flag = true;
				}
			}

			if (!$ed_range_flag) {
				if (intval($inputs['export_end_img']) >= intval($st_range) &&
					intval($inputs['export_end_img']) <= intval($ed_range)) {
					Log::debug('終了番号OK');
					$ed_range_flag = true;
				}
			}

			if ($st_range_flag && $ed_range_flag)
				break;
		}

		if (!$st_range_flag || !$ed_range_flag)
			throw new Exception('The image of out of  the scope  is specified .');
	}
}
