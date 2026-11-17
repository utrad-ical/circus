import { createQueueHandler } from '../../plugin-job-queue/index.ts';

export const handleGet = createQueueHandler(false);
