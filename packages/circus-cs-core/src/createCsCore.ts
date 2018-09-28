import configureLoader from './configureLoader';
import { makeCsCore } from './makeCsCore';
import { CsCore } from './CsCore';

export default async function createCsCore(): Promise<CsCore> {
  const { default: config } = await import('./config');
  const deps = configureLoader(config);
  return makeCsCore(deps);
}
