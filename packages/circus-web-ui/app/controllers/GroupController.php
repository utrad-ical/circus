<?php
/**
 * Class to perform the operation of group
 */
class GroupController extends BaseController {
	/**
	 * Group results
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
		Session::forget('group_input');
		Session::forget('groupID');

		//Input value acquisition
		$inputs = Input::all();

		//Data acquisition
		//Setting of acquisition column
		$select_col = array('groupID', 'groupName');

		//Total number acquisition
		$group_count = Group::count();

		//Search result acquisition
		$group_list = Group::orderby('updateTime', 'desc')
							->get($select_col);

		$result['title'] = 'Group';
		$result['url'] = 'admin/group/search';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();
		$result['group_list'] = $group_list;
		$result['inputs'] = array();

		return View::make('admin/group/search', $result);
	}

	/**
	 * Group registration input(Ajax)
	 */
	public function input() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();
		$result['url'] = '/admin/group/search';
		$result['role_list'] = Config::get('config.group_authority');

		//Input value acquisition
		$inputs = Input::all();

		//Settings page
		if (array_key_exists('btnBack', $inputs)) {
			$result['inputs'] = Session::get('group_input');
		} else if (array_key_exists('groupID', $inputs)) {
			$group_data = Group::find(intval($inputs['groupID']));
			$result['inputs'] = array(
				'groupID'		=>	$group_data->groupID,
				'groupName'		=>	$group_data->groupName,
				'updateTime'	=>	$group_data->updateTime,
				'createTime'	=>	$group_data->createTime
			);

			if (count($group_data->privileges) > 0) {
				foreach ($group_data->privileges as $rec) {
					$result['inputs']['privileges_'.$rec] = 1;
				}
			}
			Session::put('groupID', $inputs['groupID']);
			Session::put('mode', 'Edit');
		} else {
			$result['inputs'] = array('groupID' => self::createGroupID());
			Session::put('mode', 'Add new');
		}

		//Setting of title
		$mode = Session::get('mode');
		$result['title'] = $mode.' Group';

		//I hold the group information in the session
		Session::put('group_input', $result['inputs']);
		$result['group_detail'] = $result['inputs'];

		$tmp = View::make('/admin/group/input', $result);

		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => '', 'response' => "$tmp"));
		echo $res;
	}

	/**
	 * Group registration confirm
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
		$result['role_list'] = Config::get('config.group_authority');

		$mode = Session::get('mode');

		//Input value acquisition
		$inputs = Input::all();
		$group_data = Session::get('group_input');
		$inputs['groupID'] = $group_data['groupID'];
		Session::put('group_input', $inputs);

		$result['inputs'] = $inputs;

		//Session information acquisition
		$groupID = Session::get('groupID');

		//Validate check for object creation
		$group_obj = $groupID ?
						Group::findOrFail(intval($groupID)) :
						App::make('Group');

		//Set the value for the Validate check
		$group_obj->groupID = $inputs['groupID'];
		$group_obj->groupName = $inputs['groupName'];

		//ValidateCheck
		$errors = $group_obj->validate($inputs);

		//Processing in the case where there is an error
		if ($errors) {
			$result['title'] = $mode.' Group';
			$result['url'] = '/admin/group/input';
			$result['errors'] = $errors;
			$tmp = View::make('/admin/group/input', $result);
		} else {
			//Processing in the case where there is no error
			$result['title'] = $mode.' Group Confirmation';
			//And displays a confirmation screen because there is no error
			$result['url'] = '/admin/group/confirm';
			$tmp = View::make('/admin/group/confirm', $result);
		}

		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => '', 'response' => "$tmp"));
		echo $res;
	}

	/**
	 * Group registration
	 */
	public function register(){
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();

		//Information obtained from the session
		$inputs = Session::get('group_input');
		$groupID = intval(Session::get('groupID'));
		$mode = Session::get('mode');

		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();
		$role_list = Config::get('config.group_authority');	//権限一覧

		//Validate check for object creation
		$group_obj = $groupID ?
						Group::find($groupID) :
						App::make('Group');
		//Set the value for the Validate check
		$group_obj->groupID = intval($inputs['groupID']);
		$group_obj->groupName = $inputs['groupName'];

		//ValidateCheck
		$errors = $group_obj->validate($inputs);

		if (!$errors) {
			//Validate process at the time of success
			//I registered because there is no error
			$dt = new MongoDate(strtotime(date('Y-m-d H:i:s')));
			$group_obj->updateTime = $dt;
			$group_obj->createTime = $dt;

			//Setting permissions information
			$privileges = array();
			$role_keys = array_keys($role_list);
			foreach ($role_keys as $role_key){
				if (array_key_exists('privileges_'.$role_key, $inputs) !== FALSE) {
					$privileges[] = $role_key;
				}
			}

			$group_obj->privileges = $privileges;
			$group_obj->domains = array();
			$group_obj->save();

			$result['url'] = '/admin/group/complete';
			$result['msg'] = 'Registration of group information is now complete.';
			$result['groupID'] = $inputs['groupID'];
			$result['title'] = $mode.' Group Complete';

			//Session discarded
			Session::forget('group_input');
			Session::forget('groupID');
			Session::forget('mode');

			$tmp = View::make('/admin/group/complete', $result);
		} else {
			//Process at the time of Validate error
			$result['errors'] = $errors;
			$result['inputs'] = $inputs;
			$result['title'] = $mode.' Group';
			$result['url'] = '/admin/group/input';
			$result['role_list'] = $role_list;
			$tmp = View::make('/admin/group/input', $result);
		}

		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => '', 'response' => "$tmp"));
		echo $res;
	}

	/**
	 * Page individual CSS setting
	 * @return Page individual CSS configuration array
	 */
	public function cssSetting() {
		$css = array();
		$css['page.css'] = 'css/page.css';
		$css['color.css'] = 'css/color.css';
	  	return $css;
	}

	/**
	 * Page individual JS setting
	 * @return Page individual JS configuration array
	 */
	public function jsSetting() {
		$js = array();
		return $js;
	}

	/**
	 * Generate new group ID
	 * @return string Generated group ID
	 */
	public function createGroupID(){
		return Seq::getIncrementSeq('Groups');
	}
}
