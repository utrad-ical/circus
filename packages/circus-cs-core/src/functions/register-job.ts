import { PluginJobRequest as Payload } from "../interface";
import * as QueueSystem from "../queue";

// Todo: check if plugin exists?
// Todo: check if series exists?

export default async function registerJob(
  jobId: string,
  payload: Payload,
  priority: number = 0
): Promise<void> {
  const queueItem: QueueSystem.Item<Payload> = await QueueSystem.createItem(
    jobId,
    payload,
    priority
  );

  const queueId: string = await QueueSystem.enqueue(queueItem);
}
