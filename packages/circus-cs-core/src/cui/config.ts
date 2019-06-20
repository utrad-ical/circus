import { FunctionService } from '@utrad-ical/circus-lib';
import Command from './Command';
import config from '../config';

const printConfig: FunctionService<Command> = async () => {
  return async () => {
    console.log(config);
  };
};

export default printConfig;
