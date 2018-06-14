import * as ajv from 'ajv';
import registerJob from '../functions/register-job';

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
    console.error('Argument is something wrong.');
    process.exit(1);
  }

  try {
    const { jobId, pluginId, seriesUid, environment, priority } = argv;
    const createNextJobId = () => new Date().getTime().toString();
    await registerJob(
      jobId || createNextJobId(),
      {
        pluginId,
        series: [{ seriesUid }],
        environment
      },
      priority || 0
    );
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
