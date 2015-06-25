<?php

namespace CIRCUS_RS;

class Builder {
	public static function build() {
		echo "Building CIRCUS-CS...\n";
		chdir(__DIR__);
		passthru('npm install');
		passthru('gulp');
	}
}
