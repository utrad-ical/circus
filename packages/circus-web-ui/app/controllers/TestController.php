<?php
/**
 * テストデータ登録クラス
 * @author stani
 * @since 2014/12/11
 */
class TestController extends BaseController {
	/**
	 * テストデータ登録トップ画面
	 * @author stani
	 * @since 2014/12/11
	 */
	public function getIndex() {
		//ログインチェック
		if (!Auth::user()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		$result = array();
		$result["title"] = "ダミーデータ登録";
		$result["url"] = "test";
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();

		//完了メッセージ取得
		$msg = Session::get("complete.msg");
		$result["msg"] = $msg;
		//Session破棄
		Session::forget("complet.msg");

		return View::make('test.index', $result);
	}

	/**
	 * ケースダミーデータ登録(初期表示)
	 * @author stani
	 * @since 2014/12/11
	 */
	public function getIndexCase() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		$result = array();
		$result['title'] = 'Case Dummy Data Regist';
		$result['url'] = '/test/case';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();
		$result['project_list'] = Projects::getProjectList(Projects::AUTH_TYPE_CREATE, true);
		return View::make('test.case', $result);
	}

	/**
	 * ケースダミーデータ登録(登録)
	 * @author stani
	 * @since 2014/12/11
	 */
	public function registCase() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//初期設定
		$result = array();

		//入力値取得
		$inputs = Input::all();
		/*
		Log::debug("入力値(CaseRegist)");
		Log::debug($inputs);
		*/

		//Validateチェック用オブジェクト生成
		$case_obj = App::make('Cases');
		//Validateチェック用の値を設定
		$case_obj->caseID = $inputs['caseID'];
		$case_obj->incrementalID = $inputs['incrementalID'];
		$case_obj->projectID = $inputs['projectID'];
		$case_obj->date = $inputs['date'];
		$case_obj->patientInfoCache = array(
			'patientID'	=>	$inputs['patientInfoCache_patientID'],
			'name'		=>	$inputs['patientInfoCache_name'],
			'age'		=>	$inputs['patientInfoCache_age'],
			'birthday'	=>	$inputs['patientInfoCache_birthday'],
			'sex'		=>	$inputs['patientInfoCache_sex']
		);

		//ValidateCheck
		$validator = Validator::make($inputs, Cases::getValidateRules());
	//	if ($case_obj->isValid()){
		if (!$validator->fails()) {
			Log::debug("エラーなかったよ！");
			//Validate成功時の処理
			//エラーがないので登録する
			$dt = new MongoDate(strtotime(date('Y-m-d H:i:s')));
			$case_obj->updateTime = $dt;
			$case_obj->createTime = $dt;
			$case_obj->creator = Auth::user()->loginID;
			$case_obj->save();
			Session::put("complete.msg", "ケース情報の登録が完了しました。");
			return Redirect::to('test');
		} else {
			//Validateエラー時の処理
			$result['errors'] = $validator->messages();
		}

		$result['title'] = 'Case Dummy Data Regist';
		$result['url'] = '/test/case';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();
		$result['project_list'] = Projects::getProjectList(Projects::AUTH_TYPE_CREATE, true);

