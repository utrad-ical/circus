import { FunctionService } from '@utrad-ical/circus-lib';
import Command from './Command';
import * as circus from '../interface';

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
