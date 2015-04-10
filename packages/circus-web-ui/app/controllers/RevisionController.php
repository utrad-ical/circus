<?php
/**
 * リビジョン情報取得
 */
class RevisionController extends BaseController {
	/**
	 * revision list
	 */
	public function get_list() {
		$result = array();

		//POST data acquisition
		$inputs = Input::all();

		try {
			//empty caseID
			if (array_key_exists('caseID', $inputs) === false)
				throw new Exception('Please specify a case ID.');

			$case_info = ClinicalCase::find($inputs['caseID']);
			//case not found
			if (!$case_info)
				throw new Exception('Case ID does not exist.');

			//The shaping Revision information for display
			$revision_list = array();
			$revision_no_list = array();
			$max_revision = 0;
			foreach($case_info->revisions as $key => $value) {
				//The set if Revision number is large
				if ($max_revision < $key)
					$max_revision = $key;

				$revision_list[] = $this->getRevisionInfo($key, $value);
				$revision_no_list[] = $key;
			}

			//Revision sort order adaptation
			$result['revision_list'] = $this->sortRevision($revision_list, 'revision.date');
			$result['revision_no_list'] = $revision_no_list;

			//Series list created
			$result['inputs'] = Session::get('case.detail');
			return Response::json(['status'=>'OK', 'response' => $result]);
		} catch (Exception $e) {
			Log::debug($e);
			Log::debug($e->getMessage());
			return Response::json(['status'=>'NG', 'message' => $e->getMessage()]);
		}
	}

	/**
	 * get revisionInfo
	 * @param Integer $key revision index
	 * @param Array $value revision data
	 * @return Array revisionInfo
	 */
	function getRevisionInfo($key, $value) {
		$label_cnt = 0;
		foreach ($value['series'] as $rec) {
			$label_cnt += count($rec['labels']);
		}
		$w = CommonHelper::getWeekDay(date('w', $value['date']->sec));

		return array(
			'revisionNo'	=>	$key,
			'editDate'		=>	date('Y/m/d('.$w.')', $value['date']->sec),
			'editTime'		=>	date('H:i', $value['date']->sec),
			'seriesCount'	=>	count($value['series']),
			'labelCount'	=>	$label_cnt,
			'creator'		=>	$value['creator'],
			'memo'			=>	$value['description'],
			'sortEditTime'	=>	date('Y-m-d H:i:s', $value['date']->sec)
		);
	}

	/**
	 * I sort the Revision list
	 * @param $list Revsion list
	 * @param $sort Sorting method
	 * @return Sort the Revision list
	 */
	function sortRevision($list, $sort) {
		switch ($sort) {
			case 'revision.date':	//Edit Date desc
				$res = usort($list, 'self::sortEditTime');
				return $list;
			case 'revisionNo':		//RevisionNo asc
				$res = uasort($list, 'self::sortRevisionNo');
				return $list;
		}
		return $list;
	}

	/**
	 * I sort by Revision final editing time
	 * @param $a Sort array (large value)
	 * @param $b Sort array (small value)
	 */
	function sortEditTime($a, $b) {
		//Modified the new order
		$a_time = $a['sortEditTime'];
		$b_time = $b['sortEditTime'];

		if (strtotime($a_time) == strtotime($b_time))
			return 0;

		return strtotime($a_time) > strtotime($b_time) ? -1 : 1;
	}

	/**
	 * I sort by RevisionNo
	 * @param $a Sort array (large value)
	 * @param $b Sort array (small value)
	 * @return Sort Result 0: equal -1: b is greater 1: a large
	 */
	function sortRevisionNo($a, $b){
		//Revision old order
		$a_no = $a['revisionNo'];
		$b_no = $b['revisionNo'];

		if (strtotime($a_no) == strtotime($b_no))
			return 0;

		return strtotime($a_no) < strtotime($b_no) ? 1 : -1;
	}
}
