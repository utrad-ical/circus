<?php
/**
 * Classes for operating the case
 */
class CaseController extends BaseController {
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
			$detail_search = $detail_search_session[$inputs["condition_id"]];
			$detail_search["project"] = json_decode($detail_search["project"]);
			if (array_key_exists("mongo_data", $detail_search) !== FALSE) {
				$file_path = dirname(dirname(__FILE__))."/saves/".Auth::user()->loginID."_case_".($inputs["condition_id"]+1).".json";
				$handle = fopen($file_path, 'r');
				$detail_search['mongo_search_data'] = fread($handle, filesize($file_path));

				$detail_search["mongo_data"] = json_decode($detail_search["mongo_data"]);

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
				'patientInfoCache.patientID', 'patientInfoCache.name',
				'revisions.latest.date', 'revisions.latest.creator',
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
					$dt = $revision['latest']['date'];
					$w = self::getWeekDay(date('w', strtotime($dt)));

					//Project name
					$project = Project::where('projectID', '=', $rec->projectID)->get();

					//I shaping for display
					$list[] = array(
						'incrementalID' =>	$rec->incrementalID,
						'caseID'		=>	$rec->caseID,
						'projectID'		=>	$rec->projectID,
						'patientID'		=>	$patient['patientID'],
						'patientName' 	=>	$patient['name'],
						'latestDate' 	=>	date('Y/m/d('.$w.') H:i', $dt->sec),
						'creator'		=>	$revision['latest']['creator'],
						'projectName'	=>	$project ? $project[0]->projectName : '',
						'updateDate'	=>	date('Y/m/d', $rec->updateTime->sec)
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
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();
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
				'patientInfoCache.patientID', 'patientInfoCache.name',
				'revisions.latest.date', 'revisions.latest.creator',
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
					$dt = $revision['latest']['date'];
					$w = self::getWeekDay(date('w', strtotime($dt)));

					//Project name
					$project = Project::where('projectID', '=', $rec->projectID)->get();

					//I shaping for display
					$list[] = array(
						'incrementalID' =>	$rec->incrementalID,
						'caseID'		=>	$rec->caseID,
						'projectID'		=>	$rec->projectID,
						'patientID'		=>	$patient['patientID'],
						'patientName' 	=>	$patient['name'],
						'latestDate' 	=>	date('Y/m/d('.$w.') H:i', $dt->sec),
						'creator'		=>	$revision['latest']['creator'],
						'projectName'	=>	$project ? $project[0]->projectName : '',
						'updateDate'	=>	date('Y/m/d', $rec->updateTime->sec)
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

		$tmp = View::make('/case/search_result', $result);

		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => '', 'response' => "$tmp"));
		echo $res;
	}

	/**
	 * Search conditions save(Ajax)
	 */
	public function save_search() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

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
		$file_name = dirname(dirname(__FILE__))."/saves/".Auth::user()->loginID."_case_".($before_cnt+1).".json";
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
	 * Case Details screen
	 */
	public function detail() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Error message initialization
		$error_msg = '';
		$result = array();

		//POST data acquisition
		$inputs = Input::all();

		if (array_key_exists('btnBack', $inputs)) {
			//Session discarded
			if (Session::has('case_input'))
				Session::forget('case_input');
			//CaseID acquisition
			$inputs['caseID'] = Session::get('caseID');
			$inputs['mode'] = Session::get('view_mode');
		} else if (array_key_exists('caseID', $inputs) === FALSE) {
			$error_msg = 'Please specify a case ID.';
		}

		if (!$error_msg) {
			if (array_key_exists('disp', $inputs) === FALSE) $inputs['disp'] = Config::get('const.page_display');
			if (array_key_exists('sort', $inputs) === FALSE) $inputs['sort'] = 'revision.date';

			Session::put('case.detail', $inputs);
			$search_data = Session::get('case.detail');

			$case_info = ClinicalCase::find($inputs['caseID']);

			if (!$case_info) {
				$error_msg = 'Case ID does not exist.';
			} else {
				$case_data = $case_info;
				//Authority check
				//Case viewing rights
				$auth_view = Project::getProjectList(Project::AUTH_TYPE_VIEW, false);
				if (!$auth_view || array_search($case_data->projectID, $auth_view) === FALSE) {
					$error_msg = 'You do not have permission to refer to the appropriate case.';
				}
			}
		}

