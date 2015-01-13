<?php
/**
 * Class to perform the operation of group
 * @since 2014/12/16
 */
class GroupController extends BaseController {
	/**
	 * Group results
	 * @since 2014/12/16
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
		Session::forget('GroupID');

		//Input value acquisition
		$inputs = Input::all();

		//Data acquisition
		//Setting of acquisition column
		$select_col = array('GroupID', 'GroupName');

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
	 * @since 2014/12/22
	 */
	public function input() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		//$error_msg = '';
		$result = array();
		$result['url'] = '/admin/group/search';
		$result['role_list'] = Config::get('config.group_authority');


		//Input value acquisition
		$inputs = Input::all();

		//Settings page
		if (array_key_exists('btnBack', $inputs)) {
			$result['inputs'] = Session::get('group_input');
		} else if (array_key_exists('GroupID', $inputs)) {
			$group_data = Group::find($inputs['GroupID']);
			$result['inputs'] = array(
				'GroupID'		=>	$group_data->GroupID,
				'GroupName'		=>	$group_data->GroupName,
				'updateTime'	=>	$group_data->updateTime,
				'createTime'	=>	$group_data->createTime
			);

			if (count($group_data->priviledges) > 0) {
				foreach ($group_data->priviledges as $rec) {
					$result['inputs']['priviledges_'.$rec] = 1;
				}
			}
			Session::put('GroupID', $inputs['GroupID']);
			Session::put('mode', 'Edit');
		} else {
			$result['inputs'] = array('GroupID' => self::createGroupID());
			Session::put('mode', 'Add new');
		}

		//Setting of title
		$mode = Session::get('mode');
		$result['title'] = $mode.' Group';

		//グループ情報をセッションに保持する
		Session::put('group_input', $result['inputs']);
		$result['group_detail'] = $result['inputs'];

		$tmp = View::make('/admin/group/input', $result);

		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => '', 'response' => "$tmp"));
		echo $res;
	}

	/**
	 * Group registration confirm
	 * @since 2014/12/26
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
		$inputs['GroupID'] = $group_data['GroupID'];
		Session::put('group_input', $inputs);

		$result['inputs'] = $inputs;

		//Session information acquisition
		$groupID = Session::get('GroupID');

		//Validate check for object creation
		$group_obj = $groupID ?
						Group::find($groupID) :
						App::make('Group');

		//Set the value for the Validate check
		$group_obj->GroupID = $inputs['GroupID'];
		$group_obj->GroupName = $inputs['GroupName'];

		//ValidateCheck
		//$errors = Group::validate($inputs);
		$errors = $group_obj->validate($inputs);

		//エラーがある場合の処理
		if ($errors) {
			$result['title'] = $mode.' Group';
			$result['url'] = '/admin/group/input';
			$result['errors'] = $errors;
			$tmp = View::make('/admin/group/input', $result);
		} else {
			//エラーがない場合の処理
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
	 * @since 2014/12/24
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
		$inputs = Session::get('group_input');
		$groupID = Session::get('GroupID');
		$mode = Session::get('mode');

		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();
		$role_list = Config::get('config.group_authority');	//権限一覧

		//Validate check for object creation
		$group_obj = $groupID ?
						Group::find($groupID) :
						App::make('Group');
		//Set the value for the Validate check
		$group_obj->GroupID = $inputs['GroupID'];
		$group_obj->GroupName = $inputs['GroupName'];

		//ValidateCheck
		//$validator = Validator::make($inputs, Group::getValidateRules());
		$errors = $group_obj->validate($inputs);

		if (!$errors) {
			//Validate process at the time of success
			//I registered because there is no error
			$dt = new MongoDate(strtotime(date('Y-m-d H:i:s')));
			$group_obj->updateTime = $dt;
			$group_obj->createTime = $dt;

			//権限情報の設定
			$priviledges = array();
			$role_keys = array_keys($role_list);
			foreach ($role_keys as $role_key){
				if (array_key_exists('priviledges_'.$role_key, $inputs) !== FALSE) {
					$priviledges[] = $role_key;
				}
			}

			$group_obj->priviledges = $priviledges;
			$group_obj->domains = array();
			$group_obj->save();

			$result['url'] = '/admin/group/complete';
			$result['msg'] = 'Registration of group information is now complete.';
			$result['GroupID'] = $inputs['GroupID'];
			$result['title'] = $mode.' Group Complete';

			//Session discarded
			Session::forget('group_input');
			Session::forget('GroupID');
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
	 * @since 2014/12/16
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
	 * @since 2014/12/16
	 */
	public function jsSetting() {
		$js = array();
		return $js;
	}

	/**
	 * Creating group ID(SHA256+uniqid)
	 * @return string that was turned into Hash in SHA256 the uniqid (case ID)
	 * @since 2014/12/16
	 */
	public function createGroupID(){
		return hash_hmac('sha256', uniqid(), Config::get('const.hash_key'));
	}
}
