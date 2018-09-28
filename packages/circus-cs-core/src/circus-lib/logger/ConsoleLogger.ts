const logTo = (fn: string, level: string) => {
  return (message: string) =>
    (console as any)[fn](
      new Date().toISOString() + ' [' + level + ']' + message
    );
};

function ConsoleLogger() {}
ConsoleLogger.prototype = {
  trace: logTo('info', 'trace'),
  debug: logTo('info', 'debug'),
  info: logTo('info', 'info'),
  warn: logTo('log', 'warn'),
  error: logTo('error', 'error'),
  fatal: logTo('error', 'fatal')
};

export default ConsoleLogger;
