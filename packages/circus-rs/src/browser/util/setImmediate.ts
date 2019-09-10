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

const receiveMessage: (event: MessageEvent) => any = event => {
  if (typeof event.data !== 'string' || event.data.indexOf(prefix) < 0) return;
  const handle = parseInt(event.data.slice(prefix.length), 10);
  if (handlers[handle]) {
    handlers[handle]();
    delete handlers[handle];
  }
};

export default function setImmediate(callback: Function): any {
  if ('setImmediate' in window) {
    // use native one
    return (window as any).setImmediate(callback);
  }

  // use polyfill using postMessage
  if (!handlerInstalled) {
    (window as any).addEventListener('message', receiveMessage);
    handlerInstalled = true;
  }

  handlers[handlerIndex] = callback;
  (window as any).postMessage(prefix + handlerIndex, '*');
  return handlerIndex++;
}
