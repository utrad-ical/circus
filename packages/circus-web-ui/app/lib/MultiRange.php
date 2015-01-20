<?php

/**
 * Handles a set of integer ranges, like "1,5,10,20-30,50".
 * Internal data object is always normalized and stored in ascending order.
 *
 * @Author Soichiro Miki <smiki-tky@umin.ac.jp>
 */
class MultiRange implements Iterator
{
	/**
	 * @var array The main range data. Should be always normalized.
	 */
	protected $ranges;

	/**
	 * @var int Current value of the iterator.
	 */
	protected $current = false;

	/**
	 * @var int Current index (key) of the iterator.
	 */
	protected $currentIndex = null;

	/**
	 * Constructor. There are several ways to initialize this object.
	 * Passing a string like "1-5,10-12" will initialize the object with its contents. Order is not
	 * important, and the internal data will be always normalized.
	 * Passing an array of integers ([1,2,3,4,5,10,11,12]) is also accepted (the order is not important, either).
	 * And it is possible to give an existing instance and clone the object.
	 * @param mixed $data Initial data. One of a string, an array of integers, or another instance of MultiRange.
	 */
	function __construct($data = null)
	{
		$this->ranges = [];
		if (is_string($data)) {
			$data = preg_replace('/\s/', '', $data);
			foreach (preg_split('/\,/', $data) as $item) {
				if (preg_match('/^(\d+)(\-(\d+))?$/', $item, $m)) {
					if (count($m) >= 3 && strlen($m[3])) {
						$this->appendRange(intval($m[1]), intval($m[3]));
					} else {
						$this->append(intval($m[1]));
					}
				}
			}
		} else if (is_array($data)) {
			foreach ($data as $int) {
				$int = intval($int);
				$this->appendRange($int, $int);
			}
		} else if ($data instanceof self) {
			$this->ranges = $data->ranges;
		}
	}

	/**
	 * Calculates the union of two specified ranges.
	 * @param $a array Range A
	 * @param $b array Range B
	 * @return mixed Union of the $a and $b. False if $a and $b do not touch nor intersect.
	 */
	protected function calcUnion(array $a, array $b)
	{
		if ($a[1] + 1 < $b[0] || $a[0] - 1 > $b[1]) {
			return false; // cannot make union
		}
		return [min($a[0], $b[0]), max($a[1], $b[1])];
	}

	/**
	 * Determines how the given range overlaps the existing ranges.
	 * @param array $target The range array to test.
	 * @return array|int Returns array if there is a overlap with existing ranges.
	 */
	protected function findOverlap(array $target)
	{
		$lim = count($this->ranges);
		for ($lo = 0; $lo < $lim; $lo++) {
			$r = $this->ranges[$lo];
			if ($union = $this->calcUnion($r, $target)) {
				$count = 1;
				while ($lo + $count < $lim && $tmp = $this->calcUnion($union, $this->ranges[$lo + $count])) {
					$union = $tmp;
					$count++;
				}
				return ['lo' => $lo, 'count' => $count, 'union' => $union];
			} else if ($r[0] > $target[1] + 1) {
				return $lo;
			}
		}
		if ($lo == $lim) {
			return $lim; // all existing range are less than $target
		}
	}

	/**
	 * Append a new range of integers.
	 * @param int $min The minimum value of the range being appended.
	 * @param int $max The maximum value of the range being appended.
	 */
	public function appendRange($min, $max)
	{
		$newRange = [max(0, intval($min)), intval($max)];
		if ($newRange[0] > $newRange[1]) {
			$newRange = [$newRange[1], $newRange[0]];
		}
		$overlap = $this->findOverlap($newRange);
		if (is_array($overlap)) {
			array_splice($this->ranges, $overlap['lo'], $overlap['count'], [$overlap['union']]);
		} else {
			array_splice($this->ranges, $overlap, 0, [$newRange]);
		}
	}

	/**
	 * Append a new integer value.
	 * @param int $value The value being appended.
	 */
	public function append($value)
	{
		$this->appendRange($value, $value);
	}

