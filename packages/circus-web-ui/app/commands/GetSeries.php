<?php

use Illuminate\Console\Command;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Input\InputArgument;

class GetSeries extends Command
{

	/**
	 * The console command name.
	 *
	 * @var string
	 */
	protected $name = 'image:get';

	/**
	 * The console command description.
	 *
	 * @var string
	 */
	protected $description = 'Print information on the specified series.';

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
		$uids = $this->argument('series_uid');
		if (count($uids) == 0) {
			$this->error('No series UID is specified.');
			return;
		}
		$results = array();
		foreach ($uids as $series_uid) {
			$results[$series_uid] = $this->getSingleSeries($series_uid);
		}

		if ($this->option('json')) {
			$this->line(json_encode($results));
		} else {
			foreach ($results as $uid => $series) {
				$this->line("[$uid]");
				if (is_null($series)) {
					$this->error('Such series is not registered.');
					continue;
				}
				foreach ($series as $key => $value) {
					$this->line(sprintf("%-11s %s", "$key:", $value));
				}
			}
		}
	}

	protected function getSingleSeries($series_uid)
	{
		$series = Series::find($series_uid);
		if (is_null($series)) {
			return null;
		}
		$keys = array(
			'seriesUID', 'studyUID',
			'width', 'height',
			'images',
			'seriesDate',
			'modality', 'bodyPart', 'seriesDescription',
			'stationName', 'modelName', 'manufacturer',
			'domain',
			'updated_at', 'created_at'
		);
		$results = array();
		foreach ($keys as $key) {
			$results[$key] = $series->$key;
		}
		$dir = $series->storage->dicomStoragePath($series->seriesUID);
		$results['storage'] = $dir;
		return $results;
	}

	/**
	 * Get the console command arguments.
	 *
	 * @return array
	 */
	protected function getArguments()
	{
		return array(
			array('series_uid', InputArgument::IS_ARRAY, 'Series instance UID.')
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
			array('json', 'j', InputOption::VALUE_NONE, 'Output in JSON format.', null)
		);
	}

}
