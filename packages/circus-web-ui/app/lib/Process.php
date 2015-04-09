<?php

/**
 * Very thin wrapper function for exec
 */
class Process
{
	protected static function execute($command, $linefunc, &$last_line)
	{
		$spec = array(
			1 => array("pipe", "w"),  // output to stdout
			2 => array("pipe", "w") // output to stderr
		);
		$process = proc_open($command, $spec, $pipes);

		if (!is_resource($process)) {
			Log::error("Failed to invoke eternal process: $command");
			return false;
		}

		$line = null;
		while (!feof($pipes[1])) {
			$line = fgets($pipes[1]);
			$linefunc($line);
			$last_line = $line;
		}
		fclose($pipes[1]);

		$stderr = stream_get_contents($pipes[2]);
		if (strlen($stderr)) {
			Log::warning($stderr);
		}
		fclose($pipes[2]);

		$return_var = proc_close($process);
		return $return_var;
	}

	/**
	 * Works in the same way as PHP's default `exec()`, but logs everything emitted to STDERR.
	 * @param $command
	 * @param array $output
	 * @param $return_var
	 * @return bool|string
	 */
	public static function exec($command, array &$output = null, &$return_var = null)
	{
		if ($output == null) $output = [];
		$return_var = self::execute($command, function ($line) use (&$output) {
			if (strlen($line) && is_array($output)) $output[] = rtrim($line);
		}, $last_line);
		if ($return_var === false) return false; else return $last_line;
	}

	/**
	 * Works in the same way as PHP's default `system()`, but logs everything emitted to STDERR.
	 * @param $command
	 * @param $return_var
	 * @return bool|string
	 */
	public static function system($command, &$return_var = null)
	{
		$return_var = self::execute($command, function ($line) {
			print $line;
		}, $last_line);
		if ($return_var === false) return false; else return $last_line;
	}
}