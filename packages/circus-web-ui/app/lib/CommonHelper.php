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
	 * @param string $past_term 経過時間 (Default:-1day)
	 */
	public static function deletePastTemporaryFiles($dir_path, $past_term = '-1 day') {
		$past_dt = strtotime($past_term);
		if ($dir = opendir($dir_path)) {
			while(($file = readdir($dir)) !== false) {
				if ($file != "." && $file != ".." && $file != ".gitignore") {
					$file_last_ut = filemtime($dir_path . "/" . $file);
					if ($past_dt > $file_last_ut) {
						if (is_dir($file))
							rmdir($file);
						if (is_file($file))
							unlink($file);
					}
				}
			}
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
}