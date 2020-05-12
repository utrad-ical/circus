import RsHttpClient from '../../http-client/RsHttpClient';
import DicomVolumeLoader from './DicomVolumeLoader';
import DicomVolume from '../../../common/DicomVolume';
import { PixelFormat } from '../../../common/PixelFormat';
import { DicomVolumeMetadata } from './DicomVolumeLoader';
import VolumeCache, { nullVolumeCache } from './cache/VolumeCache';

export default class VesselSampleLoader implements DicomVolumeLoader {
  // [Note]
  // const sampleHost: string = window.location.protocol+'//'
  // + window.location.server+''
  // + ( window.location.port && window.location.port != 80 ? ':'+window.location.port );
  // const samplePath: string = 'vessel_mask.raw';

  // const loader = new VesselSampleLoader({
  // 'host': sampleHost,
  // 'path': samplePath
  // })

  // ObjectType = Image
  // NDims = 3
  // DimSize = 512 512 132
  // ElementType = MET_UCHAR
  // ElementSpacing = 0.468800 0.468800 0.600000
  // ElementByteOrderMSB = False
  // ElementDataFile = vessel_mask.raw

  private client: RsHttpClient;
  private path: string;
  private meta: DicomVolumeMetadata = {
    voxelSize: [0.4688, 0.4688, 0.6],
    voxelCount: [512, 512, 132],
    pixelFormat: 'uint16',
    dicomWindow: { level: 200, width: 600 },
    estimatedWindow: { level: 200, width: 600 }
  };

  private cache: VolumeCache;

  private coef: number;

  constructor({ host, path, coef, cache }: any) {
    this.client = new RsHttpClient(host);
    this.path = path;
    this.coef = coef || 1;
    this.cache = cache || nullVolumeCache;
  }

  public loadMeta(): Promise<DicomVolumeMetadata> {
    return Promise.resolve(this.meta);
  }

  public async loadVolume(): Promise<DicomVolume> {
    const buffer =
      (await this.cache.getVolume(this.path + '.static')) ||
      (await this.client.request(this.path, {}, 'arraybuffer'));
    if (!buffer) throw new Error();

    const meta = this.meta;
    const volume = new DicomVolume(meta.voxelCount, 'uint16');
    volume.setVoxelSize(meta.voxelSize);
    if (meta.dicomWindow) volume.dicomWindow = meta.dicomWindow;
    if (meta.estimatedWindow) volume.estimatedWindow = meta.estimatedWindow;

    const bufferSize =
      meta.voxelCount[0] * meta.voxelCount[1] * meta.voxelCount[2];
    const srcUint8BufferArray = new Uint8Array(buffer);
    const destUint16BufferArray = new Uint16Array(bufferSize);

    for (let offset = 0; offset < bufferSize; offset++) {
      destUint16BufferArray[offset] = srcUint8BufferArray[offset] * this.coef;
    }
    volume.assign((destUint16BufferArray as any).buffer);
    this.cache.putVolume(this.path + '.static', buffer);
    return volume;
  }
}
