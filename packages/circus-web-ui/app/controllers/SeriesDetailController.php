<?php
/**
 * シリーズ詳細
 */
class SeriesDetailController extends BaseController {
	/**
	 * Series detail page
	 */
	function detail() {
		$error_msg = '';
		$result = array();
		$inputs = Input::all();
		try {
			if (array_key_exists('btnBack', $inputs) !== false) {
				//ID retrieved from the session
				$cases = Session::get('case_input');
				$ids = array_keys($cases['series_list']);
				$inputs['seriesUID'] = $ids[0];
				//Session discarded
				Session::forget('case_input');
			} else {
				Session::forget('edit_case_id');
			}

			if (!$inputs['seriesUID'])
				throw new Exception('Please specify the series ID.');

			//Check series ID that exists
			$series_data = Series::find($inputs['seriesUID']);
			if (!$series_data)
				throw new Exception('Series ID does not exist.');

			$result['series_detail'] = $series_data;
			$result['series_list'] = $this->formatSeries($series_data);
		} catch (Exception $e){
			Log::debug($e->getMessage());
			Log::debug($e);
			$result['error_msg'] = $e->getMessage();
		}
		return View::make('series/detail', $result);
	}

	/**
	 * Series List Json
	 * @param $data Revision data that are selected
	 * @return Series list brute string to Revision
	 */
	function formatSeries($series) {
		$data = array();
		$img_save_path = Config::get('const.label_img_save_path');

		$series_info = array();
		$series_info['id'] = $series->seriesUID;
		$series_info['description'] = $series->seriesDescription;
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
		$data[] = $series_info;

		$json = json_encode($data);
		$json = preg_replace('/\\\\\//', '/', $json);
		return $json;
	}
}
