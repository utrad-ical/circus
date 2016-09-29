'use strict';

/**
 * Simulates setImmediate using postMessage.
 * setImmediate works more efficiently than setTimeout(fn, 0).
 * This does not actually polyfills setImmediate. It only returns a function
 * that works like setImmediate (without arguments support).
 * Ignores IE8 which has a synchronous version of postMessage.
 */

const prefix = 'circus-rs$' + Math.random() + '$';

let handlerIndex = 1;
const handlers: { [index: number]: Function } = {};
let handlerInstalled = false;

function receiveMessage(event): any {
	const handle = event.data.slice(prefix.length);
	if (handlers[handle]) {
		handlers[handle]();
		delete handlers[handle];
	}
}

export default function setImmediate(callback): any {
	if ('setImmediate' in window) {
		// use native one
		return window.setImmediate(callback);
	}

	// use polyfill using postMessage
	if (!handlerInstalled) {
		window.addEventListener('message', receiveMessage);
		handlerInstalled = true;
	}

	handlers[handlerIndex] = callback;
	window.postMessage(prefix + handlerIndex, '*');
	return handlerIndex++;
}
