/**
 * Exports the promisified versions of pm2 functions.
 * @module
 */
import * as pm2 from 'pm2';

export interface ProcessDescription extends pm2.ProcessDescription {}
export interface StartOptions extends pm2.StartOptions {}
export interface Proc extends pm2.Proc {}
export type ErrCallback = (err: Error) => void;
export type ErrProcCallback = (err: Error, proc: Proc) => void;
export type ErrProcDescsCallback = (
  err: Error,
  processDescriptionList: ProcessDescription[]
) => void;
// type ErrProcDescCallback = (err: Error, processDescription: ProcessDescription) => void;

export function connect(): Promise<void> {
  return new Promise((resolve, reject) => {
    pm2.connect(errCallBack(resolve, reject));
  });
}

export function disconnect(): Promise<void> {
  return new Promise((resolve, reject) => {
    // pm2.disconnect has invalid type in d.ts
    (pm2.disconnect as any)(errCallBack(resolve, reject));
  });
}

// pm2.start (script, options, errback: ErrCallback)
// >>> Raise error if already started.
export function start(script: string, options: StartOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    // pm2.disconnect has invalid type in d.ts
    pm2.start(script, options, errCallBack(resolve, reject));
  });
}

export function describe(
  process: string | number
): Promise<ProcessDescription[]> {
  return new Promise((resolve, reject) => {
    pm2.describe(process, errProcDescsCallback(resolve, reject));
  });
}

export function list(): Promise<ProcessDescription[]> {
  return new Promise((resolve, reject) => {
    pm2.list(errProcDescsCallback(resolve, reject));
  });
}

// have to use this construct because `delete` is a reserved word
function del(process: string | number): Promise<void> {
  return new Promise((resolve, reject) => {
    pm2.delete(process, errProcCallback(resolve, reject));
  });
}
export { del as delete };

function errCallBack(resolve: Function, reject: Function): ErrCallback {
  const callback: ErrCallback = (err: Error) => {
    if (err) reject(err);
    else resolve();
  };
  return callback;
}

function errProcDescsCallback(
  resolve: Function,
  reject: Function
): ErrProcDescsCallback {
  const callback: ErrProcDescsCallback = (
    err: Error,
    processDescriptionList: ProcessDescription[]
  ) => {
    if (err) reject(err);
    else resolve(processDescriptionList);
  };
  return callback;
}

function errProcCallback(resolve: Function, reject: Function): ErrProcCallback {
  const callback: ErrProcCallback = (err: Error, proc: Proc) => {
    if (err) reject(err);
    else resolve(proc);
  };
  return callback;
}
