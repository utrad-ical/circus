<?php
/**
 * Classes for user operation
 * @since 2014/12/17
 */
class UserController extends BaseController {
	/**
	 * User search results
	 * @since 2014/12/17
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
		$select_col = array('userID', 'description', 'groups');

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
	 * @since 2014/12/17
	 */
	public function detail() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Error message initialization
		$error_msg = "";
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
				'preferences_personalView'	=>	$user_data->preferences['personalView']
			);
		} else {
			$result['error_msg'] = $error_msg;
		}
		$result['title'] = 'User Detail';
		$result['url'] = 'admin/user/detail';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();
		return View::make('/admin/user/detail', $result);
	}

	/**
	 * User Details screen
	 * @since 2014/12/24
	 */
	public function detail_ajax() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Error message initialization
		$error_msg = "";
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
				'preferences_personalView'	=>	$user_data->preferences['personalView']
			);
		} else {
			$result['error_msg'] = $error_msg;
		}
		$result['title'] = 'User Detail';
		$result['url'] = 'admin/user/detail';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		$tmp = View::make('/admin/user/detail_ajax', $result);
		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => '', 'response' => "$tmp"));
		echo $res;
	}

	/**
	 * User registration input
	 * @since 2014/12/17
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
		$result['title'] = 'Add new User';
		$result['url'] = '/admin/user/input';
		$result['back_url'] = '/user/search';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		if (array_key_exists('btnBack', $inputs)) {
			$result['inputs'] = Session::get('user_input');
			if (array_key_exists('userID', $inputs))
				$result['title'] = 'Edit User';
		} else if (array_key_exists('userID', $inputs)) {
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
					'groups'					=>	implode(',', $user_data->groups),
					'preferences_theme'			=>	$user_data->preferences['theme'],
					'preferences_personalView'	=>	$user_data->preferences['personalView']
				);
			}
			Session::put('userID', $inputs['userID']);
		} else {
			$max_user_id = User::max('userID');
			Log::debug($max_user_id);
			$result['inputs']['userID'] = $max_user_id+1;
		}

		//Set of error messages
		if ($error_msg) {
			$result["error_msg"] = $error_msg;
		} else {
			$result['group_list'] = self::getGroupList();
			Session::put('user_input', $result['inputs']);
		}
		return View::make('/admin/user/input', $result);
	}

	/**
	 * User registration input
	 * @since 2014/12/24
	 */
	public function input_ajax() {
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
		$result['title'] = 'Add new User';
		$result['url'] = '/admin/user/input';
		$result['back_url'] = '/user/search';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		if (array_key_exists('btnBack', $inputs)) {
			$result['inputs'] = Session::get('user_input');
			if (array_key_exists('userID', $inputs))
				$result['title'] = 'Edit User';
		} else if (array_key_exists('userID', $inputs)) {
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
					'groups'					=>	implode(',', $user_data->groups),
					'preferences_theme'			=>	$user_data->preferences['theme'],
					'preferences_personalView'	=>	$user_data->preferences['personalView']
				);
			}
			Session::put('userID', $inputs['userID']);
		} else {
			$max_user_id = User::max('userID');
			$result['inputs']['userID'] = $max_user_id+1;
		}

		//Set of error messages
		if ($error_msg) {
			$result["error_msg"] = $error_msg;
		} else {
			$result['group_list'] = self::getGroupList();
			Session::put('user_input', $result['inputs']);
		}

		$tmp = View::make('/admin/user/input_ajax', $result);
		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => '', 'response' => "$tmp"));
		echo $res;
	}

	/**
	 * User registration confirmation
	 * @since 2014/12/17
	 */
	public function confirm() {
		//Login check
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
		Session::put('user_input', $inputs);

		$result['inputs'] = $inputs;
		$result['inputs']['groupName'] = self::getGroupNameDisp($inputs['groups']);

		//Session information acquisition
		$userID = Session::get('userID');

		//Validate check for object creation
		//Log::debug('userID::'.$userID);
		$user_obj = $userID ?
						User::find(intval($userID)) : App::make('User');

		//Set the value for the Validate check
		$user_obj->userID = $inputs['userID'];
		$user_obj->loginID = $inputs['loginID'];
		$user_obj->password = $inputs['password'];
		$user_obj->groups = $inputs['groups'];
		$user_obj->description = $inputs['description'];
		$user_obj->loginEnabled = $inputs['loginEnabled'];
		$user_obj->perferences = array(
			'preferences_theme' 		=>	$inputs['preferences_theme'],
			'preferences_personalView'	=>	$inputs['preferences_personalView']
		);

		//ValidateCheck
		$validator = Validator::make($inputs, User::getValidateRules());
		if ($validator->fails()) {
			//Process at the time of Validate error
			$result['title'] = 'Add new User';
			$result['url'] = '/admin/user/input';
			$result['errors'] = $validator->messages();
			$result['group_list'] = self::getGroupList();
			return View::make('/admin/user/input', $result);
		} else {
			//And displays a confirmation screen because there is no error
			$result['title'] = 'Add new User Confirmation';
			$result['url'] = '/admin/user/confirm';
			return View::make('/admin/user/confirm', $result);
		}
	}

	/**
	 * User registration confirmation(Ajax)
	 * @since 2014/12/17
	 */
	public function confirm_ajax() {
		//Login check
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
		Session::put('user_input', $inputs);

		$result['inputs'] = $inputs;
		$result['inputs']['groupName'] = self::getGroupNameDisp($inputs['groups']);

		//Session information acquisition
		$userID = Session::get('userID');

		//Validate check for object creation
		//Log::debug('userID::'.$userID);
		$user_obj = $userID ?
						User::find(intval($userID)) : App::make('User');

		//Set the value for the Validate check
		$user_obj->userID = $inputs['userID'];
		$user_obj->loginID = $inputs['loginID'];
		$user_obj->password = $inputs['password'];
		$user_obj->groups = $inputs['groups'];
		$user_obj->description = $inputs['description'];
		$user_obj->loginEnabled = $inputs['loginEnabled'];
		$user_obj->perferences = array(
			'preferences_theme' 		=>	$inputs['preferences_theme'],
			'preferences_personalView'	=>	$inputs['preferences_personalView']
		);

		//ValidateCheck
		$validator = Validator::make($inputs, User::getValidateRules());
		if ($validator->fails()) {
			//Process at the time of Validate error
			$result['title'] = 'Add new User';
			$result['url'] = '/admin/user/input';
			$result['errors'] = $validator->messages();
			$result['group_list'] = self::getGroupList();
			$tmp =  View::make('/admin/user/input_ajax', $result);
		} else {
			//And displays a confirmation screen because there is no error
			$result['title'] = 'Add new User Confirmation';
			$result['url'] = '/admin/user/confirm';
			$tmp = View::make('/admin/user/confirm_ajax', $result);
		}

	//	$tmp = View::make('/admin/user/input_ajax', $result);
		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => '', 'response' => "$tmp"));
		echo $res;
	}

	/**
	 * User registration
	 * @since 2014/12/17
	 */
	public function regist(){
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();

		//Information obtained from the session
		$inputs = Session::get('user_input');
		$userID = Session::get('userID');

		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		//Validateチェック用オブジェクト生成
		$user_obj = $userID ?
						User::find(intval($userID)) :
						App::make('User');
		//Validateチェック用の値を設定
		$user_obj->userID = $inputs['userID'];
		$user_obj->loginID = $inputs['loginID'];
		$user_obj->password = Hash::make($inputs['password']);
		$user_obj->groups = $inputs['groups'];
		$user_obj->description = $inputs['description'];
		$user_obj->loginEnabled = $inputs['loginEnabled'];
		$user_obj->preferences = array(
			'theme' 		=>	$inputs['preferences_theme'],
			'personalView'	=>	$inputs['preferences_personalView']
		);
		//ValidateCheck
		$validator = Validator::make($inputs, User::getValidateRules());
		if (!$validator->fails()) {
			//Validate成功時の処理
			//エラーがないので登録する
			$dt = new MongoDate(strtotime(date('Y-m-d H:i:s')));
			$user_obj->updateTime = $dt;
			$user_obj->createTime = $dt;
			$user_obj->save();

			if (Session::get('userID'))
				$result['title'] = 'User Edit Complete';
			else
				$result['title'] = 'Add new User Complete';
			$result['url'] = '/admin/user/complete';
			$result['msg'] = 'Registration of the user information is now complete.';
			$result['userID'] = $inputs['userID'];
			//登録が完了したので完了画面に遷移する
			Session::put('user_complete', $result);
			return Redirect::to('/admin/user/complete');
			//return View::make('/admin/user/complete', $result);
		} else {
			//Validateエラー時の処理
			$result['errors'] = $validator->messages();
			$result['inputs'] = $inputs;
			$result['group_list'] = self::getGroupList();
			if (Session::get("userID"))
				$result['title'] = 'Add new User';
			else
				$result['title'] = 'User Edit';
			$result['url'] = '/admin/user/input';
			return View::make('/admin/user/input', $result);
		}
	}

	/**
	 * User registration(Ajax)
	 * @since 2014/12/24
	 */
	public function regist_ajax(){
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();

		//Information obtained from the session
		$inputs = Session::get('user_input');
		$userID = Session::get('userID');

		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

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
		$user_obj->loginEnabled = $inputs['loginEnabled'];
		$user_obj->preferences = array(
			'theme' 		=>	$inputs['preferences_theme'],
			'personalView'	=>	$inputs['preferences_personalView']
		);
		//ValidateCheck
		$validator = Validator::make($inputs, User::getValidateRules());
		if (!$validator->fails()) {
			//Validate process at the time of success
			//I registered because there is no error
			$dt = new MongoDate(strtotime(date('Y-m-d H:i:s')));
			$user_obj->updateTime = $dt;
			$user_obj->createTime = $dt;
			$user_obj->save();

			if (Session::get('userID'))
				$result['title'] = 'User Edit Complete';
			else
				$result['title'] = 'Add new User Complete';
			$result['url'] = '/admin/user/complete';
			$result['msg'] = "Registration of the user information is now complete.";
			$result['userID'] = $inputs['userID'];
			//I transitions to complete screen because registration is complete
			Session::put('user_complete', $result);;
			$tmp = View::make('/admin/user/complete_ajax', $result);
		} else {
			//Validateエラー時の処理
			$result['errors'] = $validator->messages();
			$result['inputs'] = $inputs;
			$result['group_list'] = self::getGroupList();
			if (Session::get("userID"))
				$result['title'] = 'Add new User';
			else
				$result['title'] = 'User Edit';
			$result['url'] = '/admin/user/input';
			$tmp = View::make('/admin/user/input_ajax', $result);
		}

		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => '', 'response' => "$tmp"));
		echo $res;
	}

	/**
	 * ユーザ登録/更新完了画面
	 * @author stani
	 * @since 2014/12/17
	 */
	public function complete(){
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//セッションから表示情報取得
		$result = Session::get('user_complete');

		//セッション破棄
		Session::forget('user_input');
		Session::forget('userID');
		Session::forget('user_complete');

		return View::make('/admin/user/complete', $result);
	}

	/**
	 * ページ個別CSS設定
	 * @author stani
	 * @since 2014/12/16
	 */
	public function cssSetting($mode = 'search') {
		$css = array();
		$css["page.css"] = "css/page.css";
		$css["color.css"] = "css/color.css";
		$css["ui-lightness/jquery-ui-1.10.4.custom.min.css"] = "css/ui-lightness/jquery-ui-1.10.4.custom.min.css";
	  	return $css;
	}

	/**
	 * Setting the page individual JS
	 * @return Page individual JS configuration array
	 * @since 2014/12/16
	 */
	public function jsSetting() {
		$js = array();
		$js['jquery-ui.min.js'] = 'js/jquery-ui.min.js';
		$js['jquery.multiselect.min.js'] = 'js/jquery.multiselect.min.js';
		return $js;
	}

	/**
	 * Create a user ID (SHA256 + uniqid)
	 * @return string that was turned into Hash in SHA256 the uniqid (case ID)
	 * @since 2014/12/17
	 */
	public function createUserID(){
		return hash_hmac('sha256', uniqid(), Config::get('const.hash_key'));
	}

	/**
	 * I get the group list
	 * @return Group List
	 * @since 2014/12/17
	 */
	public function getGroupList(){
		//Acquisition of group list
		$group_list = Groups::get();
		$list = array();
		foreach ($group_list as $rec) {
			$list[$rec->GroupID] = $rec['GroupName'];
		}
		return $list;
	}

	/**
	 * I get the name of the group
	 * @param $gids Group ID group
	 * @return Group name array
	 * @since 2014/12/17
	 */
	public function getGroupNameDisp($gids = array()) {
		$group_names = Groups::addWhere(array('GroupID' => $gids))
							->get(array('GroupName'));
		$group_name = array();
		foreach ($group_names as $group) {
			$group_name[] = $group->GroupName;
		}
		return implode(',', $group_name);
	}
}
