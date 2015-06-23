<?php

use Illuminate\Auth\UserTrait;
use Illuminate\Auth\UserInterface;

/**
 * User model
 *
 * @property string userEmail The user ID
 * @property string loginID The login ID
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
	 * @var array privileges of this user
	 */
	private $privileges;

	/**
	 * @var array list of accessible domains
	 */
	private $domains;

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
	 * @param array $data Validate checked
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
	 * Checks if this user has the specified privilege
	 * @param string $priv_name The privilege to be checked.
	 * @return boolean True if this user has the specified privilege.
	 */
	public function hasPrivilege($priv_name) {
		if (!$priv_name)
			return false;
		$this->fetchPrivileges();
		return array_search($priv_name, $this->privileges) !== false;
	}

	/**
	 * Fetches the list of all privileges this user has.
	 * @return array The list.
	 */
	public function fetchPrivileges() {
		if (!$this->privileges) {
			$result = array();
			foreach ($this->groups as $group) {
				$data = Group::find($group);
				foreach ($data->privileges as $priv) {
					if (array_search($priv, $result) === false)
						$result[] = $priv;
				}
			}
			$this->privileges = array_keys($result);
		}
		return $this->privileges;
	}

	public function listAccessibleDomains() {
		if (!$this->domains) {
			$result = array();
			foreach ($this->groups as $group) {
				$data = Group::find($group);
				foreach ($data->domains as $domain) {
					if (array_search($domain, $result) === false)
						$result[] = $domain;
				}
			}
			$this->domains = $result;
		}
		return $this->domains;
	}

}

Validator::extend('preferences', function ($attribute, $value, $parameters) {
	return is_array($value)
		&& isset($value['theme'])
		&& $value['theme'] === 'mode_white' || $value['theme'] === 'mode_black'
		&& isset($value['personalInfoView'])
		&& $value['personalInfoView'] === true || $value['personalInfoView'] === false;
});
