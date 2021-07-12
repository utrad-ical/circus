export default class VolumeCuboid {

  //             1.0 y            
  //              ^  -1.0           //         [7]------[6]
  //              | / z             //        / |      / |
  //              |/       x        //      [3]------[2] |
  // -1.0 -----------------> +1.0   //       |  |     |  |
  //            / |                 //       | [4]----|-[5]
  //      +1.0 /  |                 //       |/       |/
  //           -1.0                 //      [0]------[1]
  //

  private positions: number[];
  private indices: number[];
  private color: [number, number, number, number][];
  private voxelSize: [number, number, number];

  constructor(
    voxelSize: number[],
    voxelCount: number[],
    offset: number[] = [0, 0, 0]
  ) {
    const [vw, vh, vd] = voxelSize;
    const [ox, oy, oz] = [offset[0] * vw, offset[1] * vh, offset[2] * vd];
    const [w, h, d] = [voxelCount[0] * vw, voxelCount[1] * vh, voxelCount[2] * vd];

    this.voxelSize = voxelSize as [number, number, number];

    this.positions = [
      // Front face
      ox, oy, oz + d, // v0
      ox + w, oy, oz + d, // v1
      ox + w, oy + h, oz + d, // v2
      ox, oy + h, oz + d, // v3
      // Back face
      ox, oy, oz, // v4
      ox + w, oy, oz, // v5
      ox + w, oy + h, oz, // v6
      ox, oy + h, oz, // v7
      // Top face
      ox + w, oy + h, oz + d, // v2
      ox, oy + h, oz + d, // v3
      ox, oy + h, oz, // v7
      ox + w, oy + h, oz, // v6
      // Bottom face
      ox, oy, oz + d, // v0
      ox + w, oy, oz + d, // v1
      ox + w, oy, oz, // v5
      ox, oy, oz, // v4
      // Right face
      ox + w, oy, oz + d, // v1
      ox + w, oy + h, oz + d, // v2
      ox + w, oy + h, oz, // v6
      ox + w, oy, oz, // v5
      // Left face
      ox, oy, oz + d, // v0
      ox, oy + h, oz + d, // v3
      ox, oy + h, oz, // v7
      ox, oy, oz // v4
    ];

    this.indices = [
      0, 1, 2, 0, 2, 3, // Front face
      4, 5, 6, 4, 6, 7, // Back face
      8, 9, 10, 8, 10, 11, // Top face
      12, 13, 14, 12, 14, 15, // Bottom face
      16, 17, 18, 16, 18, 19, // Right face
      20, 21, 22, 20, 22, 23 // Left face
    ];

    this.color = [
      [1.0, 1.0, 0.0, 0.1], // Front face  ... YELLOW
      [1.0, 0.0, 0.0, 0.1], // Back face ... RED
      [0.0, 1.0, 0.0, 0.1], // Top face   ... GREEN
      [0.0, 0.5, 0.5, 0.1], // Bottom face .. CYAN
      [1.0, 0.0, 1.0, 0.1], // Right face ... PURPLE
      [0.0, 0.0, 1.0, 0.1] // Left face  ... BLUE
    ];
  }

  public vertexIndex() {
    return this.indices;
  }

  public vertexCount() {
    return this.indices.length;
  }

  public attribPosition() {
    return new Float32Array(this.positions);
  }

  public attribColor() {
    const colors = this.color;
    let volumeVertexColors: number[] = [];
    for (let i in colors) {
      let color = colors[i];
      for (let j = 0; j < 4; j++) {
        volumeVertexColors = volumeVertexColors.concat(color);
      }
    }

    return new Float32Array(volumeVertexColors);
  }

  public unifVoxelSize() {
    return this.voxelSize;
  }
}
