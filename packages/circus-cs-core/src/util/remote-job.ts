export interface RemoteCadDefinition {
  endpoint: string;
  authentication: string;
  maxConcurrency: number;
  env: Record<string, string>;
}

export type JobStatus = 'finished' | 'failed';

export interface FinishedJobResult {
  status: 'finished';
  resultStream: ReadableStream;
}

export interface ErrorJobResult {
  status: 'failed';
  errorMessage: string;
}

export type JobResult = FinishedJobResult | ErrorJobResult;

export type JobResponse = {
  /**
   * Stream used to return the plugin's standard output in real time.
   * This stream must be closed before `result` is fulfilled.
   */
  logStream: ReadableStream;
  /**
   * A promise that is fulfilled after the plugin's processing is finished,
   */
  result: Promise<JobResult>;
};

/**
 * "Adapter" determines a protocol to communicate from CIRCUS CS
 * to some remote job execution service.
 * @param cadDefinition - Definition of the remote CAD service.
 * @param inputDir - Directory containing preprocessed image files.
 */
export type RemoteAdapter = (
  cadDefinition: RemoteCadDefinition,
  inputDir: string
) => Promise<JobResponse>;
