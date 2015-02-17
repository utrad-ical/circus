<?php

class AdministrationController extends BaseController
{
	public function index($kind)
	{
		$vars = [
			'title' => ucfirst($kind),
			'url' => URL::current(),
			'css' => [
				'css/ui-lightness/jquery-ui-1.10.4.custom.min.css',
				'css/jquery.flexforms.css'
			],
			'js' => [
				'js/jquery-ui.min.js',
				'js/jquery.flexforms.js',
				'js/jquery.multiselect.min.js',
				'js/adminEditor.js'
			]
		];
		return View::make("admin.$kind", $vars);
	}
}