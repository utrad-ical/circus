<?php
/**
 * Class to perform the operation of the login screen
 */
class LoginController extends BaseController {
	/**
	 * Login screen display
	 */
	public function getIndex() {
		$result = array();
		self::setCommonSettings($result);
		return View::make('login', $result);
	}

	/**
	 * Login process
	 */
	public function login() {
		$result = array();
		self::setCommonSettings($result);

		//Input value acquisition
		$inputs = Input::only(array('loginID', 'password'));
		$result['loginID'] = $inputs['loginID'];

		//Some ID / PW both input
		if ($inputs['loginID'] && $inputs['password']) {
			//Check whether there is user information
			$secret_key = Config::get('const.hash_key');
			if (!Auth::attempt($inputs)){
				$result['error_msg'] = 'ID or password is incorrect.';
				return View::make('login', $result);
			} else {
				//Data acquisition
				$user = Auth::user();
				$user->lastLoginTime = new MongoDate(strtotime(date('Y-m-d h:i:s')));
				$user->lastLoginIP =  $_SERVER['REMOTE_ADDR'];
				$user->save();
				return Redirect::to('home');
			}
		} else {
			$result['error_msg'] = 'Please enter the ID and password.';
			return View::make('login', $result);
		}
	}

	/**
	 * Log-out processing
	 */
	public function logout() {
		//Log-out processing
		Session::flush();
		Auth::logout();

		//And redirected to the login screen
		return Redirect::to('login');
	}

	/**
	 * Common setting
	 * @param $ary Result set array
	 */
	public function setCommonSettings(&$ary) {
		$ary['title'] = 'Sign in';
		$ary['url'] = 'login';
	}
}
