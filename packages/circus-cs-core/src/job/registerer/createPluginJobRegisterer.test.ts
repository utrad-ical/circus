import createPluginJobRegisterer from './createPluginJobRegisterer';
import {
  DicomFileRepository,
  PartialVolumeDescriptor
} from '@utrad-ical/circus-lib';
import * as circus from '../../interface';

describe('createPluginJobRegisterer', () => {
  const defaultPayload: circus.PluginJobRequest = {
    pluginId: 'my-plugin-id',
    series: [
      {
        seriesUid: '1.2.3',
        partialVolumeDescriptor: { start: 1, end: 5, delta: 1 }
      }
    ]
  };

  let deps: any;

  beforeEach(() => {
    const queue = {
      enqueue: jest.fn()
    } as unknown as circus.PluginJobRequestQueue;

    const dicomFileRepository = {
      getSeries: jest.fn(seriesUid =>
        Promise.resolve({ images: seriesUid === '1.2.3' ? '1-50' : '' })
      )
    } as unknown as DicomFileRepository;

    const pluginDefinitionAccessor = {
      get: async pluginId => {
        if (pluginId === 'my-plugin-id') {
          return {
            pluginId: 'my-plugin-id',
            pluginName: 'my-plugin',
            version: '1.0.0',
            type: 'CAD'
          } as circus.PluginDefinition;
        } else {
          throw new Error('No such plug-in installed.');
        }
      },
      list: async () => {
        throw Error();
      }
    } as circus.PluginDefinitionAccessor;

    deps = {
      queue,
      pluginDefinitionAccessor,
      dicomFileRepository
    };
  });

  test('Register', async () => {
    const registerer = await createPluginJobRegisterer(undefined, deps);
    await registerer.register('aaa', defaultPayload, undefined);
    expect(deps.dicomFileRepository.getSeries).toHaveBeenCalledWith('1.2.3');
    expect(deps.queue.enqueue).toHaveBeenCalled();
  });

  test('Invalid Job ID throws', async () => {
    // Note that we do not check a duplicate of job IDs
    // because it's not possible to block that here in the first place
    const registerer = await createPluginJobRegisterer(undefined, deps);
    await expect(registerer.register('../', defaultPayload, 0)).rejects.toThrow(
      'Invalid Job ID'
    );
  });

  test('Invalid plug-in ID throws', async () => {
    const wrongPayload: circus.PluginJobRequest = {
      ...defaultPayload,
      pluginId: 'imaginary'
    };
    const registerer = await createPluginJobRegisterer(undefined, deps);
    await expect(registerer.register('abc', wrongPayload, 0)).rejects.toThrow(
      'No such plug-in installed.'
    );
  });

  test('Specifying no series throws', async () => {
    const wrongPayload: circus.PluginJobRequest = {
      ...defaultPayload,
      series: []
    };
    const registerer = await createPluginJobRegisterer(undefined, deps);
    await expect(registerer.register('abc', wrongPayload, 0)).rejects.toThrow(
      'No series specified'
    );
  });

  test('Nonexistent series throws', async () => {
    const wrongPayload: circus.PluginJobRequest = {
      ...defaultPayload,
      series: [
        {
          seriesUid: '9.9.9',
          partialVolumeDescriptor: { start: 1, end: 1, delta: 1 }
        }
      ]
    };
    const registerer = await createPluginJobRegisterer(undefined, deps);
    await expect(registerer.register('abc', wrongPayload, 0)).rejects.toThrow(
      'Series 9.9.9 not found'
    );
  });

  test('Series with wrong PVD throws', async () => {
    const check = async (
      partialVolumeDescriptor: PartialVolumeDescriptor,
      expectedMessage: string = 'does not contain enough images'
    ) => {
      const wrongPayload = {
        ...defaultPayload,
        series: [{ seriesUid: '1.2.3', partialVolumeDescriptor }]
      };
      const registerer = await createPluginJobRegisterer(undefined, deps);
      await expect(registerer.register('abc', wrongPayload, 0)).rejects.toThrow(
        expectedMessage
      );
    };
    await check({ start: 1, end: 999, delta: 1 });
    await check({ start: 100, end: 1, delta: -1 });
    await check(
      { start: 1, end: 10, delta: 100 },
      'invalid partial volume descriptor'
    );
  });
});
