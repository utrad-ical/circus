<?php

/**
 * Used when validation fails. Contains the invalid model for easy analysis.
 */
class InvalidModelException extends \RuntimeException {
	/**
	 * The message bag instance containing validation error messages
	 * @var \Illuminate\Support\MessageBag
	 */
	protected $errors;

	/**
	 * Receives the invalid model and sets the {@link model} and {@link errors} properties.
	 * @param Ardent $model The troublesome model.
	 */
	public function __construct($errors) {
		$this->errors = $errors;
	}

	public function getErrors() {
		return $this->errors;
	}
}