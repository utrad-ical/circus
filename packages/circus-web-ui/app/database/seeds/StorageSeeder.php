<?php

/**
 * Set up the default storage area.
 */
class StorageSeeder extends Seeder
{
	protected function askDirectoryAndCreateIfNecessary($question, $default)
	{
		while (true) {
			$ans = $this->command->ask($question, $default);
			if (is_dir($ans)) {
				return $ans;
			} else {
				$try = $this->command->confirm('This directory does not exist. Try to make one? [Y/n]');
				if (!$try) {
					continue;
				} else {
					if (mkdir($ans, 0777, true)) {
						return $ans;
					} else {
						$this->command->error('Failed to create a directory with the given path!');
						continue;
					}

				}
			}
		}
		return null;
	}

	public function run()
	{
		// Ensure index for the storage collection
		DB::table(Storage::COLLECTION)->delete();
		Schema::create(Storage::COLLECTION, function ($collection) {
			$collection->unique('storageID');
		});

		Eloquent::unguard();

		// Guess the appropriate storage path
		if (strpos(PHP_OS, 'WIN') !== false) {
			$prefix = 'C:\circus_db_data\\';
		} else {
			$prefix = '/var/circus_db/';
		}

		$default = "{$prefix}dicom_storage" . DIRECTORY_SEPARATOR;
		$dicom_path = $this->askDirectoryAndCreateIfNecessary(
			"Initial DICOM storage area: ($default) ", $default
		);
		$default = "{$prefix}labels" . DIRECTORY_SEPARATOR;
		$label_path = $this->askDirectoryAndCreateIfNecessary(
			"Initial label storage area: ($default) ", $default
		);

		Storage::create(array(
			'storageID' => 1,
			'path' => $dicom_path,
			'type' => 'dicom',
			'active' => true
		));

		Storage::create(array(
			'storageID' => 2,
			'path' => $label_path,
			'type' => 'label',
			'active' => true
		));
	}
}