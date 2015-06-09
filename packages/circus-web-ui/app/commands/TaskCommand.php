<?php

use Illuminate\Console\Command;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * Task class
 */
class TaskCommand extends Command
{
	/**
	 * The Task instance which this command is associated with.
	 * @var Task
	 */
	protected $task = null;
	private $taskFinished = false;

	/**
	 * Constructor. Registers the 'task' option.
	 */
	public function __construct()
	{
		parent::__construct();
		// Always notice this '--task' option for the task commands.
		$this->addOption('task', null, InputOption::VALUE_REQUIRED, 'Task ID');
	}

	/**
	 * If the associated task is present, appends the task log.
	 * @param string $log The log string.
	 */
	protected function addTaskLog($log)
	{
		if (!$this->task) return;
		$this->task->addLog($log);
	}

	/**
	 * If the associated task is present, updates the task status.
	 * @param float $value
	 * @param float $max
	 * @param string $textStatus
	 */
	protected function updateTaskProgress($value, $max = 0, $textStatus = '')
	{
		if (!$this->task) return;
		$this->task->updateProgress($value, $max, $textStatus);
	}

	/**
	 * If the associated task is present, marks it as finished.
	 */
	protected function markTaskAsFinished()
	{
		if (!$this->task) return;
		$this->task->markAsFinished();
		$this->taskFinished = true;
	}

	/**
	 * Waits for the other tasks before actually calls fire().
	 * @param InputInterface $input
	 * @param OutputInterface $output
	 */
	protected function execute(InputInterface $input, OutputInterface $output)
	{
		// If '--task' exists, waits for the other task commands to finish.
		if ($this->option('task')) {
			$task_id = $this->option('task');
			$this->task = Task::findOrFail($task_id);
			$this->task->textStatus = 'The server is busy. Please wait.';
			$this->task->save();
			// Not wait for the other tasks! This may take many seconds or even minutes.
			if ($this->task->waitForOtherTasks()) {
				// We have waited.
				$this->task->textStatus = 'Execution in progress.';
				$this->task->status = Task::PROCESSING;
				$this->task->save();
			} else {
				$this->task->textStatus = 'Timeout. The server was busy, and was unable to process your job.';
				$this->task->markAsFinished();
				return; // Return without calling fire()!
			}
		}
		parent::execute($input, $output);
	}

	/**
	 * Destructor. This ensures this task will be marked as 'finished' even when some runtime error occurred.
	 */
	function __destruct()
	{
		// parent::__destruct(); // Seems unnecessary
		if ($this->task && !$this->taskFinished) {
			$this->markTaskAsFinished();
		}
	}

}