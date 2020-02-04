declare module 'dicom-parser' {
  export interface DicomDataset {
    elements: {
      [tag: string]: {
        dataOffset: number;
        length: number;
        fragments: any;
      };
    };
    byteArray: Uint8Array;
    string: (tag: string) => string | undefined;
    uint16: (tag: string) => number | undefined;
    floatString: (tag: string, index?: number) => number | undefined;
    intString: (tag: string, index?: number) => number | undefined;
  }

  export const parseDicom: (
    byteArray: Uint8Array,
    options?: any
  ) => DicomDataset;
}
