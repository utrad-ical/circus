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
			$inputs['data_type'] = ClinicalCase::DATA_TYPE_ORIGINAL_LABEL;
			$inputs['output_type'] = ClinicalCase::OUTPUT_TYPE_SEPARATE;

			$result['mode'] = $inputs['mode'];
			Session::put('view_mode', $inputs['mode']);
			Session::put('caseID', $inputs['caseID']);
			Session::put('case.detail', $inputs);

			$case_info = ClinicalCase::find($inputs['caseID']);

			if (!$case_info)
				throw new Exception('Case ID does not exist.');

			$user = Auth::user();

			//ケース自体はあるが、参照権限がない(403エラー）
			if (!$user->isAccessibleSeries($inputs['caseID'])) {
				$result['url'] = 'home';
				$result['error_msg'] = 'Unauthorized action.';
				return Response::view('error', $result, 403);
			}

			//Authority check
			//Case viewing rights
			$auth_view = $user->listAccessibleProjects(Project::AUTH_TYPE_READ);
			if (!$auth_view || array_search($case_info->projectID, $auth_view) === false)
				throw new Exception('You do not have permission to refer to this case.');

			//Case edit authority
			$result['edit_flg'] = $user->isEditCase($case_info->projectID);
			$result['add_series_flg'] = $user->isAddSeries($case_info->projectID);

			//The shaping Revision information for display
			$revision_list = array();
			$revision_no_list = array();
			$max_revision = 0;
			foreach($case_info->revisions as $key => $value) {
				//The set if Revision number is large
				if ($max_revision < $key)
					$max_revision = $key;

				$revision_list[] = $this->getRevisionInfo($key, $value);
				$revision_no_list[] = $key;
			}
			$select_revision = isset($inputs['revisionNo']) ? $inputs['revisionNo'] : $max_revision;
			$result['revisionNo'] = $select_revision;

			$result['case_detail'] = $case_info;

			//Revision sort order adaptation
			$result['revision_list'] = $this->sortRevision($revision_list, 'revision.date');
			$result['revision_no_list'] = $revision_no_list;

			//Series list created
			$inputs['seriesUID'] = $this->getSeriesIDList($case_info, $select_revision);
			//Shaping of the series list
			$result['series_list'] = $this->getSeriesList($case_info->revisions[$select_revision],
														  $case_info->project->windowPriority,
														  $case_info->project->windowPresets);
			$result['attribute'] = json_encode($case_info->revisions[$select_revision]['attributes']);
			$result['inputs'] = Session::get('case.detail');

			//Attribute Settings
			$result['label_attribute_settings'] = json_encode($case_info->project->labelAttributesSchema);
			$result['case_attribute_settings'] = json_encode($case_info->project->caseAttributesSchema);
			$result['window_presets'] = json_encode($case_info->project->windowPresets);

			//JsonFile read
			$result['server_url'] = Helper\ConfigHelper::getServerConfig();
		} catch (Exception $e) {
			Log::debug($e);
			$result['error_msg'] = $e->getMessage();
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
			if (array_key_exists('labels', $rec))
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
	function getSeriesList($revision_info, $priority, $presets = array()) {
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
				'preset'	=>	array(),
				'priority'	=> $priority
			);

			if ($presets)
				$series_info['window']['preset'] = $presets;

			$label_list = array();
			if (array_key_exists('labels', $series)) {
				foreach ($series['labels'] as $rec){
					$label = array();

					//considers the creation label is seen when there is no name in the attributes, label sky objects
					if ($rec){
						$label['attribute'] = $rec['attributes'];
						$label['id'] = $rec["id"];

						//Label information acquisition
						if ($rec['id']) {
							$label_info = Label::find($rec['id']);
							if ($label_info) {
								$label['size'] = array($label_info->w, $label_info->h, $label_info->d);
								$label['offset'] = array($label_info->x, $label_info->y, $label_info->z);

								//Storage information acquisition
								$storage_info = Storage::find($label_info->storageID);
								$storage_path = $storage_info->path;

								$tmp = '';
								$load_path = $storage_path."/".$label['id'].'.gz';
								if (file_exists($load_path)) {
									$tmp = file_get_contents($load_path);
									$label['image'] = base64_encode($tmp);
								} else {
									//throw new Exception('ラベル情報の読み込みに失敗しました。');
									$label['image'] = 'error';
								}

							}
						}
					}
					$series_info['label'][] = $label;
				}
			}
			$data[] = $series_info;
		}
		$json = json_encode($data);
		$json = preg_replace('/\\\\\//', '/', $json);
		return $json;
	}
	/**
	 * Revisionの該当シリーズに紐づくラベル一覧取得(Ajax)
	 */
	function get_label_list() {
		$inputs = Input::all();
		$label_list = ClinicalCase::getLabelList($inputs);
		return Response::json(["label_list" => $label_list]);
	}
}
