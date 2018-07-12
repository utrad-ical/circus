import { bootstrapQueueSystem, bootstrapJobRunner } from '../bootstrap';

export default async function register(argv: any) {
  const { queue, dispose } = await bootstrapQueueSystem();
  const repository = await bootstrapJobRunner();
  try {
    const newJobId = () => new Date().getTime().toString();
    const { jobId, pluginId, series, environment, priority } = argv;
    const payload = {
      pluginId,
      series: [{ seriesUid: series }],
      environment
    };
    await queue.enqueue(jobId || newJobId(), payload, priority);
  } finally {
    await dispose();
  }
}
