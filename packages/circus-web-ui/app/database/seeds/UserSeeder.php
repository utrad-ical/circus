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
			$collection->unique('userEmail');
			$collection->unique('loginID');
		});

		Eloquent::unguard();

		User::create(array(
			'userEmail'     => 'info@circus.co.jp',
			'loginID'       => 'circus',
			'password'      => (new CustomHasher())->make('circus'),
			'groups'        => [Group::where(['groupName' => 'admin'])->firstOrFail()->groupID],
			'lastLoginTime' => null,
			'lastLoginIP'   => null,
			'description'   => 'Default administrative user',
			'loginEnabled'  => true,
			'preferences'   => array('theme' => 'mode_white', 'personalInfoView' => true)
		));
	}
}