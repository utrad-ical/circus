<?php

/**
 * Tag register class.
 */
class TagRegisterController extends ApiBaseController
{
	function save_tags()
	{
		$inputs = Input::all();
		Log::info($inputs);

		// validation
		$accessibleProjects = Auth::user()->listAccessibleProjects(Project::AUTH_TYPE_READ, true);
		if (!isset($inputs['caseID'])) throw new Exception('Case ID not specified.');
		$cases = is_array($inputs['caseID']) ? $inputs['caseID'] : [$inputs['caseID']];

		if (!isset($inputs['tags']) || !is_array($inputs['tags']))
			throw new Exception('Tags not properly specified.');

		foreach ($cases as $caseID) {
			$case = ClinicalCase::findOrFail($caseID);
			if (!isset($accessibleProjects[$case->projectID])) {
				throw new Exception('You cannot access this project.');
			}
			$case->tags = $inputs['tags'];
			$case->save();
		}
		return $this->succeedResponse();
	}
}
