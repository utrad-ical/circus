import Koa from 'koa';
import Router from 'koa-router';
import { RawData } from '../browser';
import fs from 'fs';
import path from 'path';
import { PassThrough } from 'stream';
import { EventEmitter } from 'events';

interface VolumePreviewer {
  show: (data: RawData) => Promise<void>;
}

interface Options {
  port: number;
}

const createVolumePreviewer = async (
  options: Options
): Promise<VolumePreviewer> => {
  const { port = 9000 } = options;

  const koa = new Koa();
  const emitter = new EventEmitter();
  let rawData: RawData | undefined = undefined;
  const router = new Router();

  const serve = (file: string) => async (ctx: Koa.BaseContext) => {
    ctx.body = fs.createReadStream(path.join(__dirname, file));
  };
  router.get('/', serve('index.html'));
  router.get('/index.js', serve('index.js'));
  router.get('/circus-rs-client.js', serve('../dist/circus-rs-client.js'));

  router.get('/volume', ctx => {
    if (!rawData) return; // results in 404
    // the following won't create the view of the underlying memory
    ctx.body = Buffer.from(rawData.data);
  });

  router.get('/metadata', ctx => {
    if (!rawData) return; // results in 404
    ctx.body = {
      pixelFormat: rawData.getPixelFormat(),
      dimention: rawData.getDimension()
    };
  });

  router.get('/events', ctx => {
    const stream = new PassThrough();
    ctx.type = 'text/event-stream';
    const handler = () => {
      stream.write('event: updated\ndata: {}\n\n');
    };
    const timer = setInterval(() => {
      stream.write('event: ping\n\n');
    }, 30000);
    emitter.on('update', handler);
    stream.on('close', () => {
      clearInterval(timer);
      emitter.off('update', handler);
    });
    ctx.body = stream;
  });
  koa.use(router.routes());

  const show: VolumePreviewer['show'] = async data => {
    rawData = data;
    emitter.emit('update');
  };

  return new Promise(resolve => {
    koa.listen(port, () => {
      resolve({ show });
    });
  });
};

export default createVolumePreviewer;
