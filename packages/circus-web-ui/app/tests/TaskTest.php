<?php

class TaskTest extends TestCase {
	public function testTaskInsert() {
		$seconds = 1;

		Auth::setUser(User::all()->first());
		$task = Task::startNewTask("dummy-wait --seconds=$seconds");
		$this->assertNotNull($task);

		sleep($seconds + 2); // This should enough for the task above to finish
		$task2 = Task::find($task->taskID);
		$this->assertNotNull($task2);
		$this->assertEquals(Task::FINISHED, $task2->status);
	}
}