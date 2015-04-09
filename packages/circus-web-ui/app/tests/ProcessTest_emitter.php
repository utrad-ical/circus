<?php

switch($argv[1]) {
	case 1:
		print "TEST1 TEST";
		break;
	case 2:
		print "TEST2 TEST\n";
		break;
	case 3:
		print "TEST3 TEST\n\n";
		break;
	case 4:
		print "TEST4\nTEST\nTEST\n\n";
		break;
	case 5:
		print "TEST5 \nTEST\t \n";
		break;
	case 6:
		print "TEST6\n\nTEST\n\n\n\n\nTEST\t";
		break;
	case 7:
		print "TEST7 \nTEST\t\n  TEST   \n\n";
		break;
}