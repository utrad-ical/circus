<?php

class SeriesListController extends ApiBaseController {
	public function search() {
		$data = Input::all();
		$filter = $data['filter'];
		$results = Series::whereRaw($filter)->get();
		return Response::json($results);
	}
}
