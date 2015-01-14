<?php

use Illuminate\Auth\UserTrait;
use Illuminate\Auth\UserInterface;

use Jenssegers\Mongodb\Model as Eloquent;

/**
 * User table manipulation class
 */
class User extends Eloquent implements UserInterface {
	use UserTrait;

	protected $connection = 'mongodb';
	protected $collection = 'Users';
	protected $primaryKey = 'userID';

	/**
	 * Validate rules
	 * @var $rules Validate rules
	 */
	private $rules = array(
        'loginID'	=>	'required',
		'password'	=>	'required'
    );

	/**
	 * Validate Check
	 * @param $data Validate checked
	 * @return Error content
	 */
    public function validate($data) {
		$validator = Validator::make($data, $this->rules);

		if ($validator->fails()) {
			return $validator->messages();
		}
		return;
	}

}
