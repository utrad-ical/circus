<?php
/**
 * ケース検索Base
 */
class CaseSearchBaseController extends BaseController {
	protected $_prefix;
	/**
	 * Case Search Results
	 */
	public function search($preset_id = false) {
		try {
			$result = ClinicalCase::searchCase(Input::all(), $preset_id);
			$result['prefix'] = $this->_prefix;
		} catch (Exception $e) {
			Log::debug($e);
			$result['error_msg'] = $e->getMessage();
		}
		Log::debug('prefix::'.$result['prefix']);
		return View::make('case/search', $result);
	}

	/**
	 * Case Search Results(Ajax)
	 */
	public function search_ajax() {
		try {
			$result = ClinicalCase::searchCase(Input::all());
			$result['prefix'] = $this->_prefix;
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
		$presets = isset($pref[$this->_prefix.'SearchPresets']) ? $pref[$this->_prefix.'SearchPresets'] : array();
		$presets[] = $inputs;
		$pref[$this->_prefix.'SearchPresets'] = $presets;

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
			$case_attr = ClinicalCase::getCaseAttribute(Input::all());
			return Response::json(['status' => 'OK', 'case_attr' => $case_attr]);
		} catch (Exception $e) {
			return Response::json(['status' => 'NG', 'message' => $e->getMessage()]);
		}
	}
}
