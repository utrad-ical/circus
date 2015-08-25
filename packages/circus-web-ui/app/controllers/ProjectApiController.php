<?php

class ProjectApiController extends ResourceApiBaseController
{
	protected $targetClass = 'Project';
	protected $fields = null;
	protected $settable = null;
	protected $useStringID = true;

	function __construct()
	{
		$project = new Project();
		$fields = array_keys($project->getRules());
		$this->fields = $fields;
		array_shift($fields);
		$this->settable = $fields;
	}

	/**
	 * Displays project schema for sharing.
	 * @param $projectID
	 */
	public function schema($projectID)
	{
		$class = $this->targetClass;
		$item = $class::findOrFail($this->normalizeID($projectID), $this->fields)->toArray();
		$item = array_only($item, array(
			'projectID', 'projectName', 'description',
			'caseAttributesSchema', 'labelAttributesSchema',
			'windowPriority', 'windowPresets'
		));
		$item['origin'] = route('projectSchema');
		return Response::json($item);
	}
}