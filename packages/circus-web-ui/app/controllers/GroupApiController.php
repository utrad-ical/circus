<?php

class GroupApiController extends ResourceApiBaseController
{
	protected $fields = array('groupID', 'groupName', 'privileges');
	protected $targetClass = 'Group';
	protected $settable = ['groupName', 'privileges'];
}