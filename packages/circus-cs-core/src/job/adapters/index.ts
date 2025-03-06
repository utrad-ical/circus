import defaultHttpAdapter from './defaultHttpAdapter';
import { RemoteAdapter } from '../../util/remote-job';

const adapters: Record<string, RemoteAdapter> = { defaultHttpAdapter };

export default adapters;
