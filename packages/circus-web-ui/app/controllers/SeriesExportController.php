<?php

/**
 * Export series volume data
 */
class SeriesExportController extends BaseController
{
	/**
	 * Series Export
	 */
	public function export()
	{
		$result = array();

		//POST data acquisition
		$inputs = Input::all();
		try {
			//validate check
			$this->validate($inputs);

			//create temporary folder
			$tmp_dir = Str::random(32);
			$tmp_dir_path = storage_path('cache') . '/' . $tmp_dir;

			if (!mkdir($tmp_dir_path))
				throw new Exception('Creating a temporary folder failed');

			//delete trash files
			CommonHelper::deleteOlderTemporaryFiles(storage_path('cache'), true, '-1 day');

			//command execution
			$cmd_str = ' series ' . $inputs['seriesUID'] . ' ' . $tmp_dir_path . ' --compress';

			$task = Task::startNewTask("image:export-volume " . $cmd_str);
			if (!$task) {
				throw new Exception('Failed to invoke export process.');
			}

			// determine download zip file
			$zip_file_name = $inputs['seriesUID'] . '.zip';
			$zip_file_path = $tmp_dir_path . '/' . $zip_file_name;
			$task->saveDownloadPath($zip_file_path);

			return Response::json(array(
				'result' => true,
				'taskID' => $task->taskID
			));
		} catch (Exception $e) {
			Log::error($e);

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
	function validate($inputs)
	{
		//seriesUID empty
		if (!isset($inputs['seriesUID']))
			throw new Exception('Please select the seriesUID .');

		//series not found
		$series = Series::find($inputs['seriesUID']);
		if (!$series)
			throw new Exception('The series does not exist .');

		//series image range specification error
		if (!isset($inputs['export_start_img']) || !isset($inputs['export_end_img']))
			throw new Exception('Please specify a series image range .');

		//out of range
		$image_range = explode(',', $series->images);
		$st_range_flag = false;
		$ed_range_flag = false;

		foreach ($image_range as $range) {
			if (strpos($range, '-') !== false)
				list($st_range, $ed_range) = explode('-', $range);
			else
				$st_range = $ed_range = $range;

			if (!$st_range_flag) {
				if (intval($inputs['export_start_img']) >= intval($st_range) &&
					intval($inputs['export_start_img']) <= intval($ed_range)
				) {
					$st_range_flag = true;
				}
			}

			if (!$ed_range_flag) {
				if (intval($inputs['export_end_img']) >= intval($st_range) &&
					intval($inputs['export_end_img']) <= intval($ed_range)
				) {
					$ed_range_flag = true;
				}
			}

			if ($st_range_flag && $ed_range_flag)
				break;
		}

		if (!$st_range_flag || !$ed_range_flag)
			throw new Exception('The image of out of  the scope  is specified .');
	}
}
