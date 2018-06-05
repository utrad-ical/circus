import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';

export function isDir(dir: string): Promise<boolean>
{
	return new Promise( (resolve, reject) => {
		fs.stat(dir, (err, stats) => {
			resolve( !err );
		});
	});
}

export function mkDir(dir: string): Promise<void>
{
	return new Promise( (resolve, reject) => {
		fs.mkdir(dir, (err) => {
			if(err)
				reject(err);
			else
				resolve();
		});
	} );
}

export function rmDir(dir: string): Promise<void>
{
	return new Promise( (resolve, reject) => {
		rimraf(dir, (err) => {
			if(err)
				reject(err);
			else
				resolve();
		});
	} );
}
