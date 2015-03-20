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
		$result['title'] = 'Series Detail';
		$result['url'] = 'series/detail';

		$inputs = Input::all();

		try {
			//Error message initialization
			if (array_key_exists('btnBack', $inputs) !== false) {
				//ID retrieved from the session
				$cases = Session::get('case_input');
				$ids = array_keys($cases['series_list']);
				$inputs['seriesUID'] = $ids[0];
				//Session discarded
				Session::forget('case_input');
			}

			if (!$inputs['seriesUID'])
				throw new Exception('Please specify the series ID.');

			//Check series ID that exists
			$series_data = Series::find($inputs['seriesUID']);
			if (!$series_data)
				throw new Exception('Series ID does not exist.');

			$result['series_detail'] = $series_data;
		} catch (Exception $e){
			Log::debug($e->getMessage());
			Log::debug($e);
			$result['error_msg'] = $e->getMessage();
		}
		return View::make('/series/detail', $result);
	}
}
