import DicomVolume from './DicomVolume';
import { PixelFormat } from './PixelFormat';

/**
 * Parses the header file as a list of key-value pairs.
 * @param text Content of the MHD header file.
 */
export function parseMhdHeader(text: string): Map<string, string> {
  const result: Map<string, string> = new Map();
  const lines = text.split(/\r\n?/);
  lines.forEach(line => {
    const [key, value] = line.split(/\s*=\s*/, 2);
    result.set(key, value);
  });
  return result;
}

const formats: { [key: string]: PixelFormat } = {
  MET_UCHAR: 'uint8',
  MET_CHAR: 'int8',
  MET_USHORT: 'uint16',
  MET_SHORT: 'int16'
};

const normalizeTo3D = (input: number[]) => {
  const result = [...input];
  while (result.length < 3) result.push(1);
  return result.slice(0, 3) as [number, number, number];
};

/**
 * Creates a DicomVolume object from files in MHD format.
 * @param headerText Content of the MHD file
 * @param dataFile Content of the data file
 */
export default function loadVolumeFromMhd(
  headerText: string,
  dataFile: ArrayBuffer
): DicomVolume {
  const headers = parseMhdHeader(headerText);

  if (headers.get('ObjectType') !== 'Image') {
    throw new TypeError('ObjectType is not Image');
  }

  const elementType = headers.get('ElementType');
  if (!elementType || !formats[elementType]) {
    throw new TypeError('Unknown element type');
  }
  const pixelFormat = formats[elementType];

  const dimSize = headers.get('DimSize');
  if (!dimSize) {
    throw new TypeError('Unknown DimSize');
  }
  const dims = normalizeTo3D(dimSize.split(/\s+/).map(s => parseInt(s, 10)));

  const elementSpacing = headers.get('ElementSpacing');
  if (!elementSpacing) {
    throw new TypeError('Unknown ElementSpacing');
  }
  const pixelSize = normalizeTo3D(
    elementSpacing.split(/\s+/).map(s => parseFloat(s))
  );

  const headerSizeStr = headers.get('HeaderSize');
  const headerSize = headerSizeStr ? parseInt(headerSizeStr, 10) : 0;
  if (headerSize < 0) {
    throw new TypeError('Negative header size is not supported');
  }

  const volume = new DicomVolume(dims, pixelFormat);
  volume.setVoxelSize(pixelSize);

  volume.assign(dataFile.slice(headerSize));

  return volume;
}
