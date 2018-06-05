import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import * as Docker from 'dockerode';
import DicomFileRepository from './dicom-file-repository/DicomFileRepository';

import * as memory from 'memory-streams';
import {isDir, mkDir, rmDir} from './directory';

const config = require('../config/default');
// console.log(JSON.stringify(config, null, 2));

const pluginConfig = loadPluginConfig();
console.log(JSON.stringify(pluginConfig, null, 2));

const dockerSocketPath = process.env.DOCKER_SOCKET || '/var/run/docker.sock';

if (!fs.statSync(dockerSocketPath).isSocket()) {
  throw new Error('Are you sure the docker is running?');
}

const args = process.argv.slice(2);
const seriesUID: string = args.shift() || '';
const tmpBaseDir: string = args.shift() || '';

if(!seriesUID || !tmpBaseDir) {
	console.error('Invalid arguments');
	process.exit();
}

draft().then(() => {
	process.exit();
});

async function draft()
{
	const pluginName = "Lung-CAD";

	const tmpDicomDir = tmpBaseDir + '/dicom';
	const tmpPluginInputDir = tmpBaseDir + '/in';
	const tmpPluginOutputDir = tmpBaseDir + '/out';
	
	try {
		await rmDir(tmpBaseDir);
		await mkDir(tmpBaseDir);
	} catch(e) {
		throw new Error (`${tmpBaseDir} is already exists.`);
	}
	
	/**
	 * Prepare temporary DICOM files for DICOM voxel dumper.
	 *   repository ---> temporary dicom files
	 */
	const repositoryConfig = config.dicomFileRepository;
	const repository: DicomFileRepository = detectDicomeFileRepository( repositoryConfig );
	
	try {
		// Create directory
		if(await isDir(tmpDicomDir))
			throw new Error (`${tmpDicomDir} is already exists.`);
							
		await mkDir(tmpDicomDir);
		await storeDicomFiles(repository, seriesUID, tmpDicomDir);
	} catch(e) {
		console.error(e);
		return 1;
	}

	/**
	 * Parse DICOM files to volume file and meta files.
	 *   temporary dicom files ---> dicom volume file and meta files for plugin inputs.
	 */
	try {
		// Create directory
		if(await isDir(tmpPluginInputDir))
			throw new Error (`${tmpPluginInputDir} is already exists.`);
							
		await mkDir(tmpPluginInputDir);
		
		await convertDicomFilesToVolumeFileAndMetaFiles(
			tmpDicomDir,
			tmpPluginInputDir,
		);
	} catch(e) {
		console.error(e);
		return 1;
	}
	
	/**
	 * Execute plugin via docker.
	 *   ---> plugin outputs.
	 */
	try {
		// Create directory
		if(await isDir(tmpPluginOutputDir))
			throw new Error (`${tmpPluginOutputDir} is already exists.`);
							
		await mkDir(tmpPluginOutputDir);
		const message = await executePlugin(pluginName, tmpPluginInputDir, tmpPluginOutputDir);
		console.log(message);
		
	} catch(e) {
		console.error(e);
		return 1;
	}
	
}

// Based on circus-rs\src\server\ModuleLoader.ts
function detectDicomeFileRepository(descriptor: {module: string, options: any})
{
  let loadPath: string;
  if (/\//.test(descriptor.module)) {
    // Load external module if module path is explicitly set
    loadPath = descriptor.module;
  } else {
    // Load built-in modules
    loadPath = './dicom-file-repository/' + descriptor.module;
  }
  let repositoryClass = require(loadPath).default;
  return new repositoryClass(descriptor.options || {});
}

async function storeDicomFiles(
	repository: DicomFileRepository,
	seriesUID: string,
	temporaryDir: string
): Promise<void>
{
	// Save dicom files as source temporary from repository.
	const {seriesLoader, count} = await repository.getSeriesLoader(seriesUID);
	
	const save = (num: number) => {
		const filename = ('00000000' + num.toString()).slice(-8);
		return new Promise((resolve, reject) => {
			seriesLoader(num).then(
				(buffer: ArrayBuffer) => fs.writeFile(
					`${temporaryDir}/${filename}.dcm`,
					new Buffer(buffer),
					(err) => {
						if(err) reject(err);
						resolve();
					}
				)
			)
		});
	};
	
	const promiseCollection = [];
	for(let i = 1; i <= count; i++)
		promiseCollection.push(save(i));
	
	return Promise.all(promiseCollection)
		.then(() => {});
}

