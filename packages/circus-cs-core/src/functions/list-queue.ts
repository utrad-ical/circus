import { PluginJobRequest as Payload } from "../interface";
import * as QueueSystem from "../queue";

// Todo: check if plugin exists?
// Todo: check if series exists?

export default async function listQueue(
  state: QueueSystem.QueueState | "all" = "wait"
): Promise<QueueSystem.Item<Payload>[]> {
  return await QueueSystem.list(state);
}
