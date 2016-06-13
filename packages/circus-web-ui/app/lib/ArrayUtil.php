<?php

class ArrayUtil {
	public static function in_array_multiple(array $needles, array $haystack) {
		foreach ($needles as $needle) {
			if (in_array($needle, $haystack)) return true;
		}
		return false;
	}
}
