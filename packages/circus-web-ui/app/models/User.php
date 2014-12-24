<?php

use Illuminate\Auth\UserTrait;
use Illuminate\Auth\UserInterface;

use Jenssegers\Mongodb\Model as Eloquent;

/**
 * User table manipulation class
 * @since 2014/12/17
 */
class User extends Eloquent implements UserInterface {
	use UserTrait;

	protected $connection = 'mongodb';
	protected $collection = 'User';
	protected $primaryKey = 'userID';

	/**
	 * Validateルール
	 * @var $rules Validateルール
	 */
	public static $rules = array(
        'loginID'	=>	'required',
		'password'	=>	'required'
    );

    /**
     * Password AES256 encryption
     * @param $pwd Password
     * @return $encrypt_pwd The AES256 encrypted password
     * @since 2014/12/17
     */
    public static function encryptPassword($pwd) {
    	//$salt = openssl_random_pseudo_bytes(16)
    }

    /**
     * Password AES256 decryption
     * @param $pwd Decoded password
     * @return $decrypt_pwd The decrypted password
     * @since 2014/12/17
     */
    public static function decryptPassword($pwd) {

    }

	/**
	 * I get the Validate rules
	 * This method When isValid now can use I delete
	 * @return Validate rules array
	 * @since 2014/12/17
	 */
	public static function getValidateRules() {
 		return array(
			'userID'					=>	'required|integer',
			'loginID'					=>	'required',
			'password'					=>	'required',
			'description'				=>	'required',
			'loginEnabled'				=>	'required|boolean',
			'preferences_theme'			=>	'required',
			'preferences_personalView'	=>	'required|boolean'
		);
	}

}
