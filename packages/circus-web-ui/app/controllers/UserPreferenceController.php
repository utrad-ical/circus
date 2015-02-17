<?php
/**
 * Class to perform the operation of the management screen
 */
class UserPreferenceController extends BaseController {
	public function index()
	{
		$vars = [
			'title' => 'Preferences',
			'url' => URL::current(),
			'css' => [
				'css/ui-lightness/jquery-ui-1.10.4.custom.min.css',
				'css/jquery.flexforms.css'
			],
			'js' => [
				'js/jquery-ui.min.js',
				'js/jquery.flexforms.js',
				'js/adminEditor.js'
			]
		];
		return View::make("preference", $vars);
	}
}
