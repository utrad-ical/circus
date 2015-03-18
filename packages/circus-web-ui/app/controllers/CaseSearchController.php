<?php
/**
 * ケース検索
 */
class CaseSearchController extends BaseController {
	/**
	 * Case Search Results
	 */
	public function search() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$search_flg = false;
		$result = array();

		//Input value acquisition
		$inputs = Input::all();

		//Reset button or the initial display when pressed
		if (array_key_exists('btnReset', $inputs) !== FALSE || !$inputs) {
			Session::forget('case.search');
		//Search button is pressed during
		} else if (array_key_exists ('btnSearch', $inputs) !== FALSE) {
			if (array_key_exists('disp', $inputs) === FALSE) $inputs['disp'] = Config::get('const.page_display');
			if (array_key_exists('sort', $inputs) === FALSE) $inputs['sort'] = 'updateTime';
			Session::put('case.search', $inputs);
		} else if (array_key_exists('page', $inputs) !== FALSE) {
			$tmp = Session::get('case.search');
			$tmp['perPage'] = $inputs['page'];
			Session::put('case.search', $tmp);
		} else if (array_key_exists('condition_id', $inputs) !== FALSE){
			$detail_search_session = Session::get('case_detail_search');
			$detail_search = $detail_search_session[$inputs['condition_id']];
			$detail_search['project'] = json_decode($detail_search['project']);
			if (array_key_exists('mongo_data', $detail_search) !== FALSE) {
				$file_path = dirname(dirname(__FILE__)).'/saves/'.Auth::user()->userID.'_case_'.($inputs['condition_id']+1).'.json';
				$handle = fopen($file_path, 'r');
				$detail_search['mongo_search_data'] = fread($handle, filesize($file_path));

				$detail_search['mongo_data'] = json_decode($detail_search['mongo_data']);

			}
			$detail_search['disp'] = Config::get('const.page_display');
			$detail_search['sort'] = 'updateTime';
			Session::put('case.search', $detail_search);
		}

		$search_data = Session::get('case.search');

		if ($search_data) {
			$search_flg = true;
			//Get the search criteria from the session

			//Search conditions generation and data acquisition
			//Setting of acquisition column
			$select_col = array(
				'caseID', 'projectID', 'incrementalID',
				'patientInfoCache.patientID', 'patientInfoCache.patientName',
				'patientInfoCache.age', 'patientInfoCache.sex',
				'latestRevision.date',
				'updateTime'
			);

			//Simple Search
			if ($search_data["search_mode"] == 0) {
				//Total number acquisition
				$case_count = ClinicalCase::addWhere($search_data)
									->count();

				//Search result acquisition
				if ($case_count > 0)
					$case_list = ClinicalCase::addWhere($search_data)
									->orderby($search_data['sort'], 'desc')
									->addLimit($search_data)
									->get($select_col);
			} else {
				//Advanced Search
				//Total number acquisition
				$case_count = ClinicalCase::addWhere($search_data)
									->whereRaw($search_data["mongo_data"])
									->count();

				//Search result acquisition
				if ($case_count > 0)
					$case_list = ClinicalCase::addWhere($search_data)
									->whereRaw($search_data["mongo_data"])
									->orderby($search_data['sort'], 'desc')
									->addLimit($search_data)
									->get($select_col);
			}

			//The formatting for display
			$list = array();
			if ($case_count > 0) {
				foreach($case_list as $rec) {
					//Patient information
					$patient = $rec->patientInfoCache;

					//Day of the week get
					$revision = $rec->revisions;
					$dt = $rec->latestRevision['date'];
					$w = self::getWeekDay(date('w', strtotime($dt)));

					//Project name
					$project = Project::where('projectID', '=', $rec->projectID)->get();

					//I shaping for display
					$list[] = array(
						'caseID'		=>	$rec->caseID,
						'patientID'		=>	$patient ? $patient['patientID'] : '',
						'patientName' 	=>	$patient ? $patient['patientName'] : '',
						'sex'			=>	$patient ? self::getSex($patient['sex']) : '',
						'age'			=>	$patient ? $patient['age'] : '',
						'latestDate' 	=>	date('Y/m/d('.$w.') H:i', $dt->sec),
						'projectName'	=>	$project ? $project[0]->projectName : '',
						'updateDate'	=>	date('Y/m/d', strtotime($rec->updateTime))
					);
				}
			}
			$result['list'] = $list;
			//Setting the pager
			$case_pager = Paginator::make(
				$list,
				$case_count,
				$search_data['disp']
			);
			$result['list_pager'] = $case_pager;

		}
		$result['inputs'] = $search_data;

		$result['title'] = 'Case Search';
		$result['url'] = 'case/search';
		$result['search_flg'] = $search_flg;
		$result['project_list'] = self::getProjectList(true);

