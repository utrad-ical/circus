import DicomFileRepository, { SeriesAccessor } from './DicomFileRepository';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as crypto from 'crypto';
import MultiRange, { multirange } from 'multi-integer-range';

interface Options {
  dataDir: string;
  useHash?: boolean;
}

const sha256 = (str: string) => {
  const hash = crypto.createHash('sha256');
  hash.update(str);
  return hash.digest('hex');
};

const pad8 = (num: number) => ('00000000' + num).slice(-8);

export default class StaticDicomFileRepository implements DicomFileRepository {
  constructor(private options: Options) {}

  /**
   * Read the file list of the directory and count the DICOM files.
   */
  protected async scanDicomImages(dirPath: string): Promise<MultiRange> {
    const result = multirange();
    try {
      const files = await fs.readdir(dirPath);
      for (let file of files) {
        const num = parseInt(path.basename(file), 10);
        result.append(num);
      }
      return result;
    } catch (e) {
      if (e.code === 'ENOENT') {
        // Directory does not exist
        return result;
      }
      throw e;
    }
  }

  public async getSeries(seriesUid: string): Promise<SeriesAccessor> {
    let dir: string;
    if (this.options.useHash) {
      const hashStr = sha256(seriesUid);
      dir = path.join(
        this.options.dataDir,
        hashStr.substring(0, 2),
        hashStr.substring(2, 4),
        seriesUid
      );
    } else {
      dir = path.join(this.options.dataDir, seriesUid);
    }

    const count = await this.scanDicomImages(dir);

    const load = async (image: number) => {
      const fileName = pad8(image) + '.dcm';
      const filePath = path.join(dir, fileName);
      const data = await fs.readFile(filePath);
      return data.buffer as ArrayBuffer;
    };

    const save = async (image: number, buffer: ArrayBuffer) => {
      const fileName = pad8(image) + '.dcm';
      const filePath = path.join(dir, fileName);
      await fs.ensureDir(dir);
      await fs.writeFile(filePath, Buffer.from(buffer));
    };

    return {
      load,
      save,
      get images() {
        return count.toString();
      }
    };
  }
}
