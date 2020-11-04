export interface LabelingResults<T> {
  /**
   * Contains label indexes.
   */
  labelMap: Uint8Array;
  /**
   * The number of labels detected.
   */
  labelNum: number;
  /**
   * Array of objects that contains infomation for each label.
   */
  labels: Array<{
    volume: number;
    min: T;
    max: T;
  }>;
}

export type LabelingResults2D = LabelingResults<[number, number]>;
export type LabelingResults3D = LabelingResults<[number, number, number]>;

export type CCL2D = (
  array: Uint8Array | Uint16Array,
  width: number,
  height: number,
  threshold?: number
) => LabelingResults2D;

export type CCL3D = (
  array: Uint8Array | Uint16Array,
  width: number,
  height: number,
  NSlice: number,
  threshold?: number
) => LabelingResults3D;
