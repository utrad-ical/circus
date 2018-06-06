import {MongoClient} from 'mongodb';
import {PluginJobRequest} from './interface';
import * as QueueSystem from './queue';

export default async function registerJob(jobId: string, payload: PluginJobRequest, priority: number = 0): Promise<void>
{
	// Todo: check if plugin exists?
	
	// Todo: check if series exists?
	
	const queueItem: QueueSystem.Item<PluginJobRequest> = await QueueSystem.createItem(jobId, payload, priority);
	
	const queueId: string = await QueueSystem.enqueue(queueItem);
}
