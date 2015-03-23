<?php
/**
 * Class to perform the operation of the home screen
 */
class TopController extends BaseController {
	/**
	 * Home screen
	 */
	public function getIndex() {
		return View::make('home');
	}
}
