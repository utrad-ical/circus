export default interface Command {
  (commandName: string, argv: any): Promise<void>;
}
