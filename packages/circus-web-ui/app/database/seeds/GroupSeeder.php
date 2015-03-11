<?php

/**
 * Creates default user group.
 */
class GroupSeeder extends Seeder
{
	public function run()
	{
		// Ensure index for the groups collection
		DB::table(Group::COLLECTION)->delete();
		Schema::create(Group::COLLECTION, function ($collection) {
			$collection->unique('groupID');
			$collection->unique('groupName');
		});

		Eloquent::unguard();

		Group::create(array(
			'groupID' => 1,
			'groupName' => 'admin',
			'privileges' => array(
				'createProject',
				'deleteProject',
				'restartServer',
				'personalInfoView'
			),
			'domains' => array()
		));

		Group::create(array(
			'groupID' => 2,
			'groupName' => 'user',
			'privileges' => array(
				'personalInfoView'
			),
			'domains' => array()
		));
	}
}