<?php

use Illuminate\Console\Command;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Input\InputArgument;

// CAUTION!
// Make sure this command is called under the proper OS user.
// (i.e. Use `sudo apache php artisan image:server status`)
// Otherwise, you will encounter an inconsistent behavior
// from what you can see via your browser.

/**
 * Starts and stops the CIRCUS RS instance using forever.
 */
class ManageRs extends Command {

	/**
	 * The console command name.
	 * @var string
	 */
	protected $name = 'image:server';

	/**
	 * The console command description.
	 * @var string
	 */
	protected $description = 'Manages DICOM image server (CIRCUS RS).';

	/**
	 * Execute the console command.
	 * @return mixed
	 */
	public function fire()
	{
		$command = strtolower($this->argument('operation'));
		$manager = new RsManager();
		$check = $manager->checkForever();
		if ($check !== true) {
			$this->error('The bundled CIRCUS RS is not properly configured.');
			$this->error($check);
			return;
		}
		$status = null;
		switch ($command) {
			case 'start':
				$status = $manager->start();
				break;
			case 'stop':
				$status = $manager->stop();
				break;
			case 'status':
				$status = $manager->status();
				break;
			case 'restart':
				$manager->stop();
				$status = $manager->start();
				break;
			default:
				throw new \RuntimeException('Invalid operation. Specify one of start/stop/status/restart.');
		}
		$this->info($status);
	}

	/**
	 * Get the console command arguments.
	 * @return array
	 */
	protected function getArguments()
	{
		return array(
			array('operation', InputArgument::REQUIRED, 'One of start/stop/status/restart')
		);
	}

}
