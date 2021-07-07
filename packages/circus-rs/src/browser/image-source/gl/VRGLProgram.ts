import { Vector3, Matrix4, Quaternion, Euler } from 'three';
import { TransferFunction, InterpolationMode } from '../../ViewState';
import ShaderProgram, { AttribBufferer, SetUniform, VertexElementBufferer } from './ShaderProgram';
import { LabelData } from '../volume-loader/interface';
import loadLabelIntoTexture from '../volume-rendering-image-source/texture-loader/loadLabelIntoTexture';
import RawData from '../../../common/RawData';
import loadVolumeIntoTexture from '../volume-rendering-image-source/texture-loader/loadVolumeIntoTexture';
import loadTransferFunctionIntoTexture from '../volume-rendering-image-source/texture-loader/loadTransferFunctionIntoTexture';
import { TextureLayout } from '../volume-rendering-image-source/texture-loader/interface';
import DicomVolume from 'common/DicomVolume';
import { Camera, createCamera, createModelViewMatrix, createPojectionMatrix, tooSmallToZero } from './webgl-util';
import { mat4, quat, vec3 } from 'gl-matrix';
import runExample from './runExample';

// WebGL shader source (GLSL)
const vertexShaderSource = require('./glsl/vr-volume.vert');
const fragmentShaderSource = [
  require('./glsl/vr-header.frag'),
  require('./glsl/vr-fn.frag'),
  require('./glsl/vr-main.frag')
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

export default class VRGLProgram extends ShaderProgram {

  /**
   * 1mm in normalized device coordinates.
   */
  private mmInNdc: number = 0.002;

  private highlightLabelIndex: number = -1;

  private uVolumeOffset: SetUniform['uniform3fv'];
  private uVolumeDimension: SetUniform['uniform3fv'];
  private uVoxelSizeInverse: SetUniform['uniform3fv'];
  private uBackground: SetUniform['uniform4fv'];
  private uRayStride: SetUniform['uniform3fv'];
  private uSkipStride: SetUniform['uniform3fv'];
  private uRayIntensityCoef: SetUniform['uniform1f'];
  private uInterpolationMode: SetUniform['uniform1i'];
  private uMVPMatrix: SetUniform['uniformMatrix4fv'];
  private uDebugFlag: SetUniform['uniform1i'];

  private aVertexIndexBuffer: VertexElementBufferer;
  private aVertexPositionBuffer: AttribBufferer;
  private aVertexColorBuffer: AttribBufferer;

  private volumeTexture: WebGLTexture | undefined = undefined;
  private volumeTextureLayout: TextureLayout | undefined = undefined;
  private uVolumeTextureSampler: SetUniform['uniform1i'];
  private uTextureSize: SetUniform['uniform2fv'];
  private uSliceGridSize: SetUniform['uniform2fv'];

  private transferFunctionTexture: WebGLTexture | undefined = undefined;
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

  private uProjectionMatrix: SetUniform['uniformMatrix4fv'];
  private uModelViewMatrix: SetUniform['uniformMatrix4fv'];

  constructor(gl: WebGLRenderingContext) {
    super(gl, vertexShaderSource, fragmentShaderSource);

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
    this.uProjectionMatrix = this.uniformMatrix4fv('uProjectionMatrix', false);
    this.uModelViewMatrix = this.uniformMatrix4fv('uModelViewMatrix', false);

    this.uEnableLabel = this.uniform1i('uEnableLabel');
    this.uEnableMask = this.uniform1i('uEnableMask');
    this.uDebugFlag = this.uniform1i('uDebugFlag');

    // Buffers
    this.aVertexIndexBuffer = this.vertexElementBuffer();
    this.aVertexPositionBuffer = this.attribBuffer('aVertexPosition', { size: 3, type: gl.FLOAT, usage: gl.STREAM_DRAW });
    this.aVertexColorBuffer = this.attribBuffer('aVertexColor', { size: 4, type: gl.FLOAT, usage: gl.STATIC_DRAW });

    // Textures
    this.uVolumeTextureSampler = this.uniform1i('uVolumeTextureSampler');
    this.uTextureSize = this.uniform2fv('uTextureSize');
    this.uSliceGridSize = this.uniform2fv('uSliceGridSize');

    this.uTransferFunctionSampler = this.uniform1i('uTransferFunctionSampler');

    // Labels
    this.uLabelSampler = this.uniform1i('uLabelSampler');
    this.uLabelTextureSize = this.uniform2fv('uLabelTextureSize');
    this.uLabelSliceGridSize = this.uniform2fv('uLabelSliceGridSize');
    this.uLabelBoundaryFrom = this.uniform3fv('uLabelBoundaryFrom');
    this.uLabelBoundaryTo = this.uniform3fv('uLabelBoundaryTo');
    this.uLabelLabelColor = this.uniform4fv('uLabelLabelColor');

  }

  public activate() {
    super.activate();
    this.gl.enable(this.gl.DEPTH_TEST);
  }

  public setMmInNdc(mmInNdc: number) {
    this.mmInNdc = mmInNdc;
  }

  public setDebugMode(debug: number) {
    this.uDebugFlag(debug);
  }

  public setDicomVolume(volume: DicomVolume, mask?: RawData) {

    const voxelSize = volume.getVoxelSize();
    const dimension = volume.getDimension();
    const offset = [0, 0, 0];

    this.uVoxelSizeInverse([
      1.0 / voxelSize[0],
      1.0 / voxelSize[1],
      1.0 / voxelSize[2]
    ]);
    this.uVolumeOffset(offset);
    this.uVolumeDimension(dimension);

    if (!this.volumeTexture) {
      console.time('loadVolumeIntoTexture');
      this.volumeTexture = this.createTexture();
      this.volumeTextureLayout = loadVolumeIntoTexture(
        this.gl,
        this.volumeTexture,
        volume,
        mask
      );
      console.timeEnd('loadVolumeIntoTexture');
    }

    const { textureSize, sliceGridSize } = this.volumeTextureLayout!;
    this.uTextureSize(textureSize);
    this.uSliceGridSize(sliceGridSize);
  }

  public setVolumeCuboid({
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
    this.bufferVertexColor();
  }

  public setTransferFunction(transferFunction: TransferFunction) {
    if (this.transferFunctionTexture === undefined) {
      this.transferFunctionTexture = this.createTexture();
    }

    console.time('loadTransferFunctionIntoTexture');
    loadTransferFunctionIntoTexture(
      this.gl,
      this.transferFunctionTexture,
      transferFunction
    );
    console.timeEnd('loadTransferFunctionIntoTexture');
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

  private bufferVertexPosition({
    dimension,
    offset,
    voxelSize
  }: {
    dimension: number[];
    offset: number[];
    voxelSize: number[];
  }) {
    //                                  |
    //             1.0 y                |        [7]------[6]
    //              ^  -1.0             |       / |      / |
    //              | / z               |     [3]------[2] |
    //              |/       x          |      |  |     |  |
    // -1.0 -----------------> +1.0     |      | [4]----|-[5]
    //            / |                   |      |/       |/
    //      +1.0 /  |                   |     [0]------[1]
    //           -1.0                   |
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
    this.aVertexPositionBuffer(data);

    const volumeVertexIndices = [
      0, 1, 2, 0, 2, 3, // Front face
      4, 5, 6, 4, 6, 7, // Back face
      8, 9, 10, 8, 10, 11, // Top face
      12, 13, 14, 12, 14, 15, // Bottom face
      16, 17, 18, 16, 18, 19, // Right face
      20, 21, 22, 20, 22, 23 // Left face
    ];
    this.aVertexIndexBuffer(volumeVertexIndices);

  }

  private bufferVertexColor() {
    const colors = [
      [1.0, 0.0, 0.0, 1.0], // Front face ... RED
      [1.0, 1.0, 0.0, 1.0], // Back face  ... YELLOW
      [0.0, 1.0, 0.0, 1.0], // Top face   ... GREEN
      [0.0, 0.5, 0.5, 1.0], // Bottom face .. CYAN
      [1.0, 0.0, 1.0, 1.0], // Right face ... PURPLE
      [0.0, 0.0, 1.0, 1.0] // Left face  ... BLUE
    ];
    let volumeVertexColors: number[] = [];
    for (let i in colors) {
      let color = colors[i];
      for (let j = 0; j < 4; j++) {
        volumeVertexColors = volumeVertexColors.concat(color);
      }
    }

    const data = new Float32Array(volumeVertexColors);
    this.aVertexColorBuffer(data);
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
    const [r, g, b, a] = background as number[];
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

  private camera: Camera = createCamera([0, 0, 0], [0, 0, 1], 1.0, [0, 1, 0]);

  public setCamera(camera: Camera) {
    this.camera = camera;
  }

  public setMaskEnabled(enabled: boolean) {
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

  // public run() {
  //   const gl = this.gl;

  //   // Activate textures
  //   if (this.volumeTexture) {
  //     this.uVolumeTextureSampler(0);
  //     gl.activeTexture(gl.TEXTURE0);
  //     gl.bindTexture(gl.TEXTURE_2D, this.volumeTexture);
  //   }

  //   // Transfer function
  //   if (this.transferFunctionTexture) {
  //     this.uTransferFunctionSampler(1);
  //     gl.activeTexture(gl.TEXTURE1);
  //     gl.bindTexture(gl.TEXTURE_2D, this.transferFunctionTexture);
  //   }

  //   if (this.highlightLabelIndex > -1) {
  //     const { texture } = this.labelTextures[this.highlightLabelIndex];
  //     this.uLabelSampler(2);
  //     this.gl.activeTexture(this.gl.TEXTURE2);
  //     this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
  //   }

  //   // Model/View/Projection
  //   const projectionMatrix = new Matrix4().fromArray(
  //     createPojectionMatrix(this.camera)
  //   );
  //   const modelViewMatrix = new Matrix4().fromArray(
  //     createModelViewMatrix(this.camera, this.mmInNdc)
  //   );
  //   // const mvpMatrix = projectionMatrix.multiply(modelViewMatrix);
  //   // this.uMVPMatrix(mvpMatrix.toArray());
  //   this.uProjectionMatrix(projectionMatrix.toArray());
  //   this.uModelViewMatrix(modelViewMatrix.toArray());

  //   // Enable attribute pointers
  //   gl.enableVertexAttribArray(this.getAttribLocation('aVertexPosition'));
  //   gl.enableVertexAttribArray(this.getAttribLocation('aVertexColor'));

  //   // Draw vertices
  //   gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
  // }

  public run() {
    const gl = this.gl;
    runExample(gl.canvas as HTMLCanvasElement);
    return;

    // Enable attribute pointers
    gl.enableVertexAttribArray(this.getAttribLocation('aVertexPosition'));
    gl.enableVertexAttribArray(this.getAttribLocation('aVertexColor'));

    const draw = () => {
      // Model/View/Projection
      const projectionMatrix = new Matrix4().fromArray(
        createPojectionMatrix(this.camera)
      );
      const modelViewMatrix = new Matrix4().fromArray(
        createModelViewMatrix(this.camera, this.mmInNdc)
      );
      // const mvpMatrix = projectionMatrix.multiply(modelViewMatrix);
      // this.uMVPMatrix(mvpMatrix.toArray());
      this.uProjectionMatrix(projectionMatrix.toArray());
      this.uModelViewMatrix(modelViewMatrix.toArray());

      // Draw vertices
      gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
    };

    //
    // 調査用
    //

    // 初期カメラ
    const initialCamera = (() => {
      const metadata = { "voxelCount": [512, 512, 132], "voxelSize": [0.468748, 0.46875, 0.6], "dicomWindow": { "level": 329, "width": 658 }, "pixelFormat": "int16" };
      // let c = createCamera([0,0,0], [0.5 * w, cos(150) * w, sin(150) * w], 0.5, [0, 0, 1]);
      const centerOfTheVolume = [
        metadata.voxelCount[0] * metadata.voxelSize[0] / 2,
        metadata.voxelCount[1] * metadata.voxelSize[1] / 2,
        metadata.voxelCount[2] * metadata.voxelSize[2] / 2,
      ];
      // const upperOfTheCenter = [
      //   centerOfTheVolume[0],
      //   centerOfTheVolume[1],
      //   centerOfTheVolume[2] + metadata.voxelCount[2] * metadata.voxelSize[2]
      // ];
      const pos = [
        centerOfTheVolume[0] - 80,
        centerOfTheVolume[1] + 80,
        centerOfTheVolume[2] + (metadata.voxelCount[2] * metadata.voxelSize[2] * 3)
      ];
      return createCamera(centerOfTheVolume, pos, 0.5, [0, 0, 1]);

      // const cos = (deg: number) => Math.cos(deg * Math.PI / 180);
      // const sin = (deg: number) => Math.sin(deg * Math.PI / 180);
      // const w = 512;
      // const cam30 = createCamera([0, 0, 0], [0.5 * w, cos(150) * w, sin(150) * w], 0.5, [0, 0, 1]);

    })();

    this.camera = initialCamera;

    // カメラ操作
    const translateCamera = (camera: Camera, dx: number, dy: number, dz: number): Camera => ({
      target: new Vector3().addVectors(camera.target, new Vector3(dx, dy, dz)),
      position: new Vector3().addVectors(camera.position, new Vector3(dx, dy, dz)),
      up: camera.up.clone(),
      zoom: camera.zoom
    });

    // 回転
    const cameraQuat = (camera: Camera, quat: Quaternion): Camera => {
      const targetToPosition = new Vector3().subVectors(camera.position, camera.target);

      const distToTarget = targetToPosition.length();
      const position = targetToPosition.normalize().applyQuaternion(quat)
        .multiplyScalar(distToTarget)
        .add(camera.target);
      tooSmallToZero(position);

      const up = camera.up.clone().normalize().applyQuaternion(quat);
      tooSmallToZero(up);

      return {
        target: camera.target.clone(),
        position,
        up,
        zoom: camera.zoom
      }
    };

    const rotateCameraAround = (camera: Camera, axis: Vector3, deg: number): Camera => {
      const quat = new Quaternion();
      quat.setFromAxisAngle(axis, deg * Math.PI / 180);

      return cameraQuat(camera, quat);
    };

    const rotateCameraHV = (camera: Camera, degH: number, degV: number = 0): Camera => {
      const positionToTarget = new Vector3().subVectors(camera.target, camera.position).normalize();
      const camUp = camera.up.clone().normalize();
      const leftToRightAxis = new Vector3().crossVectors(positionToTarget, camUp);

      const q = new Quaternion().setFromAxisAngle(leftToRightAxis, degH * Math.PI / 180);
      return cameraQuat(camera, q);
    }

    const drawScene = (deltaTime: number) => {
      const zAxis = new Vector3(0, 0, 1).normalize();
      // this.camera = rotateCameraAround(this.camera, zAxis, deltaTime * 10);
      this.camera = rotateCameraAround(this.camera, zAxis, deltaTime * 0.006 * 3);
      draw();
    };

    // Draw the scene repeatedly
    let tillMicroSeconds = 5000;
    let start: number = 0;
    let end: number = 0;
    let then = 0;
    let drawTimes = 0;
    function render(now: number) {
      if (!end){
        start = now;
        end = now + tillMicroSeconds;
      }
      if (end < now) {
        console.log((drawTimes / (tillMicroSeconds * 0.001)).toFixed(2) + ' [fps]');
        return;
      }

      const deltaTime = now - then;
      then = now;

      drawScene(deltaTime);
      ++drawTimes;

      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  }
}

// [WEbGLBuffer]
// https://developer.mozilla.org/ja/docs/Web/API/WebGLRenderingContext/bufferData
// target: GLenum, // ARRAY_BUFFER | ELEMENT_ARRAY_BUFFER
// usage: GLenum, // STATIC_DRAW | DYNAMIC_DRAW | STREAM_DRAW
// type: number, // UNSIGNED_SHORT | FLOAT
// size: number
