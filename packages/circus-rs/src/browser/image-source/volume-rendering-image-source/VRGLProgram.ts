import { Vector3, Matrix4 } from 'three';
import { mat4 } from 'gl-matrix';
import { TransferFunction, InterpolationMode } from '../../ViewState';
import GLProgramBase, { SetUniform } from './GLProgramBase';
import { LabelData } from '../volume-loader/interface';
import loadLabelIntoTexture from './texture-loader/loadLabelIntoTexture';
import RawData from '../../../common/RawData';
import loadVolumeIntoTexture from './texture-loader/loadVolumeIntoTexture';
import loadTransferFunctionIntoTexture from './texture-loader/loadTransferFunctionIntoTexture';
import { TextureLayout } from './texture-loader/interface';

export interface Camera {
  position: Vector3;
  target: Vector3;
  up: Vector3;
  zoom: number;
}

// WebGL shader source (GLSL)
const vertexShaderSource = require('./vertex-shader.vert');
const fragmentShaderSource = [
  require('./fragment-shader/header.frag'),
  require('./fragment-shader/getLabeledAt.frag'),
  require('./fragment-shader/getValueAt.frag'),
  require('./fragment-shader/getColorFromPixelValue.frag'),
  require('./fragment-shader/getVoxelValueAndMaskValueWithInterpolation.frag'),
  // If highlighting label with interporation, it seems too weak.
  // require('./fragment-shader/getLabeledValueWithInterpolation.frag'),
  require('./fragment-shader/getLabeledValueAnyNeighbor.frag'),
  require('./fragment-shader/getColorWithRayCasting.frag'),
  require('./fragment-shader/main.frag')
].join('\n');

// [TextureIndex]
// 0: Volume
// 1: Transfer function
// 2: Label

type LabelTexuture = {
  offset: [number, number, number];
  size: [number, number, number];
  textureLayout: TextureLayout;
  texture: WebGLTexture;
  color: [number, number, number, number];
};

export default class VRGLProgram extends GLProgramBase {
  protected program: WebGLProgram;
  private highlightLabelIndex: number = -1;
  private mmToWorldCoords?: number;

  private uVolumeOffset: SetUniform['uniform3fv'];
  private uVolumeDimension: SetUniform['uniform3fv'];
  private uVoxelSizeInverse: SetUniform['uniform3fv'];
  private uBackground: SetUniform['uniform4fv'];
  private uRayStride: SetUniform['uniform3fv'];
  private uSkipStride: SetUniform['uniform3fv'];
  private uRayIntensityCoef: SetUniform['uniform1f'];
  private uInterpolationMode: SetUniform['uniform1i'];
  public uMVPMatrix: SetUniform['uniformMatrix4fv'];
  private uDebugFlag: SetUniform['uniform1i'];

  private aVertexPositionBuffer: WebGLBuffer;
  private aVertexPositionLocation: number;
  private aVertexColorBuffer: WebGLBuffer;
  private aVertexColorLocation: number;
  private aVertexIndexBuffer: WebGLBuffer;

  private volumeTexture: WebGLTexture;
  private uVolumeTextureSampler: SetUniform['uniform1i'];
  private uTextureSize: SetUniform['uniform2fv'];
  private uSliceGridSize: SetUniform['uniform2fv'];

  private transferFunctionTexture: WebGLTexture;
  private uTransferFunctionSampler: SetUniform['uniform1i'];

  private labelTextures: Record<number, LabelTexuture> = {};
  private uLabelSampler: SetUniform['uniform1i'];
  private uLabelTextureSize: SetUniform['uniform2fv'];
  private uLabelSliceGridSize: SetUniform['uniform2fv'];
  private uLabelBoundaryFrom: SetUniform['uniform3fv'];
  private uLabelBoundaryTo: SetUniform['uniform3fv'];
  private uLabelLabelColor: SetUniform['uniform4fv'];

  private uEnableLabel: SetUniform['uniform1i'];
  private uEnableMask: SetUniform['uniform1i'];

