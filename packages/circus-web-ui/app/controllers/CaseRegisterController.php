<?php
/**
 * ケース登録クラス
 */
class CaseRegisterController extends ApiBaseController {
	/**
	 * Case registration input
	 */
	function input() {
		//Initial setting
		$result = array();
		$result['url'] = '/case/input';
		$result['project_list'] = Auth::user()->listAccessibleProjects(Project::AUTH_TYPE_ADD_SERIES, true);

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
					throw new Exception('Case information can not be retrieved .');

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
				'patientInfo'	=>	$patient,
				'domains'		=>	Series::getDomains($series_ids)
			);
			Session::put('case_input', $case_info);
		} catch (Exception $e) {
			Log::error($e);
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

		for($i = 0; $i < count($inputs->latestRevision['series']); $i++){
			$series_exclude_ary[] = $inputs->latestRevision['series'][$i]['seriesUID'];
		}

		$cookie_series = $_COOKIE['seriesCookie'];
		$add_series = explode('_' , $cookie_series);
		return array_unique(array_merge($series_exclude_ary, $add_series));
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
	 * Case registered
	 */
	function register(){
		//Initial setting
		$result = array();

		//Input value acquisition
		$inputs = Session::get('case_input');
		$inputs['projectID'] = Input::get('projectID');
		$inputs['seriesUID'] = Input::get('series');

		$caseID = Session::get('caseID', null);
		$mode = Session::get('mode');
		$this->setBackUrl($inputs, $result);

		try {
			$series_list = $this->sortSeriesList($inputs['series_list'], $inputs['seriesUID']);
			//Validate check for object creation
			$revision = $this->createRevision($series_list);

			$params = array(
				'projectID' => $inputs['projectID'],
				'patientInfoCache' => $this->setPatientInfo($inputs['patientInfo']),
				'latestRevision' => $revision,
				'domains' => $inputs['domains']
			);

			if ($caseID) {
				$caseObj = ClinicalCase::find($caseID);
				$revisions = $caseObj->revisions;
				$revisions[] = $revision;
				$params['revisions'] = $revisions;
			} else {
				$params['revisions'] = array($revision);
				$params['tags'] = array();
				$params['caseID'] = $inputs['caseID'];
			}
			ClinicalCase::saveCase($params, $caseID);


			$result['msg'] = 'Registration of case information is now complete.';
			$result['caseID'] = $inputs['caseID'];
			$result['mode'] = Session::get('mode');

			//I gain the necessary parameters on the screen to complete the session
			Session::put('complete', $result);
			return Redirect::to('case/complete');
		} catch (InvalidModelException $e) {
			Log::error($e);
			return $this->errorRedirectFinish($e->getErrors(), $result, $mode);
		} catch (Exception $e) {
			Log::error($e);
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
		Session::forget('edit_case_id');

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
			'creator'		=>	Auth::user()->userEmail,
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