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

		Seq::create(array(
			'_id' => 'Storages',
			'seq' => Storage::count()
		));
		Seq::create(array(
			'_id' => 'Users',
			'seq' => User::count()
		));
	}
}