<?php
/**
 * 共通処理クラス
 * @author stani
 * @since 2015/03/20
 */
class CommonHelper{
	/**
	 * 性別(表示)を取得する
	 * @param String $sex 性別コード(O/F/M)
	 * @return String 性別ラベル
	 */
	public static function getSex($sex) {
		if (!$sex) return '';
		$sexes = Config::get('const.patient_sex');
		return $sexes[$sex];
	}

	/**
	 * 性別をコード値に変換する
	 * @param $sex 性別ラベル
	 * @return String 性別のコード値
	 */
	public static function setSex($sex) {
		if (!$sex) return '';
		$sexes = Config::get('const.patient_sex');
		return array_search($sex, $sexes);
	}


	/**
	 * Delete files which updated before the specified datetime in target directory (recursively).
	 * @param string $target_dir Target directory to delete.
	 * @param  bool  $preserve The flag to preserve $target_path itself (Default:false).
	 * @param string $time date/time string (Default:null => delete all files)
	 */
	public static function deleteOlderTemporaryFiles($target_dir, $preserve = false, $time = null)
	{
		if (!File::isDirectory($target_dir)) return false;

		$th_datetime = strtotime($time);
		if (!is_null($time) && $th_datetime == false) return false;

		$items = new FilesystemIterator($target_dir);

		foreach ($items as $item) {
			if ($item->isDir()) {
				self::deleteOlderTemporaryFiles(
					$item->getPathname(),
					false,
					$time);
			} else if ($item->getFilename() != ".gitignore") {
				$file_name = $item->getPathname();
				$file_datetime = File::lastModified($file_name);

				if (is_null($time) || $th_datetime > $file_datetime)
					File::delete($file_name);
			}
		}

		if (!$preserve) {
			$file_datetime = File::lastModified($target_dir);
			if (is_null($time) || $th_datetime > $file_datetime)
				@rmdir($target_dir);
		}

		return true;
	}

	/**
	 * Zipファイルダウンロード
	 * @param string $tmp_dir 対象フォルダ
	 * @param string $file_name ファイル名
	 */
	public static function downloadZip($tmp_dir, $file_name, $is_delete = true) {
		try {
			if (!$tmp_dir || !$file_name)
				throw new Exception('Please select download file .');

			$headers = array(
				'Content-Type' => 'application/zip',
				'Content-Disposition' => 'attachment; filename="'.$file_name.'"',
				'Content-Length' => filesize($tmp_dir.'/'.$file_name)
			);

	   		return Response::stream(
	   			function() use ($file_name, $tmp_dir, $is_delete){
	   				$zip_file_path = $tmp_dir.'/'.$file_name;
	   				$fp = fopen($zip_file_path, 'rb');
					while(!feof($fp)) {
						$buf = fread($fp, 1048576);
						echo $buf;
						ob_flush();
						flush();
					}
					fclose($fp);

					//delete temporary folder recursively
					if ($is_delete)
						File::deleteDirectory($tmp_dir);
	   			}
				, 200
				, $headers);
		} catch (Exception $e) {
			Log::error($e);
		}
	}

	/**
	 * download tgz file
	 * @param string $taskID taskID of task model
	 */
	public static function downloadTgz($taskID)
	{
		try {
			if (!$taskID)
				throw new Exception('Please select taskID .');

			$tgz_path = Task::getDownloadUrl($taskID);

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
		} catch (Exception $e) {
			Log::error($e);
		}
	}
}