<?php
/**
 * 共通処理
 * @since 2014/12/22
 */
class CommonUtil {

	/**
	 * ログインチェック
	 * @param String $redirect リダイレクト先(Default:login)
	 * @return 未ログインの場合はredirectに設定されたURL(未設定の場合はログイン画面)
	 * @since 2014/12/22
	 */
	public static function isLogin($redirect = '') {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to($redirect ? $redirect : 'login');
		}
	}

	/**
	 * SHA256を用いてIDを自動生成する
	 * @return 自動生成したID
	 * @since 2014/12/22
	 */
	public static function createID(){
		return hash_hmac('sha256', uniqid(), Config::get('const.hash_key'));
	}
}
