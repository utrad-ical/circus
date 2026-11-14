import { Command } from 'commander';
import { setSharedHelp, setSharedOptions } from './post.args.js';

export default (program: Command) => {
  const p = program.command('patch').description('Patch data to CIRCUS API');
  setSharedOptions(p);
  setSharedHelp(p, 'patch');
  return p;
};
