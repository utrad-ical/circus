<?php

use Illuminate\Auth\UserTrait;
use Illuminate\Auth\UserInterface;

/**
 * User model
 *
 * @property string userEmail
 * @property string loginID
 * @property string password The hashed password
 * @property array groups List of groups to which this user belongs
 * @property array preferences
 * @property bool loginEnabled
 * @property MongoDate lastLoginTime
 * @property string lastLoginIP
 */
class User extends BaseModel implements UserInterface {
	use UserTrait;

	const COLLECTION = 'Users';
	protected $collection = self::COLLECTION;
	protected $primaryKey = 'userEmail';
	protected $uniqueFields = ['loginID'];

	/**
	 * @var Array $privilegs privilegs of User
	 */
	private static $privilegs;

	protected $rules = array(
		'userEmail' 	=>	'required|email',
        'loginID'		=>	'required|alpha_dash|max:20',
		'password'		=>	'required',
		'groups'		=>	'required|array_of_group_ids',
		'preferences' 	=>	'required|preferences',
		'loginEnabled' 	=>	'required|strict_bool',
		'lastLoginTime' =>	'mongodate',
		'lastLoginIP' 	=>	'',
		'description'	=>	'',
		'createTime'	=>	'mongodate',
		'updateTime'	=>	'mongodate'
    );

	public function groups() {
		return $this->belongsToMany('Group', null, 'groups', 'groupID');
	}

	/**
	 * Validate Check
	 * @param $data Validate checked
	 * @return Error content
	 * @deprecated Do not use. Use selfValidate
	 */
	public function validate($data) {
		$validator = Validator::make($data, $this->rules);

		if ($validator->fails()) {
			return $validator->messages();
		}
		return;
	}

	/**
	 * 該当の権限を所持しているか判定する
	 * @param string $priv_name 権限名
	 * @return boolean 該当の権限の所持有無
	 */
	public static function hasPrivilege($priv_name) {
		if (!$priv_name)
			return false;
		//権限情報取得
		self::fetchPrivilege();

		return array_search($priv_name, self::$privilegs) !== false;
	}

	/**
	 * 権限リスト取得
	 * @return Array 権限リスト
	 */
	public static function fetchPrivilege() {
		if (!self::$privilegs) {
			$groups = Auth::user()->groups;

			$result = array();
			foreach ($groups as $group) {
				$data = Group::find($group);
				foreach ($data->privileges as $priv) {
					if (array_search($priv, $result) === false)
						$result[] = $priv;
				}
			}
			self::$privilegs = $result;
		}
		return self::$privilegs;
	}

}

Validator::extend('preferences', function ($attribute, $value, $parameters) {
	return is_array($value)
		&& isset($value['theme'])
		&& $value['theme'] === 'mode_white' || $value['theme'] === 'mode_black'
		&& isset($value['personalInfoView'])
		&& $value['personalInfoView'] === true || $value['personalInfoView'] === false;
});
