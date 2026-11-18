import type { HttpBindings } from '@hono/node-server';
import type { Logger } from '@utrad-ical/circus-lib';
import type { VolumeAccessor } from './helper/createVolumeProvider.ts';
import type PartialVolumeDescriptor from '../volume/PartialVolumeDescriptor.ts';

export interface RsEnv {
  Bindings: HttpBindings;
  Variables: {
    requestLogger?: Logger;
    volumeAccessor: VolumeAccessor;
    partialVolumeDescriptor?: PartialVolumeDescriptor;
    rsQuery: Record<string, any>;
  };
}
