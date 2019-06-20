/**
 * PluginJobReporter takes responsibility of reporting the status
 * of the current job to some external source.
 */
export default interface PluginJobReporter {
  report: (jobId: string, type: string, payload?: any) => Promise<void>;
}
