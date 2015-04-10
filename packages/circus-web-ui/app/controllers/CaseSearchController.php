<?php
/**
 * ケース検索
 */
class CaseSearchController extends BaseController {
	/**
	 * Case Search Results
	 */
	public function search() {
		//Initial setting
		$search_flg = false;
		$result = array();
		$result['project_list'] = Project::getProjectList(Project::AUTH_TYPE_VIEW, true);

		//Input value acquisition
		$inputs = Input::all();

		try {
			$this->setSearchData($inputs);
			$search_data = Session::get('case.search');

			if ($search_data) {
				$search_flg = true;
				$result['list'] = ClinicalCase::getCaseList($search_data);
				$list_count = ClinicalCase::getCaseList($search_data, true);

				if ($result['list'])
					$result['list_pager'] = Paginator::make(
												$result['list']->toArray(),
												$list_count,
												$search_data['disp']);
			}
			$result['inputs'] = $search_data;
			$result['search_flg'] = $search_flg;
		} catch (Exception $e) {
			Log::debug('[Case Search Exception]::');
			Log::debug($e);
			$result['error_msg'] = $e->getMessage();
		}
		return View::make('case/search', $result);
	}

	/**
	 * 検索条件設定
	 * @param Array $inputs 入力値
	 * @author stani
	 * @since 2015/03/20
	 */
	public function setSearchData($inputs) {
		if (array_key_exists('btnReset', $inputs) !== false || !$inputs) {
			Session::forget('case.search');
		//Search button is pressed during
		} else if (array_key_exists ('btnSearch', $inputs) !== false) {
			if (array_key_exists('disp', $inputs) === false) $inputs['disp'] = Config::get('const.page_display');
			if (array_key_exists('sort', $inputs) === false) $inputs['sort'] = 'updateTime';
			Session::put('case.search', $inputs);
		} else if (array_key_exists('page', $inputs) !== false) {
			$tmp = Session::get('case.search');
			$tmp['perPage'] = $inputs['page'];
			Session::put('case.search', $tmp);
		} else if (array_key_exists('condition_id', $inputs) !== false){
			$detail_search_session = Session::get('case_detail_search');
			$detail_search = $detail_search_session[$inputs['condition_id']];
			if (array_key_exists('mongo_data', $detail_search) !== false) {
				$file_path = storage_path()."/saves/".Auth::user()->userID.'_case_'.($inputs['condition_id']+1).'.json';
				$handle = fopen($file_path, 'r');
				$detail_search['mongo_search_data'] = fread($handle, filesize($file_path));
			}
			$detail_search['disp'] = Config::get('const.page_display');
			$detail_search['sort'] = 'updateTime';
			Session::put('case.search', $detail_search);
		}
	}

	/**
	 * Case Search Results(Ajax)
	 */
	public function search_ajax() {
		//Initial setting
		$search_flg = false;
		$result = array();

		//Input value acquisition
		$inputs = Input::all();

		try {
			$this->setSearchData($inputs);

			$search_data = Session::get('case.search');

			if ($search_data) {
				$search_flg = true;
				$result['list'] = ClinicalCase::getCaseList($search_data);
				$list_count = ClinicalCase::getCaseList($search_data, true);
				if ($result['list'])
					$result['list_pager'] = Paginator::make($result['list']->toArray(),
															$list_count,
															$search_data['disp']);
			}
			$result['search_flg'] = $search_flg;
			$result['inputs'] = $search_data;
			$tmp = View::make('case/case', $result);
		} catch (Exception $e) {
			Log::debug($e);
			Log::debug($e->getMessage());
			$tmp="";
		}
		return Response::json(['result' => true, 'message' => '', 'response' => "$tmp"]);
	}

	/**
	 * Search conditions save(Ajax)
	 */
	public function save_search() {
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
		$file_name = storage_path()."/saves/".Auth::user()->userID."_case_".($before_cnt+1).".json";

		if (!file_exists($file_name)) {
			touch($file_name);
			$data = json_decode($inputs["mongo_search_data"]);
			file_put_contents($file_name, $inputs["mongo_search_data"]);
		}else {
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
}
