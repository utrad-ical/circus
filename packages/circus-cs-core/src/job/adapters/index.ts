import gcp from './gcp';
import { RemoteAdapter } from '../../util/remote-job';

const adapters: Record<string, RemoteAdapter> = { gcp };

export default adapters;