  constructor(gl: WebGLRenderingContext) {
    super(gl);
    gl.enable(gl.DEPTH_TEST);

    // Prepare program
    this.program = this.activateProgram();

    // Uniforms
    this.uVolumeOffset = this.uniform3fv('uVolumeOffset');
    this.uVolumeDimension = this.uniform3fv('uVolumeDimension');
    this.uVoxelSizeInverse = this.uniform3fv('uVoxelSizeInverse');
    this.uBackground = this.uniform4fv('uBackground');
    this.uRayStride = this.uniform3fv('uRayStride');
    this.uSkipStride = this.uniform3fv('uSkipStride');
    this.uRayIntensityCoef = this.uniform1f('uRayIntensityCoef');
    this.uInterpolationMode = this.uniform1i('uInterpolationMode');
    this.uMVPMatrix = this.uniformMatrix4fv('uMVPMatrix', false);

    this.uDebugFlag = this.uniform1i('uDebugFlag');

    // Buffers
    this.aVertexPositionBuffer = this.createBuffer();
    this.aVertexPositionLocation = this.getAttribLocation('aVertexPosition');

    this.aVertexIndexBuffer = this.createBuffer();

    this.aVertexColorBuffer = this.createBuffer();
    this.aVertexColorLocation = this.getAttribLocation('aVertexColor');

    // Textures
    this.volumeTexture = this.createTexture();
    this.uVolumeTextureSampler = this.uniform1i('uVolumeTextureSampler');
    this.uTextureSize = this.uniform2fv('uTextureSize');
    this.uSliceGridSize = this.uniform2fv('uSliceGridSize');

    this.transferFunctionTexture = this.createTexture();
    this.uTransferFunctionSampler = this.uniform1i('uTransferFunctionSampler');

    this.uEnableLabel = this.uniform1i('uEnableLabel');
    this.uEnableMask = this.uniform1i('uEnableMask');

    // Labels
    this.uLabelSampler = this.uniform1i('uLabelSampler');
    this.uLabelTextureSize = this.uniform2fv('uLabelTextureSize');
    this.uLabelSliceGridSize = this.uniform2fv('uLabelSliceGridSize');
    this.uLabelBoundaryFrom = this.uniform3fv('uLabelBoundaryFrom');
    this.uLabelBoundaryTo = this.uniform3fv('uLabelBoundaryTo');
    this.uLabelLabelColor = this.uniform4fv('uLabelLabelColor');
  }

  protected activateProgram() {
    const vertexShader = this.compileShader(vertexShaderSource, 'vertex');
    const fragmentShader = this.compileShader(fragmentShaderSource, 'fragment');
    const shaderProgram = super.activateProgram([vertexShader, fragmentShader]);
    return shaderProgram;
  }

  public setDebugMode(debug: number) {
    switch (debug) {
      case 1: // 1: check volume box
      case 2: // 2: check volume box with ray casting
      case 3: // 3: check transfer function
        this.uDebugFlag(debug);
        break;
      default:
        this.uDebugFlag(0);
    }
  }

  public setWorldCoordsBaseLength(mmBaseLength: number) {
    this.mmToWorldCoords = 1.0 / mmBaseLength;
  }

  public setVolume(volume: RawData, mask?: RawData) {
    const { textureSize, sliceGridSize } = loadVolumeIntoTexture(
      this.gl,
      this.volumeTexture,
      volume,
      mask
    );

    this.uTextureSize(textureSize);
    this.uSliceGridSize(sliceGridSize);
  }

  public setTransferFunction(transferFunction: TransferFunction) {
    loadTransferFunctionIntoTexture(
      this.gl,
      this.transferFunctionTexture,
      transferFunction
    );
  }

  public appendLabelData(index: number, label: LabelData) {
    // Check if texture is already created.
    if (index in this.labelTextures) return;

    const { offset, size } = label;
    const texture = this.createTexture();
    const textureLayout = loadLabelIntoTexture(this.gl, texture, label);

    type RGBA = [number, number, number, number];
    const color = [0xff, 0xff, 0, 0x80].map(v => v / 0xff) as RGBA;

    this.labelTextures[index] = {
      offset,
      size,
      textureLayout,
      texture,
      color
    };
  }

  public setDrawingBoundary({
    offset,
    dimension,
    voxelSize
  }: {
    offset: [number, number, number];
    dimension: [number, number, number];
    voxelSize: [number, number, number];
  }) {
    this.uVolumeOffset(offset);
    this.uVolumeDimension(dimension);
    this.uVoxelSizeInverse([
      1.0 / voxelSize[0],
      1.0 / voxelSize[1],
      1.0 / voxelSize[2]
    ]);
    this.bufferVertexPosition({ dimension, offset, voxelSize });
    this.bufferVertexIndex();
    this.bufferVertexColor();
  }

