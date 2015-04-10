<?php
/**
 * ケース登録クラス
 */
class CaseRegisterController extends BaseController {
	/**
	 * Case registration input
	 */
	function input() {
		//Initial setting
		$result = array();
		$result['url'] = '/case/input';
		$result['project_list'] = Project::getProjectList(Project::AUTH_TYPE_CREATE, true);

		$series_list = array();
		$error_msg = '';

		//Input value acquisition
		$inputs = Input::all();
		$this->setBackUrl($inputs, $result);

		try {
			//Back button is pressed during
			if (array_key_exists('btnBack', $inputs)) {
				$result['inputs'] = Session::get('case_input');
				$series_ids = array_keys($result['inputs']['series_list']);
			//Edit mode
			} else if (Session::has('edit_case_id')) {
				$case_data = ClinicalCase::find(Session::get('edit_case_id'));

				//Set case information
				if (!$case_data)
					throw new Exception('ケース情報が取得できません。');

				$result['inputs'] = $case_data;
				Session::put('caseID', $case_data->caseID);
				$series_ids = $this->getSeriesUIDList($result['inputs']);
				Session::put('mode', 'Edit');
			//New registration mode
			} else {
				//Session initialization
				Session::forget('caseID');
				$result['inputs'] = array('caseID' => ClinicalCase::createCaseID());

				//Series UID obtained from the Cookie
				$cookie_series = $_COOKIE['seriesCookie'];
				$series_ids = explode('_' , $cookie_series);
				Session::put('mode', 'Add new');
			}

			$series = Series::getPluralSeries($series_ids);
			//Patient ID duplication check
			$error_msg = ClinicalCase::checkDuplicatePatientID($series, $series_list);
			if ($error_msg)
				throw new Exception($error_msg);

			$result['series_list'] = $series_list;
			$patient = $series[0]->patientInfo;
			$result['inputs']['patientInfoCache'] = $patient;

			//The store fixed information in session
			$case_info = array(
				'caseID'		=>	$result['inputs']['caseID'],
				'series_list'	=>	$series_list,
				'patientInfo'	=>	$patient
			);
			Session::put('case_input', $case_info);
		} catch (Exception $e) {
			Log::debug($e);
			$result['error_msg'] = $e->getMessage();
		}
		return View::make('case.input', $result);
	}

	/**
	 * CookieからシリーズIDリストを生成する
	 * @param $inputs 入力値
	 * @return シリーズIDリスト
	 * @author stani
	 * @since 2015/03/20
	 */
	function getSeriesUIDList($inputs){
		$series_exclude_ary = array();
		$tmp_series_exclude_ary = array();
		foreach ($inputs->revisions as $key => $value) {
			for($i = 0; $i < count($value['series']); $i++){
				$tmp_series_exclude_ary[] = $value['series'][$i]['seriesUID'];
			}
		}

		$cookie_series = $_COOKIE['seriesCookie'];
		$add_series = explode('_' , $cookie_series);
		return array_merge($tmp_series_exclude_ary, $add_series);
	}

	/**
	 * Case registration confirmation
	 */
	function confirm() {
		//Initial setting
		$result = array();

		//Input value acquisition
		$inputs = Input::all();
		$this->setBackUrl($inputs, $result);

		try {
			//Session information acquisition
			$caseID = Session::get('caseID');
			$case_info = Session::get('case_input');
			$mode = Session::get('mode');

			$case_info['projectID'] = intval($inputs['projectID']);
			//Set of series
			$case_info['seriesUID'] = $inputs['series'];

			//Patient ID duplication check
			$error_msg = ClinicalCase::checkDuplicatePatientID(Series::getPluralSeries($inputs['series']), $case_info['series_list']);
			if (!$error_msg)
				$case_info['series_list'] = $this->sortSeriesList($case_info['series_list'], $inputs['series']);

			//Save the input value to the session
			Session::put('case_input', $case_info);

			$case_info['projectName'] = Project::getProjectName($inputs['projectID']);

			//Validate check for object creation
			$case_obj = $caseID ?
						ClinicalCase::find($caseID) :
						App::make('ClinicalCase');

			//Set the value for the Validate check
			$case_obj->caseID = $case_info['caseID'];
			$case_obj->incrementalID = 1; // This can be a dummy number only for validation
			$case_obj->projectID = intval($case_info['projectID']);
			$case_obj->patientInfoCache = $this->setPatientInfo($case_info['patientInfo']);
			$case_obj->creator = Auth::user()->userID;

			//ValidateCheck
			$case_obj->selfValidationFails($errors);

			$result['inputs'] = $case_info;
			$result['series_list'] = $case_info['series_list'];
			if ($errors)
				return $this->errorConfirmFinish($errors, $result, $mode);

			//And displays a confirmation screen because there is no error
			return View::make('case.confirm', $result);

		} catch (InvalidModelException $e) {
			return $this->errorConfirmFinish($e->getErrors(), $result, $mode);
		} catch (Exception $e) {
			return $this->errorConfirmFinish($e->getMessage(), $result, $mode);
		}
	}

