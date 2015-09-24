<?php
/**
 * ケース検索Base
 */
class CaseSearchBaseController extends ApiBaseController {
	protected $_prefix;
	protected $_export_mode = false;
	private $_init_storage = true;
	/**
	 * Case Search Results
	 */
	public function search($preset_id = false) {
		try {
			//検索条件の設定
			$inputs = Input::all();
			$this->setSearchCondition($inputs, $preset_id);
			$search_data = Session::get($this->_prefix.'.search');

			$result = ClinicalCase::searchCase($search_data);
			$result['prefix'] = $this->_prefix;
			$result['export_mode'] = $this->_export_mode;
			$result['init'] = $this->_init_storage;

			//タグの設定
			if ($search_data && array_key_exists('tags', $search_data)) {
				//ProjectID
				$search_data['project'] = json_decode($search_data['project'], true);
				if (count($search_data['project']) === 1) {
					$params = array();
					$params['projectID'] = $search_data['project'][0];
					if (!array_key_exists('projectID', $inputs))
						throw new Exception('Please specify the project .');

					$result['tag_list'] = Project::getProjectTags(array($inputs['projectID']));
				}
			}
			Session::put('backUrl', $this->_prefix . '/search');
		} catch (Exception $e) {
			Log::error($e);
			$result['error_msg'] = $e->getMessage();
		}

		return View::make('case/search', $result);
	}

	/**
	 * Case Search Results(Ajax)
	 */
	public function search_ajax()
	{
		$this->setSearchCondition(Input::all(), false);
		$search_data = Session::get($this->_prefix.'.search');
		$result = ClinicalCase::searchCase($search_data);

		$result['prefix'] = $this->_prefix;
		$result['export_mode'] = $this->_export_mode;
		$result['init'] = $this->_init_storage;

		$tmp = View::make('case/case', $result);

		return Response::json(['result' => true, 'message' => '', 'response' => "$tmp"]);
	}

	/**
	 * Search conditions save(Ajax)
	 */
	public function save_search()
	{
		//Input value acquisition
		$inputs = Input::all();

		$user = Auth::user();
		$pref = $user->preferences;
		$presets = isset($pref['caseSearchPresets']) ? $pref['caseSearchPresets'] : array();
		$presets[] = $inputs;
		$pref['caseSearchPresets'] = $presets;

		$user->preferences = $pref;
		$user->save();

		return $this->succeedResponse();
	}

	/**
	 * ケース検索条件設定
	 * @param Array $inputs 入力値
	 */
	private function setSearchCondition($inputs , $preset_id)
	{
		if (array_key_exists('btnReset', $inputs) !== false || (!$inputs && $preset_id === false)) {
			Session::forget($this->_prefix.'.search');
		//Search button is pressed during
		} else if (array_key_exists ('btnSearch', $inputs) !== false) {
			if (array_key_exists('disp', $inputs) === false) $inputs['disp'] = Config::get('const.page_display');
			if (array_key_exists('sort', $inputs) === false) $inputs['sort'] = 'updateTime';
			if (array_key_exists('order_by', $inputs) === false) $inputs['order_by'] = 'desc';
			Session::put($this->_prefix.'.search', $inputs);
		} else if (array_key_exists('page', $inputs) !== false) {
			$tmp = Session::get($this->_prefix.'.search');
			$tmp['perPage'] = $inputs['page'];
			Session::put($this->_prefix.'.search', $tmp);
			$this->_init_storage = false;
		} else if ($preset_id !== false) {
			$presets = Auth::user()->preferences['caseSearchPresets'];
			$detail_search = $presets[$preset_id];
			$detail_search['disp'] = Config::get('const.page_display');
			$detail_search['sort'] = 'updateTime';
			$detail_search['order_by'] = 'desc';
			Session::put($this->_prefix.'.search', $detail_search);
		} else if (array_key_exists('btnBack', $inputs) === false) {
			Session::forget($this->_prefix.'.search');
		}
	}

}
