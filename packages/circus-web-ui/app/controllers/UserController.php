<?php
/**
 * ユーザの操作を行うクラス
 * @author stani
 * @since 2014/12/17
 */
class UserController extends BaseController {
	/**
	 * ユーザ検索結果
	 * @author stani
	 * @since 2014/12/17
	 */
	public function search() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//初期設定
		$result = array();

		//セッション破棄
		Session::forget('user_input');
		Session::forget('userID');

		//入力値取得
		$inputs = Input::all();

		//データ取得
		//取得カラムの設定
		$select_col = array('userID', 'description', 'groups');

		//総件数取得
		$user_count = User::count();

		//検索結果取得
		$user_list = User::orderby('userID', 'desc')
							->get($select_col);

		$list = array();
		if (count($user_list) > 0) {
			foreach ($user_list as $rec) {
				$list[] = array(
					'userID'		=>	$rec->userID,
					'description'	=>	$rec->description,
					//'groups'		=>	implode(",", $rec->groups)
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
	 * ユーザ詳細画面
	 * @author stani
	 * @since 2014/12/17
	 */
	public function detail() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//エラーメッセージ初期化
		$error_msg = "";
		$result = array();

		//POSTデータ取得
		$inputs = Input::all();

		if (array_key_exists('userID', $inputs) === FALSE)
			$error_msg = 'ユーザIDを指定してください。';

		if (!$error_msg) {
			$user_data = User::find(intval($inputs['userID']));
			$query_log = DB::getQueryLog();
			if (!$user_data) {
				$error_msg = '存在しないユーザIDです。';
			}
		}

		//エラーメッセージがない場合はユーザ詳細情報を表示する
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
	 * ユーザ登録入力
	 * @author stani
	 * @since 2014/12/17
	 */
	public function input() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//初期設定
		$result = array();
		$error_msg = '';
		//入力値取得
		$inputs = Input::all();

		Log::debug("入力値");
		Log::debug($inputs);

		//ページ設定
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
				$error_msg = '存在しないユーザIDです。';
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

		//エラーメッセージの設定
		if ($error_msg) {
			$result["error_msg"] = $error_msg;
		} else {
			$result['group_list'] = self::getGroupList();
			Session::put('user_input', $result['inputs']);
		}
		return View::make('/admin/user/input', $result);
	}

	public function getGroupList(){
		//グループリストの取得
		$group_list = Groups::get();
		$list = array();
		foreach ($group_list as $rec) {
			$list[$rec->GroupID] = $rec['GroupName'];
		}
		return $list;
	}

	/**
	 * ユーザ登録確認
	 * @author stani
	 * @since 2014/12/17
	 */
	public function confirm() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//初期設定
		$result = array();
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		//入力値取得
		$inputs = Input::all();
		$user_data = Session::get('user_input');
		$inputs['userID'] = $user_data['userID'];
		Log::debug("入力値");
		Log::debug($inputs);

		Session::put('user_input', $inputs);
		$result['inputs'] = $inputs;

		//グループ名設定(表示用)
		/*
		$group_names = Groups::addWhere(array('GroupID' => $inputs['groups']))
							->get(array('GroupName'));
		$query_log = DB::getQueryLog();
		Log::debug($query_log);
		$group_name = array();
		foreach ($group_names as $group) {
			$group_name[] = $group->GroupName;
		}
		*/
	//	$result['inputs']['groupName'] = implode(',', $group_name);
		$result['inputs']['groupName'] = self::getGroupNameDisp($inputs['groups']);

		//セッション情報取得
		$userID = Session::get('userID');

		//Validateチェック用オブジェクト生成
		Log::debug('userID::'.$userID);
		$user_obj = $userID ?
						User::find(intval($userID)) : App::make('User');

		//Validateチェック用の値を設定
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
			//Validateエラー時の処理
			$result['title'] = 'Add new User';
			$result['url'] = '/admin/user/input';
			$result['errors'] = $validator->messages();
			$result['group_list'] = self::getGroupList();
			return View::make('/admin/user/input', $result);
		} else {
			//エラーがないので確認画面を表示
			$result['title'] = 'Add new User Confirmation';
			$result['url'] = '/admin/user/confirm';
			return View::make('/admin/user/confirm', $result);
		}
	}

	public function getGroupNameDisp($gids = array()) {
		$group_names = Groups::addWhere(array('GroupID' => $gids))
							->get(array('GroupName'));
		//$query_log = DB::getQueryLog();
		//Log::debug($query_log);
		$group_name = array();
		foreach ($group_names as $group) {
			$group_name[] = $group->GroupName;
		}
		return implode(',', $group_name);
	}

	/**
	 * ユーザ登録
	 * @author stani
	 * @since 2014/12/17
	 */
	public function regist(){
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//初期設定
		$result = array();

		//セッションから情報取得
		$inputs = Session::get('user_input');
		$userID = Session::get('userID');

		Log::debug('入力値');
		Log::debug($inputs);

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
			$result['msg'] = "ユーザ情報の登録が完了しました。";
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
	 * ページ個別のJSの設定を行う
	 * @return ページ個別のJS設定配列
	 * @author stani
	 * @since 2014/12/16
	 */
	public function jsSetting() {
		$js = array();
		$js['jquery-ui.min.js'] = 'js/jquery-ui.min.js';
		$js['jquery.multiselect.min.js'] = 'js/jquery.multiselect.min.js';
		return $js;
	}

	/**
	 * ユーザID作成(SHA256+uniqid)
	 * @return uniqidをSHA256でHash化した文字列(ケースID)
	 * @author stani
	 * @since 2014/12/17
	 */
	public function createUserID(){
		return hash_hmac('sha256', uniqid(), Config::get('const.hash_key'));
	}
}
