<?php

/**
 * Show recent download tasks
 */
class ShareDownloadController extends BaseController
{
	/**
	 * Share Download
	 */
	public function index()
	{
		$result = array();

		$tasks = Task::where('status', '=', Task::FINISHED)
			->where('owner', '=', Auth::user()->userEmail)
			->where('download', '!=', '')
			->where('updateTime', '=', array('$gte' => new MongoDate(strtotime('-2 day'))))
			->orderby('updateTime', 'desc')
			->get();

		$result['list'] = $tasks;
		return Response::view('share/download', $result);
	}
}
