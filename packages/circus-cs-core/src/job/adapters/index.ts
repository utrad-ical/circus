import defaultHttpAdapter from './defaultHttpAdapter.ts';
import type { RemoteAdapter } from '../../util/remote-job.ts';

const adapters: Record<string, RemoteAdapter> = { defaultHttpAdapter };

export default adapters;
