<?php
/**
 * Classes for user operation
 */
class UserController extends BaseController {
	/**
	 * User search results
	 */
	public function search() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();

		//Session discarded
		Session::forget('user_input');
		Session::forget('userID');

		//Input value acquisition
		$inputs = Input::all();

		//Data acquisition
		//Setting of acquisition column
		$select_col = array('userID', 'description', 'groups', 'loginID');

		//Total number acquisition
		$user_count = User::count();

		//Search result acquisition
		$user_list = User::orderby('userID', 'desc')
							->get($select_col);

		$list = array();
		if (count($user_list) > 0) {
			foreach ($user_list as $rec) {
				$list[] = array(
					'userID'		=>	$rec->userID,
					'loginID'		=>	$rec->loginID,
					'description'	=>	$rec->description,
					'groupName'		=>	self::getGroupNameDisp($rec->groups)
				);
			}
		}

		$result['title'] = 'User';
		$result['url'] = 'admin/user/search';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();
		$result['user_list'] = $list;

		return View::make('admin/user/search', $result);
	}

	/**
	 * User Details screen
	 */
	public function detail() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Error message initialization
		$error_msg = '';
		$result = array();

		//POST data acquisition
		$inputs = Input::all();

		if (array_key_exists('userID', $inputs) === FALSE)
			$error_msg = 'Please specify a user ID.';

		if (!$error_msg) {
			$user_data = User::find(intval($inputs['userID']));
			$query_log = DB::getQueryLog();
			if (!$user_data) {
				$error_msg = 'There is a user ID that does not.';
			}
		}

		//I want to display the user detailed information if there is no error message
		if (!$error_msg) {
			$result['user_detail'] = array(
				'userID'					=>	$user_data->userID,
				'loginID'					=>	$user_data->loginID,
				'updateTime'				=>	$user_data->updateTime,
				'createTime'				=>	$user_data->createTime,
				'description'				=>	$user_data->description,
				'loginEnabled'				=>	$user_data->loginEnabled,
				'groupName'					=>	self::getGroupNameDisp($user_data->groups),
				'preferences_theme'			=>	$user_data->preferences['theme'],
				'preferences_personalInfoView'	=>	$user_data->preferences['personalInfoView']
			);
		} else {
			$result['error_msg'] = $error_msg;
		}
		$result['title'] = 'User Detail';
		$result['url'] = 'admin/user/detail';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		$tmp = View::make('/admin/user/detail', $result);
		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => '', 'response' => "$tmp"));
		echo $res;
	}

	/**
	 * User registration input
	 */
	public function input() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();
		$error_msg = '';
		//Input value acquisition
		$inputs = Input::all();
		//Settings page
		$result['url'] = '/admin/user/input';
		$result['back_url'] = '/user/search';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		if (array_key_exists('btnBack', $inputs)) {
			$result['inputs'] = Session::get('user_input');
		} else if (array_key_exists('userID', $inputs)) {
			Session::put('mode', 'Edit');
			$user_data = User::find(intval($inputs['userID']));
			if (!$user_data) {
				$error_msg = 'There is a user ID that does not.';
			} else {
				$result['inputs'] = array(
					'userID'					=>	$user_data->userID,
					'loginID'					=>	$user_data->loginID,
					'updateTime'				=>	$user_data->updateTime,
					'createTime'				=>	$user_data->createTime,
					'description'				=>	$user_data->description,
					'loginEnabled'				=>	$user_data->loginEnabled,
					'groups'					=>	$user_data->groups,
					'preferences_theme'			=>	$user_data->preferences['theme'],
					'preferences_personalInfoView'	=>	$user_data->preferences['personalInfoView']
				);
			}
			Session::put('userID', $inputs['userID']);
		} else {
			Session::put('mode', 'Add new');
			$max_user_id = User::max('userID');
			$result['inputs']['userID'] = $max_user_id+1;
		}

		//Setting of title
		$mode = Session::get('mode');
		$result['title'] = $mode.' User';

		//Set of error messages
		if ($error_msg) {
			$result['error_msg'] = $error_msg;
		} else {
			$result['group_list'] = self::getGroupList();
			Session::put('user_input', $result['inputs']);
		}

		$tmp = View::make('/admin/user/input', $result);
		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => '', 'response' => "$tmp"));
		echo $res;
	}

	/**
	 * User registration confirmation
	 */
	public function confirm() {
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		//Input value acquisition
		$inputs = Input::all();
		$user_data = Session::get('user_input');
		$inputs['userID'] = $user_data['userID'];

		//Set of Checkbox system
		$inputs['loginEnabled'] = isset($inputs['loginEnabled']) ? $inputs['loginEnabled'] : false;
		$inputs['preferences_personalInfoView'] = isset($inputs['preferences_personalInfoView']) ? $inputs['preferences_personalInfoView'] : false;
		Session::put('user_input', $inputs);

		$result['inputs'] = $inputs;
		$result['inputs']['groupName'] = self::getGroupNameDisp($inputs['groups']);

		//Session information acquisition
		$userID = Session::get('userID');

		//Validate check for object creation
		$user_obj = $userID ?
						User::find(intval($userID)) : App::make('User');

		//Set the value for the Validate check
		$user_obj->userID = $inputs['userID'];
		$user_obj->loginID = $inputs['loginID'];
		$user_obj->password = $inputs['password'];
		$user_obj->groups = $inputs['groups'];
		$user_obj->description = $inputs['description'];
		$user_obj->loginEnabled = (bool)$inputs['loginEnabled'];
		$user_obj->preferences = array(
			'preferences_theme' 		=>	$inputs['preferences_theme'],
			'preferences_personalInfoView'	=>	(bool)$inputs['preferences_personalInfoView']
		);

		//ValidateCheck
		$errors = $user_obj->validate($inputs);
		if ($errors) {
			//Process at the time of Validate error
			$result['title'] = 'Add new User';
			$result['url'] = '/admin/user/input';
			//$result['errors'] = $validator->messages();
			$result['errors'] = $errors;
			$result['group_list'] = self::getGroupList();
			$tmp =  View::make('/admin/user/input', $result);
		} else {
			//And displays a confirmation screen because there is no error
			$result['title'] = 'Add new User Confirmation';
			$result['url'] = '/admin/user/confirm';
			$tmp = View::make('/admin/user/confirm', $result);
		}

		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => '', 'response' => "$tmp"));
		echo $res;
	}

	/**
	 * User registration
	 */
	public function register(){
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		//Information obtained from the session
		$inputs = Session::get('user_input');
		$userID = Session::get('userID');
		$mode = Session::get('mode');

		//Validate check for object creation
		$user_obj = $userID ?
						User::find(intval($userID)) :
						App::make('User');
		//Set the value for the Validate check
		$user_obj->userID = $inputs['userID'];
		$user_obj->loginID = $inputs['loginID'];
		$user_obj->password = Hash::make($inputs['password']);
		$user_obj->groups = $inputs['groups'];
		$user_obj->description = $inputs['description'];
		$user_obj->loginEnabled = (bool)$inputs['loginEnabled'];
		$user_obj->preferences = array(
			'theme' 		=>	$inputs['preferences_theme'],
			'personalInfoView'	=>	(bool)$inputs['preferences_personalInfoView']
		);
		//ValidateCheck
		$errors = $user_obj->validate($inputs);
		if (!$errors) {
			//Validate process at the time of success
			//I registered because there is no error
			$dt = new MongoDate(strtotime(date('Y-m-d H:i:s')));
			$user_obj->updateTime = $dt;
			$user_obj->createTime = $dt;
			$user_obj->save();

			$result['title'] = $mode.' User Complete';
			$result['url'] = '/admin/user/complete';
			$result['msg'] = 'Registration of the user information is now complete.';
			$result['userID'] = $inputs['userID'];
			//I transitions to complete screen because registration is complete
			Session::put('user_complete', $result);;
			$tmp = View::make('/admin/user/complete', $result);
		} else {
			//Process at the time of Validate error
			$result['errors'] = $errors;
			$result['inputs'] = $inputs;
			$result['group_list'] = self::getGroupList();
			$result['title'] = $mode.' User';
			$result['url'] = '/admin/user/input';
			$tmp = View::make('/admin/user/input', $result);
		}

		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => '', 'response' => "$tmp"));
		echo $res;
	}

	/**
	 * User registration / update completion screen
	 */
	public function complete(){
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Display information retrieved from the session
		$result = Session::get('user_complete');

		//Session discarded
		Session::forget('user_input');
		Session::forget('userID');
		Session::forget('user_complete');
		Session::forget('mode');

		return View::make('/admin/user/complete', $result);
	}

	/**
	 * Preferences information changes (theme / personal information display propriety)
	 */
	public function inputPreferences() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();
		$error_msg = '';
		//Input value acquisition
		$inputs = Input::all();

		//Settings page
		$result['url'] = '/preferences/input';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		//User information acquisition
		if (array_key_exists('btnBack', $inputs)) {
			$result['inputs'] = Session::get('user_input');
		} else {
			$user_data = User::find(Auth::user()->userID);
			if (!$user_data) {
				$error_msg = 'There is a user ID that does not.';
			} else {
				$result['inputs'] = json_decode($user_data, true);
				$result['inputs']['preferences_theme'] = $user_data->preferences['theme'];
				$result['inputs']['preferences_personalInfoView'] = $user_data->preferences['personalInfoView'];
			}
		}

		//Setting of title
		$mode = Session::get('mode');
		$result['title'] = $mode.' User';

		//Set of error messages
		if ($error_msg) {
			$result['error_msg'] = $error_msg;
		} else {
			$result['group_list'] = self::getGroupList();
			Session::put('user_input', $result['inputs']);
		}

		return View::make('/preferences/input', $result);
	}

	/**
	 * Change of Prferences information (confirmation screen)
	 */
	public function confirmPreferences() {
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		//Input value acquisition
		$user_data = Session::get('user_input');
		$inputs = Input::all();
		//Set of Checkbox system
		$user_data['preferences_theme'] = $inputs['preferences_theme'];
		$user_data['preferences_personalInfoView'] =
			array_key_exists('preferences_personalInfoView', $inputs) ?
				$inputs['preferences_personalInfoView'] : "false";
		Session::put('user_input', $user_data);

		//Object作成
		$user_obj = User::find(Auth::user()->userID);

		//Set the value for the Validate check
		$user_obj->preferences = array(
			'preferences_theme' 		=>	$user_data['preferences_theme'],
			'preferences_personalInfoView'	=>	$user_data['preferences_personalInfoView'] == 'true'
		);

		//ValidateCheck
		$errors = $user_obj->validate($user_data);
		$result['inputs'] = $user_data;
		if ($errors) {
			//Process at the time of Validate error
			$result['title'] = 'Edit Preferences';
			$result['url'] = '/preferences/input';
			$result['errors'] = $errors;
			return View::make('/preferences/input', $result);
		} else {
			//And displays a confirmation screen because there is no error
			$result['title'] = 'Edit Preferences Confirmation';
			$result['url'] = '/preferences/confirm';
			return View::make('/preferences/confirm', $result);
		}
	}

	/**
	 * Preferences information update
	 */
	public function registerPreferences(){
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		//Information obtained from the session
		$inputs = Session::get('user_input');

		//Validate check for object creation
		$user_obj = User::find(Auth::user()->userID);
		//Set the value for the Validate check
		$user_obj->preferences = array(
			'theme' 		=>	$inputs['preferences_theme'],
			'personalInfoView'	=> $inputs['preferences_personalInfoView'] == 'true'
		);
		//ValidateCheck
		$errors = $user_obj->validate($inputs);

		if (!$errors) {
			//Validate process at the time of success
			//I registered because there is no error
			$dt = new MongoDate(strtotime(date('Y-m-d H:i:s')));
			$user_obj->updateTime = $dt;
			$user_obj->save();

			$result['title'] = 'Edit Preferences Complete';
			$result['url'] = '/preferences/complete';
			$result['msg'] = 'Registration of the preferences information is now complete.';
			//I transitions to complete screen because registration is complete
			Session::put('user_complete', $result);
			return View::make('/preferences/complete', $result);
		} else {
			//Process at the time of Validate error
			$result['errors'] = $errors;
			$result['inputs'] = $inputs;
			$result['title'] = 'Edit Preferences';
			$result['url'] = '/preferences/input';
			return View::make('/preferences/input', $result);
		}
	}

	/**
	 * Preferences information update completion (completion screen)
	 */
	public function completePreferences(){
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Display information retrieved from the session
		$result = Session::get('user_complete');

		//Session discarded
		Session::forget('user_input');
		Session::forget('user_complete');

		return View::make('/preferences/complete', $result);
	}

	/**
	 * Change of theme (Ajax)
	 */
	public function changeTheme(){
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//POST information acquisition
		$inputs = Input::all();

		//User information acquisition
		$user_obj = User::find(Auth::user()->userID);

		//Change of theme
		$prf = $user_obj->preferences;
		$user_obj->preferences = array(
			"theme"			=>	$inputs['preferences_theme'],
			"personalInfoView"	=>	$prf["personalInfoView"]
		);

		//Validate
		$errors = $user_obj->validate(json_decode($user_obj, true));
		if (!$errors) {
			$dt = new MongoDate(strtotime(date('Y-m-d H:i:s')));
			$user_obj->updateTime = $dt;
			$user_obj->save();

			$msg = 'Change of theme has been completed.';
		} else {
			$msg = "Change of theme has failed.";
		}

		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => $msg));
		echo $res;
	}

	/**
	 * Page individual CSS setting
	 * @return Page individual CSS configuration array
	 */
	public function cssSetting($mode = 'search') {
		$css = array();
		$css['page.css'] = 'css/page.css';
		$css['color.css'] = 'css/color.css';
		$css['ui-lightness/jquery-ui-1.10.4.custom.min.css'] = 'css/ui-lightness/jquery-ui-1.10.4.custom.min.css';
	  	return $css;
	}

	/**
	 * Page individual JS setting
	 * @return Page individual JS configuration array
	 */
	public function jsSetting() {
		$js = array();
		$js['jquery-ui.min.js'] = 'js/jquery-ui.min.js';
		$js['jquery.multiselect.min.js'] = 'js/jquery.multiselect.min.js';
		return $js;
	}

	/**
	 * I get the group list
	 * @return Group List
	 */
	public function getGroupList(){
		//Acquisition of group list
		$group_list = Group::get();
		$list = array();
		foreach ($group_list as $rec) {
			$list[$rec->groupID] = $rec['groupName'];
		}
		return $list;
	}

	/**
	 * I get the name of the group
	 * @param $gids Group ID group
	 * @return Group name array
	 */
	public function getGroupNameDisp($gids = array()) {
		$group_names = Group::addWhere(array('groupID' => $gids))
							->get(array('groupName'));
		$group_name = array();
		foreach ($group_names as $group) {
			$group_name[] = $group->groupName;
		}
		return implode(',', $group_name);
	}
}
