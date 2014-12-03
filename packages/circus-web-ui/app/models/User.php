<?php

use Illuminate\Auth\UserTrait;
use Illuminate\Auth\UserInterface;

use Jenssegers\Mongodb\Model as Eloquent;

class User extends Eloquent implements UserInterface {
	use UserTrait;

	protected $connection = 'mongodb';
	protected $collection = 'User';

	public static $rules = array(
        'loginID'	=>	'required',
		'password'	=>	'required'
    );

}
