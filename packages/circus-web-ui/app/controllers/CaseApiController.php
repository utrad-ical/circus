<?php

class CaseApiController extends ApiBaseController
{
	public function show($cid) {
		// Log::info('fetching' . $cid);
		$case = ClinicalCase::findOrFail($cid)->toArray();

		$case = array_except($case, ['_id']);

		$case['latestRevision']['date'] = Util::mongoToISO($case['latestRevision']['date']);
		foreach ($case['revisions'] as &$rev) {
			$rev['date'] = Util::mongoToISO($rev['date']);
		}

		return Response::json($case);
	}

	/**
	 * Saves a new revision.
	 */
	public function postRevision($cid) {
		$case = ClinicalCase::findOrFail($cid);
		$revision_data = Input::all();
		$revision_data['date'] = new MongoDate();

		$case->latestRevision = $revision_data;
		$revs = $case->revisions;
		$revs[] = $revision_data;
		$case->revisions = $revs;
		$case->save();

		return $this->succeedResponse();
	}

}