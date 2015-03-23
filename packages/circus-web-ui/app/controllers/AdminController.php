<?php
/**
 * Class to perform the operation of the management screen
 */
class AdminController extends BaseController {
	/**
	 * Management screen
	 */
	public function getIndex() {
		return View::make('admin/index');
	}
}
