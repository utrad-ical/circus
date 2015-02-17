<?php

class GroupApiController extends ApiBaseController
{
	protected $fields = array('groupID', 'groupName', 'privileges');
	protected $targetClass = 'Group';
	protected $settable = ['groupName', 'privileges'];
}