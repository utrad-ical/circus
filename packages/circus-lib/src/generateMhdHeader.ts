import { PixelFormat } from './PixelFormat';
export type LineEndingType = 'lf' | 'crlf';
export type Vector3D = [number, number, number];

const pixelFormatMap: { [format: string]: string } = {
  uint8: 'MET_UCHAR',
  int8: 'MET_CHAR',
  uint16: 'MET_USHORT',
  int16: 'MET_SHORT'
};

const generateMhdHeader = (
  pixelFormat: PixelFormat,
  dimSize: Vector3D,
  elementSpacing: Vector3D,
  elementDataFile: string,
  lineEnding: LineEndingType
) => {
  const stringifyObjet = (obj: { [key: string]: string | number }) => {
    const br = lineEnding === 'crlf' ? '\r\n' : '\n';
    return (
      Object.keys(obj)
        .map(k => `${k} = ${obj[k]}`)
        .join(br) + br
    );
  };
  const obj: { [key: string]: string | number } = {
    ObjectType: 'Image',
    NDims: 3,
    DimSize: dimSize.join(' '),
    ElementType: pixelFormatMap[pixelFormat],
    ElementSpacing: elementSpacing.join(' '),
    ElementByteOrderMSB: 'False',
    ElementDataFile: elementDataFile
  };
  return stringifyObjet(obj);
};

export default generateMhdHeader;
