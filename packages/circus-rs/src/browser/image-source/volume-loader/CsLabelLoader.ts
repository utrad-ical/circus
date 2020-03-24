import RsHttpClient from '../../http-client/RsHttpClient';
import { LabelData, LabelLoader } from './interface';

interface CsLabelCandidate {
  rank: number;
  centerOfMass?: [number, number, number];
  boundingBox: {
    origin: [number, number, number];
    size: [number, number, number];
  };
  confidence?: number;
  rawName: string;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
  };
  num_voxels?: number;
}

export default class CsLabelLoader implements LabelLoader {
  private rsHttpClient: RsHttpClient;
  private basePath: string;
  private initialized: Promise<void> | undefined;
  private candidates: CsLabelCandidate[] = [];

  constructor({
    rsHttpClient,
    basePath,
    indexName = 'candidates.json'
  }: {
    rsHttpClient: RsHttpClient;
    basePath: string;
    indexName?: string;
  }) {
    this.rsHttpClient = rsHttpClient;
    this.basePath = basePath;

    this.initialized = this.initialize(indexName);
  }

  private async initialize(indexName: string) {
    this.candidates = await this.rsHttpClient.request(
      `${this.basePath}/${indexName}`,
      {}
    );
  }

  public async load(index: number) {
    await this.initialized;

    if (!(index in this.candidates)) return null;

    const rawName: string = this.candidates[index].rawName;
    const data: ArrayBuffer = await this.rsHttpClient.request(
      `${this.basePath}/${rawName}`,
      {},
      'arraybuffer'
    );

    const meta = this.candidates[index];

    return new CsLabelData(
      meta.boundingBox.origin,
      meta.boundingBox.size,
      data
    );
  }
}

class CsLabelData implements LabelData {
  public offset: [number, number, number];
  public size: [number, number, number];
  protected view!: { [offset: number]: number };

  constructor(
    offset: [number, number, number],
    size: [number, number, number],
    data: ArrayBuffer
  ) {
    this.view = new Uint8Array(data);
    this.offset = offset;
    this.size = size;

    // console.log('CsLabelData created');
    // console.log(this.dumpSlicesAsString());
  }

  public getValueAt(x: number, y: number, z: number): boolean {
    x -= this.offset[0];
    y -= this.offset[1];
    z -= this.offset[2];
    if (
      x < 0.0 ||
      y < 0.0 ||
      z < 0.0 ||
      x >= this.size[0] ||
      y >= this.size[1] ||
      z >= this.size[2]
    ) {
      return false;
    }

    return this.view[x + (y + z * this.size[1]) * this.size[0]] > 0;
  }

  /**
   * For debugging
   * @todo remove this method.
   */
  private dumpSlicesAsString() {
    const [width, height, depth] = this.size;
    const [ox, oy, oz] = this.offset;
    let map: string = '';
    let i = 0;
    for (let z = 0; z < depth; z++) {
      map += '(' + z.toString() + ')\n';
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          map += this.view[i++] ? 'X' : '-';
          map += this.getValueAt(ox + x, oy + y, oz + z) ? 'x' : '_';
        }
        map += '\n';
      }
    }
    return map;
  }
}
