<?php

use Illuminate\Auth\UserTrait;
use Illuminate\Auth\UserInterface;

use Jenssegers\Mongodb\Model as Eloquent;

class User extends Eloquent implements UserInterface {
	use UserTrait;

	protected $connection = 'mongodb';
	protected $collection = 'User';
	protected $primaryKey = 'userID';

	public static $rules = array(
        'loginID'	=>	'required',
		'password'	=>	'required'
    );


    /**
     * パスワードAES256暗号化
     * @param $pwd パスワード
     * @return $encrypt_pwd AES256暗号化されたパスワード
     * @author stani
     * @since 2014/12/17
     */
    public static function encryptPassword($pwd) {
    	//$salt = openssl_random_pseudo_bytes(16)
    }

    /**
     * パスワードAES256復号化
     * @param $pwd 復号化対象のパスワード
     * @return $decrypt_pwd 復号化したパスワード
     * @author stani
     * @since 2014/12/17
     */
    public static function decryptPassword($pwd) {

    }

	/**
	 * Validateルールを取得する
	 * isValidが使えるようになったらこのメソッドは削除する
	 * @return Validateルール配列
	 * @author stani
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
