<?php
/**
 * ケース登録クラス
 */
class CaseRegisterController extends BaseController {
	/**
	 * Case registration input
	 */
	function input() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();
		$series_list = array();
		$error_msg = '';

		//Input value acquisition
		$inputs = Input::all();

		//Settings page
		$result['url'] = '/case/input';


		$result['project_list'] = Project::getProjectList(Project::AUTH_TYPE_CREATE, true);

		//Back button is pressed during
		if (array_key_exists('btnBack', $inputs)) {
			$result['inputs'] = Session::get('case_input');
			$series_exclude_ary = array_keys($result['inputs']['series_list']);
		//Edit mode
		} else if (Session::has('edit_case_id')) {
			$case_data = ClinicalCase::find(Session::get('edit_case_id'));

			//Set case information
			if ($case_data) {
				$result['inputs'] = $case_data;
				Session::put('caseID', $case_data->caseID);
			}

			//Stores series information
			$series_exclude_ary = array();
			$tmp_series_exclude_ary = array();
			foreach ($result['inputs']->revisions as $key => $value) {
				for($i = 0; $i < count($value['series']); $i++){
					$tmp_series_exclude_ary[] = $value['series'][$i]['seriesUID'];
				}
			}

			$cookie_series = $_COOKIE['seriesCookie'];
			$add_series = explode('_' , $cookie_series);
			$series_exclude_ary = array_merge($tmp_series_exclude_ary, $add_series);

			Session::put('mode', 'Edit');
		//New registration mode
		} else {
			//Session initialization
			Session::forget('caseID');
			$result['inputs'] = array('caseID' => self::createCaseID());

			//Series UID obtained from the Cookie
			$cookie_series = $_COOKIE['seriesCookie'];
			$series_exclude_ary = explode('_' , $cookie_series);
			Session::put('mode', 'Add new');
		}

		//Setting of title
		$mode = Session::get('mode');
		$result['title'] = $mode.' Case';

		$inputs['seriesUID'] = $series_exclude_ary;
		$select_col = array(
			'seriesUID', 'seriesDescription',
			'patientInfo.patientID', 'patientInfo.age',
			'patientInfo.sex', 'patientInfo.patientName',
			'patientInfo.birthDate', 'patientInfo.size',
			'patientInfo.weight'
		);
		$series = Series::addWhere($inputs)
						->get($select_col);

		//Patient ID duplication check
		$error_msg = self::checkDuplicatePatientID($series, $series_list);

		//Set Series List if there is no error message
		if ($error_msg) {
			$result['error_msg'] = $error_msg;
		} else {
			$result['series_list'] = $series_list;
			$patient = $series[0]->patientInfo;
			$patient['sex'] = self::getSex($patient['sex']);
			$result['inputs']['patientInfo'] = $patient;

			//The store fixed information in session
			$case_info = array(
				'caseID'		=>	$result['inputs']['caseID'],
				'series_list'	=>	$series_list,
				'patientInfo'	=>	$patient
			);
			Session::put('case_input', $case_info);
		}

