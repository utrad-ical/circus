<?php

class AdministrationController extends BaseController
{
	public function index($kind)
	{
		$vars = ['title' => ucfirst($kind)];
		return View::make("admin.$kind", $vars);
	}
}