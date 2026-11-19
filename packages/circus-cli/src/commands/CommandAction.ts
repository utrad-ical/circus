import type { AuthorizedFetch } from '../utils/createAuthorizedFetch.ts';

type Inquirer = typeof import('@inquirer/prompts');
export type Prompts = Pick<
  Inquirer,
  'input' | 'password' | 'select' | 'confirm'
>;

export interface CommandDeps {
  prompts: Prompts;
  isInputTTY: boolean;
  getFetch: () => AuthorizedFetch;
  rcFilePath: string;
}

export type CommandAction = (
  deps: CommandDeps
) => (...args: any[]) => Promise<void>;
