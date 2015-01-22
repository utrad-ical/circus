<?php

class DatabaseSeeder extends Seeder {

	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		// This allows us to bulk-insert records guarded by $fillable/$guarded.
		// Refer to the 'Mass Assignment' section in the Eloquent document.
		Eloquent::unguard();

		// Call each seeding class sequentially.
		// You can invoke one of those seeders individually (see the manual).
		$this->call('StorageSeeder');
		$this->call('GroupSeeder');
		$this->call('UserSeeder');
		$this->call('ProjectSeeder');
		$this->call('OtherSeeder');
		$this->call('SeqSeeder');
	}

}
