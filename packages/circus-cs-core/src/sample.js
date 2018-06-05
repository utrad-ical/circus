'use strict';

/**
 * To use dockerode first you need to instantiate it:
 */

var Docker = require('dockerode');
var docker = new Docker(); //defaults to above if env variables are not used
// var docker = new Docker({socketPath: '/var/run/docker.sock'});
// var docker = new Docker({host: 'http://192.168.1.10', port: 3000});
// var docker = new Docker({protocol:'http', host: '127.0.0.1', port: 3000});
// var docker = new Docker({host: '127.0.0.1', port: 3000}); //defaults to http


docker.createContainer({
  Image: 'bash',
  AttachStdin: true,
  AttachStdout: true,
  AttachStderr: true,
  Tty: true,
  // Cmd: ['/bin/bash', '-c', 'tail -f /var/log/dmesg'],
  OpenStdin: false,
  StdinOnce: false
}).then(function(container) {
  return container.start();
}).then(function(container) {
  return container.stop();
}).then(function(container) {
  return container.remove();
}).then(function(data) {
  console.log('container removed');
}).catch(function(err) {
  console.log(err);
});



// docker.run(
	// 'hello-world',
	// [],
	// process.stdout
// );

// docker.run(
	// 'hello-world',
	// [],
	// process.stdout,
	// {
		// createOptions:{}
	// },
	// {
		// start_options:[]
	// },
	// function (err, data, container) {
		// console.log('----------------');
		// console.log(data);
	// }
// );

// docker.createContainer(
	// {
		// Image: 'ajaycs14/hello-world',
		// Tty: true,
		// name: 'yourContainerName',
		// PortBindings: {
			// "80/tcp": [
				// { "HostPort": "8080" }
			// ]
		// }
	// }, function (err,container){
		// console.log(err);
		// // container.start();
	// }
// );

// //protocol http vs https is automatically detected
// var docker5 = new Docker({
  // host: '192.168.1.10',
  // port: process.env.DOCKER_PORT || 2375,
  // ca: fs.readFileSync('ca.pem'),
  // cert: fs.readFileSync('cert.pem'),
  // key: fs.readFileSync('key.pem'),
  // version: 'v1.25' // required when Docker >= v1.13, https://docs.docker.com/engine/api/version-history/
// });

// var docker6 = new Docker({
  // protocol: 'https', //you can enforce a protocol
  // host: '192.168.1.10',
  // port: process.env.DOCKER_PORT || 2375,
  // ca: fs.readFileSync('ca.pem'),
  // cert: fs.readFileSync('cert.pem'),
  // key: fs.readFileSync('key.pem')
// });

// //using a different promise library (default is the native one)
// var docker7 = new Docker({
  // Promise: require('bluebird')
  // //...
// });
// //...

/**
 * Manipulating a container:
 */
// create a container entity. does not query API
// var container = docker.getContainer('7f8c8260524a415bb65890c55ac2c347df0d6bcfba63b9a4de5b9fefe1b0a3b7');

// docker inspect
// 　docker inspectはイメージファイルの詳細情報を表示させるためのコマンドである。コンテナ起動時に何を実行するようになっているか、などが分かる。


// query API for container info
// container.inspect(function (err, data) {
  // console.log(data);
// });

// container.start(function (err, data) {
  // console.log(data);
// });

// container.remove(function (err, data) {
  // console.log(data);
// });

// promises are supported
	
// docker.createContainer({
  // Image: 'ubuntu',
  // AttachStdin: false,
  // AttachStdout: true,
  // AttachStderr: true,
  // Tty: true,
  // Cmd: ['/bin/bash', '-c', 'tail -f /var/log/dmesg'],
  // OpenStdin: false,
  // StdinOnce: false
// }).then(function(container) {
  // return container.start();
// }).then(function(container) {
  // return container.resize({
    // h: process.stdout.rows,
    // w: process.stdout.columns
  // });
// }).then(function(container) {
  // return container.stop();
// }).then(function(container) {
  // return container.remove();
// }).then(function(data) {
  // console.log('container removed');
// }).catch(function(err) {
  // console.log(err);
// });
