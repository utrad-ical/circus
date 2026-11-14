import type { AuthorizedFetch } from '../utils/createAuthorizedFetch.ts';

interface CommandDeps {
  getFetch: () => AuthorizedFetch;
  rcFilePath: string;
}

export type CommandAction = (
  deps: CommandDeps
) => (...args: any[]) => Promise<void>;
