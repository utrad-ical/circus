<?php
/**
 * Class to perform the operation of support screen
 */
class SupportController extends BaseController {
	/**
	 * Password reset screen
	 */
	public function forgetPassword() {
		$result = array();
		$result['title'] = 'Forget Password';
		$result['url'] = 'support/forget_password';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		return View::make('support.forget_password', $result);
	}

	/**
	 * Individual CSS setting page
	 * @return Page individual CSS configuration array
	 */
	function cssSetting() {
		$css = array();
	  	return $css;
	}

	/**
	 * Individual JS setting page
	 * @return Page individual JS configuration array
	 */
	function jsSetting() {
		$js = array();
		return $js;
	}
}
