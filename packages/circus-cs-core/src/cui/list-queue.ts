import ajv from 'ajv';
import Queue, { QueueState } from '../job/queue/Queue';
import { FunctionService } from '@utrad-ical/circus-lib';
import Command from './Command';

const argumentsSchema = {
  type: 'object',
  properties: {
    w: {
      // wait (default)
      type: 'boolean'
    },
    p: {
      // processing
      type: 'boolean'
    },
    e: {
      // error
      type: 'boolean'
    },
    d: {
      // done
      type: 'boolean'
    },
    a: {
      // all
      type: 'boolean'
    }
  }
};

const listQueue: FunctionService<Command, { queue: Queue<any> }> = async (
  options,
  deps
) => {
  const { queue } = deps;
  return async function listQueue(commandName, argv: any) {
    const argCheck = new ajv().compile(argumentsSchema)(argv);

    if (!argCheck) {
      console.error('Invalid arguments.');
      process.exit(1);
    }

    let state: QueueState | 'all';
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
