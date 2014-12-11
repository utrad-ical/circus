<?php
/**
 * ログイン画面の操作を行うクラス
 * @author stani
 * @since 2014/12/02
 */
class LoginController extends BaseController {
	/**
	 * ログイン画面表示
	 * @author stani
	 * @since 2014/12/02
	 */
	public function getIndex() {
		$result = array();
		self::setCommonSettings($result);
		return View::make('login', $result);
	}

	/**
	 * ログイン処理
	 * @author stani
	 * @since 2014/12/02
	 */
	public function login() {
		$result = array();
		self::setCommonSettings($result);

		//入力値取得
		$inputs = Input::only(array('loginID', 'password'));
		$result["loginID"] = $inputs["loginID"];

		//ID/PWともに入力ある
		if ($inputs["loginID"] && $inputs["password"]) {
			//ユーザ情報があるかチェック
			if (!Auth::attempt($inputs)){
				$result["error_msg"] = "IDまたはパスワードが間違っています。";
				return View::make('login', $result);
			} else {
				//データ取得
				$user = Auth::user();
				$user->lastLoginDate = new MongoDate(strtotime(date("Y-m-d h:i:s")));
				$user->lastLoginIP =  $_SERVER["REMOTE_ADDR"];
				$user->save();
				return Redirect::to('home');
			}
		} else {
			$result["error_msg"] = "IDおよびパスワードを入力してください。";
			return View::make('login', $result);
		}
	}

	/**
	 * ログアウト処理
	 * @author stani
	 * @since 2014/12/11
	 */
	public function logout() {
		//ログアウト処理
		Auth::logout();

		//ログイン画面にリダイレクト
		return Redirect::to('login');
	}

	/**
	 * 共通設定
	 * @param $ary 結果セット配列
	 * @author stani
	 * @since 2014/12/11
	 */
	public function setCommonSettings(&$ary) {
		$ary["title"] = "ログイン";
		$ary["url"] = "login";
	}
}
