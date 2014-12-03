<?php


use Jenssegers\Mongodb\Model as Eloquent;

class Cases extends Eloquent {
	protected $connection = 'mongodb';
	protected $collection = 'Case';

}
