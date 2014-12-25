<?php
/**
 * Test data register class
 * @since 2014/12/11
 */
class TestController extends BaseController {
	/**
	 * Test data register top screen
	 * @since 2014/12/11
	 */
	public function getIndex() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		$result = array();
		$result['title'] = 'Dummy data registration';
		$result['url'] = 'test';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		//Completion message retrieval
		$msg = Session::get('complete.msg');
		$result['msg'] = $msg;
		//Session discarded
		Session::forget('complet.msg');

		return View::make('test.index', $result);
	}

	/**
	 * Case dummy data registration (initial display)
	 * @since 2014/12/11
	 */
	public function getIndexCase() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
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
	 * Case dummy data registration (registration)
	 * @since 2014/12/11
	 */
	public function registCase() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();

		//Input value acquisition
		$inputs = Input::all();

		//Validate check for object creation
		$case_obj = App::make('Cases');
		//Set the value for the Validate check
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
		if (!$validator->fails()) {
			//Validate process at the time of success
			//I registered because there is no error
			$dt = new MongoDate(strtotime(date('Y-m-d H:i:s')));
			$case_obj->updateTime = $dt;
			$case_obj->createTime = $dt;
			$case_obj->creator = Auth::user()->loginID;
			$case_obj->save();
			Session::put('complete.msg', 'Registration of case information is now complete.');
			return Redirect::to('test');
		} else {
			//Process at the time of Validate error
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
	 * Series dummy data registration (initial display)
	 * @since 2014/12/11
	 */
	public function getIndexSeries() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		$result = array();
		$result['title'] = 'Series Dummy Data Regist';
		$result['url'] = '/test/series';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();
		$result['project_list'] = Projects::getProjectList(Projects::AUTH_TYPE_CREATE, true);
		return View::make('test.series', $result);
	}

	/**
	 * Series dummy data registration (registration)
	 * @since 2014/12/11
	 */
	public function registSeries() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();

		//Input value acquisition
		$inputs = Input::all();
		//Validate check for object creation
		$series_obj = App::make('Serieses');
		//Set the value for the Validate check
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
		//$validator = Validator::make($inputs, Cases::getValidateRules());
		$validator = Validator::make($inputs, Serieses::getValidateRules());
		if (!$validator->fails()) {
			//Validate process at the time of success
			//I registered because there is no error
			$series_obj->save();
			return Redirect::to('test.index', array('msg' => 'Registration of the series is now complete.'));
		} else {
			//Process at the time of Validate error
			$result['errors'] = $validator->messages();
		}

		$result['title'] = 'Series Dummy Data Regist';
		$result['url'] = '/test/series';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();
		$result['project_list'] = Projects::getProjectList(Projects::AUTH_TYPE_CREATE, true);

		return View::make('test.series', $result);
	}

	/**
	 * Project dummy data registration (initial display)
	 * @since 2014/12/11
	 */
	public function getIndexProject() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		$result = array();
		$result['title'] = 'Project Dummy Data Regist';
		$result['url'] = '/test/project';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		return View::make('test.project', $result);
	}

	/**
	 * Project dummy data registration (registration)
	 * @since 2014/12/11
	 */
	public function registProject() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();

		//Input value acquisition
		$inputs = Input::all();
		//Validate check for object creation
		$project_obj = App::make('Projects');
		//Set the value for the Validate check
		$project_obj->projectID = $inputs['projectID'];
		$project_obj->projectName = $inputs['projectName'];
		$project_obj->createGroups = $inputs['createGroups'];
		$project_obj->viewGroups = $inputs['viewGroups'];
		$project_obj->updateGruops = $inputs['updateGruops'];
		$project_obj->reviewGroups = $inputs['reviewGroups'];
		$project_obj->deleteGroups = $inputs['deleteGroups'];

		//ValidateCheck
		$validator = Validator::make($inputs, Projects::getValidateRules());
		if (!$validator->fails()) {
			//Validate process at the time of success
			//I registered because there is no error
			$project_obj->save();
			return Redirect::to('test.index', array('msg' => 'Registration of the project has been completed.'));
		} else {
			//Process at the time of Validate error
			$result['errors'] = $validator->messages();
		}

		$result['title'] = 'Project Dummy Data Regist';
		$result['url'] = '/test/project';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		return View::make('test.project', $result);
	}

	/**
	 * User dummy data registration (initial display)
	 * @since 2014/12/11
	 */
	public function getIndexUser() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		$result = array();
		$result['title'] = 'User Dummy Data Regist';
		$result['url'] = '/test/user';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		return View::make('test.user', $result);
	}

	/**
	 * User dummy data registration (registration)
	 * @since 2014/12/15
	 */
	public function registUser() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();

		//Input value acquisition
		$inputs = Input::all();
		//Validate check for object creation
		$user_obj = App::make('Users');
		//Set the value for the Validate check
		$user_obj->userID = $inputs['userID'];
		$user_obj->loginID = $inputs['loginID'];
		$user_obj->password = $inputs['password'];
		$user_obj->groups = $inputs['groups'];
		$user_obj->description = $inputs['description'];
		$user_obj->loginEnabled = $inputs['loginEnabled'];
		$user_obj->preferences = array(
			'theme'			=>	$inputs['preferences_theme'],
			'personalView'	=>	$inputs['preferences_personalView']
		);

		//ValidateCheck
		$validator = Validator::make($inputs, Users::getValidateRules());
		if (!$validator->fails()) {
			//Validate process at the time of success
			//I registered because there is no error
			$user_obj->save();
			return Redirect::to('test.index', array('msg' => 'Registration of the user information is now complete.'));
		} else {
			//Process at the time of Validate error
			$result['errors'] = $validator->messages();
		}

		$result['title'] = 'User Dummy Data Regist';
		$result['url'] = '/test/project';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		return View::make('test.user', $result);
	}

	/**
	 * Page individual CSS setting
	 * @return Page individual CSS configuration array
	 * @since 2014/12/04
	 */
	function cssSetting() {
		$css = array();
	  	$css['ui-lightness/jquery-ui-1.10.4.custom.min.css'] = 'css/ui-lightness/jquery-ui-1.10.4.custom.min.css';
		$css['page.css'] = 'css/page.css';
	  	return $css;
	}

	/**
	 * Page individual JS setting
	 * @return Page individual JS configuration array
	 * @since 2014/12/04
	 */
	function jsSetting() {
		$js = array();
		$js['jquery-ui.min.js'] = 'js/jquery-ui.min.js';

		return $js;
	}
}
