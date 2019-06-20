import { DaemonController } from '../daemon/createDaemonController';
import { FunctionService } from '@utrad-ical/circus-lib';
import Command from './Command';

const daemon: FunctionService<
  Command,
  { daemonController: DaemonController }
> = async (options, deps) => {
  const { daemonController: dc } = deps;
  const printStatus = async () => {
    const status = await dc.status();
    console.log(status);
  };
  return async (commandName, args) => {
    switch (commandName) {
      case 'start':
        await dc.start();
        await printStatus();
        break;
      case 'stop':
        await dc.stop();
        await printStatus();
        break;
      case 'status':
        await printStatus();
        break;
      case 'pm2list':
        console.log(await dc.pm2list());
        break;
      case 'pm2killall':
        await dc.pm2killall();
        console.log('OK');
        break;
    }
  };
};

daemon.dependencies = ['daemonController'];

export default daemon;
