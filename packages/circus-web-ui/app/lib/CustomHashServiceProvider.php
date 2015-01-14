<?php

use Illuminate\Hashing\HashServiceProvider;

class CustomHashServiceProvider extends HashServiceProvider {

    public function register()
    {
        $this->app->bind('hash', function()
        {
            return new CustomHasher;
        });
    }

	public function provides()
	{
		return array('hash');
	}

}