<?php

use Illuminate\Console\Command;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Input\InputArgument;

class ExportVolume extends Command {

	/**
	 * The console command name.
	 *
	 * @var string
	 */
	protected $name = 'image:export-volume';

	/**
	 * The console command description.
	 *
	 * @var string
	 */
	protected $description = 'Export DICOM images or labels to volume data.';

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
		// Get case information
		$case_data = ClinicalCase::find($this->argument('caseID'));

		if ($case_data == null) {
			$this->error('Invalid caseID: ' . $this->argument('caseID'));
		}

		// Check revision
		$revision_data = $case_data['latestRevision'];
		if ($this->option('revision') != 'latest') {
			if(array_key_exists($this->option('revision'), $case_data['revisions'])) {
				$revision_data = $case_data['revisions'][$this->option('revision')];
			} else {
				$this->error('Invalid revision: ' . $this->option('revision'));
				return;
			}
		}

		// Check series index
		if (!array_key_exists($this->option('series_index'), $revision_data['series'])) {
			$this->error('Invalid series index: ' . $this->option('series_index'));
			return;
		}
		$series_data = $revision_data['series'][$this->option('series_index')];

		// Todo: Export series_attributes.json (if found)

		// Check map
		$map_data = null;
		// TODO: check the target series includes label data

		$map_data = $this->checkRelationMap(
			$series_data,
			$this->option('map'));
		if(!$this->option('without-label') && $map_data == null) {
			$this->error('Invalid map:');
			return;
		}

		if($this->option('without-original') && $this->option('without-label')) {
			$this->error('Option error: --without-original and --without-label are simultaneously set');
			return;
		}

		// Todo: Check output path

		// Export original volume
		$mhd_only_flg = $this->option('without-original');
		$ex = new \VolumeExporter\Exporter();
		$ex->exportOriginalVolume(
			$series_data['seriesUID'],
			$series_data['images'],
			$this->option('output'),
			$mhd_only_flg);

		// Export label volume
		if (!$this->option('without-label')) {

			// Create label info
			$label_info = array();

			foreach ($map_data as $label_index => $voxel_value) {

				$ld = Label::find($series_data['labels'][$label_index]['id'])->getAttributes();
				$ld['path'] = Storage::find($ld['storageID'])->getAttribute('path');
				$ld['voxel_value'] = $voxel_value;

				$label_info[] = $ld;
			}

			$ex->createLabelVolume(
				$this->option('output'),
				$label_info,
				$this->option('combined'));

			// Todo: Export label_attributes.json
		}

		if ($mhd_only_flg) {
			unlink($this->option('output') . "/original.mhd");
		}

		// Todo: compress to ZIP file?

	}

	protected function checkRelationMap($series_data, $map)
	{
		$results = array();

		if ($map == null) {
			$voxel_value = 1;
			foreach ($series_data['labels'] as $key => $items) {
				$results[$key] = $voxel_value++;
			}
		} else {
			$set_value_array = array();
			$relations = explode(":", $map);

			foreach ($relations as $pair) {
				$item = explode(",", $pair);

				if(!array_key_exists($item[0], $series_data['labels'])
					|| $item[1] <= 0) {
					$this->error('Invalid pairs in "--map": (' . $item[0] . ',' . $item[1] . ')');
					return null;
				} else if (in_array($item[1], $set_value_array)) {
					$this->error('Duplicate voxel value: ' . $item[1]);
					return null;
				}
				$results[$item[0]] = $item[1];
				$set_value_array[] = $item[1];
			}
		}
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
			array('caseID', InputArgument::REQUIRED, 'Target case ID.')
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
			array('series_index', 's', InputOption::VALUE_OPTIONAL, 'Target series index (default:0).', 0),
			array('revision', 'r', InputOption::VALUE_OPTIONAL, 'Target revision (default:latest).', 'latest'),
			array('map', 'm', InputOption::VALUE_OPTIONAL, 'Relation map between label index and voxel value.', null),
			array('combined', 'c', InputOption::VALUE_NONE, 'Combine all labels into one volume data.', null),
			array('without-original', null, InputOption::VALUE_NONE, 'Without exporting original volume.', null),
			array('without-label', null, InputOption::VALUE_NONE, 'Without exporting label volume.', null),
			array('output', 'o', InputOption::VALUE_OPTIONAL, 'Output path.', null)
			//array('output', 'o', InputOption::VALUE_OPTIONAL, 'Output file name (compressed by ZIP).', null)
		);
	}

}
