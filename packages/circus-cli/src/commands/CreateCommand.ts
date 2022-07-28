import { Command } from 'commander';

interface CommandDeps {
  getFetch: () => typeof fetch;
  rcFilePath: string;
}

type CreateCommand = (deps: CommandDeps) => {
  configureCommand: (command: Command) => Command;
  run: (...args: any[]) => Promise<void>;
};

export default CreateCommand;