		//I want to display the case detailed information if there is no error message
		if (!$error_msg) {
			//Case edit authority
			$auth_edit = Project::getProjectList(Project::AUTH_TYPE_UPDATE, false);
			$result['edit_flg'] = ($auth_edit && array_search($case_data->projectID, $auth_edit) !== FALSE) ?
						true: false;
			//And shape the case information for display
			//Project name
			$project = Project::find($case_data->projectID);
			$case_detail = array(
				'caseID'		=>	$case_data->caseID,
				'projectID'		=>	$case_data->projectID,
				'projectName'	=>	$project ? $project->projectName : '',
				'patientID'		=>	$case_data->patientInfoCache['patientID'],
				'patientName'	=>	$case_data->patientInfoCache['name'],
				'birthday'		=>	$case_data->patientInfoCache['birthday'],
				'sex'			=>	self::getSex($case_data->patientInfoCache['sex'])
			);

			//The shaping Revision information for display
			$revision_list = array();
			$revision_no_list = array();
			$max_revision = 0;
			foreach($case_data->revisions as $key => $value) {
				//key is excluded so Clone thing of latest
				if ($key !== 'latest') {
					//The set if Revision number is large
					if ($max_revision < $key)
						$max_revision = $key;

					//I ask the number of label
					$label_cnt = 0;
					foreach ($value['series'] as $rec) {
						$label_cnt += count($rec['labels']);
					}

					//I ask the day of the week
					$w = self::getWeekDay(date('w', $value['date']->sec));

					//The list created for display
					$revision_list[] = array(
						'revisionNo'	=>	$key,
						'editDate'		=>	date('Y/m/d('.$w.')', $value['date']->sec),
						'editTime'		=>	date('H:i', $value['date']->sec),
						'seriesCount'	=>	count($value['series']),
						'labelCount'	=>	$label_cnt,
						'creator'		=>	$value['creator'],
						'memo'			=>	$value['description'],
						'sortEditTime'	=>	date('Y-m-d H:i:s', $value['date']->sec)
					);
					$revision_no_list[] = $key;
				}
			}
			$case_detail['revisionNo'] = isset($inputs['revisionNo']) ? $inputs['revisionNo'] : $max_revision;

			$result['case_detail'] = $case_detail;

			//Revision sort order adaptation
			$result['revision_list'] = self::sortRevision($revision_list, $search_data['sort']);
			$result['revision_no_list'] = $revision_no_list;

			//Series list created
			$series = array();
			$labels = array();
			foreach ($case_data->revisions as $key => $value) {
				if ($key == $case_detail['revisionNo']) {
					for ($i = 0; $i < count($value['series']); $i++){
						$series[] = $value['series'][$i]['seriesUID'];
					}
				}
			}
			$inputs['seriesUID'] = $series;
			$select_col = array('seriesUID', 'seriesDescription', 'storageID');
			$series_info = Series::addWhere($inputs)
								->get($select_col);
			//Shaping of the series list
			$result['series_list'] = self::getSeriesList($series_info);

			//Setting the pager
			$revision_pager = Paginator::make(
				$revision_list,
				count($revision_list),
				$search_data['disp']
			);
			$result['list_pager'] = $revision_pager;
			$result['inputs'] = $search_data;
		} else {
			$result['error_msg'] = $error_msg;
		}
		$result['title'] = 'Case Detail';
		$result['url'] = 'case/detail';
		$result['css'] = self::cssSetting('detail');
		$result['js'] = self::jsSetting('detail');
		$result['mode'] = $inputs['mode'];
		Session::put('view_mode', $inputs['mode']);
		return View::make('/case/detail', $result);
	}

	/**
	 * Revision list acquisition
	 */
	public function revision_ajax() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Error message initialization
		$error_msg = '';
		$result = array();

		//POST data acquisition
		$inputs = Input::all();

		if (array_key_exists('caseID', $inputs) === FALSE)
			$error_msg = 'Please specify a case ID.';

		if (!$error_msg) {
			if (array_key_exists('disp', $inputs) === FALSE) $inputs['disp'] = Config::get('const.page_display');
			if (array_key_exists('sort', $inputs) === FALSE) $inputs['sort'] = 'revision.date';

			//Check whether the case ID that exists
			$case_info = ClinicalCase::addWhere($inputs)
								->get();
			$query_log = DB::getQueryLog();

			if (!$case_info) {
				$error_msg = 'Case ID does not exist.';
			} else {
				$case_data = $case_info[0];
				//Authority check
				//Case viewing rights
				$auth_view = Project::getProjectList(Project::AUTH_TYPE_VIEW, false);
				if (!$auth_view || array_search($case_data->projectID, $auth_view) === FALSE) {
					$error_msg = 'You do not have permission to refer to the appropriate case.';
				}
			}
		}

		//I want to display the case detailed information if there is no error message
		if (!$error_msg) {
			//The shaping Revision information for display
			$revision_list = array();
			$revision_no_list = array();
			$max_revision = 0;
			foreach($case_data->revisions as $key => $value) {
				//key is excluded so Clone thing of latest
				if ($key !== 'latest') {
					//The set if Revision number is large
					if ($max_revision < $key)
						$max_revision = $key;

					//I ask the number of label
					$label_cnt = 0;
					foreach ($value['series'] as $rec) {
						$label_cnt += count($rec['labels']);
					}

					//I ask the day of the week
					$w = self::getWeekDay(date('w', $value['date']->sec));

					//The list created for display
					$revision_list[] = array(
						'revisionNo'	=>	$key,
						'editDate'		=>	date('Y/m/d('.$w.')', $value['date']->sec),
						'editTime'		=>	date('H:i', $value['date']->sec),
						'seriesCount'	=>	count($value['series']),
						'labelCount'	=>	$label_cnt,
						'creator'		=>	$value['creator'],
						'memo'			=>	$value['memo'],
						'sortEditTime'	=>	date('Y-m-d H:i:s', $value['date']->sec)
					);
					$revision_no_list[] = $key;
				}
			}

			//Revision sort order adaptation
			$result['revision_list'] = self::sortRevision($revision_list, $search_data['sort']);
			$result['revision_no_list'] = $revision_no_list;

			//Series list created
			$series = array();

			//Setting the pager
			$revision_pager = Paginator::make(
				$revision_list,
				count($revision_list),
				$search_data['disp']
			);
			$result['list_pager'] = $revision_pager;
			$result['inputs'] = $inputs;
		} else {
			$result['error_msg'] = $error_msg;
		}

		$tmp = View::make('/case/revision', $result);

		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => '', 'response' => "$tmp"));
		echo $res;
	}

	/**
	 * Label information storage (Ajax)
	 */
	function save_label() {
		$error_msg = '';
		$msg = '';
		//Array for pseudo transaction
		//Since there is no transaction function to MongoDB,
		//to hold to be able to delete the data of registration ID in this array
		$transaction = array();

		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		try {
			$inputs = Input::all();
			$inputs = $inputs['data'];

			Log::debug('Received data');
			Log::debug($inputs);

			$errors = self::validateSaveLabel($inputs);
			if (count($errors) > 0)
				$error_msg = implode("\n", $errors);

			//I want to save the label information because the error message is not
			if (!$error_msg){
				$dt = new MongoDate(strtotime(date('Y-m-d H:i:s')));
				$revision = array();
				$series_list = array();

				foreach ($inputs['series'] as $rec) {
					$revision[$rec['id']] = array();
					//If there is a label information
					if (array_key_exists('label', $rec) !== FALSE) {
						foreach ($rec['label'] as $rec2) {
							//Register storage table and label table is not performed if there is no image
							if ($rec2['image']) {
								//Storage registration of
								$storage_id = Seq::getIncrementSeq('Storages');
								$storage_obj = App::make('Storage');
								$storage_obj->storageID = $storage_id;
								$storage_obj->path = base64_decode(str_replace(' ', '+',$rec2['image']));
								$storage_obj->type = 'label';
								$storage_obj->active = true;
								$storage_obj->updateTime = $dt;
								$storage_obj->createTime = $dt;

								//Storage register before error checking
								$errors = $storage_obj->validate(json_decode($storage_obj, true));

								//Processing is interrupted because there is an error
								if ($errors) {
									Log::debug('Storage Validate Error');
									$error_msg = implode("\n", $errors->all());
									self::rollback($transaction);
									break;
								}

								//I do registration of storage information because there is no error
								$result = $storage_obj->save();

								//To gain in the transaction array Now that you have registered success
								if ($result) {
									if (array_key_exists('storage', $transaction) === FALSE)
										$transaction['storage'] = array();

									$transaction['storage'][] = $storage_obj->storageID;
								} else {
									Log::debug('[Storage]Regist failed');
									$error_msg = $result;
									self::rollback($transaction);
									break;
								}

								//I do the registration of the label information
								//Storage ID to use the storage ID registered just before
								$label_obj = App::make('Label');
								$label_obj->labelID = $rec2['id'];
								$label_obj->storageID = $storage_obj->storageID;
								$label_obj->x = intval($rec2['offset'][0]);
								$label_obj->y = intval($rec2['offset'][1]);
								$label_obj->z = intval($rec2['offset'][2]);
								$label_obj->w = isset($rec2['w']) ? intval($rec2['w']) : 0;
								$label_obj->h = isset($rec2['h']) ? intval($rec2['h']) : 0;
								$label_obj->d = intval($rec2['number']);
								$label_obj->creator = Auth::user()->loginID;
								$label_obj->date = $dt;
								$label_obj->updateTime = $dt;
								$label_obj->createTime = $dt;

								//Label information before registration error checking
								$errors = $label_obj->validate(json_decode($label_obj, true));

								//I want to delete the data of the registered storage because there is an error
								if ($errors) {
									Log::debug('Label Validate Error');
									$error_msg = implode("\n", $errors->all());
									self::rollback($transaction);
									break;
								}
								//I do the registration of the label information because there is no error
								$result = $label_obj->save();
								//To gain in the transaction array Now that you have registered success
								if ($result) {
									if (array_key_exists('label', $transaction) === FALSE)
										$transaction['label'] = array();

									$transaction['label'][] = $label_obj->labelID;
								} else {
									Log::debug('[Label]Regist failed');
									$error_msg = $result;
									self::rollback($transaction);
									break;
								}

								$revision[$rec['id']][] = array(
									'id'			=>	$label_obj->labelID,
									'attributes'	=>	array(
										'labelName'	=>	$rec2['name']
									)
								);
							}
						}
						$series_list[] = array(
							'seriesUID'	=>	$rec['id'],
							'labels'	=>	$revision[$rec['id']]
						);
					} else {
						$series_list[] = array(
							'seriesUID'	=>	$rec['id'],
							'labels'	=>	array()
						);
					}
				}
				//Update of case information
				//Case information acquisition
				$case_obj = ClinicalCase::find($inputs['caseId']);
				//Revision information acquisition
				$revisions = $case_obj->revisions;
				$next_index = count($revisions) > 0 ? count($revisions)-1 : 0;
				Log::debug($next_index);
				//Revision information setting
				$tmp_revision = array(
					'date'			=>	$dt,
					'creator'		=>	Auth::user()->loginID,
					'description'	=>	$inputs['memo'],
					'attributes'	=>	array(),
					'status'		=>	'draft',
					'series'		=>	$series_list
				);

				$case_obj->updateTime = $dt;

				//Error checking
				$errors = $case_obj->validate(json_decode($case_obj, true), true);
				//Remove label information and storage information if there is an error
				if ($errors){
					Log::debug('Case Validate Error');
					$error_msg = implode("\n", $errors->all());
					self::rollback($transaction);
				} else {
					$revision_data = array();
					foreach ($revisions as $key => $val) {
						if ($key !== 'latest') {
							$revision_data[$key] = $val;
						} else {
							$revision_data['latest'] = $tmp_revision;
						}
					}

					Log::debug('Registration will Revision number:'.$next_index);
					$revision_data[$next_index] = $tmp_revision;
					$case_obj->revisions = $revision_data;
					//I registered because there is no error
					$case_obj->save();
				}
				$msg = 'Registration of label information is now complete.';
			}
		} catch (Exception $e){
			$error_msg = $e->getMessage();
			Log::debug('[Exception Error]'.$error_msg);
		}
		Log::debug('Error content::'.$error_msg);

		//JSON output
		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => $error_msg ? $error_msg : $msg, 'response' => ""));
		echo $res;

	}

	/**
	 * Label information acquisition at the time of load (Ajax)
	 */
	function load_label() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Input information acquisition
		$inputs = Input::get('data');

		//Initial setting
		$error_msg = '';
		$msg = '';
		$data = array();

		try {
			//You do not specify a case ID
			if (array_key_exists('caseId', $inputs) === FALSE)
				self::errorFinish('Please specify a case ID.');

			if (!$error_msg) {
				$data["caseId"] = $inputs['caseId'];
				//I get the case information from the case ID
				$case_info = ClinicalCase::find($inputs['caseId']);

				//There is no case information brute string in case ID
				if (!$case_info) {
					self::errorFinish('There is a case ID that does not.');
				} else {
					//Revision information obtained from the case information because case information was taken
					$select_revision_no = 0;

					$revision_indexs = array_keys($case_info->revisions);
					if (array_key_exists('revisionNo', $inputs) !== FALSE) {
						$select_revision_no = $inputs['revisionNo'];

						//Check if appropriate Revision number exists
						if (array_search($select_revision_no, $revision_indexs) === FALSE){
							self::errorFinish('Specified Revision number does not exist.');
						}
					} else {
						$select_revision_no = max($revision_indexs);
					}

					$select_revision = $case_info->revisions[$select_revision_no];
					$data['memo'] = $select_revision['description'];
					$data['series'] = array();
					foreach ($select_revision['series'] as $series) {
						//Label information corrective
						$series_info = array();
						$series_info['id'] = $series['seriesUID'];
						$series_info['label'] = array();

						$label_list = array();
						foreach ($series['labels'] as $rec){
							$label = array();

							//considers the creation label is seen when there is no name in the attributes, label sky objects
							if (array_key_exists('labelName', $rec['attributes']) !== FALSE) {
								$label['attributes'] = $rec['attributes'];
								$label['id'] = $rec["id"];
								$label['name'] = $rec['attributes']['labelName'];

								//Label information acquisition
								if ($rec['id']) {
									$label_info = Label::find($rec['id']);
									$label['number'] = $label_info->d;
									$label['offset'] = array($label_info->x, $label_info->y, $label_info->z);

									//Storage information acquisition
									$storage_info = Storage::find($label_info->storageID);

									$label['image'] = base64_encode($storage_info->path);
								}
							}
							$series_info['label'][] = $label;
						}
						$data['series'][] = $series_info;
					}
				}
			}

		} catch (Exception $e) {
			Log::debug('[ExceptionError]'.$error_msg);
			self::errorFinish($e->getMessage());
		}

		//JSON output
		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => $error_msg ? $error_msg : $msg, 'response' => json_encode($data,JSON_UNESCAPED_UNICODE)));
		echo $res;
	}

	/**
	 * Pseudo transaction rollback processing (new registration only)
	 * @param $transaction Roll back
	 */
	function rollback($transaction) {
		//To perform a rollback processing because failed to register

		//Rollback processing of Storage table
		if (array_key_exists('storage', $transaction) !== FALSE) {
			$storage_cnt = count($transaction['storage']);
			Log::debug('Storage number to be deleted::'.$storage_cnt);
			Log::debug('Storage list of deleted::');
			Log::debug($transaction['storage']);
			$storage_delete_cnt = 0;

			//I do deletion process of storage that are stacked in the transaction array
			foreach ($transaction["storage"] as $rec){
				$delete = Storage::find($rec)->delete();
				if ($delete) $storage_delete_cnt++;
			}
			Log::debug('[Storage] Delete plan number:'.$storage_cnt.'\t Delete number:'.$storage_delete_cnt);
		}

		//Rollback processing of Label table
		if (array_key_exists('label', $transaction) !== FALSE) {
			$label_cnt = count($transaction['label']);
			Log::debug('Label number to be deleted::'.$label_cnt);
			Log::debug('Label list of deleted::');
			Log::debug($transaction['label']);
			$label_delete_cnt = 0;

			//I do deletion process of labels are stacked in the transaction array
			foreach ($transaction["label"] as $rec){
				$delete = Label::find($rec)->delete();
				if ($delete) $label_delete_cnt++;
			}
			Log::debug('[Label] Delete plan number:'.$label_cnt.'\t Delete number:'.$label_delete_cnt);
		}
	}

	/**
	 * I get the storage ID that brute string in series
	 * @param $seriesID Series ID
	 * @param $select_column Reference column
	 */
	function getSeries($seriesID, $select_column){
		$series = Series::addWhere(array('seriesUID' => $seriesID))
							->get($select_column);
		if (count($series) == 1)
			return $series[0];
		return;
	}

	/**
	 * Label stored data simple Validate
	 * @param $data Label stored data
	 */
	function validateSaveLabel($data) {
		$error = array();
		//Case ID check
		if (!$data['caseId']) {
			$error_msg[] = 'Please set the case ID.';
		} else {
			//Case presence check
			$case_data = ClinicalCase::find($data['caseId']);
			if (!$case_data)
				$error_msg[] = $rec['caseId'].'is the case ID that does not exist.';
		}

		//Series ID check
		if (count($data['series'] == 0)){
			$error_msg[] = 'Please set the series information.';
		} else {
			foreach ($data['series'] as $rec) {
				//Series ID check
				if (!$rec['id']) {
					$error_msg[] = 'Please set the series ID.';
					break;
				} else {
					//Series ID existence check
					$series_data = Series::find($rec['id']);
					if (!$series_data) {
						$error_msg[] = $rec['id'].'is the series ID that does not exist.';
						break;
					}
				}
			}
		}
		return $error;
	}

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

		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();
		$result['project_list'] = Project::getProjectList(Project::AUTH_TYPE_CREATE, true);

		//Back button is pressed during
		if (array_key_exists('btnBack', $inputs)) {
			$result['inputs'] = Session::get('case_input');
			$series_exclude_ary = array_keys($result['inputs']['series_list']);
		//Edit mode
		} else if (array_key_exists('caseID', $inputs) !== FALSE) {
			$case_data = ClinicalCase::find($inputs['caseID']);

			//Set case information
			if ($case_data) {
				$result['inputs'] = $case_data;
				Session::put('caseID', $case_data->caseID);
			}

			//Stores series information
			$series_exclude_ary = array();
			foreach ($result['inputs']->revisions as $key => $value) {
				if ($key !== 'latest') {
					for($i = 0; $i < count($value['series']); $i++){
						$series_exclude_ary[] = $value['series'][$i]['seriesUID'];
					}
				}
			}
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
			'patientInfo.birthday'
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
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		//Input value acquisition
		$inputs = Input::all();
		self::setBackUrl($inputs, $result);

		//Session information acquisition
		$caseID = Session::get('caseID');
		$case_info = Session::get('case_input');
		$mode = Session::get('mode');

		$case_info['projectID'] = $inputs['projectID'];
		//Set of series
		$case_info['seriesUID'] = $inputs['series'];
		$select_col = array(
			'seriesUID', 'seriesDescription',
			'patientInfo.patientID', 'patientInfo.age',
			'patientInfo.sex', 'patientInfo.patientName',
			'patientInfo.birthday'
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

		//Validate check for object creation
		$case_obj = $caseID ?
					ClinicalCase::find($caseID) :
					App::make('ClinicalCase');

		//Set the value for the Validate check
		$case_obj->caseID = $case_info['caseID'];
		$case_obj->incrementalID = 1;
		$case_obj->projectID = $case_info['projectID'];
		$case_obj->date = new MongoDate(strtotime(date('Y-m-d H:i:s')));
		$case_obj->patientInfoCache = array(
			'patientID'	=>	$case_info['patientInfo']['patientID'],
			'name'		=>	$case_info['patientInfo']['patientName'],
			'age'		=>	$case_info['patientInfo']['age'],
			'sex'		=>	$case_info['patientInfo']['sex']
		);

		//ValidateCheck
		$errors = $case_obj->validate(self::setCaseValidate($case_info));
		$result['inputs'] = $case_info;
		$result['series_list'] = $case_info['series_list'];
		if ($errors) {
			//Process at the time of Validate error
			$result['title'] = $mode.' Case';
			$result['url'] = '/case/input';
			$result['project_list'] = Project::getProjectList(Project::AUTH_TYPE_CREATE, true);
			$result['errors'] = $errors;
			return View::make('/case/input', $result);
		} else {
			//And displays a confirmation screen because there is no error
			$result['title'] = $mode.' Case Confirmation';
			$result['url'] = '/case/confirm';
			return View::make('/case/confirm', $result);
		}
	}

	/**
	 * Case registered
	 */
	function register(){
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();

		//Input value acquisition
		$inputs = Session::get('case_input');
		$caseID = Session::get('caseID');
		$mode = Session::get('mode');

		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();
		self::setBackUrl($inputs, $result);

		//Validate check for object creation
		$case_obj = $caseID ?
					ClinicalCase::find($caseID) :
					App::make('ClinicalCase');

		//Set the value for the Validate check
		$case_obj->caseID = $inputs['caseID'];
		$case_obj->incrementalID = 100;
		$case_obj->projectID = intval($inputs['projectID']);
		$case_obj->date = new MongoDate(strtotime(date('Y-m-d H:i:s')));

		//Setting of patient information
		$case_obj->patientInfoCache = array(
			'patientID'	=>	$inputs['patientInfo']['patientID'],
			'name'		=>	$inputs['patientInfo']['patientName'],
			'age'		=>	$inputs['patientInfo']['age'],
			'birthday'	=>	$inputs['patientInfo']['birthday'],
			'sex'		=>	self::setSex($inputs['patientInfo']['sex'])
		);

		//Initial setting of Revision information
		$series_list = self::createRevision($inputs['series_list']);
		$case_obj->revisions = array(
			'latest'	=>	$series_list,
			0			=>	$series_list
		);

		//ValidateCheck
		//Validate check for object creation
		$errors = $case_obj->validate(self::setCaseValidate($inputs));
		if (!$errors) {
			//Validate process at the time of success
			//I registered because there is no error
			$dt = new MongoDate(strtotime(date('Y-m-d H:i:s')));
			$case_obj->updateTime = $dt;
			$case_obj->createTime = $dt;
			$case_obj->creator = Auth::user()->loginID;
			$case_obj->save();

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
		} else {
			//Process at the time of Validate error
			$result['errors'] = $errors;
			$result['url'] = '/case/input';
			$result['title'] = $mode.' Case';
			$result['inputs'] = $inputs;
			$result['series_list'] = $inputs['series_list'];
			$result['project_list'] = Project::getProjectList(Project::AUTH_TYPE_CREATE, true);
			return View::make('/case/input', $result);
		}
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
	 * Page individual CSS setting
	 * @return Page individual CSS configuration array
	 */
	function cssSetting($mode = 'search') {
		$css = array();
	  	$css['ui-lightness/jquery-ui-1.10.4.custom.min.css'] = 'css/ui-lightness/jquery-ui-1.10.4.custom.min.css';


		switch($mode) {
			case 'search':
				$css['jquery.flexforms.css'] = 'css/jquery.flexforms.css';
				$css['page.css'] = 'css/page.css';
				break;
			case 'detail':
			case 'edit':
				$css['page_lib.css'] = 'css/page_lib.css';
				$css['jquery.simple-color-picker.cs'] = 'css/jquery.simple-color-picker.css';
				break;
			default:
				$css['page.css'] = 'css/page.css';
				break;
		}
	  	return $css;
	}

	/**
	 * Page individual JS setting
	 * @return Page individual JS configuration array
	 */
	function jsSetting($mode = 'search') {
		$js = array();
		$js['jquery-ui.min.js'] = 'js/jquery-ui.min.js';

		switch ($mode) {
			case 'search':
				$js['jquery.multiselect.min.js'] = 'js/jquery.multiselect.min.js';
				$js['jquery.formserializer.js'] = 'js/jquery.formserializer.js';
				$js['jquery.flexforms.js'] = 'js/jquery.flexforms.js';
				$js['more_search.js'] = 'js/more_search.js';
				break;
			case 'detail':
			case 'edit':
				$js['jquery.simple-color-picker.js'] = 'js/jquery.simple-color-picker.js';
				$js['voxelContainer.js'] = 'js/voxelContainer.js';
				$js['imageViewer.js'] = 'js/imageViewer.js';
				$js['imageViewerController.js'] = 'js/imageViewerController.js';
				$js['jquery.flexforms.js'] = 'js/jquery.flexforms.js';
				break;
		}
		return $js;
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
	 * Series List Json
	 * @param $data Revision data that are selected
	 * @return Series list brute string to Revision
	 */
	function getSeriesList($series_list) {
		$list = array();
		Log::debug($series_list);
		foreach ($series_list as $rec) {

			//検索条件を設定
			$search_data = array();
			$labels = array();


			$list[] = array(
				'image'		=>	array(
					'description'	=>	$rec->seriesDescription,
					'id'			=>	$rec->seriesUID,
					'voxel'			=>	array(
						'voxel_x'	=>	0,
						'voxel_y'	=>	0,
						'voxel_z'	=>	0,
						'x'			=>	0,
						'y'			=>	0,
						'z'			=>	0
					),
					'window'		=>	array(
						'level'		=>	array(
							'current'	=>	1000,
							'maximum'	=>	40000,
							'minimum'	=>	-2000
						),
						'width'		=>	array(
							'current'	=>	3500,
							'maximum'	=>	8000,
							'minimum'	=>	1
						),
						'preset'	=>	array(
							array(
								'label'	=>	'ソースからシリーズ共通用で入力',
								'level'	=>	1000,
								'width'	=>	2000
							)
						)
					)
				)
			);
		}
		return json_encode($list);
	}

	/**
	 * Case ID created (SHA256 + uniqid)
	 * @return string that was turned into Hash in SHA256 the uniqid (case ID)
	 */
	function createCaseID(){
		return hash_hmac('sha256', uniqid(), Config::get('const.hash_key'));
	}

	/**
	 * I want to create a list of revisions
	 * @param $case_data Case information
	 */
	function getRevision($case_data) {
		foreach($case_data->revisions as $key => $value) {
			//key is excluded so Clone thing of latest
			if ($key !== 'latest') {
				//I ask the number of label
				$label_cnt = 0;
				foreach ($value['series'] as $rec) {
					$label_cnt += count($rec['labels']);
				}

				//I ask the day of the week
				$w = self::getWeekDay(date('w', $value['date']->sec));

				//The list created for display
				$revision_list = array(
					'revisionNo'	=>	$key,
					'editDate'		=>	date('Y/m/d('.$w.')', $value['date']->sec),
					'editTime'		=>	date('H:i', $value['date']->sec),
					'seriesCount'	=>	count($value['series']),
					'labelCount'	=>	$label_cnt,
					'creator'		=>	$value['creator'],
					'memo'			=>	$value['description']
				);
			}
		}
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
	 * I sort by Revision final editing time
	 * @param $a Sort array (large value)
	 * @param $b Sort array (small value)
	 */
	function sortEditTime($a, $b) {
		//Modified the new order
		$a_time = $a['sortEditTime'];
		$b_time = $b['sortEditTime'];

		if (strtotime($a_time) == strtotime($b_time))
			return 0;

		return strtotime($a_time) > strtotime($b_time) ? -1 : 1;
	}

	/**
	 * I sort by RevisionNo
	 * @param $a Sort array (large value)
	 * @param $b Sort array (small value)
	 * @return Sort Result 0: equal -1: b is greater 1: a large
	 */
	function sortRevisionNo($a, $b){
		//Revision old order
		$a_no = $a['revisionNo'];
		$b_no = $b['revisionNo'];

		if (strtotime($a_no) == strtotime($b_no))
			return 0;

		return strtotime($a_no) < strtotime($b_no) ? 1 : -1;
	}

	/**
	 * I sort the Revision list
	 * @param $list Revsion list
	 * @param $sort Sorting method
	 * @return Sort the Revision list
	 */
	function sortRevision($list, $sort) {
		switch ($sort) {
			case 'revision.date':	//Edit Date desc
				$res = usort($list, 'self::sortEditTime');
				return $list;
			case 'revisionNo':		//RevisionNo asc
				$res = uasort($list, 'self::sortRevisionNo');
				return $list;
		}
		return $list;
	}

	/**
	 * I want to create an array for the Validate
	 * @param $data Validate checked the data
	 * @return Validate check for array
	 */
	function setCaseValidate($data) {
		$valid_ary = array();

		$valid_ary['caseID'] = $data['caseID'];
		$valid_ary['projectID'] = $data['projectID'];
		$valid_ary['patientInfoCache_patientID'] = $data['patientInfo']['patientID'];
		$valid_ary['patientInfoCache_name'] = $data['patientInfo']['patientName'];
		$valid_ary['patientInfoCache_age'] = $data['patientInfo']['age'];
		$valid_ary['patientInfoCache_sex'] = $data['patientInfo']['sex'];
		$valid_ary['patientInfoCache_birthday'] = $data['patientInfo']['birthday'];
		$valid_ary['date'] = new MongoDate(strtotime(date('Y-m-d H:i:s')));
		$valid_ary['incrementalID'] = 1;

		return $valid_ary;
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
			'creator'		=>	Auth::user()->loginID,
			'description'	=>	'Create a new',
			'attributes'	=>	array(
				'calc'	=>	false,
				'HBV'	=>	false
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

	/**
	 * Error handling of the system look back error when the message (for Ajax)
	 * @param $msg Error message
	 */
	function errorFinish($msg) {
		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => $msg, 'response' => ""));
		echo $res;
		exit;
	}
}