		//JsonFile read
		try {
			$file_path = dirname(dirname(__FILE__))."/config/case_detail_search.json";
			$handle = fopen($file_path, 'r');
			$result['detail_search_settings'] = fread($handle, filesize($file_path));
			fclose($handle);
		} catch (Exception $e){
			Log::debug($e->getMessage());
		}
		return View::make('case/search', $result);
	}

	/**
	 * Case Search Results(Ajax)
	 */
	public function search_ajax() {
		//Initial setting
		$search_flg = false;
		$result = array();

		//Input value acquisition
		$inputs = Input::all();

		try {
			//MongoData and project ID multiplying the json_decode
			if (array_key_exists("mongo_data", $inputs) !== FALSE)
				$inputs["mongo_data"] = json_decode($inputs["mongo_data"]);
			$inputs["project"] = json_decode($inputs["project"]);

			//Reset button or the initial display when pressed
			if (array_key_exists('btnReset', $inputs) !== FALSE || !$inputs) {
				Session::forget('case.search');
			//Search button is pressed during
			} else if (array_key_exists ('btnSearch', $inputs) !== FALSE) {
				if (array_key_exists('disp', $inputs) === FALSE) $inputs['disp'] = Config::get('const.page_display');
				if (array_key_exists('sort', $inputs) === FALSE) $inputs['sort'] = 'updateTime';
				Session::put('case.search', $inputs);
			} else if (array_key_exists('page', $inputs) !== FALSE) {
				$tmp = Session::get('case.search');
				$tmp['perPage'] = $inputs['page'];
				Session::put('case.search', $tmp);
			}

			$search_data = Session::get('case.search');

			if ($search_data) {
				$search_flg = true;
				//Get the search criteria from the session

				//Search conditions generation and data acquisition
				//Setting of acquisition column
				$select_col = array(
					'caseID', 'projectID', 'incrementalID',
					'patientInfoCache.patientID', 'patientInfoCache.patientName',
					'patientInfoCache.age', 'patientInfoCache.sex',
					'latestRevision.date',
					//'revisions.latest.creator',
					'updateTime'
				);

				//Simple Search
				if ($search_data["search_mode"] == 0) {
					//Total number acquisition
					$case_count = ClinicalCase::addWhere($search_data)
										->count();

					//Search result acquisition
					if ($case_count > 0)
						$case_list = ClinicalCase::addWhere($search_data)
										->orderby($search_data['sort'], 'desc')
										->addLimit($search_data)
										->get($select_col);
				} else {
					//Advanced Search
					//Total number acquisition
					$case_count = ClinicalCase::addWhere($search_data)
										->whereRaw($search_data["mongo_data"])
										->count();

					//Search result acquisition
					if ($case_count > 0)
						$case_list = ClinicalCase::addWhere($search_data)
										->whereRaw($search_data["mongo_data"])
										->orderby($search_data['sort'], 'desc')
										->addLimit($search_data)
										->get($select_col);
				}

				//The formatting for display
				$list = array();
				if ($case_count > 0) {
					foreach($case_list as $rec) {
						//Patient information
						$patient = $rec->patientInfoCache;

						//Day of the week get
						$dt = $rec->latestRevision['date'];
						$w = self::getWeekDay(date('w', strtotime($dt)));

						//Project name
						$project = Project::where('projectID', '=', $rec->projectID)->get();

						//I shaping for display
						$list[] = array(
							'caseID'		=>	$rec->caseID,
							'patientID'		=>	$patient['patientID'],
							'patientName' 	=>	$patient['patientName'],
							'age'			=>	$patient['age'],
							'sex'			=>	self::getSex($patient['sex']),
							'latestDate' 	=>	$dt ? date('Y/m/d('.$w.') H:i', $dt->sec) : '',
							'projectName'	=>	$project ? $project[0]->projectName : '',
							'updateDate'	=>	date('Y/m/d', strtotime($rec->updateTime))
						);
						$result['inputs'] = $search_data;

						//Setting the pager
						$case_pager = Paginator::make(
							$list,
							$case_count,
							$search_data['disp']
						);
						$result['list_pager'] = $case_pager;
					}
				}
				$result['list'] = $list;
			}
			$result['search_flg'] = $search_flg;
			$tmp = View::make('case/case', $result);
		} catch (Exception $e) {
			Log::debug($e->getMessage());
			$tmp="";
		}

		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => '', 'response' => "$tmp"));
		echo $res;
	}

	/**
	 * Search conditions save(Ajax)
	 */
	public function save_search() {
		//Initial setting
		$search_flg = false;
		$result = array();
		$error_flg = false;

		//Input value acquisition
		$inputs = Input::all();

		//I want to save your search criteria in the session
		if (Session::has('case_detail_search')) {
			$save_case_search = Session::get('case_detail_search');
			$before_cnt = count($save_case_search);
			array_push($save_case_search, $inputs);
			Session::put('case_detail_search', $save_case_search);
		} else {
			Session::put('case_detail_search', array($inputs));
			$before_cnt = 0;
		}

		//Save Json file
		$file_name = dirname(dirname(__FILE__))."/saves/".Auth::user()->userID."_case_".($before_cnt+1).".json";
		if (!file_exists($file_name)) {
			touch($file_name);
			$data = json_decode($inputs["mongo_search_data"]);
			file_put_contents($file_name, $inputs["mongo_search_data"]);
		} else {
			$error_flg = true;
		}

		$after_cnt = count(Session::get('case_detail_search'));

		if (!$error_flg && $before_cnt+1 === $after_cnt) {
			$msg = 'Save search criteria has been completed.';
		} else {
			$msg = 'I failed to save the search criteria.';
		}
		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => $msg));
		echo $res;
	}

	/**
	 * Login user I get a list of viewable project
	 * @return List login user is viewable project
	 */
	function getProjectList($make_combo_flg){
		return Project::getProjectList(Project::AUTH_TYPE_VIEW, $make_combo_flg);
	}

	/**
	 * I get the week
	 * @param $w Numeric value that represents the day of the week
	 * @return Day of the week in Japanese notation
	 */
	function getWeekDay($w) {
		$week = Config::get('const.week_day');
		return $week[$w];
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
}
