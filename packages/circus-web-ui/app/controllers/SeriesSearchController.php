<?php
/**
 * Class to perform the operation of series
 */
class SeriesSearchController extends BaseController {
	/**
	 * Series Search Result
	 */
	public function search() {
		//Initialization
		$search_flg = false;
		$result = array();

		//Input value acquisition
		$inputs = Input::all();
		//The window for the series added to an existing case
		if (array_key_exists('edit_case_id', $inputs))
			Session::put('edit_case_id', $inputs['edit_case_id']);

		$this->setSearchData($inputs, $result);
		$search_data = Session::get('series.search');

		//Search
		if ($search_data) {
			$search_flg = true;
			$result['list'] = Series::getSeriesList($search_data);

			//Setting the pager
			if ($result['list'])
				$result['list_pager'] = Paginator::make($result['list']->toArray(),
														Series::getSeriesList($search_data, true),
														$search_data['disp']);
		} else {
			$search_data['sex'] = 'all';
		}

		$result['inputs'] = $search_data;
		$result['search_flg'] = $search_flg;
		return View::make('series.search', $result);
	}

	/**
	 * 検索条件をセッションに設定する
	 * @param Array $inputs 検索条件
	 * @author stani
	 * @since 2015/03/20
	 */
	public function setSearchData($inputs) {
		//Reset or initial display button is pressed during
		if (array_key_exists ('btnReset', $inputs) !== false || !$inputs) {
			Session::forget('series.search');
		//Search button is pressed during
		} else if (array_key_exists('btnSearch', $inputs) !== false) {
			if (array_key_exists('disp', $inputs) === false) $inputs['disp'] = Config::get('const.page_display');
			if (array_key_exists('sort', $inputs) === false) $inputs['sort'] = 'updateTime';
			Session::put('series.search', $inputs);
		} else if (array_key_exists('page', $inputs) !== false) {
			$search_data = Session::get('series.search');
			$search_data['perPage'] = $inputs['page'];
			Session::put('series.search', $search_data);
		} else if (array_key_exists('condition_id', $inputs) !== false){
			$search_data = Session::get('series_detail_search');
			$detail_search = $search_data[$inputs["condition_id"]];
			$detail_search['disp'] = Config::get('const.page_display');
			$detail_search['sort'] = 'updateTime';
			Session::put('series.search', $detail_search);
		}
	}

	/**
	 * Search conditions save(Ajax)
	 */
	public function save_search() {
		//Initial setting
		$search_flg = false;
		$result = array();

		//Input value acquisition
		$inputs = Input::all();

		//I want to save your search criteria in the session
		if (Session::has('series_detail_search')) {
			$save_series_search = Session::get('series_detail_search');
			$before_cnt = count($save_series_search);
			array_push($save_series_search, $inputs);
			Session::put('series_detail_search', $save_series_search);
		} else {
			Session::put('series_detail_search', array($inputs));
			$before_cnt = 0;
		}

		$after_cnt = count(Session::get('series_detail_search'));

		if ($before_cnt+1 === $after_cnt) {
			$msg = 'Save search criteria has been completed.';
		} else {
			$msg = 'I failed to save the search criteria.';
		}
		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => $msg));
		echo $res;
	}
}
