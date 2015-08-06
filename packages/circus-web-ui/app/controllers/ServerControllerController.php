<?php

class ServerControllerController extends ApiBaseController
{
	public function status()
	{
		$manager = new RsManager();
		$status = $manager->status();
		$status = (string)$status;
		return Response::json([$status]);
	}

	public function start()
	{
		$manager = new RsManager();
		$manager->start();
		return $this->status();
	}

	public function stop()
	{
		$manager = new RsManager();
		$manager->stop();
		return $this->status();
	}
}