function convertDicomFilesToVolumeFileAndMetaFiles( srcDir: string, destDir: string ): Promise<[number, number, number]>
{
	const {image, volume_in, volume_out} = config.dicomDumpOptions;
	
	return new Promise( (resolve, reject) => {
		const docker = new Docker();
		const stream = new memory.WritableStream();
		const callback: any = (err: any, data: any, container: Docker.Container) => {
			if(err)
				throw err;
			
			const message = stream.toString();
			
			// Check result
			message.match(/Export\s+result:(\d+),(\d+),(\d+)\s+Succeeded/);
			if( message.indexOf('Succeeded') ) {
				resolve([
					Number(RegExp.$1),
					Number(RegExp.$2),
					Number(RegExp.$3)
				]);
			}else{
				reject(message);
			}
		};
		
		// const volumes: any = {};
		// volumes[volume_in] = {};
		// volumes[volume_out] = {};
		
		docker.run(
			image,
			[],
			stream, // process.stdout,
			{
				// 'Volumes': volumes,
				'HostConfig': {
					'Binds': [
						`${srcDir}:${volume_in}`,
						`${destDir}:${volume_out}`,
					],
					'AutoRemove': true
				}
			},
			{},
			callback
		);
	} );
}

function executePlugin( pluginName: string, srcDir: string, destDir: string ): Promise<string>
{
	const {
		dockerImage,
		binds = {
			'in': '/circus/in',
			'out': '/circus/out'
		},
		maxExecutionSeconds = 360
	} = pluginConfig[pluginName];
	
	return new Promise( (resolve, reject) => {
		const docker = new Docker({ // Note: single option key makes error because of docker.js(L:30)
			'socketPath': dockerSocketPath,
			'timeout': 1000 * maxExecutionSeconds,
		});
		const stream = new memory.WritableStream();
		const callback: any = (err: any, data: any, container: Docker.Container) => {
			
			// if(err) {
				// switch(true) {
					// case err.code === "ECONNRESET" && err.message === "socket hang up":
						// throw new PluginTimeout(`Plugin process did not complete in ${maxExecutionSeconds} seconds.`);
					// default:
						// console.log('err ---------- default');
						// throw err;
						// // throw new PluginExecutionError(err.message);
				// }
			// }
			
			if(err)
				throw err;
			
			const message = stream.toString();
			resolve(message);
		};
		
		docker.run(
			dockerImage,
			[],
			stream,
			{
				'HostConfig': {
					'Binds': [
						`${srcDir}:${binds.in}`,
						`${destDir}:${binds.out}`,
					],
					'AutoRemove': true
				}
			},
			{},
			callback
		);
		
		// 
		
	} );
}


/**
 * Config
 */
function loadPluginConfig()
{
	const pluginConfigPath = path.join(__dirname, '..', 'config', 'plugins.yml');
	
	try {
	  const pluginConfigContent = yaml.safeLoad(fs.readFileSync(pluginConfigPath, 'utf8'));
	  const pluginConfig: any = {};
	  if( typeof pluginConfigContent !== 'undefined' )
		[].forEach.call(
			pluginConfigContent,
			(p: any) => {
				pluginConfig[ p.pluginName ] = p;
			}
		);
		return pluginConfig;
	} catch (e) {
	  console.error(e);
	}
}

/**
 * Dockerode Timeout + Buffer.limit
 *   https://gist.github.com/srijs/b5b21638280875415216
 */

/**
 * Custom Error Classes
 *   https://gist.github.com/justmoon/15511f92e5216fa2624b
 */
// export interface ErrorBase extends Error {
  // readonly name: string;
  // readonly message: string;
  // readonly stack: string;
// };
// export interface ErrorBaseConstructor {
  // new (message: string): ErrorBase;
  // readonly prototype: ErrorBase;
// }

// export const ErrorBase: ErrorBaseConstructor = <any>class ErrorBase {
  // public constructor(message: string) {
    // Object.defineProperty(this, 'name', {
      // get: () => (this.constructor as any).name,
    // });
    // Object.defineProperty(this, 'message', {
      // get: () => message,
    // });
    // Error.captureStackTrace(this, this.constructor);
  // }
// };
// (ErrorBase as any).prototype = Object.create(Error.prototype);
// ErrorBase.prototype.constructor = ErrorBase;



// class PluginExecutionError extends ErrorBase {}
// class PluginTimeout extends ErrorBase {}