	/**
	 * Subtracts a specified range of integers.
	 * @param int $min The minimum value of the range to subtract.
	 * @param int $max The minimum value of the range to subtract.
	 */
	public function subtractRange($min, $max)
	{
		$newRange = [max(0, intval($min)), intval($max)];
		if ($newRange[0] > $newRange[1]) {
			$newRange = [$newRange[1], $newRange[0]];
		}
		$overlap = $this->findOverlap($newRange);
		if (is_array($overlap)) {
			$remain = [];
			if ($this->ranges[$overlap['lo']][0] < $newRange[0]) {
				$remain[] = [$this->ranges[$overlap['lo']][0], $newRange[0] - 1];
			}
			if ($newRange[1] < $this->ranges[$overlap['lo'] + $overlap['count'] - 1][1]) {
				$remain[] = [$newRange[1] + 1, $this->ranges[$overlap['lo'] + $overlap['count'] - 1][1]];
			}
			array_splice($this->ranges, $overlap['lo'], $overlap['count'], $remain);
		}
	}

	/**
	 * Subtracts a single integer value.
	 * @param int $value The value to subtract.
	 */
	public function subtract($value)
	{
		$this->subtractRange($value, $value);
	}

	/**
	 * Removes the internal ranges completely.
	 */
	public function reset()
	{
		$this->ranges = [];
	}

	/**
	 * Checks if the specified value is included in the current range.
	 * @param $value int Value to be checked
	 * @return bool True if the specified value is included in the range.
	 */
	public function isIncluded($value)
	{
		foreach ($this->ranges as $r) {
			if ($value >= $r[0] && $value <= $r[1]) {
				return true;
			}
			if ($value < $r[0]) {
				return false;
			}
		}
		return false;
	}

	/**
	 * Checks if the current instance is continuous.
	 * @return bool True if the current range is continuous.
	 */
	public function isContinuous()
	{
		return count($this->ranges) === 1;
	}

	/**
	 * Calculates how many numbers are effectively included in this instance.
	 * (i.e. '1-10,51-60,90' returns 21)
	 * @return int The number of integer values.
	 */
	public function length()
	{
		$result = 0;
		foreach ($this->ranges as $r) {
			$result += $r[1] - $r[0] + 1;
		}
		return $result;
	}

	/**
	 * Checks if two instances of MultiRange are the same.
	 * @param MultiRange $data The data to compare.
	 * @return bool True if $data is exactly the same as this instance.
	 */
	public function equals(MultiRange $data)
	{
		if (is_null($data)) {
			return false;
		}
		if ($data === $this) {
			return true;
		}
		if (count($this->ranges) !== count($data->ranges)) {
			return false;
		}
		foreach ($this->ranges as $idx => $val) {
			if ($val[0] !== $data->ranges[$idx][0] || $val[1] !== $data->ranges[$idx][1]) {
				return false;
			}
		}
		return true;
	}

	/**
	 * @return string Returns the normalized string expression of this instance.
	 */
	public function __toString()
	{
		$result = '';
		foreach ($this->ranges as $i => $item) {
			if ($i !== 0) $result .= ',';
			$result .= $item[0] === $item[1] ? $item[0] : "$item[0]-$item[1]";
		}
		return $result;
	}

	/*
	 * Implements iterator. Returns the current element.
	 * @return int The current value of the iterator.
	 */
	public function current()
	{
		return $this->current;
	}

	/**
	 * Implements iterator. Moves forward to next element.
	 */
	public function next()
	{
		if ($this->current < current($this->ranges)[1]) {
			$this->current++;
			$this->currentIndex++;
		} else {
			$next = next($this->ranges);
			if ($next) {
				$this->current = current($this->ranges)[0];
				$this->currentIndex++;
			} else {
				$this->current = false;
				$this->currentIndex = null;
			}
		}
	}

	/**
	 * Implements iterator. Returns the key of the current element.
	 * @return mixed scalar on success, or null on failure.
	 */
	public function key()
	{
		return $this->currentIndex;
	}

	/**
	 * Implements iterator. Checks if current position is valid.
	 * @return boolean True on success or false on failure.
	 */
	public function valid()
	{
		return $this->current !== false;
	}

	/**
	 * Implements iterator. Rewinds the Iterator to the first element.
	 */
	public function rewind()
	{
		reset($this->ranges);
		if (is_array(current($this->ranges))) {
			$this->current = current($this->ranges)[0];
			$this->currentIndex = 0;
		} else {
			$this->current = false;
			$this->currentIndex = null;
		}
	}
}