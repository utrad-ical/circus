<?php

class ProjectApiController extends ResourceApiBaseController {
	protected $targetClass = 'Project';
	protected $fields = null;
	protected $settable = null;

	function __construct() {
		$project = new Project();
		$fields = array_keys($project->getRules());
		$this->fields = $fields;
		array_shift($fields);
		$this->settable = $fields;
	}
}