<?php
/**
 * Class to perform the operation of the management screen
 */
class UserPreferenceController extends BaseController {
	public function index()
	{
		return View::make("preference");
	}
}
