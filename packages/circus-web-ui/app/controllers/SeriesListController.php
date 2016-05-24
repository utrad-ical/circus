<?php

class SeriesListController extends ApiBaseController {
	public function search() {
		$data = Input::all();

		$filter = $data['filter'];
		convertDate($filter);

		$query = Series::whereRaw($filter);
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
			$result['seriesDate'] = toISO($result['seriesDate']);
		}

		return Response::json([
			'items' => $results,
			'page' => $page,
			'totalItems' => $totalItems
		]);
	}
}

function convertDate(&$filter) {
	foreach ($filter as &$v) {
		if (is_array($v)) {
			if (count($v) === 1 && isset($v['$date'])) {
				$d = $v['$date'];
				$v = new MongoDate(strtotime($d));
			} else {
				convertDate($v);
			}
		}
	}
}

function toISO($dateObj) {
	$d = new DateTime();
	$d->setTimestamp($dateObj->sec);
	return $d->format('Y-m-d H:i:s');
}
