import { Command } from 'commander';

interface CommandDeps {
  getFetch: () => typeof fetch;
  rcFilePath: string;
}

type CreateCommand = (deps: CommandDeps) => (...args: any[]) => Promise<void>;

export default CreateCommand;
