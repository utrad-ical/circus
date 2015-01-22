<?php

/**
 * Creates a default user.
 */
class UserSeeder extends Seeder
{
	public function run()
	{
		// Ensure index for the users collection
		DB::table(User::COLLECTION)->delete();
		Schema::create(User::COLLECTION, function ($collection) {
			$collection->unique('userID');
			$collection->unique('loginID');
		});

		Eloquent::unguard();

		User::create(array(
			'userID' => 0,
			'loginID' => 'circus',
			'password' => (new CustomHasher())->make('circus'),
			'groups' => array('admin'),
			'lastLoginDate' => null,
			'lastLoginIP' => null,
			'description' => 'Default administrative user',
			'loginEnabled' => "1",
			'preferences' => array('theme' => 'mode_white', 'personalView' => "1"),
			'updateTime' => new MongoDate(), // TODO: Remove eventually
			'createTime' => new MongoDate() // TODO: Remove eventually
		));
	}
}