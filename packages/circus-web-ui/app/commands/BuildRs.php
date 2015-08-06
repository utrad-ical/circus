<?php

use Illuminate\Console\Command;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Input\InputArgument;

class BuildRs extends Command {

	/**
	 * The console command name.
	 *
	 * @var string
	 */
	protected $name = 'build-rs';

	/**
	 * The console command description.
	 *
	 * @var string
	 */
	protected $description = 'Prepare CIRCUS RS.';

	/**
	 * Execute the console command.
	 *
	 * @return mixed
	 */
	public function fire()
	{
		$manager = new RsManager();
		$rs_dir = $manager->getRsDir();
		chdir($rs_dir);
		$this->info('Building CIRCUS RS...');
		passthru('npm install');
		passthru('npm install mongoose');
		passthru('gulp');
	}

}
