<?php

/**
 * Manager for CIRCUS RS system.
 */
class RsManager
{
	protected $rs_dir;
	protected $script;

	public function __construct()
	{
		$this->rs_dir = app_path() . '/../vendor/utrad-ical/circus-rs';
		$this->script = $this->rs_dir . '/build/circus-rs.js';
	}

	public function status()
	{
		if (!is_dir($this->rs_dir)) {
			return 'Error: CIRCUS RS package is not installed.';
		}
		if (!is_file($this->script)) {
			return 'Error: CIRCUS RS package is installed, but building process is not complete.';
		}

		$out = [];
		$forever = $this->rs_dir . '/node_modules/.bin/forever';
		Log::info(file_exists($forever));
		Log::info($forever);
		exec("$forever", $out, $retvar);
		$str = implode("\n", $out);

		return $str;
	}

	protected function makeConfig()
	{
		$data = [
			'pathResolver' => [
				'module' => 'CircusDbPathResolver',
				'options' => [
					'configPath' => app_path() . '/config/db_config.json'
				]
			],
			'logs' => [[
				'type' => 'datefile',
				'filename' => storage_path('logs'),
				'pattern' => '-yyyyMMdd.log'
			]],
			'port' =>  3000,
			'bufferSize' => 512 * 512 * 1024
		];
		$confFileName = storage_path('rsconfig') . '/circus_rs.config';
		file_put_contents($confFileName, json_encode($data));
		return $confFileName;
	}

	public function start()
	{
		$app = escapeshellarg($this->script);
		$conf = escapeshellarg($this->makeConfig());
		system("forever start $app --config=$conf");
	}

	public function stop()
	{
		$app = escapeshellarg($this->script);
		system("forever stop $app");
	}

	public function restart()
	{
		$this->stop();
		$this->start();
	}
}