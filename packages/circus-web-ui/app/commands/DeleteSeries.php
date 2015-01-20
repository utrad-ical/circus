<?php

use Illuminate\Console\Command;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Input\InputArgument;

class DeleteSeries extends Command {

	/**
	 * The console command name.
	 *
	 * @var string
	 */
	protected $name = 'image:delete';

	/**
	 * The console command description.
	 *
	 * @var string
	 */
	protected $description = 'Deletes imported series from database.';

	/**
	 * Create a new command instance.
	 *
	 * @return void
	 */
	public function __construct()
	{
		parent::__construct();
	}

	/**
	 * Execute the console command.
	 *
	 * @return mixed
	 */
	public function fire()
	{
		$series_uids = $this->argument('series_uid');
		foreach ($series_uids as $suid) {
			$series = Series::find($suid);
			if (is_null($series)) {
				$this->error("Series not found: $suid");
				continue;
			}
			$this->Info("Deleting $suid");

			$case = ClinicalCase::where('revisions.latest.series.seriesUID', '=', $suid)->first();
			if (!is_null($case)) {
				$this->error('This series is already in use in at least one case.');
				continue;
			}

			if (!$this->option('keep')) {
				$this->info("Deleting imported DICOM files...");
				$series->deleteAssociatedImageFiles();
			}
			$series->delete();
			$this->Info("Deleted $suid");
		}
	}

	/**
	 * Get the console command arguments.
	 *
	 * @return array
	 */
	protected function getArguments()
	{
		return array(
			array('series_uid', InputArgument::IS_ARRAY, 'Series instance UID to delete')
		);
	}

	/**
	 * Get the console command options.
	 *
	 * @return array
	 */
	protected function getOptions()
	{
		return array(
			array('keep', 'k', InputOption::VALUE_NONE, 'Keep DICOM image files.', null)
		);
	}

}
