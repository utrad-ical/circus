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
			$collection->unique('GroupID');
		});

		Eloquent::unguard();

		Group::create(array(
			'GroupID' => 'admin', // TODO: Lowercase key
			'GroupName' => 'admin', // TODO: Lowercase key
			'privileges' => array(
				'createProject',
				'deleteProject',
				'createCase',
				'deleteCase',
				'restartServer',
				'personalInfoView'
			),
			'domains' => array(),
			'updateTime' => new MongoDate(), // TODO: Remove eventually
			'createTime' => new MongoDate() // TODO: Remove eventually
		));

		/*
		Group::create(array(
			'GroupID' => 'user',
			'GroupName' => 'user',
			'privileges' => array(
				'createCase'
			),
			'domains' => array(),
			'updateTime' => new MongoDate(), // TODO: Remove eventually
			'createTime' => new MongoDate() // TODO: Remove eventually
		));
		*/
	}
}