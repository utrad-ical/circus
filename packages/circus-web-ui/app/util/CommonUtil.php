<?php
/**
 * 共通処理
 */
class CommonUtil {

	/**
	 * ログインチェック
	 * @param String $redirect リダイレクト先(Default:login)
	 * @return 未ログインの場合はredirectに設定されたURL(未設定の場合はログイン画面)
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
	 */
	public static function createID(){
		return hash('sha256', uniqid());
	}
}
