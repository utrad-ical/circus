<?php
/**
 * ケースExport
 */
class CaseExportController extends BaseController {
	/**
	 * Case Export
	 */
	public function export() {
		$result = array();

		//POST data acquisition
		$inputs = Input::all();
		Log::debug('Input Values');
		Log::debug($inputs);
		try {
			//validate check
			$this->validate($inputs);

			//create temporary folder
			$tmp_dir = Str::random(32);
			$tmp_dir_path = storage_path('cache').'/'.$tmp_dir;
			if (!mkdir($tmp_dir_path))
				throw new Exception('Creating a temporary folder failed');

			//delete trash files
			CommonHelper::deleteOlderTemporaryFiles(storage_path('cache'), true, '-1 day');

			$data_label = $this->getDataTypeOption(intval($inputs['data_type']));
			$output_label = $this->getOutputTypeOption(intval($inputs['output_type']));
			$series_index = $this->getSeriesIndex($inputs['caseID'], $inputs['revisionNo'], $inputs['seriesUID']);

			//command execution
			$cmd_str = ' case '.$inputs['caseID'].' '.$tmp_dir_path;

			$cmd_ary = array(
				'--series_index' => $series_index,
				'--revision' => $inputs['revisionNo']
			);

			//create label map
			if (intval($inputs['data_type']) !== ClinicalCase::DATA_TYPE_ORIGINAL)
				$cmd_ary['--map'] = $this->createMap($inputs['labels']);

			foreach ($cmd_ary as $cmd_key => $cmd_val) {
				$cmd_str .= ' '.$cmd_key.'='.$cmd_val;
			}

			$cmd_str .= ' --compress';
			if ($data_label)
				$cmd_str .= ' '.$data_label;
			if ($output_label)
				$cmd_str .= ' '.$output_label;

			Log::debug('command params::');
			Log::debug($cmd_str);

			$task = Task::startNewTask("image:export-volume " .$cmd_str);
			if (!$task) {
				throw new Exception('Failed to invoke export process.');
			}

			//download zip file
			$zip_file_name = $inputs['caseID'].'_series'.$series_index.'_revision'.$inputs['revisionNo'].'.zip';
			$zip_file_path = $tmp_dir_path.'/'.$zip_file_name;

			if (!file_exists($zip_file_path))
				throw new Exception('failed create zip file .');

			//ダウンロードに必要な情報の設定
			$res = array(
				'file_name' => $zip_file_name,
				'dir_name' => $tmp_dir
			);
			return Response::json(array(
				'result' => true,
				'taskID' => $task->taskID,
				'response' => $res
			));
		} catch (Exception $e) {
			Log::debug($e);

			if (isset($tmp_dir_path))
				File::deleteDirectory($tmp_dir_path);
			return Response::json(
				array('result' => false, 'errorMessage' => $e->getMessage()),
				400
			);
		}
	}

	/**
	 * validate check
	 * @param $inputs input values
	 */
	function validate($inputs) {
		//no select data type
		if (!array_key_exists('data_type', $inputs))
			throw new Exception('Please select the data type .');
		//data type not found
		if ($inputs['data_type'] != ClinicalCase::DATA_TYPE_LABEL &&
			$inputs['data_type'] != ClinicalCase::DATA_TYPE_ORIGINAL &&
			$inputs['data_type'] != ClinicalCase::DATA_TYPE_ORIGINAL_LABEL)
			throw new Exception('The data type does not exist .');

		//no select output type
		if (!array_key_exists('output_type', $inputs))
			throw new Exception('Please select the output type .');
		//output type not found
		if ($inputs['output_type'] != ClinicalCase::OUTPUT_TYPE_COMBI &&
			$inputs['output_type'] != ClinicalCase::OUTPUT_TYPE_SEPARATE)
			throw new Exception('The output type does not exists .');

		//include a label output and no select label
		if (($inputs['data_type'] == ClinicalCase::DATA_TYPE_LABEL ||
			$inputs['data_type'] == ClinicalCase::DATA_TYPE_ORIGINAL_LABEL) &&
			!array_key_exists('labels', $inputs))
			throw new Exception('Please select at least one label.');

		$case_info = ClinicalCase::find($inputs['caseID']);
		//case not found
		if (!$case_info)
			throw new Exception('The case does not exist .');

		//revision not found
		if (!array_key_exists($inputs['revisionNo'], $case_info->revisions))
			throw new Exception('The revisionNo does not exist .');

		$revision = $case_info->revisions[$inputs['revisionNo']];
		$series_idx = null;
		foreach ($revision['series'] as $idx => $series){
			if ($series['seriesUID'] === $inputs['seriesUID']) {
				$series_idx = $idx;
				break;
			}
		}
		//series not found
		if ($series_idx === null)
			throw new Exception('The series does not exist .');

		//include a label output and label not found
		if ($inputs['data_type'] == ClinicalCase::DATA_TYPE_LABEL ||
			$inputs['data_type'] == ClinicalCase::DATA_TYPE_ORIGINAL_LABEL) {
			$series = $revision['series'][$series_idx];
			foreach($inputs['labels'] as $idx => $label) {
				//label not found
				if (!array_key_exists($idx, $series['labels']))
					throw new Exception('The label does not exist .');
			}
		}
	}

	/**
	 * get the Index number of series from series ID
	 * @param $case_id case id
	 * @param $revision_no revision number
	 * @param $series_uid series id
	 * @return $idx series index number
	 */
	function getSeriesIndex($case_id, $revision_no, $series_uid) {
		$case_info = ClinicalCase::find($case_id);

		$revision = $case_info->revisions[$revision_no];
		foreach($revision['series'] as $idx => $series) {
			if ($series['seriesUID'] === $series_uid)
				return $idx;
		}
	}

	/**
	 * get data type
	 * @param $data_type data type
	 */
	function getDataTypeOption($data_type) {
		$opt_label = '';
		switch ($data_type) {
			case ClinicalCase::DATA_TYPE_ORIGINAL:
				$opt_label = '--without-label';
				break;
			case ClinicalCase::DATA_TYPE_LABEL:
				$opt_label = '--without-original';
				break;
		}
		return $opt_label;
	}

	/**
	 * get output type
	 * @param $output_type output type
	 */
	function getOutputTypeOption($output_type) {
		return $output_type == ClinicalCase::OUTPUT_TYPE_COMBI ? '--combined' : '';
	}

	/**
	 * create map
	 * @param $labels label list
	 * @return map of label info
	 */
	function createMap($labels) {
		if (!$labels) return '';

		$map_list = array();
		foreach ($labels as $key => $value) {
			$map_list[$value] = $key+1;
		}
		ksort($map_list);
		//KeyとValueを連結
		$tmp_map = array();
		foreach($map_list as $key => $value) {
			$tmp_map[] = $key.','.$value;
		}
		return implode(':',$tmp_map);
	}

}
