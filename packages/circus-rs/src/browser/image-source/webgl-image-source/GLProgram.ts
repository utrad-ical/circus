import { Vector3, Matrix4 } from 'three';
import { mat4 } from 'gl-matrix';
import { TransferFunction, InterpolationMode } from '../../ViewState';
import GLProgramBase, { SetUniform } from './GLProgramBase';
import RawData from '../../../common/RawData';
import loadVolumeIntoTexture from './texture-loader/loadVolumeIntoTexture';
import loadTransferFunctionIntoTexture from './texture-loader/loadTransferFunctionIntoTexture';
import { Section, vectorizeSection } from '../../../common/geometry/Section';

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
  require('./fragment-shader/pixel-value.frag'),
  require('./fragment-shader/pixel-color.frag'),
  require('./fragment-shader/main.frag')
].join('\n');

// [TextureIndex]
// 0: Volume
// 1: Transfer function
// 2: Label

export default class GLProgram extends GLProgramBase {
  protected program: WebGLProgram;
  private mmToWorldCoords?: number;

  private uVolumeOffset: SetUniform['uniform3fv'];
  private uVolumeDimension: SetUniform['uniform3fv'];
  private uVoxelSizeInverse: SetUniform['uniform3fv'];
  private uBackground: SetUniform['uniform4fv'];
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

  private transferFunctionTexture: WebGLTexture | undefined = undefined;
  private uTransferFunctionSampler: SetUniform['uniform1i'];

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

    this.uTransferFunctionSampler = this.uniform1i('uTransferFunctionSampler');
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

  public setVolume(volume: RawData) {
    const { textureSize, sliceGridSize } = loadVolumeIntoTexture(
      this.gl,
      this.volumeTexture,
      volume
    );

    this.uTextureSize(textureSize);
    this.uSliceGridSize(sliceGridSize);
  }

  public setTransferFunction(transferFunction: TransferFunction) {
    if (this.transferFunctionTexture === undefined) {
      this.transferFunctionTexture = this.createTexture();
    }

    loadTransferFunctionIntoTexture(
      this.gl,
      this.transferFunctionTexture,
      transferFunction
    );
  }

  public setSectionBoundary(
    section: Section,
    {
      offset,
      dimension,
      voxelSize
    }: {
      offset: [number, number, number];
      dimension: [number, number, number];
      voxelSize: [number, number, number];
    }
  ) {
    this.uVolumeOffset(offset);
    this.uVolumeDimension(dimension);
    this.uVoxelSizeInverse([
      1.0 / voxelSize[0],
      1.0 / voxelSize[1],
      1.0 / voxelSize[2]
    ]);
    this.bufferSectionPosition(section);
    this.bufferSectionIndex();
    this.bufferSectionColor();
  }

  private bufferSectionPosition(section: Section) {
    const gl = this.gl;

    const { origin, xAxis, yAxis } = vectorizeSection(section);

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

    //      [3]------[2]
    //       |        |
    //       |        |
    //       |        |
    //      [0]------[1]

    const v0 = origin;
    const v1 = new Vector3().addVectors(origin, xAxis);
    const v2 = new Vector3().addVectors(origin, xAxis).add(yAxis);
    const v3 = new Vector3().addVectors(origin, yAxis);
    const positions = [
      v0.x,
      v0.y,
      v0.z, // v0
      v1.x,
      v1.y,
      v1.z, // v1
      v2.x,
      v2.y,
      v2.z, // v2
      v3.x,
      v3.y,
      v3.z // v3
    ];

    const data = new Float32Array(positions);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW);
    // gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
  }

  private bufferSectionIndex() {
    const gl = this.gl;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.aVertexIndexBuffer);

    // Vertex index buffer array
    const volumeVertexIndices = [0, 1, 2, 0, 2, 3];
    const data = new Uint16Array(volumeVertexIndices);

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
  }

  private bufferSectionColor() {
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

    const red = [1.0, 0.0, 0.0, 1.0];
    const yellow = [1.0, 1.0, 0.0, 1.0];
    const green = [0.0, 1.0, 0.0, 1.0];
    const cyan = [0.0, 0.5, 0.5, 1.0];
    const purple = [1.0, 0.0, 1.0, 1.0];
    const blue = [0.0, 0.0, 1.0, 1.0];

    const data = new Float32Array([...red, ...yellow, ...green, ...cyan]);
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

  public run() {
    const gl = this.gl;

    // Activate textures
    this.uVolumeTextureSampler(0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.volumeTexture);

    // Transfer function
    if (this.transferFunctionTexture) {
      this.uTransferFunctionSampler(1);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.transferFunctionTexture);
    }

    // Enable attribute pointers
    gl.enableVertexAttribArray(this.aVertexColorLocation);
    gl.enableVertexAttribArray(this.aVertexPositionLocation);

    // Draw vertices
    const elementCount = 6;
    gl.drawElements(
      gl.TRIANGLES,
      elementCount, // volumeVertexIndices.length
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
