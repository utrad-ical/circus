<?php
/**
 * Class to perform the operation of the home screen
 */
class TopController extends BaseController {
	/**
	 * Home screen
	 */
	public function getIndex() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//To perform the display processing of the home screen so are logged in
		$result = array();
		$result['title'] = 'Home';
		$result['url'] = 'home';

		return View::make('home', $result);
	}
}
