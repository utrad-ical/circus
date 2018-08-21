// import { createDaemonController } from '@utrad-ical/circus-cs-core';
import * as jobManagerController from './api/mockJobManager';

export default function circusCsDeps() {
  return {
    jobManagerController
  };
}
