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
		if (!isset($inputs['caseID'])) throw new Exception('Case ID not specified.');
		$cases = is_array($inputs['caseID']) ? $inputs['caseID'] : [$inputs['caseID']];

		if (!isset($inputs['tags']) || !is_array($inputs['tags']))
			throw new Exception('Tags not properly specified.');

		$mode = 'replace';
		if (isset($inputs['mode'])) {
			if (preg_match('/^(replace|append|remove)$/', $inputs['mode'])) {
				$mode = $inputs['mode'];
			} else {
				throw new Exception('Illegal edit mode specified.');
			}
		}

		foreach ($cases as $caseID) {
			$case = ClinicalCase::findOrFail($caseID);
			if (!isset($accessibleProjects[$case->projectID])) {
				throw new Exception('You cannot access this project.');
			}
			switch ($mode) {
				case 'replace':
					$case->tags = $inputs['tags'];
					break;
				case 'append':
					$case->appendTags($inputs['tags']);
					break;
				case 'remove':
					$case->removeTags($inputs['tags']);
					break;
			}
			$case->save();
		}
		return $this->succeedResponse();
	}
}
