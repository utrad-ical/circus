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
		$result = array("title" => "ログイン", "url" => "login");
		return View::make('login', $result);
	}

	/**
	 * ログイン処理
	 * @author stani
	 * @since 2014/12/02
	 */
	public function login() {
		$result = array();
		$result["title"] = "ログイン";
		$result["url"] = "login";

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
				return Redirect::to('home');
			}
		} else {
			$result["error_msg"] = "IDおよびパスワードを入力してください。";
			return View::make('login', $result);
		}
	}
}
