import { NoDepFunctionService } from '@utrad-ical/circus-lib';
import * as ws from 'ws';

const createWSServer: NoDepFunctionService<
  ws.Server,
  {
    perMessageDeflate?: ws.ServerOptions['perMessageDeflate'];
  } | undefined
> = async ({ perMessageDeflate } = {}) => {
  const options: ws.ServerOptions = {
    noServer: true,
    skipUTF8Validation: true,
    perMessageDeflate,
    // perMessageDeflate: {
    //   zlibDeflateOptions: {
    //     // See zlib defaults.
    //     chunkSize: 1024,
    //     memLevel: 7,
    //     level: 3
    //   },
    //   zlibInflateOptions: {
    //     chunkSize: 10 * 1024
    //   },
    //   // Other options settable:
    //   clientNoContextTakeover: true, // Defaults to negotiated value.
    //   serverNoContextTakeover: true, // Defaults to negotiated value.
    //   serverMaxWindowBits: 10, // Defaults to negotiated value.
    //   // Below options specified as default values.
    //   concurrencyLimit: 10, // Limits zlib concurrency for perf.
    //   threshold: 1024 // Size (in bytes) below which messages
    //   // should not be compressed if context takeover is disabled.
    // }
  };
  return new ws.Server(options);
}

export default createWSServer;
