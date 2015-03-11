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
			'createGroups' => array(2),
			'viewGroups' => array(2),
			'updateGroups' => array(2),
			'reviewGroups' => array(2),
			'deleteGroups' => array(1),
			'personalInfoViewGroups' => array(2),
			'windowPriority' => 'dicom,preset,auto',
			'windowPresets' => array(),
			'caseAttributesSchema' => array(),
			'labelAttributesSchema' => array()
		));
	}
}