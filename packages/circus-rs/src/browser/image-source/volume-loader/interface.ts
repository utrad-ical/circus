export interface LabelLoader {
  load: (labelIndex: number) => Promise<LabelData | null>;
}
export interface LabelData {
  offset: [number, number, number];
  size: [number, number, number];
  getValueAt(x: number, y: number, z: number): boolean;
}
