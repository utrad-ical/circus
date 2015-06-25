<?php
/**
 * ケース検索
 */
class CaseSearchController extends BaseController {
	/**
	 * Case Search Results
	 */
	public function search($preset_id = false) {
		//Initial setting
		$search_flg = false;
		$result = array();
		$result['project_list'] = Auth::user()->listAccessibleProjects(Project::AUTH_TYPE_READ, true);

		//Input value acquisition
		$inputs = Input::all();
		$inputs['preset_id'] = $preset_id;

		try {
			$this->setSearchData($inputs);
			$search_data = Session::get('case.search');

			if ($search_data) {
				$search_flg = true;
				$result['list'] = ClinicalCase::getCaseList($search_data);
				$list_count = ClinicalCase::getCaseList($search_data, true);

				if ($result['list'] && $search_data['disp'] !== 'all' )
					$result['list_pager'] = Paginator::make(
												$result['list']->toArray(),
												$list_count,
												$search_data['disp']);
				$search_data['case_attributes'] = json_encode(
													$this->getProjectCaseAttribute(json_decode($search_data['project'], true))
												  );
			} else {
				$search_data['project'] = json_encode("");
				$search_data['search_mode'] = 0;
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
			if (array_key_exists('order_by', $inputs) === false) $inputs['order_by'] = 'desc';
			Session::put('case.search', $inputs);
		} else if (array_key_exists('page', $inputs) !== false) {
			$tmp = Session::get('case.search');
			$tmp['perPage'] = $inputs['page'];
			Session::put('case.search', $tmp);
		} else if ($inputs['preset_id'] !== false) {
			$presets = Auth::user()->preferences['caseSearchPresets'];
			$detail_search = $presets[$inputs['preset_id']];
			$detail_search['disp'] = Config::get('const.page_display');
			$detail_search['sort'] = 'updateTime';
			$detail_search['order_by'] = 'desc';
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
				if ($result['list'] && $search_data['disp'] !== 'all' )
					$result['list_pager'] = Paginator::make($result['list']->toArray(),
															$list_count,
															$search_data['disp']);
				$search_data['case_attributes'] = json_encode(
													$this->getProjectCaseAttribute(json_decode($search_data['project'], true))
												  );
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
		//Input value acquisition
		$inputs = Input::all();

		$user = Auth::user();
		$pref = $user->preferences;
		$presets = isset($pref['caseSearchPresets']) ? $pref['caseSearchPresets'] : array();
		$presets[] = $inputs;
		$pref['caseSearchPresets'] = $presets;

		$user->preferences = $pref;
		$user->save();

		$msg = 'Saved search criteria.';
		return Response::json(array('result' => true, 'message' => $msg));
	}

	/**
	 * プロジェクトに紐づくCase Attributeを取得する(Json)
	 */
	public function get_case_attribute() {
		$inputs = Input::all();
		try {
			if (!array_key_exists('projectID', $inputs))
				throw new Exception('Please specify the project .');

			$case_attr = $this->getProjectCaseAttribute(array($inputs['projectID']));
			return Response::json(['status' => 'OK', 'case_attr' => $case_attr]);
		} catch (Exception $e) {
			return Response::json(['status' => 'NG', 'message' => $e->getMessage()]);
		}
	}

	/**
	 * get the caseAttributesScheme of the project
	 * @param Json $projects selected projects
	 * @return Json the createAttributesSchema of the project
	 */
	private function getProjectCaseAttribute($projects) {
		if (count($projects) === 1) {
			$project = Project::find(intval($projects[0]));
			if ($project->caseAttributesSchema) {
				$case_attr = $project->caseAttributesSchema;
				foreach ($case_attr as $key => $val) {
					$case_attr[$key]['key'] = 'latestRevision.attributes.'.$val['key'];
				}
				return $case_attr;
			}

		}
		return;
	}
}
