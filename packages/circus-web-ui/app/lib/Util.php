<?php

/**
 * Collection of simple helper functions
 */
class Util {
	public static function in_array_multiple(array $needles, array $haystack) {
		foreach ($needles as $needle) {
			if (in_array($needle, $haystack)) return true;
		}
		return false;
	}

	public static function convertDate(&$filter) {
		foreach ($filter as &$v) {
			if (is_array($v)) {
				if (count($v) === 1 && isset($v['$date'])) {
					$d = $v['$date'];
					$v = new MongoDate(strtotime($d));
				} else {
					convertDate($v);
				}
			}
		}
	}

	public static function mongoToISO($dateObj) {
		$d = new DateTime();
		$d->setTimestamp($dateObj->sec);
		return $d->format('Y-m-d H:i:s');
	}


}
