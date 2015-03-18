<?php
/**
 * ケース詳細
 */
class CaseDetailController extends BaseController {
	/**
	 * Case Search Results(Ajax)
	 */

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
		} else if (array_key_exists('caseID', $inputs) === FALSE) {
			$error_msg = 'Please specify a case ID.';
		}

		$inputs['caseID'] = isset($inputs['caseID']) ? $inputs['caseID'] : Session::get('caseID');
		$inputs['mode'] = isset($inputs['mode']) ? $inputs['mode'] : Session::get('view_mode');

		if (!$error_msg) {
			Session::put('caseID', $inputs['caseID']);
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
				'patientName'	=>	$case_data->patientInfoCache['patientName'],
				'birthDate'		=>	$case_data->patientInfoCache['birthDate'],
				'sex'			=>	self::getSex($case_data->patientInfoCache['sex'])
			);

			//The shaping Revision information for display
			$revision_list = array();
			$revision_no_list = array();
			$max_revision = 0;
			foreach($case_data->revisions as $key => $value) {
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
			$select_revision = isset($inputs['revisionNo']) ? $inputs['revisionNo'] : $max_revision;
			$case_detail['revisionNo'] = $select_revision;

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
			Log::debug('Revision number that has been selected::'.$select_revision);
			$result['series_list'] = self::getSeriesList($case_data->revisions[$select_revision]);
			$revision_attribute = $case_data->revisions[$select_revision]['attributes'];
			//datepickerが日付でない値(空文字など)設定するとおかしくなるのでそれの対処を入れる
			if (array_key_exists('birthDate', $revision_attribute) === FALSE || !$revision_attribute['birthDate']) {
				unset($revision_attribute['birthDate']);
			}

			//$result['attribute'] = json_encode($case_data->revisions[$select_revision]['attributes']);
			$result['attribute'] = json_encode($revision_attribute);

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
		$result['mode'] = $inputs['mode'];
		Session::put('view_mode', $inputs['mode']);

		//JsonFile read
		try {
			$projects = Project::find($case_data->projectID);
			$result['label_attribute_settings'] = json_encode($projects->labelAttributesSchema);
			$result['case_attribute_settings'] = json_encode($projects->caseAttributesSchema);

			$file_path = app_path()."/config/server_config.json";
			$handle = fopen($file_path, 'r');
			$result['server_url'] = json_decode(fread($handle, filesize($file_path)), true);
			fclose($handle);
		} catch (Exception $e){
			Log::debug($e->getMessage());
		}

		return View::make('/case/detail', $result);
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

	/**
	 * Series List Json
	 * @param $data Revision data that are selected
	 * @return Series list brute string to Revision
	 */
	function getSeriesList($revision_info) {
		$data = array();
		$img_save_path = Config::get('const.label_img_save_path');

		foreach ($revision_info['series'] as $series) {
			//Label information corrective
			$series_info = array();
			$series_info['id'] = $series['seriesUID'];
			$series_info['description'] = Series::getSeriesDescription($series['seriesUID']);
			$series_info['label'] = array();
			$series_info['voxel'] = array(
				'voxel_x'	=>	0,
				'voxel_y'	=>	0,
				'voxel_z'	=>	0,
				'x'			=>	0,
				'y'			=>	0,
				'z'			=>	0
			);
			$series_info['window'] = array(
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
			);

			$label_list = array();
			foreach ($series['labels'] as $rec){
				$label = array();

				//considers the creation label is seen when there is no name in the attributes, label sky objects
				if ($rec){
					$label['attribute'] = $rec['attributes'];
					$label['id'] = $rec["id"];

					//Label information acquisition
					if ($rec['id']) {
						$label_info = Label::find($rec['id']);
						$label['size'] = array($label_info->w, $label_info->h, $label_info->d);
						$label['offset'] = array($label_info->x, $label_info->y, $label_info->z);

						//Storage information acquisition
						$storage_info = Storage::find($label_info->storageID);
						$storage_path = $storage_info->path;
						$img_path = file_get_contents($storage_path.$label['id'].'.png');
						$label['image'] = 'data:image/png;base64,'.base64_encode($img_path);
					}
				}
				$series_info['label'][] = $label;
			}
			$data[] = $series_info;
		}

		$json = json_encode($data);
		$json = preg_replace('/\\\\\//', '/', $json);
		return $json;
	}
}
