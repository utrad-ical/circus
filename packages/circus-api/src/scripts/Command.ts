import { FunctionService } from '@utrad-ical/circus-lib';

export type CommandFunc = (options: any) => Promise<void>;
type Command<D> = FunctionService<CommandFunc, D>;

export default Command;
