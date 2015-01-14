<?php
/**
 * Class to perform the operation of the management screen
 */
class AdminController extends BaseController {
	/**
	 * Management screen
	 */
	public function getIndex() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();

		$result['url'] = 'admin';
		$result['title'] = 'Administrator';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		return View::make('admin/index', $result);
	}

	/**
	 * Page individual CSS setting
	 * @return Page individual CSS configuration array
	 */
	function cssSetting(){
		$css = array();
	 	$css['page.css'] = 'css/page.css';
		$css['color.css'] = 'css/color.css';
	  	return $css;
	}

	/**
	 * Page individual JS setting
	 * @return Page individual JS configuration array
	 */
	function jsSetting(){
		$js = array();
		return $js;
	}
}