		//Setting the return destination
		self::setBackUrl($inputs, $result);
		return View::make('/case/input', $result);
	}

	/**
	 * Case registration confirmation
	 */
	function confirm() {
	//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();

		//Input value acquisition
		$inputs = Input::all();
		self::setBackUrl($inputs, $result);

		//Session information acquisition
		$caseID = Session::get('caseID');
		$case_info = Session::get('case_input');
		$mode = Session::get('mode');

		$case_info['projectID'] = intval($inputs['projectID']);
		//Set of series
		$case_info['seriesUID'] = $inputs['series'];
		$select_col = array(
			'seriesUID', 'seriesDescription',
			'patientInfo.patientID', 'patientInfo.age',
			'patientInfo.sex', 'patientInfo.patientName',
			'patientInfo.birthDate', 'patientInfo.size',
			'patientInfo.weight'
		);
		$series = Series::addWhere($case_info)
						->get($select_col);

		//Patient ID duplication check
		$error_msg = self::checkDuplicatePatientID($series, $series_list);
		if (!$error_msg)
			$case_info['series_list'] = self::sortSeriesList($series_list, $inputs['series']);

		//Save the input value to the session
		Session::put('case_input', $case_info);

		$case_info['projectName'] = Project::getProjectName($inputs['projectID']);

		try {
			//Validate check for object creation
			$case_obj = $caseID ?
						ClinicalCase::find($caseID) :
						App::make('ClinicalCase');

			//Set the value for the Validate check
			$case_obj->caseID = $case_info['caseID'];
			$case_obj->incrementalID = 1; // This can be a dummy number only for validation
			$case_obj->projectID = intval($case_info['projectID']);
			//$case_obj->date = new MongoDate(strtotime(date('Y-m-d H:i:s')));
			$case_obj->patientInfoCache = array(
				'patientID'	  => $case_info['patientInfo']['patientID'],
				'patientName' => $case_info['patientInfo']['patientName'],
				'age'		  => $case_info['patientInfo']['age'],
				'sex'		  => self::setSex($case_info['patientInfo']['sex']),
				'birthDate'	  => $case_info['patientInfo']['birthDate'],
				'size'		  => $case_info['patientInfo']['size'],
				'weight'	  => $case_info['patientInfo']['weight']
			);
			$case_obj->creator = Auth::user()->userID;

			//ValidateCheck
			$case_obj->selfValidationFails($errors);

			$result['inputs'] = $case_info;
			$result['series_list'] = $case_info['series_list'];
			if ($errors)
				return self::errorConfirmFinish($errors, $result, $mode);

			//And displays a confirmation screen because there is no error
			$result['title'] = $mode.' Case Confirmation';
			$result['url'] = '/case/confirm';
			return View::make('/case/confirm', $result);

		} catch (InvalidModelException $e) {
			return self::errorConfirmFinish($e->getErrors(), $result, $mode);
		} catch (Exception $e) {
			return self::errorConfirmFinish($e->getMessage(), $result, $mode);
		}
	}

	/**
	 * 確認画面エラーメッセージ出力
	 * TODO::完了画面エラー出力と統合したい
	 * @param $errorMsg エラーメッセージ
	 * @param $result Bladeに設定するパラメータ
	 * @param $mode 編集モード
	 * @return View 入力画面のView
	 */
	function errorConfirmFinish($errorMsg, $result, $mode) {
		//Process at the time of Validate error
		$result['title'] = $mode.' Case';
		$result['url'] = '/case/input';
		$result['project_list'] = Project::getProjectList(Project::AUTH_TYPE_CREATE, true);
		if (is_array($errorMsg))
			$result['errors'] = $errorMsg;
		else
			$result['error_msg'] = $errorMsg;
		return View::make('/case/input', $result);
	}

	/**
	 * Case registered
	 */
	function register(){
	//Login check

		//Initial setting
		$result = array();

		//Input value acquisition
		$inputs = Session::get('case_input');
		$caseID = Session::get('caseID');
		$mode = Session::get('mode');

		self::setBackUrl($inputs, $result);

		try {
			//Validate check for object creation
			$case_obj = $caseID ?
						ClinicalCase::find($caseID) :
						App::make('ClinicalCase');

			//Set the value for the Validate check
			$case_obj->caseID = $inputs['caseID'];
			$case_obj->incrementalID = Seq::getIncrementSeq('incrementalCaseID');
			$case_obj->projectID = $inputs['projectID'];

			//Setting of patient information
			$case_obj->patientInfoCache = array(
				'patientID'	  => $inputs['patientInfo']['patientID'],
				'patientName' => $inputs['patientInfo']['patientName'],
				'age'		  => $inputs['patientInfo']['age'],
				'birthDate'	  => $inputs['patientInfo']['birthDate'],
				'sex'		  => self::setSex($inputs['patientInfo']['sex']),
				'size'		  => $inputs['patientInfo']['size'],
				'weight'	  => $inputs['patientInfo']['weight']
			);

			//Initial setting of Revision information
			$series_list = self::createRevision($inputs['series_list']);

			if ($caseID) {
				$revisions = $case_obj->revisions;
				$revisions[] = $series_list;
				$case_obj->revisions = $revisions;
			} else {
				$case_obj->revisions = array($series_list);
			}

			$case_obj->latestRevision = $series_list;

			//ValidateCheck
			//Validate check for object creation
			$case_obj->creator = Auth::user()->userID;

			$errors = $case_obj->save();
			if ($errors)
				return self::errorConfirmFinish($errors, $result, $mode);

			$result['title'] = $mode.' Case Complete';
			$result['url'] = '/case/complete';
			$result['msg'] = 'Registration of case information is now complete.';
			$result['caseID'] = $inputs['caseID'];

			//Session information Delete
			Session::forget('caseID');
			Session::forget('case_input');
			Session::forget('mode');

			//I gain the necessary parameters on the screen to complete the session
			Session::put('complete', $result);
			return Redirect::to('/case/complete');
		} catch (InvalidModelException $e) {
			return self::errorRedirectFinish($e->getErrors(), $result, $mode);
		} catch (Exception $e) {
			return self::errorRedirectFinish($e->getMessage(), $result, $mode);
		}
	}

	/**
	 * 完了画面エラーメッセージ出力
	 * @param $errorMsg エラーメッセージ
	 * @param $result Bladeに設定するパラメータ
	 * @param $mode 編集モード
	 */
	function errorRedirectFinish($errorMsg, $result, $mode) {
		$result['title'] = $mode.' Case Complete';
		$result['url'] = '/case/complete';
		$result['error_msg'] = $errorMsg;
		$result['caseID'] = Session::get('caseID');
		//Session information Delete
		Session::forget('caseID');
		Session::forget('case_input');
		Session::forget('mode');
		Session::put('complete', $result);
		return Redirect::to('/case/complete');
	}

	/**
	 * I want to display the complete screen
	 */
	function complete() {
		//Session information acquisition
		$result = Session::get('complete');

		//Session information discarded
		Session::forget('complete');

		//Screen display
		return View::make('case/complete', $result);
	}

	/**
	 * I get the sex for display
	 * @param $sex Gender of value
	 * @return Gender display string
	 */
	function getSex($sex) {
		if (!$sex) return '';
		$sexes = Config::get('const.patient_sex');
		return $sexes[$sex];
	}

	/**
	 * I set the sex for display
	 * @param $sex Gender of value
	 * @return Gender string
	 */
	function setSex($sex) {
		$sexes = Config::get('const.patient_sex');
		return array_search($sex, $sexes);
	}

	/**
	 * Case ID created (SHA256 + uniqid)
	 * @return string that was turned into Hash in SHA256 the uniqid (case ID)
	 */
	function createCaseID(){
		return hash('sha256', uniqid());
	}

	/**
	 * Patient ID duplication check
	 * If there is no overlap I store the series list for display
	 * @param $list Series List of patient ID overlapping subject
	 * @param $series_list Destination Series List of if there is no error
	 * @return $error_msg Error message
	 */
	function checkDuplicatePatientID($list, &$series_list = array()) {
		$patientID = $list[0]->patientInfo['patientID'];
		foreach ($list as $rec) {
			if ($patientID != $rec->patientInfo['patientID']) {
				return 'Series that can be registered in one case only the same patient.<br>Please select the same patient in the series.';
			}
			$series_list[$rec->seriesUID] = $rec->seriesDescription;
		}
	}

	/**
	 * I set the return destination of the URL
	 * @param $input Input parameters
	 */
	function setBackUrl($input, &$result) {
		if (array_key_exists('back_url', $input) === FALSE)
			$input['back_url'] = Session::get('back_url');

		switch ($input['back_url']) {
			case 'series_search':
				$result['back_url'] = 'series/search';
				$result['back_label'] = 'Back to Series Search';
				break;
			case 'series_detail':
				$result['back_url'] = 'series/detail';
				$result['back_label'] = 'Back to Series Detail';
				break;
			case 'case_detail':
				$result['back_url'] = 'case/detail';
				$result['back_label'] = 'Back to Case Detail';
				break;
		}

		Session::set('back_url', $input['back_url']);
	}

	/**
	 * To create a Revision information (New)
	 * @param $series_list Series array
	 * @return Revision information
	 */
	function createRevision($series_list) {
		$revision = array(
			'date'			=>	new MongoDate(strtotime(date('Y-m-d H:i:s'))),
			'creator'		=>	Auth::user()->userID,
			'description'	=>	'',
			'attributes'	=>	array(
			),
			'status'		=>	'draft'
		);

		$series = array();
		foreach ($series_list as $key => $val) {
			$series_info = Series::find($key);
			$series[] = array(
				'seriesUID'	=>	$key,
				'images'	=>	$series_info->images,
				'labels'	=>	array()
			);
		}
		$revision['series'] = $series;
		return $revision;
	}

	/**
	 * And rearranges the series listed in the specified order
	 * @param $list Series List
	 * @param $order Sort ordering
	 * @return Sort the Series List
	 */
	function sortSeriesList($list, $order) {
		$ary = array();

		for ($i = 0; $i < count($order); $i++) {
			foreach ($list as $key => $val){
				if ($key == $order[$i]) {
					$ary[$key] = $val;
				}
			}
		}
		return $ary;
	}
}
