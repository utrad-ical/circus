<?php
/**
 * 管理画面の操作を行うクラス
 * @author stani
 * @since 2014/12/16
 */
class AdminController extends BaseController {
	/**
	 * 管理画面
	 * @author stani
	 * @since 2014/12/12
	 */
	public function getIndex() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//初期設定
		$result = array();

		$result['url'] = 'admin';
		$result['title'] = 'Administrator';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		return View::make('admin/index', $result);
	}

	/**
	 * ページ個別CSS設定
	 * @author stani
	 * @since 2014/12/16
	 */
	function cssSetting(){
		$css = array();
	 	$css["page.css"] = "css/page.css";
		$css["color.css"] = "css/color.css";
	  	return $css;
	}

	/**
	 * ページ個別のJSの設定を行う
	 * @return ページ個別のJS設定配列
	 * @author stani
	 * @since 2014/12/16
	 */
	function jsSetting(){
		$js = array();
		return $js;
	}
}
