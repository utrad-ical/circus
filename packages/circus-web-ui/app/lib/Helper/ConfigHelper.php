<?php

namespace Helper;

class ConfigHelper {
	/**
	 * サーバー情報取得
	 * @param String $key 取得キー
	 * @author stani
	 * @since 2015/03/20
	 */
	public static function getServerConfig($key = null) {
		return self::getConfig('server_config.json', $key , true);
	}

	/**
	 * 詳細検索項目取得
	 * @param String $key 取得キー
	 * @author stani
	 * @since 2015/03/20
	 */
	public static function getDetailSearchConfig($key = null) {
		return self::getConfig('case_detail_search.json', $key);
	}

	/**
	 * コンフィグファイルから値を取得する
	 * @param String $file_name コンフィグファイル名
	 * @param String $key 取得キー
	 * @author stani
	 * @since 2015/03/20
	 */
	private static function getConfig($file_name, $key = null, $json = false) {
		$file_path = app_path().'/config/'.$file_name;
		$handle = fopen($file_path, 'r');
		$res = fread($handle, filesize($file_path));
		if ($json)
			$res = json_decode($res, true);
		fclose($handle);
		return $key === null ? $res : (array_key_exists($key, $res) ? $res[$key] : '');
	}
}