<?php
/**
 * Class to perform the operation of series
 */
class SeriesSearchController extends BaseController {
	protected $searchableFields = [
		'SeriesUID', 'seriesDescription', 'patientID', 'patientName',
		'minAge', 'maxAge', 'sex'
	];

	/**
	 * Series Search Result
	 */
	public function search($preset_id = false) {
		//Initialization
		$search_flg = false;
		$result = array();

		//閲覧可能なシリーズがあるかチェック
		if (!Auth::user()->isAccessibleSeries()) {
			$result['error_msg'] = '参照可能なシリーズはありません。';
			return View::make('series.search', $result);
		}

		//Input value acquisition
		$inputs = Input::all();

		// Enter 'add new series to an existing case' mode
		if (isset($inputs['edit_case_id']))
			Session::put('edit_case_id', $inputs['edit_case_id']);

		// Parse input from HTML and save the search condition as an object
		$this->setSearchData($inputs, $preset_id);
		$search_data = Session::get('series.search');

		//Search
		if ($search_data) {
			$search_flg = true;
			$result['list'] = Series::getSeriesList($search_data);

			//Setting the pager
			if ($result['list'] && $search_data['disp'] !== 'all' )
				$result['list_pager'] = Paginator::make($result['list']->toArray(),
														Series::getSeriesList($search_data, true),
														$search_data['disp']);
		} else {
			$search_data['sex'] = 'all';
		}

		$result['inputs'] = $search_data;
		$result['search_flg'] = $search_flg;
		$result['edit_case_flg'] = $this->isEditCase();
		return View::make('series.search', $result);
	}

	private function isEditCase() {
		return Session::get('edit_case_id') ? true : false;
	}

	protected function setSearchData($inputs, $preset_id)
	{
		if (array_key_exists('btnReset', $inputs) !== false || (!$inputs && $preset_id === false)) {
			// "Reset" clicked, or first-time visit to the search screen
			Session::forget('series.search');
			Session::forget('edit_case_id');
			setcookie('seriesCookie', time() - 1800);
		} else if (array_key_exists('btnSearch', $inputs) !== false) {
			// "Search" button is pressed
			if (array_key_exists('disp', $inputs) === false) $inputs['disp'] = Config::get('const.page_display');
			if (array_key_exists('sort', $inputs) === false) $inputs['sort'] = 'seriesDate';
			if (array_key_exists('order_by', $inputs) === false) $inputs['order_by'] = 'desc';
			Session::put('series.search', $inputs);
			setcookie('seriesCookie', time() - 1800);
		} else if (array_key_exists('page', $inputs) !== false) {
			$search_data = Session::get('series.search');
			$search_data['perPage'] = $inputs['page'];
			Session::put('series.search', $search_data);
		} else if ($preset_id !== false) {
			$presets = Auth::user()->preferences['seriesSearchPresets'];
			$detail_search = $presets[$preset_id];
			$detail_search['disp'] = Config::get('const.page_display');
			$detail_search['sort'] = 'seriesDate';
			$detail_search['order_by'] = 'desc';
			Session::put('series.search', $detail_search);
			setcookie('seriesCookie', time() - 1800);
		}
	}

	/**
	 * Search conditions save(Ajax)
	 */
	public function save_search() {
		//Input value acquisition
		$inputs = Input::all();

		$user = Auth::user();
		$pref = $user->preferences;
		$presets = isset($pref['seriesSearchPresets']) ? $pref['seriesSearchPresets'] : array();
		$presets[] = $inputs;
		$pref['seriesSearchPresets'] = $presets;

		$user->preferences = $pref;
		$user->save();

		$msg = 'Saved search criteria.';
		return Response::json(array('result' => true, 'message' => $msg));
	}
}
