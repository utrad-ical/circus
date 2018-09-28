import config from './config';
import configureLoader from './configureLoader';
import { makeCsCore } from './makeCsCore';

/**
 * Interfaces
 */
export { Configuration } from './config/Configuration';

const deps = configureLoader(config);
export default makeCsCore(deps);
