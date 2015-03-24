<?php
/**
 * ケース詳細
 */
class CaseDetailController extends BaseController {
	/**
	 * Case Details screen
	 */
	public function detail() {
		$result = array();

		//POST data acquisition
		$inputs = Input::all();

		try {
			if (array_key_exists('caseID', $inputs) === false)
				throw new Exception('Please specify a case ID.');

			if (array_key_exists('btnBack', $inputs)) {
				//Session discarded
				if (Session::has('case_input'))
					Session::forget('case_input');
			}

			$inputs['caseID'] = isset($inputs['caseID']) ? $inputs['caseID'] : Session::get('caseID');
			$inputs['mode'] = isset($inputs['mode']) ? $inputs['mode'] : Session::get('view_mode');

			$result['mode'] = $inputs['mode'];
			Session::put('view_mode', $inputs['mode']);
			Session::put('caseID', $inputs['caseID']);
			Session::put('case.detail', $inputs);

			$case_info = ClinicalCase::find($inputs['caseID']);

			if (!$case_info)
				throw new Exception('Case ID does not exist.');

			//Authority check
			//Case viewing rights
			$auth_view = Project::getProjectList(Project::AUTH_TYPE_VIEW, false);
			if (!$auth_view || array_search($case_info->projectID, $auth_view) === false) //{
				throw new Exception('You do not have permission to refer to the appropriate case.');

			//Case edit authority
			$auth_edit = Project::getProjectList(Project::AUTH_TYPE_UPDATE, false);
			$result['edit_flg'] = ($auth_edit && array_search($case_info->projectID, $auth_edit) !== false) ?
						true: false;

			//The shaping Revision information for display
			$revision_list = array();
			$revision_no_list = array();
			$max_revision = 0;
			foreach($case_info->revisions as $key => $value) {
				//The set if Revision number is large
				if ($max_revision < $key)
					$max_revision = $key;

				$revision_list[] = self::getRevisionInfo($key, $value);
				$revision_no_list[] = $key;
			}
			$select_revision = isset($inputs['revisionNo']) ? $inputs['revisionNo'] : $max_revision;
			$result['revisionNo'] = $select_revision;

			$result['case_detail'] = $case_info;

			//Revision sort order adaptation
			$result['revision_list'] = self::sortRevision($revision_list, 'revision.date');
			$result['revision_no_list'] = $revision_no_list;

			//Series list created
			$inputs['seriesUID'] = self::getSeriesIDList($case_info, $select_revision);
			//Shaping of the series list
			$result['series_list'] = self::getSeriesList($case_info->revisions[$select_revision]);
			$result['attribute'] = json_encode($case_info->revisions[$select_revision]['attributes']);
			$result['inputs'] = Session::get('case.detail');

			//Attribute Settings
			$result['label_attribute_settings'] = json_encode($case_info->project->labelAttributesSchema);
			$result['case_attribute_settings'] = json_encode($case_info->project->caseAttributesSchema);

			//JsonFile read
			$result['server_url'] = Helper\ConfigHelper::getServerConfig();
		} catch (Exception $e) {
			Log::debug($e);
			Log::debug($e->getMessage());
			$result['error_msg'] = $e->getMessage();
			//$result['title'] = 'Case Detail';
		}
		return View::make('case/detail', $result);
	}

	function getSeriesIDList($case_info, $revision_no) {
		$series = array();
		foreach ($case_info->revisions as $key => $value) {
			if ($key == $revision_no) {
				for ($i = 0; $i < count($value['series']); $i++){
					$series[] = $value['series'][$i]['seriesUID'];
				}
			}
		}
		return $series;
	}

	function getRevisionInfo($key, $value) {
		$label_cnt = 0;
		foreach ($value['series'] as $rec) {
			$label_cnt += count($rec['labels']);
		}
		$w = CommonHelper::getWeekDay(date('w', $value['date']->sec));

		return array(
			'revisionNo'	=>	$key,
			'editDate'		=>	date('Y/m/d('.$w.')', $value['date']->sec),
			'editTime'		=>	date('H:i', $value['date']->sec),
			'seriesCount'	=>	count($value['series']),
			'labelCount'	=>	$label_cnt,
			'creator'		=>	$value['creator'],
			'memo'			=>	$value['description'],
			'sortEditTime'	=>	date('Y-m-d H:i:s', $value['date']->sec)
		);
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
						$img_path = file_get_contents($storage_path."/".$label['id'].'.png');
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
