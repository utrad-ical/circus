<?php

/**
 * Model class for tasks.
 * @property int taskID Task ID.
 * @property string owner Who started this task.
 * @property string status Task status.
 * @property string command The command.
 * @property string download Download path (do not expose this to the end user).
 * @property bool publicDownload Whether anyone can download the generated file.
 * @property string textStatus Text status which is to be shown to the end user.
 * @property array logs Array of strings which hold log items.
 * @property number value
 * @property number max
 */
class Task extends BaseModel
{
	protected $connection = 'mongodb';

	const COLLECTION = 'Tasks';
	protected $collection = self::COLLECTION;

	/**
	 * Const string which indicates the task is currently processing.
	 */
	const PROCESSING = 'processing';

	/**
	 * Const string which indicates the task is waiting for other processes.
	 */
	const WAITING = 'waiting';

	/**
	 * Const string which indicates the task has finished.
	 */
	const FINISHED = 'finished';

	protected $primaryKey = 'taskID';

	/**
	 * Validate Rules
	 */
	protected $rules = [
		'taskID' => 'required|strict_string',
		'owner' => 'required|strict_string',
		'status' => 'required|strict_string',
		'command' => 'required|strict_string',
		'download' => 'strict_string',
		'publicDownload' => 'strict_bool',
		'textStatus' => 'required|strict_string',
		'logs' => 'array',
		'value' => 'required|strict_numeric',
		'max' => 'required|strict_numeric',
		'createTime' => 'mongodate',
		'updateTime' => 'mongodate'
	];

	/**
	 * This is intended to be called by artisan commands. Do not call it within HTTP server.
	 * @param int $timeout Timeout in seconds. 0 for no timeout.
	 * @return bool True if success, false if timeout or another error happens.
	 */
	public function waitForOtherTasks($timeout = 100, $zombie_threshold = 100)
	{
		$startTime = time();
		$zombie = new MongoDate(time() - $zombie_threshold); // Tasks older than this time will be ignored.
		while (true) {
			$count = Task::where(self::CREATED_AT, '<', $this->createTime) // find tasks made before myself ...
				->where(self::CREATED_AT, '>', $zombie) // but not too old ...
				->where('status', '!=', self::FINISHED) // and not finished
				->count();
			if ($count === 0) {
				// OK, there are no preceding processes. We can go on.
				return true;
			}
			if ($timeout > 0 && time() - $startTime > $timeout) {
				// We have waited too long. Let's give up.
				return false;
			}
			sleep(1);
		}
		return false;
	}

	/**
	 * This is intended to be called within HTTP server process.
	 * @param string $command The command without 'php artisan' part. (e.g. 'import-image -r /path/to/dicom')
	 * @param string $stdin String injected via stdin after $command is invoked.
	 * @return Task The new Task instance with a new task ID.
	 */
	public static function startNewTask($command, $stdin = null)
	{
		$task_id = md5(rand());

		$task = new Task();
		$task->taskID = $task_id;
		$task->owner = Auth::user()->userEmail;
		$task->status = self::WAITING;
		$task->command = $command;
		$task->textStatus = 'Starting up the process...';
		$task->logs = [];
		$task->value = 0;
		$task->max = 0;
		$task->download = "";
		$task->publicDownload = false;
		$task->save();

		if (!$task->executeBackgroundProcess($command, $stdin)) {
			Log::info("Task process invocation failed. ($command)");
			$task->status = self::FINISHED;
			$task->save;
			return null;
		}
		return $task;
	}

	/**
	 * This is intended to be called within commands.
	 * @param string $log The log string.
	 */
	public function addLog($log)
	{
		$tmp = $this->logs;
		$tmp[] = $log;
		$this->logs = $tmp;
		$this->save();
	}

	/**
	 * This is intended to be called within commands.
	 * @param $value
	 * @param int $max
	 * @param string $textStatus
	 */
	public function updateProgress($value, $max = 0, $textStatus = '')
	{
		$this->value = $value;
		if ($max > 0) {
			$this->max = $max;
		}
		if (strlen($textStatus)) {
			$this->textStatus = $textStatus;
		}
		$this->save();
	}

	/**
	 * This is intended to be called within commands.
	 */
	public function markAsFinished()
	{
		$this->textStatus = 'Execution finished.';
		$this->status = self::FINISHED;
		$this->save();
	}


	public function saveDownloadPath($path, $public = false)
	{
		$this->download = $path;
		$this->publicDownload = !!$public;
		$this->save();
	}

	/**
	 * Executes command as a background process.
	 * @param string $command The command.
	 * @param string $stdin String injected via stdin after $command is invoked.
	 * @return string The task ID, which is used to query the progress and result.
	 */
	protected function executeBackgroundProcess($command, $stdin)
	{
		$artisan = 'php ' . app_path() . '/../artisan';
		$descriptor = array(
			0 => array('pipe', 'r'),
		);
		$fullCommand = "$artisan $command --task=$this->taskID";
		Log::debug("Invoking $fullCommand");
		$process = proc_open(
			$fullCommand,
			$descriptor,
			$pipes
		);
		if (strlen($stdin)) {
			fwrite($pipes[0], $stdin);
		}
		return is_resource($process);
	}

}