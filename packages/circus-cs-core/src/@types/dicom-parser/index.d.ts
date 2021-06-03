declare module 'dicom-parser' {
  export interface Element {
    tag: string;
    dataOffset: number;
    length: number;
    fragments: any;
    vr: string;
    items: Element[];
    dataSet: DicomDataset;
  }

  export interface DicomDataset {
    elements: {
      [tag: string]: Element;
    };
    byteArray: Uint8Array;
    string: (tag: string, index?: number) => string | undefined;
    uint16: (tag: string, index?: number) => number | undefined;
    floatString: (tag: string, index?: number) => number | undefined;
    intString: (tag: string, index?: number) => number | undefined;
  }

  export const parseDicom: (
    byteArray: Uint8Array,
    options?: any
  ) => DicomDataset;

  export const readEncapsulatedPixelDataFromFragments: (
    dataSet: DicomDataset,
    pixelDataElement: Element,
    startFragmentIndex: number,
    numFragments?: number,
    fragments?: number
  ) => any;
}
