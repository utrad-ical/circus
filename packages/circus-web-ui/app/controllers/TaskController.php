<?php

class TaskController extends ApiBaseController
{

	public function index()
	{
		// $tasks = Task::where(['owner' => Auth::user()->loginID])->get();
		$tasks = Task::all();
		$result = [];
		foreach ($tasks as $task) {
			$result[] = array_except($task->toArray(), ['_id', 'logs']);
		}
		return Response::json($result);
	}

	public function show($taskID)
	{
		$task = Task::findOrFail($taskID);
		return Response::json(
			array_except($task->toArray(), ['_id'])
		);
	}

}