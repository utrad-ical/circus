import { Command } from 'commander';
import { setSharedHelp, setSharedOptions } from './post.args.js';

export default (program: Command) => {
  const p = program.command('put').description('Put data to CIRCUS API');
  setSharedOptions(p);
  setSharedHelp(p, 'put');
  return p;
};
