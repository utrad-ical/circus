<?php

/**
 * Creates a default project.
 */
class ProjectSeeder extends Seeder
{
	public function run()
	{
		// Ensure index for the users collection
		DB::table(Project::COLLECTION)->delete();
		Schema::create(Project::COLLECTION, function ($collection) {
			$collection->unique('projectID');
			$collection->unique('projectName');
		});

		Eloquent::unguard();

		Project::create(array(
			'projectID' => 1,
			'projectName' => 'Default',
			'createGroups' => array('user'),
			'viewGroups' => array('user'),
			'updateGroups' => array('user'),
			'reviewGroups' => array('user'),
			'deleteGroups' => array('user'),
			'updateTime' => new MongoDate(), // TODO: Remove eventually
			'createTime' => new MongoDate() // TODO: Remove eventually
		));
	}
}