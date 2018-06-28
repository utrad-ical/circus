export interface PluginJobReporter {
  report: (jobId: string, status: string) => Promise<void>;
}

export default function pluginJobReporter(): PluginJobReporter {
  return {
    report: async (jobId: string, status: string) => {
      console.log('Job Status', jobId, status);
    }
  };
}
