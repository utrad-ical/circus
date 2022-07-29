interface CommandDeps {
  getFetch: () => typeof fetch;
  rcFilePath: string;
}

type CommandAction = (deps: CommandDeps) => (...args: any[]) => Promise<void>;

export default CommandAction;
