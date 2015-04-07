<?php

class ProcessTest extends TestCase {

	public function testSystem() {
		ob_start();
		Process::system('php -v', $return_var);
		$contents = ob_get_contents();
		ob_end_clean();
		$this->assertSame(0, $return_var);
		$this->assertSame(1, preg_match("/PHP/", $contents));
	}

	public function testCommand() {
		Process::exec('php -v', $result, $return_var);
		$this->assertSame(0, $return_var);
		$this->assertSame(1, preg_match("/PHP/", implode("\n", $result)));
	}

	public function testCommandWarning() {
		Process::system('php -r "fputs(STDERR, \'This is test warning output\'); exit(1);"', $return_var);
		$this->assertSame(1, $return_var);
		Process::exec('php -r "fputs(STDERR, \'This is test warning output\'); exit(1);"', $output, $return_var);
		$this->assertSame(1, $return_var);
	}

}
