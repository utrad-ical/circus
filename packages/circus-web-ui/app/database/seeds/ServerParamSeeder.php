<?php

/**
 * Creates a default server params.
 */
class ServerParamSeeder extends Seeder
{
	public function run()
	{
		// Ensure index for the users collection
		DB::table(ServerParam::COLLECTION)->delete();
		Schema::create(ServerParam::COLLECTION, function ($collection) {
			$collection->unique('key');
		});

		Eloquent::unguard();

		ServerParam::create(array(
			'key' => 'domains',
			'value' => ['default']
		));

		ServerParam::create(array(
			'key' => 'defaultDomain',
			'value' => 'default'
		));
	}
}