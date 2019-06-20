import { PluginJobRequest } from '../../interface';

export default interface PluginJobRegisterer {
  register(
    jobId: string,
    payload: PluginJobRequest,
    priority?: number
  ): Promise<void>;
}