		return View::make('test.case', $result);
	}

	/**
	 * シリーズダミーデータ登録(初期表示)
	 * @author stani
	 * @since 2014/12/11
	 */
	public function getIndexSeries() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		$result = array();
		$result['title'] = 'Series Dummy Data Regist';
		$result['url'] = '/test/series';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();
		//$result['errors'] = array();

		return View::make('test.series', $result);
	}

	/**
	 * シリーズダミーデータ登録(登録)
	 * @author stani
	 * @since 2014/12/11
	 */
	public function registSeries() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//初期設定
		$result = array();

		//入力値取得
		$inputs = Input::all();
		//Validateチェック用オブジェクト生成
		$series_obj = App::make('Serieses');
		//Validateチェック用の値を設定
		$series_obj->caseID = $inputs['studyUID'];
		$series_obj->incrementalID = $inputs['seriesUID'];
		$series_obj->projectID = $inputs['storageID'];
		$series_obj->width = $inputs['width'];
		$series_obj->height = $inputs['height'];
		$series_obj->modality = $inputs['modality'];
		$series_obj->seriesDescription = $inputs['seriesDescription'];
		$series_obj->bodyPart = $inputs['bodyPart'];
		$series_obj->images = $inputs['images'];
		$series_obj->stationName = $inputs['stationName'];
		$series_obj->modelName = $inputs['modelName'];
		$series_obj->manufacturer = $inputs['manufacturer'];
		$series_obj->domain = $inputs['domain'];
		$series_obj->patientInfo = array(
			'patientID'		=>	$inputs['patientInfo_patientID'],
			'patientName'	=>	$inputs['patientInfo_patientName'],
			'age'			=>	$inputs['patientInfo_age'],
			'birthday'		=>	$inputs['patientInfo_birthday'],
			'sex'			=>	$inputs['patientInfo_sex'],
			'height'		=>	$inputs['patientInfo_height'],
			'weight'		=>	$inputs['patientInfo_weight']
		);

		//ValidateCheck
		$validator = Validator::make($inputs, Cases::getValidateRules());
	//	if ($case_obj->isValid()){
		if (!$validator->fails()) {
			//Validate成功時の処理
			//エラーがないので登録する
			$case_obj->save();
			return Redirect::to('test.index', array('msg' => 'ケースの登録が完了しました。'));
		} else {
			//Validateエラー時の処理
			$result['errors'] = $validator->messages();
		}

		$result['title'] = 'Case Dummy Data Regist';
		$result['url'] = '/test/case';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();
		$result['project_list'] = Projects::getProjectList(Projects::AUTH_TYPE_CREATE, true);

		return View::make('test.case', $result);
	}

	/**
	 * プロジェクトダミーデータ登録(初期表示)
	 * @author stani
	 * @since 2014/12/11
	 */
	public function getIndexProject() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		$result = array();
		$result["title"] = "Project Dummy Data Regist";
		$result["url"] = "/test/project";
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();

		return View::make('test.project', $result);
	}

	/**
	 * プロジェクトダミーデータ登録(登録)
	 * @author stani
	 * @since 2014/12/11
	 */
	public function registProject() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//初期設定
		$result = array();

		//入力値取得
		$inputs = Input::only(
			array(
				"projectID", "projectName",
				"createGroups", "viewGroups", "updateGroups", "reviwGroups", "deleteGroups"
			)
		);

		Log::debug("入力値(Project Dummy)");
		Log::debug($inputs);

		if (Serieses::isValid()) {
			//Validate成功時の処理
			//エラーがないので登録する
			Project::save();
			return Redirect::to('test.index', array("msg" => "プロジェクトの登録が完了しました。"));
		} else {
			//Validateエラー時の処理
		}

		$result["title"] = "Project Dummy Data Regist";
		$result["url"] = "/test/project";
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();

		return View::make('test.project', $result);
	}

	/**
	 * ユーザダミーデータ登録(初期表示)
	 * @author stani
	 * @since 2014/12/11
	 */
	public function getIndexUser() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		$result = array();
		$result["title"] = "User Dummy Data Regist";
		$result["url"] = "/test/user";
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();
	//	$result["errors"] = array();

		return View::make('test.user', $result);
	}

	/**
	 * ページ個別CSS設定
	 * @author stani
	 * @since 2014/12/04
	 */
	function cssSetting() {
		$css = array();
	  	$css["ui-lightness/jquery-ui-1.10.4.custom.min.css"] = "css/ui-lightness/jquery-ui-1.10.4.custom.min.css";
		$css["page.css"] = "css/page.css";
	  	return $css;
	}

	/**
	 * ページ個別のJSの設定を行う
	 * @return ページ個別のJS設定配列
	 * @author stani
	 * @since 2014/12/04
	 */
	//function jsSetting($mode = 'search') {
	function jsSetting() {
		$js = array();
		$js["jquery-ui.min.js"] = "js/jquery-ui.min.js";

		return $js;
	}
}
