<?php

class ProjectApiController extends ResourceApiBaseController
{
	protected $targetClass = 'Project';
	protected $fields = null;
	protected $settable = null;
	protected $useStringID = true;

	function __construct()
	{
		parent::__construct();
		$project = new Project();
		$fields = array_keys($project->getRules());
		$this->fields = $fields;
		array_shift($fields);
		$this->settable = $fields;
	}

	public function store()
	{
		if (!Auth::user()->hasPrivilege(Group::PROJECT_CREATE)) {
			return $this->errorResponse('You do not have the privilege to create a new project.', 403);
		}
		return parent::store();
	}

	public function delete($id)
	{
		if (!Auth::user()->hasPrivilege(Group::PROJECT_DELETE)) {
			return $this->errorResponse('You do not have the priviledge to delete a project.', 403);
		}
		return parent::delete($id);
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