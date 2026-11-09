import type { FunctionService } from '@utrad-ical/circus-lib';
import type Command from './Command.ts';
import type * as circus from '../interface.ts';

const printConfig: FunctionService<
  Command,
  { configuration: circus.Configuration }
> = async (options, { configuration }) => {
  return async () => {
    console.log(configuration);
  };
};

printConfig.dependencies = ['configuration'];

export default printConfig;
