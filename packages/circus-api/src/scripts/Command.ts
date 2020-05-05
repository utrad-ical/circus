import { FunctionService } from '@utrad-ical/circus-lib';

export type CommandFunc = (options: any) => Promise<void>;
type Command<D> = FunctionService<CommandFunc, D>;

// eslint-disable-next-line
export default Command;
