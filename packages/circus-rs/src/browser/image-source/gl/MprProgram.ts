import { Vector3, Matrix4 } from 'three';
import { TransferFunction, InterpolationMode } from '../../ViewState';
import ShaderProgram, {
  AttribBufferer,
  SetUniform,
  VertexElementBufferer
} from './ShaderProgram';
import loadTransferFunctionIntoTexture from './texture/loadTransferFunctionIntoTexture';
import { Section, vectorizeSection } from '../../../common/geometry/Section';
import { ViewWindow } from 'common/ViewWindow';
import {
  Camera,
  createCamera,
  createModelViewMatrix,
  createPojectionMatrix
} from './webgl-util';
import DicomVolume from 'common/DicomVolume';
import volumeTextureTransferer from './texture/volumeTextureTransferer';

// WebGL shader source (GLSL)
const vertexShaderSource = require('./glsl/mpr-section.vert');
const fragmentShaderSource = [
  require('./glsl/mpr-header.frag'),
  require('./glsl/pixel-value.frag'),
  require('./glsl/pixel-color.frag'),
  require('./glsl/mpr-main.frag')
].join('\n');

export default class MprProgram extends ShaderProgram {
  /**
   * 1mm in normalized device coordinates.
   */
  private mmInNdc: number = 0.002;

  private uVolumeDimension: SetUniform['uniform3fv'];
  private uVoxelSizeInverse: SetUniform['uniform3fv'];
  private uBackground: SetUniform['uniform4fv'];
  private uInterpolationMode: SetUniform['uniform1i'];
  private uProjectionMatrix: SetUniform['uniformMatrix4fv'];
  private uModelViewMatrix: SetUniform['uniformMatrix4fv'];
  private uDebugFlag: SetUniform['uniform1i'];

  private aVertexPositionBuffer: AttribBufferer;
  private aVertexIndexBuffer: VertexElementBufferer;

  private volumeTexture: WebGLTexture | undefined = undefined;
  private uVolumeTextureSampler: SetUniform['uniform1i'];
  private uTextureSize: SetUniform['uniform2fv'];
  private uSliceGridSize: SetUniform['uniform2fv'];

  private uWindowWidth: SetUniform['uniform1f'];
  private uWindowLevel: SetUniform['uniform1f'];

  private transferFunctionTexture: WebGLTexture | undefined = undefined;
  private uTransferFunctionSampler: SetUniform['uniform1i'];

  constructor(gl: WebGLRenderingContext) {
    super(gl, vertexShaderSource, fragmentShaderSource);

    // Uniforms
    this.uVolumeDimension = this.uniform3fv('uVolumeDimension');
    this.uVoxelSizeInverse = this.uniform3fv('uVoxelSizeInverse');
    this.uBackground = this.uniform4fv('uBackground');
    this.uInterpolationMode = this.uniform1i('uInterpolationMode');
    this.uProjectionMatrix = this.uniformMatrix4fv('uProjectionMatrix', false);
    this.uModelViewMatrix = this.uniformMatrix4fv('uModelViewMatrix', false);
    this.uWindowWidth = this.uniform1f('uWindowWidth');
    this.uWindowLevel = this.uniform1f('uWindowLevel');
    this.uDebugFlag = this.uniform1i('uDebugFlag');

    // Buffers
    this.aVertexIndexBuffer = this.vertexElementBuffer();
    this.aVertexPositionBuffer = this.attribBuffer('aVertexPosition', {
      size: 3,
      type: gl.FLOAT
    });

    // Textures
    this.uVolumeTextureSampler = this.uniform1i('uVolumeTextureSampler');
    this.uTextureSize = this.uniform2fv('uTextureSize');
    this.uSliceGridSize = this.uniform2fv('uSliceGridSize');

    this.uTransferFunctionSampler = this.uniform1i('uTransferFunctionSampler');
  }

  public setMmInNdc(mmInNdc: number) {
    this.mmInNdc = mmInNdc;
  }

  public setDebugMode(debug: number) {
    this.uDebugFlag(debug);
  }

  public setDicomVolume(volume: DicomVolume) {
    const voxelSize = volume.getVoxelSize();
    const dimension = volume.getDimension();

    this.uVoxelSizeInverse([
      1.0 / voxelSize[0],
      1.0 / voxelSize[1],
      1.0 / voxelSize[2]
    ]);
    this.uVolumeDimension(dimension);

    this.volumeTexture = this.createTexture();

    const { images, layout, transfer } = volumeTextureTransferer(
      this.gl,
      this.volumeTexture,
      volume
    );

    const { textureSize, sliceGridSize } = layout;
    this.uTextureSize(textureSize);
    this.uSliceGridSize(sliceGridSize);

    return { images, transfer };
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

    // prettier-ignore
    const positions = [
      v0.x, v0.y, v0.z, // v0
      v1.x, v1.y, v1.z, // v1
      v2.x, v2.y, v2.z, // v2
      v3.x, v3.y, v3.z // v3
    ];

    const data = new Float32Array(positions);

    this.aVertexPositionBuffer(data);
    this.aVertexIndexBuffer([0, 1, 2, 0, 2, 3]);
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

  /**
   * Set the background color to fill the points outside the volume,
   * but inside the viewport section.
   * Specify each value as 0 to 1
   */
  public setBackground([r, g, b, a]: [number, number, number, number]) {
    this.uBackground([r, g, b, a]);
  }

  private camera: Camera = createCamera(
    [0, 0, 0],
    [0, 0, 1],
    [0, 1, 0],
    [1, 1]
  );

  public setCamera(camera: Camera) {
    this.camera = camera;
  }

  public run() {
    const gl = this.gl;

    // Activate textures
    if (this.volumeTexture) {
      this.uVolumeTextureSampler(0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.volumeTexture);
    }

    // Transfer function
    if (this.transferFunctionTexture) {
      this.uTransferFunctionSampler(1);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.transferFunctionTexture);
    }

    // Projection(Model/View)
    const projectionMatrix = new Matrix4().fromArray(
      createPojectionMatrix(this.camera, this.mmInNdc)
    );
    this.uProjectionMatrix(projectionMatrix.toArray());

    const modelViewMatrix = new Matrix4().fromArray(
      createModelViewMatrix(this.camera, this.mmInNdc)
    );
    this.uModelViewMatrix(modelViewMatrix.toArray());

    // Enable attribute pointers
    gl.enableVertexAttribArray(this.getAttribLocation('aVertexPosition'));

    // Draw vertices
    gl.drawElements(
      gl.TRIANGLES,
      6, // Length of aVertexIndexBuffer elements
      gl.UNSIGNED_SHORT, // 2 [byte]
      0
    );
  }
}
