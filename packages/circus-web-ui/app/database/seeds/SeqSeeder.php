<?php

/**
 * Creates the initial sequence data.
 */
class SeqSeeder extends Seeder
{
	public function run()
	{
		// Ensure index for the groups collection
		DB::table(Seq::COLLECTION)->delete();

		Eloquent::unguard();

		$collections = array(
			Storage::COLLECTION => 'storageID',
			User::COLLECTION => 'userID',
			Group::COLLECTION => 'groupID'
		);

		foreach ($collections as $collection => $field) {
			Seq::create(array(
				'_id' => $collection,
				'seq' => DB::table($collection)->max($field)
			));
		}
	}
}