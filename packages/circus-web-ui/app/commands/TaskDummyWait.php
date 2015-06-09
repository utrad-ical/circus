<?php

use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Input\InputArgument;

/**
 * This is a dummy command which essentially does nothing but sleep for the given seconds.
 */
class TaskDummyWait extends TaskCommand
{

	/**
	 * The console command name.
	 *
	 * @var string
	 */
	protected $name = 'dummy-wait';

	/**
	 * The console command description.
	 *
	 * @var string
	 */
	protected $description = 'Example dummy command for the Task framework.';

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
		$max = intval($this->option('seconds'));
		for ($progress = 1; $progress <= $max; $progress++) {
			Log::debug("Dummy wait task running ... $progress/$max");
			$this->updateTaskProgress($progress, $max, "I waited for $progress seconds.");
			sleep(1);
		}
		Log::debug("Dummy wait task finished.");
	}

	/**
	 * Get the console command arguments.
	 *
	 * @return array
	 */
	protected function getArguments()
	{
		return array();
	}

	/**
	 * Get the console command options.
	 *
	 * @return array
	 */
	protected function getOptions()
	{
		return array(
			array('seconds', null, InputOption::VALUE_OPTIONAL, 'An example option.', 10)
		);
	}

}
