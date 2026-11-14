import type { FunctionService } from '@utrad-ical/circus-lib';
import type Command from './Command.ts';
import type * as circus from '../interface.ts';

// wait (default), processing, error, done, all
const flags = ['w', 'p', 'e', 'd', 'a'];

const listQueue: FunctionService<
  Command,
  { queue: circus.PluginJobRequestQueue }
> = async (options, deps) => {
  const { queue } = deps;
  return async function listQueue(commandName, argv: any) {
    const argCheck = flags.every(
      f => argv[f] === undefined || typeof argv[f] === 'boolean'
    );

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
