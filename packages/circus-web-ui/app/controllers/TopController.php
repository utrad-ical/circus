<?php
/**
 * ホーム画面の操作を行うクラス
 * @author stani
 * @since 2014/12/02
 */
class TopController extends BaseController {
	/**
	 * ホーム画面
	 * @author stani
	 * @since 2014/12/02
	 */
	public function getIndex() {
		//ログインチェック
		if (!Auth::user()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//ログインしているのでホーム画面の表示処理を行う
		$result = array();
		$result["user_name"] = Auth::user()->loginID;
		$result["title"] = "ホーム";
		$result["url"] = "home";

		return View::make('home', $result);
	}
}
