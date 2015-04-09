<?php
/**
 * 共通処理クラス
 * @author stani
 * @since 2015/03/20
 */
class CommonHelper{
	/**
	 * 曜日(表示)を取得する
	 * @param $w 曜日を表す数値
	 * @author stani
	 * @since 2015/03/20
	 */
	public static function getWeekDay($w) {
		$week = Config::get('const.week_day');
		return $week[$w];
	}

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
	 * 一定期間以上経過したテンポラリファイルを削除する
	 * @param string $past_term 経過時間 (Default:-1 day)
	 */
	public static function deletePastTemporaryFiles($dir_path, $past_term = '-1 day') {
		$past_dt = strtotime($past_term);
		Log::debug('基準日::'.$past_dt);

		$files = new RecursiveIteratorIterator(
			new RecursiveDirectoryIterator(
				$dir_path,
				FilesystemIterator::CURRENT_AS_FILEINFO |
				FilesystemIterator::KEY_AS_PATHNAME |
				FilesystemIterator::SKIP_DOTS
			),
			RecursiveIteratorIterator::SELF_FIRST
		);

		//ファイル削除
		$delete_dir = array();
		foreach($files as $path => $info){
			$file_name = $info->getFileName();
			if ($file_name != "." && $file_name != ".." && $file_name != ".gitignore") {
				if($info->getMTime() < $past_dt){
					Log::debug('削除対象ファイル::'.$path);
					if (is_file($path))
						unlink($path);

					//ファイルが空でないので、削除対象のフォルダを記録しておく
					if (is_dir($path))
						$delete_dir[] = $path;
				}
			}
		}

		//フォルダ削除
		foreach ($delete_dir as $dir) {
			rmdir($dir);
		}
	}

	/**
	 * テンポラリフォルダを削除する
	 * @param string $dir_path 削除対象のフォルダパス
	 */
	public static function deleteTemporaryDirectory($dir_path) {
		if (!file_exists($dir_path)) return;

		$fileName = $dir_path.'/*';
		foreach (glob($fileName) as $val) {
			unlink($val);
		}
		rmdir($dir_path);
	}

	/**
	 * Zipファイルダウンロード
	 * @param string $tmp_dir 対象フォルダ
	 * @param string $file_name ファイル名
	 */
	public static function downloadZip($tmp_dir, $file_name) {
		try {
			if (!$tmp_dir || !$file_name)
				throw new Exception('Please select download file .');

			$headers = array(
				'Content-Type' => 'application/zip',
				'Content-Disposition' => 'attachment; filename="'.$file_name.'"',
				'Content-Length' => filesize($tmp_dir.'/'.$file_name)
			);

	   		return Response::stream(
	   			function() use ($file_name, $tmp_dir){
	   				$zip_file_path = $tmp_dir.'/'.$file_name;
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
					rmdir($tmp_dir);
	   			}
				, 200
				, $headers);
		} catch (Exception $e) {
			Log::debug($e);
		}
	}
}