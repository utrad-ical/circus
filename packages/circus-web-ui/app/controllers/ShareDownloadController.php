<?php

/**
 * Download feature
 */
class ShareDownloadController extends BaseController
{
	/**
	 * Share Download
	 */
	public function index()
	{
		$result = array();

		$downloadList = Task::getDownloadList();
		$result['list'] = $downloadList;
		return Response::view('share/download', $result);
	}

}
