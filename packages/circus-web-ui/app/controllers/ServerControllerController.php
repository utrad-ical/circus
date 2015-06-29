<?php

class ServerControllerController extends ApiBaseController {
	public function status()
	{
		$manager = new RsManager();
		$status = $manager->status();
		$status = (string)$status;
		Log::info($status);
		return Response::json([$status]);
	}
}