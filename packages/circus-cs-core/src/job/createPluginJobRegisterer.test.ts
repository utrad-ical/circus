import createPluginJobRegisterer from './createPluginJobRegisterer';
import { PluginJobRequest, PluginDefinition } from '../interface';
import { QueueSystem } from '../queue/queue';
import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import { PluginDefinitionAccessor } from '../CsCore';

describe('registerJob', () => {
  const defaultPayload: PluginJobRequest = {
    pluginId: 'my-plugin',
    series: [{ seriesUid: '1.2.3' }]
  };

  let deps: any;

  beforeEach(() => {
    const queue = <QueueSystem<PluginJobRequest>>(<any>{ enqueue: jest.fn() });

    const repository = <DicomFileRepository>(<any>{
      getSeries: jest.fn(seriesUid =>
        Promise.resolve({ images: seriesUid === '1.2.3' ? '1-50' : '' })
      )
    });

    const pluginDefinitionAccessor: PluginDefinitionAccessor = {
      get: async pluginId => {
        if (pluginId === 'my-plugin') {
          return {
            pluginId: 'my-plugin',
            pluginName: 'my-plugin',
            version: '1.0.0',
            type: 'CAD',
            dockerImage: 'my-plugin'
          } as PluginDefinition;
        } else {
          throw new Error('No such plug-in installed.');
        }
      },
      list: async () => {
        throw Error();
      }
    };

    deps = {
      queue,
      pluginDefinitionAccessor,
      repository
    };
  });

  test('Register', async () => {
    const registerer = createPluginJobRegisterer(deps);
    await registerer.register('aaa', defaultPayload, undefined);
    expect(deps.repository.getSeries).toHaveBeenCalled();
    expect(deps.queue.enqueue).toHaveBeenCalled();
  });

  test('Invalid Job ID throws', async () => {
    // Note that we do not check a duplicate of job IDs
    // because it's not possible to block that here in the first place
    const registerer = createPluginJobRegisterer(deps);
    await expect(registerer.register('../', defaultPayload, 0)).rejects.toThrow(
      'Invalid Job ID'
    );
  });

  test('Invalid plug-in ID throws', async () => {
    const wrongPayload: PluginJobRequest = {
      ...defaultPayload,
      pluginId: 'imaginary'
    };
    const registerer = createPluginJobRegisterer(deps);
    await expect(registerer.register('abc', wrongPayload, 0)).rejects.toThrow(
      'No such plug-in installed.'
    );
  });

  test('Specifying no series throws', async () => {
    const wrongPayload: PluginJobRequest = { ...defaultPayload, series: [] };
    const registerer = createPluginJobRegisterer(deps);
    await expect(registerer.register('abc', wrongPayload, 0)).rejects.toThrow(
      'No series specified'
    );
  });

  test('Nonexistent series throws', async () => {
    const wrongPayload: PluginJobRequest = {
      ...defaultPayload,
      series: [{ seriesUid: '9.9.9' }]
    };
    const registerer = createPluginJobRegisterer(deps);
    await expect(registerer.register('abc', wrongPayload, 0)).rejects.toThrow(
      'Series 9.9.9 not found'
    );
  });

  test('Insufficient series throws', async () => {
    const check = async (
      data: object,
      expectedMessage: string = 'does not contain enough images'
    ) => {
      const wrongPayload = {
        ...defaultPayload,
        series: [{ seriesUid: '1.2.3', ...data }]
      };
      const registerer = createPluginJobRegisterer(deps);
      await expect(registerer.register('abc', wrongPayload, 0)).rejects.toThrow(
        expectedMessage
      );
    };
    await check({ startImgNum: 999 });
    await check({ startImgNum: 1, endImgNum: 100 });
    await check({ startImgNum: 100, endImgNum: 1 });
    await check({ startImgNum: '100' }, 'Invalid startImgNum');
  });
});
