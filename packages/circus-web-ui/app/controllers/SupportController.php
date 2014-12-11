<?php
/**
 * サポート画面の操作を行うクラス
 * @author stani
 * @since 2014/12/11
 */
class SupportController extends BaseController {
	/**
	 * パスワード再設定画面
	 * @author stani
	 * @since 2014/12/11
	 */
	public function forgetPassword() {
		//ログインしているのでケース検索画面の表示処理を行う
		$result = array();
		$result["title"] = "Forget Password";
		$result["url"] = "support/forget_password";
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();

		return View::make('support.forget_password', $result);
	}

	/**
	 * ページ個別のCSS設定を行う
	 * @return ページ個別のCSS設定配列
	 * @author stani
	 * @since 2014/12/11
	 */
	function cssSetting() {
		$css = array();
	  	return $css;
	}

	/**
	 * ページ個別のJSの設定を行う
	 * @return ページ個別のJS設定配列
	 * @author stani
	 * @since 2014/12/11
	 */
	//function jsSetting($mode = 'search') {
	function jsSetting() {
		$js = array();
		return $js;
	}

	/*
	function getProjectList($make_combo_flg){
		return Projects::getProjectList(Projects::AUTH_TYPE_VIEW, $make_combo_flg);
	}

	function getWeekDay($w) {
		$week = array('日', '月', '火', '水', '木', '金', '土');
		return $week[$w];
	}
	*/
}
