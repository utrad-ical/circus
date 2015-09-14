<?php

class TaskController extends ApiBaseController
{

	public function index()
	{
		$tasks = Task::where(['owner' => Auth::user()->userEmail])->get();
		$result = [];
		foreach ($tasks as $task) {
			$result[] = array_except($task->toArray(), ['_id', 'logs', 'command', 'download']);
		}
		return Response::json($result);
	}

	public function show($taskID)
	{
		$task = Task::findOrFail($taskID);
		if ($task->owner !== Auth::user()->userEmail) {
			throw new Exception('You cannot access this task.');
		}
		$data = array_except($task->toArray(), ['_id', 'command', 'download']);
		if (strlen($task->download)) { $data['downloadable'] = true; }
		return Response::json(
			$data
		);
	}

	public function delete($taskID)
	{
		$delete = Task::find($taskID)->delete();
		return Response::json(array('result' => $delete));
	}

	public function download($taskID)
	{
		$task = Task::findOrFail($taskID);
		if ($task->owner !== Auth::user()->userEmail) {
			throw new Exception('You cannot access this task.');
		}
		return Response::download($task->download);
	}

}