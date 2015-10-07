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
	 * @param mixed $preset_id
	 *
	 */
	public function search($preset_id = false) {
		try {
			//Setting search conditions
			$inputs = Input::all();
			$search_data = $this->setSearchCondition($inputs, $preset_id);
			$this->setSearchConditionToSession($search_data);
			$search_data = Session::get($this->_prefix.'.search');
			$result = ClinicalCase::searchCase($search_data);
			$result['prefix'] = $this->_prefix;
			$result['export_mode'] = $this->_export_mode;
			$result['init'] = $this->_init_storage;

			//setting tags and setting case attributes
			if ($search_data) {
				//ProjectID
				$projects = $search_data['project'];
				if (count($projects) === 1) {
					$params = array();
					$params['projectID'] = $projects[0];
					if (!array_key_exists('project', $result['inputs']))
						throw new Exception('Please specify the project .');

					$result['tag_list'] = Project::getProjectTags(array($projects[0]));
					$result['inputs']['case_attributes'] = json_encode(Project::getProjectCaseAttribute(array($projects[0])));
				}
			}

			$this->arrayToJson($result['inputs']);

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
		$search_data = $this->setSearchCondition(Input::all(), false);
		$this->setSearchConditionToSession($search_data);
		$search_data = Session::get($this->_prefix.'.search');
		$result = ClinicalCase::searchCase($search_data);

		$result['prefix'] = $this->_prefix;
		$result['export_mode'] = $this->_export_mode;
		$result['init'] = $this->_init_storage;

		$tmp = View::make('case/case', $result);

		return Response::json(['result' => true, 'message' => '', 'response' => "$tmp"]);
	}

	/**
	 * setting Case Search condition
	 * @param Array $inputs Input value
	 * @param integer $preset_id Save Search ID
	 * @return array $search_data search conditions
	 */
	private function setSearchCondition($inputs , $preset_id)
	{
		$search_data = array();
		if (array_key_exists('btnReset', $inputs) !== false || (!$inputs && $preset_id === false)) {
			return $search_data;
		//Search button is pressed during
		} else if (array_key_exists ('btnSearch', $inputs) !== false) {
			if (array_key_exists('disp', $inputs) === false) $inputs['disp'] = Config::get('const.page_display');
			if (array_key_exists('sort', $inputs) === false) $inputs['sort'] = 'updateTime';
			if (array_key_exists('order_by', $inputs) === false) $inputs['order_by'] = 'desc';

			$this->jsonToArray($inputs);
			$search_data = $inputs;
		} else if (array_key_exists('page', $inputs) !== false) {
			$tmp = Session::get($this->_prefix.'.search');
			$tmp['perPage'] = $inputs['page'];
			$this->_init_storage = false;
			$search_data = $tmp;
		} else if ($preset_id !== false) {
			$presets = Auth::user()->preferences['caseSearchPresets'];

			$detail_search = $presets[$preset_id];
			$detail_search['disp'] = Config::get('const.page_display');
			$detail_search['sort'] = 'updateTime';
			$detail_search['order_by'] = 'desc';

			$this->jsonToArray($detail_search);
			$search_data =  $detail_search;
		} else if (array_key_exists('btnBack', $inputs) === false) {
			return $search_data;
		} else {
			$search_data = Session::get($this->_prefix.'.search');
		}
		return $search_data;
	}

	/**
	 * set session search condition
	 * @param array $search_data search conditions.
	 */
	private function setSearchConditionToSession($search_data) {
		if (!$search_data)
			Session::forget($this->_prefix.'.search');
		else
			Session::put($this->_prefix.'.search', $search_data);
	}

	private function jsonToArray(&$search_data)
	{
		if ($search_data) {
			if (array_key_exists('project', $search_data) !== false)
				$search_data['project'] = json_decode($search_data['project'], true);
			if (array_key_exists('mongo_data', $search_data) !== false)
				$search_data['mongo_data'] = json_decode($search_data['mongo_data'], true);
			if (array_key_exists('tags', $search_data) !== false)
				$search_data['tags'] = json_decode($search_data['tags']);
		}
	}

	private function arrayToJson(&$search_data){
		if ($search_data) {
			if (array_key_exists('project', $search_data) !== false)
				$search_data['project'] = json_encode($search_data['project']);
			if (array_key_exists('mongo_data', $search_data) !== false)
				$search_data['mongo_data'] = json_encode($search_data['mongo_data']);
			if (array_key_exists('tags', $search_data) !== false)
				$search_data['tags'] = json_encode($search_data['tags']);
		}
	}
}
