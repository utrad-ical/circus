export interface LabelingResults<T> {
  labelMap: Uint8Array;
  labelNum: number;
  labels: Array<{
    volume: number;
    min: T;
    max: T;
  }>;
}

export type LabelingResults2D = LabelingResults<[number, number]>;
export type LabelingResults3D = LabelingResults<[number, number, number]>;
