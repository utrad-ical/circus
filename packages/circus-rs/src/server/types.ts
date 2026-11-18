import type { HttpBindings } from '@hono/node-server';
import type { VolumeAccessor } from './helper/createVolumeProvider.ts';
import type PartialVolumeDescriptor from '../volume/PartialVolumeDescriptor.ts';

export interface RsEnv {
  Bindings: HttpBindings;
  Variables: {
    volumeAccessor: VolumeAccessor;
    partialVolumeDescriptor?: PartialVolumeDescriptor;
    rsQuery: Record<string, any>;
  };
}
