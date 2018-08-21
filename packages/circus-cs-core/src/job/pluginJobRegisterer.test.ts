import pluginJobRegisterer from './pluginJobRegisterer';
import { PluginJobRequest, PluginDefinition } from '../interface';
import { QueueSystem } from '../queue/queue';
import { DicomFileRepository } from '@utrad-ical/circus-dicom-repository';

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

    const pluginDefinitions: PluginDefinition[] = [
      {
        pluginId: 'my-plugin',
        version: '1.0.0',
        type: 'CAD',
        dockerImage: 'my-plugin'
      }
    ];

    deps = {
      queue,
      pluginDefinitions,
      repository
    };
  });

  test('Register', async () => {
    const registerer = pluginJobRegisterer(deps);
    await registerer.register('aaa', defaultPayload, undefined);
    expect(deps.repository.getSeries).toHaveBeenCalled();
    expect(deps.queue.enqueue).toHaveBeenCalled();
  });

  test('Invalid Job ID throws', async () => {
    // Note that we do not check a duplicate of job IDs
    // because it's not possible to block that here in the first place
    const registerer = pluginJobRegisterer(deps);
    await expect(registerer.register('../', defaultPayload, 0)).rejects.toThrow(
      'Invalid Job ID'
    );
  });

  test('Invalid plug-in ID throws', async () => {
    const wrongPayload: PluginJobRequest = {
      ...defaultPayload,
      pluginId: 'imaginary'
    };
    const registerer = pluginJobRegisterer(deps);
    await expect(registerer.register('abc', wrongPayload, 0)).rejects.toThrow(
      'No such plug-in installed.'
    );
  });

  test('Specifying no series throws', async () => {
    const wrongPayload: PluginJobRequest = { ...defaultPayload, series: [] };
    const registerer = pluginJobRegisterer(deps);
    await expect(registerer.register('abc', wrongPayload, 0)).rejects.toThrow(
      'No series specified'
    );
  });

  test('Nonexistent series throws', async () => {
    const wrongPayload: PluginJobRequest = {
      ...defaultPayload,
      series: [{ seriesUid: '9.9.9' }]
    };
    const registerer = pluginJobRegisterer(deps);
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
      const registerer = pluginJobRegisterer(deps);
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
