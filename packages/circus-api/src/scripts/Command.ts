import { FunctionService } from '@utrad-ical/circus-lib';

type Command<D> = FunctionService<CommandFunc, D>;
export default Command;

export type CommandFunc = (options: any) => Promise<void>;
