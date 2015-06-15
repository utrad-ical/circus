<?php

/**
 * Model class for ServerParams.
 * @property string key
 * @property mixed value
 */
class ServerParam extends BaseModel
{
	protected $connection = 'mongodb';

	const COLLECTION = 'ServerParams';
	protected $collection = self::COLLECTION;
	protected $primaryKey = 'key';


	public static function getVal($key){
		$obj = self::find($key);
		if ($obj)
			return $obj->value;
		return null;
	}

	public static function setVal($key, $value) {
		if ($value === null) $value = '';
		$obj = new ServerParam();
		$obj->key = $key;
		$obj->value = $value;
		$obj->save();
	}

	protected $rules = array(
		'key'           => 'required',
		'value'         => 'required',
		'createTime'    => 'mongodate',
		'updateTime'    => 'mongodate'
	);

	public static function getDomainList() {
		$domain_list = array();

		//get default domain
		$default_domain = self::getVal('defaultDomain');
		if ($default_domain)
			$domain_list[$default_domain] = $default_domain;

		//selectable domain
		$domains = self::getVal('domains');

		if ($domains) {
			$domains = array_values(json_decode($domains, true));
			foreach($domains as $domain) {
				$domain_list[$domain] = $domain;
			}
		}

		return $domain_list;
	}
}