	/**
	 * 患者情報の設定
	 * @param $patient 患者情報
	 * @return ケーステーブル登録用に整形した患者情報
	 * @author stani
	 * @since 2015/03/20
	 */
	function setPatientInfo($patient) {
		return array(
				'patientID'	  => $patient['patientID'],
				'patientName' => $patient['patientName'],
				'age'		  => $patient['age'],
				'sex'		  => $patient['sex'],
				'birthDate'	  => $patient['birthDate'],
				'size'		  => $patient['size'],
				'weight'	  => $patient['weight']
			);
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
		$result['project_list'] = Project::getProjectList(Project::AUTH_TYPE_CREATE, true);
		if (is_array($errorMsg))
			$result['errors'] = $errorMsg;
		else
			$result['error_msg'] = $errorMsg;
		return View::make('case.input', $result);
	}

	/**
	 * Case registered
	 */
	function register(){
		//Initial setting
		$result = array();

		//Input value acquisition
		$inputs = Session::get('case_input');
		$caseID = Session::get('caseID');
		$mode = Session::get('mode');
		$this->setBackUrl($inputs, $result);

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
			$case_obj->patientInfoCache = $this->setPatientInfo($inputs['patientInfo']);

			//Initial setting of Revision information
			$series_list = $this->createRevision($inputs['series_list']);

			if ($caseID) {
				$revisions = $case_obj->revisions;
				$revisions[] = $series_list;
				$case_obj->revisions = $revisions;
			} else {
				$case_obj->revisions = array($series_list);
			}
			$case_obj->latestRevision = $series_list;
			$case_obj->creator = Auth::user()->userID;
			$case_obj->save();

			$result['msg'] = 'Registration of case information is now complete.';
			$result['caseID'] = $inputs['caseID'];
			$result['mode'] = Session::get('mode');

			//I gain the necessary parameters on the screen to complete the session
			Session::put('complete', $result);
			return Redirect::to('case/complete');
		} catch (InvalidModelException $e) {
			return $this->errorRedirectFinish($e->getErrors(), $result, $mode);
		} catch (Exception $e) {
			return $this->errorRedirectFinish($e->getMessage(), $result, $mode);
		}
	}

	/**
	 * 完了画面エラーメッセージ出力
	 * @param $errorMsg エラーメッセージ
	 * @param $result Bladeに設定するパラメータ
	 * @param $mode 編集モード
	 */
	function errorRedirectFinish($errorMsg, $result, $mode) {
		$result['mode'] = $mode;
		$result['error_msg'] = $errorMsg;
		$result['caseID'] = Session::get('caseID');
		Session::put('complete', $result);
		return Redirect::to('case/complete');
	}

	/**
	 * I want to display the complete screen
	 */
	function complete() {
		//Session information acquisition
		$result = Session::get('complete');

		//Session information discarded
		Session::forget('complete');
		Session::forget('caseID');
		Session::forget('case_input');
		Session::forget('mode');

		//Screen display
		return View::make('case/complete', $result);
	}

	/**
	 * I set the return destination of the URL
	 * @param $input Input parameters
	 */
	function setBackUrl($input, &$result) {
		if (array_key_exists('back_url', $input) === false)
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
			'attributes'	=>	array(),
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
