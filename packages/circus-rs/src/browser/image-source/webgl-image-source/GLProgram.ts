import { Vector3, Matrix4, Vector2 } from 'three';
import { mat4 } from 'gl-matrix';
import { TransferFunction, InterpolationMode } from '../../ViewState';
import GLShaderProgram, { AttribBufferer, SetUniform, VertexElementBufferer } from './GLShaderProgram';
import RawData from '../../../common/RawData';
import loadVolumeIntoTexture from './texture-loader/loadVolumeIntoTexture';
import loadTransferFunctionIntoTexture from './texture-loader/loadTransferFunctionIntoTexture';
import { Section, vectorizeSection } from '../../../common/geometry/Section';
import { ViewWindow } from 'common/ViewWindow';
import { Camera, compileShader, createModelViewMatrix, createPojectionMatrix, createProgram } from './webgl-util';

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

export default class GLProgram extends GLShaderProgram {
  private mmToWorldCoords?: number;

  private uVolumeOffset: SetUniform['uniform3fv'];
  private uVolumeDimension: SetUniform['uniform3fv'];
  private uVoxelSizeInverse: SetUniform['uniform3fv'];
  private uBackground: SetUniform['uniform4fv'];
  private uInterpolationMode: SetUniform['uniform1i'];
  public uMVPMatrix: SetUniform['uniformMatrix4fv'];
  private uDebugFlag: SetUniform['uniform1i'];

  private aVertexPositionBuffer: AttribBufferer;
  private aVertexColorBuffer: AttribBufferer;
  private aVertexIndexBuffer: VertexElementBufferer;

  private volumeTexture: WebGLTexture;
  private uVolumeTextureSampler: SetUniform['uniform1i'];
  private uTextureSize: SetUniform['uniform2fv'];
  private uSliceGridSize: SetUniform['uniform2fv'];

  private uWindowWidth: SetUniform['uniform1f'];
  private uWindowLevel: SetUniform['uniform1f'];

  private transferFunctionTexture: WebGLTexture | undefined = undefined;
  private uTransferFunctionSampler: SetUniform['uniform1i'];

  constructor(gl: WebGLRenderingContext) {
    super(gl, vertexShaderSource, fragmentShaderSource);
    gl.enable(gl.DEPTH_TEST);

    // Uniforms
    this.uVolumeOffset = this.uniform3fv('uVolumeOffset');
    this.uVolumeDimension = this.uniform3fv('uVolumeDimension');
    this.uVoxelSizeInverse = this.uniform3fv('uVoxelSizeInverse');
    this.uBackground = this.uniform4fv('uBackground');
    this.uInterpolationMode = this.uniform1i('uInterpolationMode');
    this.uMVPMatrix = this.uniformMatrix4fv('uMVPMatrix', false);
    this.uWindowWidth = this.uniform1f('uWindowWidth');
    this.uWindowLevel = this.uniform1f('uWindowLevel');
    this.uDebugFlag = this.uniform1i('uDebugFlag');

    // Buffers
    this.aVertexIndexBuffer = this.vertexElementBuffer();
    this.aVertexPositionBuffer = this.attribBuffer('aVertexPosition', { size: 3, type: gl.FLOAT });
    this.aVertexColorBuffer = this.attribBuffer('aVertexColor', { size: 4, type: gl.FLOAT });

    // Textures
    this.volumeTexture = this.createTexture();
    this.uVolumeTextureSampler = this.uniform1i('uVolumeTextureSampler');
    this.uTextureSize = this.uniform2fv('uTextureSize');
    this.uSliceGridSize = this.uniform2fv('uSliceGridSize');

    this.uTransferFunctionSampler = this.uniform1i('uTransferFunctionSampler');
  }

  public use() {
    super.use();
    this.onUseProgram();
  }

  private onUseProgram() {
    this.aVertexIndexBuffer([0, 1, 2, 0, 2, 3]);

    const red = [1.0, 0.0, 0.0, 1.0];
    const yellow = [1.0, 1.0, 0.0, 1.0];
    const green = [0.0, 1.0, 0.0, 1.0];
    const cyan = [0.0, 0.5, 0.5, 1.0];
    const purple = [1.0, 0.0, 1.0, 1.0];
    const blue = [0.0, 0.0, 1.0, 1.0];
    const colorData = new Float32Array([...red, ...yellow, ...green, ...cyan]);
    this.aVertexColorBuffer(colorData);
  }

  public setDebugMode(debug: number) {
    this.uDebugFlag(debug);
  }

  public setWorldCoordsBaseLength(mmBaseLength: number) {
    this.mmToWorldCoords = 1.0 / mmBaseLength;
  }

  public setVolumeInformation(
    voxelSize: [number, number, number],
    dimension: [number, number, number],
    offset: [number, number, number] = [0, 0, 0]
  ) {
    this.uVoxelSizeInverse([
      1.0 / voxelSize[0],
      1.0 / voxelSize[1],
      1.0 / voxelSize[2]
    ]);
    this.uVolumeOffset(offset);
    this.uVolumeDimension(dimension);
  }

  public setVolume(volume: RawData) {
    console.time('setVolume');
    const { textureSize, sliceGridSize } = loadVolumeIntoTexture(
      this.gl,
      this.volumeTexture,
      volume
    );
    console.timeEnd('setVolume');

    this.uTextureSize(textureSize);
    this.uSliceGridSize(sliceGridSize);
  }

  public setViewWindow(viewWindow: ViewWindow) {
    this.uWindowWidth(viewWindow.width);
    this.uWindowLevel(viewWindow.level);
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

  public setSection(section: Section) {

    const { origin, xAxis, yAxis } = vectorizeSection(section);

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
      v0.x, v0.y, v0.z, // v0
      v1.x, v1.y, v1.z, // v1
      v2.x, v2.y, v2.z, // v2
      v3.x, v3.y, v3.z // v3
    ];

    const data = new Float32Array(positions);

    this.aVertexPositionBuffer(data);
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

  public setBackground([r, g, b, a]: [number, number, number, number]) {
    this.uBackground([r, g, b, a]);
  }

  public setCamera(camera: Camera) {
    const projectionMatrix = new Matrix4().fromArray(
      createPojectionMatrix(camera)
    );
    const modelViewMatrix = new Matrix4().fromArray(
      createModelViewMatrix(camera, this.mmToWorldCoords!)
    );
    const mvpMatrix = projectionMatrix.multiply(modelViewMatrix);
    this.uMVPMatrix(mvpMatrix.toArray());
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
    gl.enableVertexAttribArray(this.getAttribLocation('aVertexColor'));
    gl.enableVertexAttribArray(this.getAttribLocation('aVertexPosition'));

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
