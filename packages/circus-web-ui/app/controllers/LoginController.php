<?php
/**
 * Class to perform the operation of the login screen
 * @since 2014/12/02
 */
class LoginController extends BaseController {
	/**
	 * Login screen display
	 * @since 2014/12/02
	 */
	public function getIndex() {
		$result = array();
		self::setCommonSettings($result);
		return View::make('login', $result);
	}

	/**
	 * Login process
	 * @since 2014/12/02
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
			$encrypt_password = openssl_encrypt($inputs['password'],'aes-256-ecb',$secret_key);
			/*
			Log::debug("暗号化前PWD::".$inputs['password']);
			Log::debug("暗号化後PWD::".$encrypt_password);
			//$encrypt_password = $inputs['password'];
			*/
			$inputs['password'] = $encrypt_password;
			if (!Auth::attempt($inputs)){
				$result['error_msg'] = 'ID or password is incorrect.';
				return View::make('login', $result);
			} else {
				//Data acquisition
				$user = Auth::user();
				$user->lastLoginDate = new MongoDate(strtotime(date('Y-m-d h:i:s')));
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
	 * @since 2014/12/11
	 */
	public function logout() {
		//Log-out processing
		Auth::logout();

		//And redirected to the login screen
		return Redirect::to('login');
	}

	/**
	 * Common setting
	 * @param $ary Result set array
	 * @since 2014/12/11
	 */
	public function setCommonSettings(&$ary) {
		$ary['title'] = 'Sign in';
		$ary['url'] = 'login';
	}
}
