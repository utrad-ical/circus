import * as minimist from 'minimist';
import * as ajv from 'ajv';
import {
	default as config,
	checkTemporaryDirBase,
	checkDocker,
	checkMongo,
	setupCoreMongo } from './config';

import registerJob from './register-job';
import processNextJob from './process-next-job';

async function main()
{
	const argv = minimist(process.argv.slice(2));
	const command = argv._.shift();
	
	switch(command) {
		case "up":
			await up(argv);
			break;
		case "check":
			await check(argv);
			break;
		case "register":
			await register(argv);
			break;
		case "next":
			await next(argv);
			break;
	}
}

async function register(argv: any)
{
	const argCheck = ((new ajv()).compile({
		"type": "object",
		"properties": {
			"jobId": {
				"type": "string"
			},
			"pluginId": {
				"type": "string"
			},
			"seriesUid": {
				"type": "string"
			},
			"environment": {
				"type": "string"
			},
			"priority": {
				"type": "number"
			}
		},
		"required": [
			"pluginId",
			"seriesUid"
		]
	}))(argv);
	
	if(!argCheck) {
		console.error('Argument is something wrong.');
		process.exit(1);
	}
	
	try {
		const {jobId, pluginId, seriesUid, environment, priority} = argv;
		const createNextJobId = () => (new Date()).getTime().toString();
		await registerJob(
			jobId || createNextJobId(),
			{
				pluginId,
				series: [
					{seriesUid}
				],
				environment
			},
			priority || 0
		);
	} catch (e) {
		console.error(e.message);
		process.exit(1);
	}
}

async function next(argv: any)
{
	const argCheck = ((new ajv()).compile({
		"type": "object"
	}))(argv);
	
	if(!argCheck) {
		console.error('Argument is something wrong.');
		process.exit(1);
	}
	
	try {
		await processNextJob();
	} catch(e) {
		console.error(e.message);
		process.exit(1);
	}
}

async function check(argv: any)
{
	const argCheck = ((new ajv()).compile({
		"type": "object"
	}))(argv);
	
	if(!argCheck) {
		console.error('Argument is something wrong.');
		process.exit(1);
	}
	
	try {
		await checkTemporaryDirBase();
		await checkDocker();
		await checkMongo('config.mongoURL', config.mongoURL);
		// await checkMongo('config.webUI.mongoURL', config.webUI.mongoURL);
	} catch(e) {
		console.error(e.message);
		process.exit(1);
	}
	
	console.log('OK');
}

async function up(argv: any)
{
	const argCheck = ((new ajv()).compile({
		"type": "object"
	}))(argv);
	
	if(!argCheck) {
		console.error('Argument is something wrong.');
		process.exit(1);
	}
	
	try {
		await setupCoreMongo();
	} catch(e) {
		console.error(e.message);
		process.exit(1);
	}
}

main();
