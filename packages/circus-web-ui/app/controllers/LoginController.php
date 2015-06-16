<?php
/**
 * Class to perform the operation of the login screen
 */
class LoginController extends BaseController
{
	/**
	 * Login screen display
	 */
	public function getIndex()
	{
		return View::make('login');
	}

	/**
	 * Login process
	 */
	public function login()
	{
		$inputs = Input::only(array('loginID', 'password'));
		$param = array('loginID' => $inputs['loginID']);

		if (!strlen($inputs['loginID']) || !strlen($inputs['password'])) {
			$param['error_msg'] = 'Please enter your ID and password.';
			return View::make('login', $param);
		}
		//try to userEmail login
		if (!Auth::attempt(array('userEmail' => $inputs['loginID'], 'password' => $inputs['password']))) {
			//try to loginID login
			if (!Auth::attempt($inputs)) {
				//login failed
				$param['error_msg'] = 'Invalid ID or password.';
				return View::make('login', $param);
			}
		}

		// login succeeded
		$user = Auth::user();
		$user->lastLoginTime = new MongoDate();
		$user->lastLoginIP = $_SERVER['REMOTE_ADDR'];
		$user->save();
		return Redirect::to('home');
	}

	/**
	 * Logout process
	 */
	public function logout()
	{
		Session::flush();
		Auth::logout();
		return Redirect::to('login');
	}

}
