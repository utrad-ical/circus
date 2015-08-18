<?php
/**
 * ケース検索Base
 */
class CaseSearchBaseController extends BaseController {
	protected $_prefix;
	protected $_export_mode = false;
	private $_cookie_delete = false;
	/**
	 * Case Search Results
	 */
	public function search($preset_id = false) {
		try {
			//検索条件の設定
			$inputs = Input::all();
			$inputs['preset_id'] = $preset_id;
			$this->setSearchCondition($inputs);
			$search_data = Session::get($this->_prefix.'.search');

			$result = ClinicalCase::searchCase($search_data, $preset_id);
			$result['prefix'] = $this->_prefix;
			$result['export_mode'] = $this->_export_mode;

			//タグの設定
			if ($search_data && array_key_exists('tags', $search_data)){
				//ProjectID
    			$search_data['project'] = json_decode($search_data['project'], true);
    			if (count($search_data['project']) === 1) {
    				$params = array();
    				$params['projectID'] = $search_data['project'][0];
    				$result['tag_list'] = $this->getTags($params);
    			}
			}
			Session::put('backUrl', $this->_prefix.'/search');
		} catch (Exception $e) {
			Log::error($e);
			$result['error_msg'] = $e->getMessage();
		}
		return View::make('case/search', $result);
	}

	/**
	 * Case Search Results(Ajax)
	 */
	public function search_ajax() {
		try {
			$this->setSearchCondition(Input::all());
			$search_data = Session::get($this->_prefix.'.search');
			$result = ClinicalCase::searchCase($search_data);

			$result['prefix'] = $this->_prefix;
			$result['export_mode'] = $this->_export_mode;

			if ($this->_export_mode) {
				$target = array();
				if (isset($_COOKIE["exportCookie"]) && $_COOKIE["exportCookie"] && !$this->_cookie_delete) {
					$export_target = $_COOKIE["exportCookie"];
					$target = explode('_', $export_target);
				}
				$result['inputs']['export_target'] = $target;
			}
			$tmp = View::make('case/case', $result);
		} catch (Exception $e) {
			Log::error($e);
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
		try {
			//$case_attr = ClinicalCase::getCaseAttribute(Input::all());
			$case_attr = $this->getCaseAttribute(Input::all());
			return Response::json(['status' => 'OK', 'case_attr' => $case_attr]);
		} catch (Exception $e) {
			return Response::json(['status' => 'NG', 'message' => $e->getMessage()]);
		}
	}

	/**
	 * プロジェクトに紐づくtagsを取得する(Json)
	 */
	public function get_project_tags() {
		try {
			$tags = $this->getTags(Input::all());
			return Response::json(['status' => 'OK', 'tags' => $tags]);
		} catch (Exception $e) {
			return Response::json(['status' => 'NG', 'message' => $e->getMessage()]);
		}
	}

	/**
	 * ケース検索条件設定
	 * @param Array $inputs 入力値
	 */
	private function setSearchCondition($inputs) {
		if (array_key_exists('btnReset', $inputs) !== false || !$inputs) {
			Session::forget($this->_prefix.'.search');
			$this->deleteCookie();
		//Search button is pressed during
		} else if (array_key_exists ('btnSearch', $inputs) !== false) {
			if (array_key_exists('disp', $inputs) === false) $inputs['disp'] = Config::get('const.page_display');
			if (array_key_exists('sort', $inputs) === false) $inputs['sort'] = 'updateTime';
			if (array_key_exists('order_by', $inputs) === false) $inputs['order_by'] = 'desc';
			Session::put($this->_prefix.'.search', $inputs);
			$this->deleteCookie();
		} else if (array_key_exists('page', $inputs) !== false) {
			$tmp = Session::get($this->_prefix.'.search');
			$tmp['perPage'] = $inputs['page'];
			Session::put($this->_prefix.'.search', $tmp);
		} else if ($inputs['preset_id'] !== false) {
			$presets = Auth::user()->preferences['caseSearchPresets'];
			$detail_search = $presets[$inputs['preset_id']];
			$detail_search['disp'] = Config::get('const.page_display');
			$detail_search['sort'] = 'updateTime';
			$detail_search['order_by'] = 'desc';
			Session::put($this->_prefix.'.search', $detail_search);
			$this->deleteCookie();
		} else if (array_key_exists('btnBack', $inputs) === false) {
			Session::forget($this->_prefix.'.search');
			$this->deleteCookie();
		} else {
			$this->deleteCookie();
		}
	}

	public function getCaseAttribute($inputs) {
		if (!array_key_exists('projectID', $inputs))
			throw new Exception('Please specify the project .');

		return ClinicalCase::getProjectCaseAttribute(array($inputs['projectID']));
	}

	public function getTags($inputs) {
		if (!array_key_exists('projectID', $inputs))
			throw new Exception('Please specify the project .');

		return ClinicalCase::getProjectTags(array($inputs['projectID']));
	}

	/**
	 * Export対象クッキー削除
	 */
	private function deleteCookie() {
		if (isset($_COOKIE["exportCookie"]))
			$this->_cookie_delete = setcookie("exportCookie", "", time() - 3600);
	}
}
