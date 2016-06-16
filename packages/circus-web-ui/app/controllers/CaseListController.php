<?php

class CaseListController extends ApiBaseController {
	public function search() {
		$data = Input::all();

		$filter = $data['filter'];
		Util::convertDate($filter);

		$query = ClinicalCase::whereRaw($filter);
		if (isset($data['sort'])) {
			list($key, $asc) = explode(' ', $data['sort']);
			$query->orderBy($key, $asc);
		}
		$per = 15;
		$page = 1;
		if (isset($data['page'])) $page = intval($data['page']);
		$totalItems = $query->count();
		$results = $query->take($per)->skip(($page - 1) * $per)->get();

		foreach ($results as &$result) {
			// $result['seriesDate'] = Util::mongoToISO($result['seriesDate']);
		}

		return Response::json([
			'items' => $results,
			'page' => $page,
			'totalItems' => $totalItems
		]);
	}
}
