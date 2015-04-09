<?php

class ProcessTest extends TestCase {
	private $command;

	public function setUp() {
		parent::setUp();
		$this->command = "php " . __DIR__ . '/ProcessTest_emitter.php';
	}

	public function testSystem() {
		for ($i = 1; $i <= 7; $i++) {
			ob_start();
			Process::system("$this->command $i", $return_var_my);
			$contents_my = ob_get_contents();
			ob_end_clean();

			ob_start();
			system("$this->command $i", $return_var_orig);
			$contents_orig = ob_get_contents();
			ob_end_clean();
			$this->assertSame($contents_orig, $contents_my);
			$this->assertSame($return_var_orig, $return_var_my);
		}
	}

	public function testCommand() {
		for ($i = 1; $i <= 7; $i++) {
			$lines_my = array();
			$lines_orig = array();
			Process::exec("$this->command $i", $lines_my, $return_var_my);
			exec("$this->command $i", $lines_orig, $return_var_orig);
			$this->assertSame($lines_orig, $lines_my);
			$this->assertSame($return_var_orig, $return_var_my);
		}
	}

	public function testCommandWarning() {
		Process::system('php -r "fputs(STDERR, \'This is test warning output\'); exit(1);"', $return_var);
		$this->assertSame(1, $return_var);
		Process::exec('php -r "fputs(STDERR, \'This is test warning output\'); exit(1);"', $output, $return_var);
		$this->assertSame(1, $return_var);
	}

}