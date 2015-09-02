<?php

/**
 * Tag register class.
 */
class TagRegisterController extends ApiBaseController
{
	function save_tags()
	{
		$inputs = Input::all();

		// validation
		$accessibleProjects = Auth::user()->listAccessibleProjects(Project::AUTH_TYPE_READ, true);
		if (!$inputs['caseID'])
			throw new Exception('Case ID not specified.');
		$tags = json_decode($inputs['tags'], true);
		if (!is_array($tags))
			throw new Exception('Invalid tag.');

		$cases = is_array($inputs['caseID']) ? $inputs['caseID'] : [$inputs['caseID']];

		foreach ($cases as $caseID) {
			$case = ClinicalCase::findOrFail($caseID);
			if (!isset($accessibleProjects[$case->projectID])) {
				throw new Exception('You cannot access this project.');
			}
			$case->tags = $tags;
			$case->save();
		}

		return $this->succeedResponse();
	}
}
