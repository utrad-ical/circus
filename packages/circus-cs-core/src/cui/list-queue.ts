import ajv from 'ajv';
import { QueueState } from '../queue/queue';
import { Configuration } from '../config';
import { createModuleLoader } from '../createCsCore';

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

export default async function listQueue(config: Configuration, argv: any) {
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

  const moduleLoader = createModuleLoader(config);
  const [queue, dispose] = [
    await moduleLoader.load('queueSystem'),
    await moduleLoader.load('dispose')
  ];

  try {
    const items = await queue.list(state);
    console.log(items);
  } finally {
    await dispose();
  }
}
