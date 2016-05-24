<?php

class SeriesListController extends ApiBaseController {
	public function search() {
		$data = Input::all();
		$filter = $data['filter'];
		$query = Series::whereRaw($filter);
		if (isset($data['sort'])) {
			list($key, $asc) = explode(' ', $data['sort']);
			$query->orderBy($key, $asc);
		}
		$per = 2;
		$page = 1;
		if (isset($data['page'])) $page = intval($data['page']);
		$totalItems = $query->count();
		$results = $query->take(2)->skip(($page - 1) * 2)->get();

		foreach ($results as &$result) {
			$result['seriesDate'] = toISO($result['seriesDate']);
		}

		return Response::json([
			'items' => $results,
			'page' => $page,
			'totalItems' => $totalItems
		]);
	}
}

function toISO($dateObj) {
	$d = new DateTime();
	$d->setTimestamp($dateObj->sec);
	return $d->format('Y-m-d H:i:s');
}
