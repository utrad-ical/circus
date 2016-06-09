<?php
/**
 * Class to perform the operation of the login screen
 */
class LoginApiController extends ApiBaseController
{
	public function login()
	{
		$input = Input::only(['id', 'password']);

		// try to authenticate using user Email
		if (!Auth::attempt(['userEmail' => $input['id'], 'password' => $input['password']])) {
			// try to authenticate using login ID
			if (!Auth::attempt(['loginID' => $input['id'], 'password' => $input['password']])) {
				// login failed
				return $this->errorResponse('Invalid credential', 401);
			}
		}

		// login succeeded
		$user = Auth::user();
		$user->lastLoginTime = new MongoDate();
		$user->lastLoginIP = $_SERVER['REMOTE_ADDR'];
		$user->save();

		return $this->succeedResponse();
	}

	public function logout()
	{
		Auth::logout();
		return $this->succeedResponse();
	}

}
