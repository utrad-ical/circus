import * as ajv from 'ajv';
import { bootstrapQueueSystem } from '../bootstrap';

const argumentsSchema = {
  type: 'object',
  properties: {
    jobId: {
      type: 'string'
    },
    pluginId: {
      type: 'string'
    },
    seriesUid: {
      type: 'string'
    },
    environment: {
      type: 'string'
    },
    priority: {
      type: 'number'
    }
  },
  required: ['pluginId', 'seriesUid']
};

export default async function register(argv: any) {
  const argCheck = new ajv().compile(argumentsSchema)(argv);

  if (!argCheck) {
    console.error('Invalid arguments.');
    process.exit(1);
  }

  const { queue, dispose } = await bootstrapQueueSystem();
  try {
    const newJobId = () => new Date().getTime().toString();
    const { jobId, pluginId, seriesUid, environment, priority } = argv;
    const payload = {
      pluginId,
      series: [{ seriesUid }],
      environment
    };
    await queue.enqueue(jobId || newJobId(), payload, priority);
  } finally {
    await dispose();
  }
}
