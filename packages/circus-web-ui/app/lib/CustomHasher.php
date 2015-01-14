<?php

class CustomHasher implements Illuminate\Hashing\HasherInterface {

	public function make($value, array $options = array()){
	  	$secret_key = Config::get("const.hash_key");
	  	Log::debug(openssl_encrypt($value,'aes-256-ecb',$secret_key));
	   	return openssl_encrypt($value,'aes-256-ecb',$secret_key);
	}

	public function check($value, $hashedValue, array $options = array()){
		$secret_key = Config::get("const.hash_key");
		Log::debug(openssl_encrypt($value,'aes-256-ecb',$secret_key));
    	return $hashedValue == openssl_encrypt($value,'aes-256-ecb',$secret_key);
	}

	public function needsRehash($hashedValue, array $options = array()){
		return false;
	}
}