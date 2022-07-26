import { Command } from 'commander';

type CreateCommand = (authorizedFetch: typeof fetch) => {
  configureCommand: (command: Command) => Command;
  run: (...args: any[]) => Promise<void>;
};

export default CreateCommand;
