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
	 * @author stani
	 * @since 2015/03/20
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
	 * @author stani
	 * @since 2015/03/20
	 */
	function setSex($sex) {
		$sexes = Config::get('const.patient_sex');
		return array_search($sex, $sexes);
	}
}