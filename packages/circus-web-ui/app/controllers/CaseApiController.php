<?php

class CaseApiController extends ApiBaseController
{
	public function show($cid) {
		Log::info('fetching' . $cid);
		$case = ClinicalCase::findOrFail($cid)->toArray();

		$case = array_except($case, ['_id']);

		return Response::json($case);
	}
}