  private bufferVertexPosition({
    dimension,
    offset,
    voxelSize
  }: {
    dimension: number[];
    offset: number[];
    voxelSize: number[];
  }) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.aVertexPositionBuffer);

    // Describe the layout of the buffer
    gl.vertexAttribPointer(
      this.aVertexPositionLocation,
      3, // size
      gl.FLOAT, // type
      false, // normalized
      0, // stride
      0 // offset
    );

    //
    //             1.0 y
    //              ^  -1.0
    //              | / z
    //              |/       x
    // -1.0 -----------------> +1.0
    //            / |
    //      +1.0 /  |
    //           -1.0
    //
    //         [7]------[6]
    //        / |      / |
    //      [3]------[2] |
    //       |  |     |  |
    //       | [4]----|-[5]
    //       |/       |/
    //      [0]------[1]
    //
    const [vw, vh, vd] = voxelSize;
    const [ox, oy, oz] = [offset[0] * vw, offset[1] * vh, offset[2] * vd];
    const [w, h, d] = [dimension[0] * vw, dimension[1] * vh, dimension[2] * vd];

    // prettier-ignore
    const positions = [
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

    const data = new Float32Array(positions);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW);
    // gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
  }

  private bufferVertexIndex() {
    const gl = this.gl;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.aVertexIndexBuffer);

    // Vertex index buffer array
    // prettier-ignore
    const volumeVertexIndices = [
      0, 1, 2, 0, 2, 3, // Front face
      4, 5, 6, 4, 6, 7, // Back face
      8, 9, 10, 8, 10, 11, // Top face
      12, 13, 14, 12, 14, 15, // Bottom face
      16, 17, 18, 16, 18, 19, // Right face
      20, 21, 22, 20, 22, 23 // Left face
    ];
    const data = new Uint16Array(volumeVertexIndices);

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
  }

  private bufferVertexColor() {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.aVertexColorBuffer);

    // Describe the layout of the buffer
    gl.vertexAttribPointer(
      this.aVertexColorLocation,
      4, // size
      gl.FLOAT, // type
      false, // normalized
      0, // stride
      0 // offset
    );

    const colors = [
      [1.0, 0.0, 0.0, 1.0], // Front face ... RED
      [1.0, 1.0, 0.0, 1.0], // Back face  ... YELLOW
      [0.0, 1.0, 0.0, 1.0], // Top face   ... GREEN
      [0.0, 0.5, 0.5, 1.0], // Bottom face .. CYAN
      [1.0, 0.0, 1.0, 1.0], // Right face ... PURPLE
      [0.0, 0.0, 1.0, 1.0] // Left face  ... BLUE
    ];
    let volumeVertexColors: number[] = [];
    for (const i in colors) {
      const color = colors[i];
      for (let j = 0; j < 4; j++) {
        volumeVertexColors = volumeVertexColors.concat(color);
      }
    }

    const data = new Float32Array(volumeVertexColors);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  }

  public setInterporationMode(interpolationMode?: InterpolationMode) {
    switch (interpolationMode) {
      case 'trilinear':
        this.uInterpolationMode(1);
        break;
      case 'nearestNeighbor':
      default:
        this.uInterpolationMode(0);
        break;
    }
  }

  public setBackground(background: [number, number, number, number]) {
    const gl = this.gl;
    const [r, g, b, a] = background as number[];
    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.uBackground([r / 0xff, g / 0xff, b / 0xff, a / 0xff]);
  }

  public setRay(
    camera: Camera,
    {
      voxelSize,
      intensity,
      quality
    }: {
      voxelSize: [number, number, number];
      intensity: number;
      quality: number;
    }
  ) {
    const vs = new Vector3().fromArray(voxelSize);
    const direction = new Vector3() // in voxel coords
      .subVectors(
        camera.target.clone().divide(vs),
        camera.position.clone().divide(vs)
      )
      .normalize();

    this.uSkipStride(direction.toArray());
    this.uRayStride(direction.divideScalar(quality).toArray());
    this.uRayIntensityCoef(1.0 / intensity / quality);
  }

  public setCamera(camera: Camera) {
    const projectionMatrix = new Matrix4().fromArray(
      this.createPojectionMatrix(camera)
    );
    const modelViewMatrix = new Matrix4().fromArray(
      this.createModelViewMatrix(camera)
    );
    const mvpMatrix = projectionMatrix.multiply(modelViewMatrix);
    this.uMVPMatrix(mvpMatrix.toArray());
  }

  private createPojectionMatrix(camera: Camera) {
    const near = 0.001;
    const far = 100; // far 1.5

    const projectionMatrix = mat4.create();
    mat4.ortho(
      projectionMatrix,
      -0.5 / camera.zoom,
      0.5 / camera.zoom,
      -0.5 / camera.zoom,
      0.5 / camera.zoom,
      near,
      far
    );

    return projectionMatrix;
  }

  /**
   * @param camera Camera
   * @todo use threejs
   */
  private createModelViewMatrix(camera: Camera) {
    // Model to world coordinates size.
    const modelMatrix = new Matrix4()
      .makeScale(
        this.mmToWorldCoords!,
        this.mmToWorldCoords!,
        this.mmToWorldCoords!
      )
      .toArray();

    // Prepare view matrix
    const viewMatrixWithGLMatrix = mat4.create();
    const [px, py, pz] = camera.position
      .clone()
      .multiplyScalar(this.mmToWorldCoords!)
      .toArray();
    const [tx, ty, tz] = camera.target
      .clone()
      .multiplyScalar(this.mmToWorldCoords!)
      .toArray();
    const [ux, uy, uz] = camera.up.toArray();
    try {
      mat4.lookAt(
        viewMatrixWithGLMatrix,
        [px, py, pz, 1],
        [tx, ty, tz, 1],
        [ux, uy, uz, 0]
      );
    } catch (e) {
      mat4.identity(viewMatrixWithGLMatrix);
    }
    const viewMatrix = viewMatrixWithGLMatrix;

    // const viewMatrixWithThree = new Matrix4()
    //   .lookAt(
    //     camera.position.clone().multiplyScalar(this.mmToWorldCoords!),
    //     camera.target.clone().multiplyScalar(this.mmToWorldCoords!),
    //     camera.up
    //   )
    //   .toArray();
    // const viewMatrix = viewMatrixWithThree;

    // Model view
    const modelViewMatrix = mat4.create();
    mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

    return modelViewMatrix;
  }

  public toggleMask(enabled: boolean) {
    this.uEnableMask(enabled ? 1 : 0);
  }

  /**
   * Specify index of label to highlight (-1 to disable).
   * @param index
   */
  public setHighlightLabel(index: number) {
    if (index in this.labelTextures) {
      this.uEnableLabel(1);

      const { offset, size, textureLayout, color } = this.labelTextures[index];
      const boundaryTo = [
        offset[0] + size[0],
        offset[1] + size[1],
        offset[2] + size[2]
      ];
      this.uLabelBoundaryFrom(offset);
      this.uLabelBoundaryTo(boundaryTo);
      this.uLabelLabelColor(color);
      this.uLabelTextureSize(textureLayout.textureSize);
      this.uLabelSliceGridSize(textureLayout.sliceGridSize);
      this.highlightLabelIndex = index;
    } else {
      this.uEnableLabel(0);
      this.highlightLabelIndex = -1;
    }
  }

  public run() {
    const gl = this.gl;

    // Activate textures
    this.uVolumeTextureSampler(0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.volumeTexture);

    this.uTransferFunctionSampler(1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.transferFunctionTexture);

    if (this.highlightLabelIndex > -1) {
      const { texture } = this.labelTextures[this.highlightLabelIndex];
      this.uLabelSampler(2);
      this.gl.activeTexture(this.gl.TEXTURE2);
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    }

    // Enable attribute pointers
    gl.enableVertexAttribArray(this.aVertexColorLocation);
    gl.enableVertexAttribArray(this.aVertexPositionLocation);

    // Draw vertices
    gl.drawElements(
      gl.TRIANGLES,
      36, // volumeVertexIndices.length
      gl.UNSIGNED_SHORT, // 2 [byte]
      0
    );
  }
}

// [WEbGLBuffer]
// https://developer.mozilla.org/ja/docs/Web/API/WebGLRenderingContext/bufferData
// target: GLenum, // ARRAY_BUFFER | ELEMENT_ARRAY_BUFFER
// usage: GLenum, // STATIC_DRAW | DYNAMIC_DRAW | STREAM_DRAW
// type: number, // UNSIGNED_SHORT | FLOAT
// size: number
