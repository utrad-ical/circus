<?php
/**
 * Class to perform the operation of support screen
 * @since 2014/12/11
 */
class SupportController extends BaseController {
	/**
	 * Password reset screen
	 * @since 2014/12/11
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
	 * @since 2014/12/11
	 */
	function cssSetting() {
		$css = array();
	  	return $css;
	}

	/**
	 * Individual JS setting page
	 * @return Page individual JS configuration array
	 * @since 2014/12/11
	 */
	function jsSetting() {
		$js = array();
		return $js;
	}
}
