import ajv from 'ajv';
import { FunctionService } from '@utrad-ical/circus-lib';
import Command from './Command';
import * as circus from '../interface';

const argumentsSchema = {
  type: 'object',
  properties: {
    w: { type: 'boolean' }, // wait (default)
    p: { type: 'boolean' }, // processing
    e: { type: 'boolean' }, // error
    d: { type: 'boolean' }, // done
    a: { type: 'boolean' } // all
  }
};

const listQueue: FunctionService<
  Command,
  { queue: circus.PluginJobRequestQueue }
> = async (options, deps) => {
  const { queue } = deps;
  return async function listQueue(commandName, argv: any) {
    const argCheck = new ajv().compile(argumentsSchema)(argv);

    if (!argCheck) {
      console.error('Invalid arguments.');
      process.exit(1);
    }

    let state: circus.QueueState | 'all';
    switch (true) {
      case argv.a:
        state = 'all';
        break;
      case argv.p:
        state = 'processing';
        break;
      case argv.w:
      default:
        state = 'wait';
        break;
    }

    const items = await queue.list(state);
    console.log(items);
  };
};

listQueue.dependencies = ['queue'];

export default listQueue;
