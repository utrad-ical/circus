import DicomVolume from '../../common/DicomVolume';
import { DicomVolumeMetadata } from './volume-loader/DicomVolumeLoader';
import ImageSource from './ImageSource';
import Viewer from '../viewer/Viewer';
import ViewState, { VrViewState, TransferFunctionEntry } from '../ViewState';
import DicomVolumeLoader from './volume-loader/DicomVolumeLoader';

// WebGL shader source (GLSL)
const vertexShaderSource = require('./volume-rendering-image-source/vertex-shader.vert');
const fragmentShaderSource = require('./volume-rendering-image-source/fragment-shader.frag');

import * as vec3 from 'gl-matrix/src/gl-matrix/vec3.js';
import * as vec4 from 'gl-matrix/src/gl-matrix/vec4.js';
import * as mat4 from 'gl-matrix/src/gl-matrix/mat4.js';

import WebGlContextManager from './volume-rendering-image-source/WebGlContextManager';

import buildTransferFunctionMap from './volume-rendering-image-source/buildTransferFunctionMap';

interface Camera {
  position: number[];
  target: number[];
  up: number[];
  zoom: number;
}

/**
 * Container for a WebGL texture.
 */
interface VolumeTexture {
  textureSize: [number, number];
  sliceGridSize: [number, number];
  sliceSize: [number, number];
  texture: WebGLTexture;
}

type GLRawVolumeImageSourceOption = {
  loader: DicomVolumeLoader;
};

export default class VolumeRenderingImageSource extends ImageSource {
  private meta: DicomVolumeMetadata;
  private volume: DicomVolume;

  private glHandler: WebGlContextManager;
  private volumeTexture: VolumeTexture;

  private readyState: Promise<void>;

  // viewState cache for checking update something on WegGL
  private transferFunction: TransferFunctionEntry[];
  private subVolume: any;

  private transferFunctionTexture: WebGLTexture;

  private baseScale: number;

  constructor({ loader }: GLRawVolumeImageSourceOption) {
    super();
    this.readyState = loader
      .loadMeta()
      .then((meta: any) => {
        this.meta = meta;

        const [mmVolumeWidth, mmVolumeHeight] = this.meta.voxelCount;
        this.baseScale = 2.0 / Math.max(mmVolumeWidth, mmVolumeHeight);

        return loader.loadVolume();
      })
      .then((volume: DicomVolume) => {
        this.volume = volume;
        return Promise.resolve();
      });
  }

  public ready(): Promise<void> {
    return this.readyState;
  }

  public initialState(viewer: Viewer): ViewState {
    const meta = this.meta;
    const [dx, dy, dz] = meta.voxelCount;

    const state: VrViewState = {
      type: 'vr',
      background: [0.0, 0.0, 0.0, 1.0],
      zoom: 2.0,
      horizontal: 0,
      vertical: 0,
      // Target will be used only in special cases
      // target: [dx * 0.5 * vw, dy * 0.5 * vh, dz * 0.5 * vd],
      subVolume: {
        offset: [0, 0, 0],
        dimension: [dx, dy, dz]
      },
      transferFunction: [
        /* [texture check] */
        { position: 0.0 / 65536.0, color: '#000000ff' },
        { position: 658.0 / 65536.0, color: '#ffffffff' },
        { position: 65536.0 / 65536.0, color: '#ffffffff' }
      ],
      quality: 1.0,
      interpolationMode: 'trilinear'
    };

    return state;
  }

  /**
   * Performs the main rendering.
   * @param viewer
   * @param viewState
   * @returns {Promise<ImageData>}
   */
  public async draw(viewer: Viewer, viewState: ViewState): Promise<ImageData> {
    const [viewportWidth, viewportHeight] = viewer.getResolution();
    const [vw, vh, vd] = this.volume.getVoxelSize();

    if (viewState.type !== 'vr') throw new Error('Unsupported view state.');

    // ビューアの幅と高さがわからないと、裏キャンバスが作れない？
    // 特殊な方法で回避できそうだが取り急ぎ draw 時にセットアップ(どっちみち、コンテキスト消失への対応は必要)
    if (!this.glHandler) {
      this.glHandler = new WebGlContextManager({
        width: viewportWidth,
        height: viewportHeight
      });
      this.glSetup();
    }

    const glh = this.glHandler;
    const gl = glh.gl;

    /* Prepare boundary box vertexes */
    if (this.subVolume !== viewState.subVolume) {
      glh.registerBuffer(
        'VolumeVertexPositionBuffer',
        gl.ARRAY_BUFFER,
        gl.FLOAT,
        3
      );
      glh.registerBuffer(
        'VolumeVertexPositionIndex',
        gl.ELEMENT_ARRAY_BUFFER,
        gl.UNSIGNED_SHORT,
        1
      );
      glh.registerBuffer(
        'VolumeVertexColorBuffer',
        gl.ARRAY_BUFFER,
        gl.FLOAT,
        4
      );

      const subVolume = viewState.subVolume || {
        offset: [0, 0, 0],
        dimension: this.volume.getDimension()
      };
      this.updateVolumeBoxBuffer(subVolume);

      gl.uniform3fv(glh.uniformIndex['uVolumeOffset'], subVolume.offset);
      gl.uniform3fv(glh.uniformIndex['uVolumeDimension'], subVolume.dimension);
      gl.uniform3fv(glh.uniformIndex['uVoxelSizeInverse'], [
        1.0 / vw,
        1.0 / vh,
        1.0 / vd
      ]);

      this.subVolume = subVolume;
    }

    // background setup
    const [r, g, b, a] = viewState.background as number[];
    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform4fv(glh.uniformIndex['uBackground'], [r, b, g, a]);

    // interpolation mode
    switch (viewState.interpolationMode) {
      case 'trilinear':
        gl.uniform1i(glh.uniformIndex['uInterpolationMode'], 1);
        break;
      case 'vr-mask-custom':
        gl.uniform1i(glh.uniformIndex['uInterpolationMode'], 2);
        break;
      case 'nearestNeighbor':
      default:
        gl.uniform1i(glh.uniformIndex['uInterpolationMode'], 0);
        break;
    }

    /* Prepare camera */
    const camera = this.createCamera(viewState);

    /* Ray configration */
    const ray = vec3.create();
    vec3.subtract(ray, camera.target, camera.position);
    vec3.normalize(ray, ray);
    gl.uniform3fv(glh.uniformIndex['uRayDirection'], ray);

    const uRayStepLength =
      2.0 / (viewState.zoom || 2.0) / (viewState.quality || 1.0);

    const uMaxSteps = Math.ceil(
      vec3.length(
        [
          this.subVolume.dimension[0] * vw,
          this.subVolume.dimension[1] * vh,
          this.subVolume.dimension[2] * vd
        ]
      ) / uRayStepLength
    );
    const uRayIntensityCoef = viewState.rayIntensityCoef || 0.65; // [0; 1]
    gl.uniform1i(glh.uniformIndex['uMaxSteps'], uMaxSteps);
    gl.uniform1f(glh.uniformIndex['uRayStepLength'], uRayStepLength);
    gl.uniform1f(glh.uniformIndex['uRayIntensityCoef'], uRayIntensityCoef);

    /* Projection matrix */
    const near = 0.001;
    const far = 100; // far 1.5

    const projectionMatrix = mat4.create();
    mat4.ortho(projectionMatrix, -1.0, 1.0, -1.0, 1.0, near, far);

    gl.uniformMatrix4fv(glh.uniformIndex['uPMatrix'], false, projectionMatrix);

    /* Prepare texture */

    // transfer function texture
    if (
      viewState.transferFunction !== this.transferFunction &&
      viewState.transferFunction
    ) {
      this.updateTransferFunction(viewState.transferFunction);
      this.transferFunction = viewState.transferFunction;
    }

    gl.uniform1i(glh.uniformIndex['uTransferFunctionSampler'], 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.transferFunctionTexture);

    // volume texture
    const { textureSize, sliceGridSize, texture } = this.volumeTexture;
    gl.uniform1i(glh.uniformIndex['uVolumeTextureSampler'], 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.uniform2fv(glh.uniformIndex['uTextureSize'], textureSize);
    gl.uniform2fv(glh.uniformIndex['uSliceGridSize'], sliceGridSize);
    // gl.uniform2fv( glh.uniformIndex["uSliceSize"], sliceSize );
    gl.bindTexture(gl.TEXTURE_2D, texture);

    this.glDrawVolumeBox(camera, viewState);

    /**
     * Resolve image data
     */

    const pixels = new Uint8Array(
      gl.drawingBufferWidth * gl.drawingBufferHeight * 4
    );
    gl.readPixels(
      0,
      0,
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels
    );

    // v これだと上下反転で取得されてしまう
    const imageData = new ImageData(
      Uint8ClampedArray.from(pixels),
      gl.drawingBufferWidth,
      gl.drawingBufferHeight
    );

    // v 上下反転しつつimageDataを作成
    // const imageData = new ImageData( gl.drawingBufferWidth, gl.drawingBufferHeight );
    // const pixelData = imageData.data;

    // for( let i = 0; i < gl.drawingBufferHeight; i++ ) {
    // const srcOffset = (gl.drawingBufferWidth-1 - i) * gl.drawingBufferWidth * 4;
    // const destOffset = i * gl.drawingBufferWidth * 4;

    // // Which is better, (A) or (B) ?
    // /* (A) */ // pixelData.set( pixels.slice(srcOffset, srcOffset + gl.drawingBufferWidth * 4 ), destOffset );
    // /* (B) */
    // const w = 4 * gl.drawingBufferWidth;
    // for( let j = 0; j < w; j++ ) {
    // pixelData[ destOffset + j ] = pixels[ srcOffset + j ];
    // }
    // }

    return imageData;
  }

  /**
   * viewState のカメラ定義から、レンダリングに使用する定義に調整
   * viewState.rotate
   */
  // private debugCount: number = 0;
  private createCamera(viewState): Camera {
    const [
      mmVolumeWidth,
      mmVolumeHeight,
      mmVolumeDepth
    ] = this.volume.getMmDimension();

    const camera: Camera = {
      // 同次座標系
      position: [
        mmVolumeWidth * 0.5,
        mmVolumeHeight * 0.5,
        mmVolumeDepth * 0.5 +
          Math.max(mmVolumeWidth, mmVolumeHeight, mmVolumeDepth) * 100, // 十分遠ければ良い。ズームの最大を意識する
        1
      ],
      target: [
        mmVolumeWidth * 0.5,
        mmVolumeHeight * 0.5,
        mmVolumeDepth * 0.5,
        1
      ],
      up: [0, 1, 0, 0],

      zoom: 1.0
    };

    const rotateCamera = mat4.create();

    // rotate camera
    mat4.translate(rotateCamera, rotateCamera, [
      camera.target[0],
      camera.target[1],
      camera.target[2]
    ]);
    if (Math.floor(viewState.horizontal) !== 0) {
      const horizontalRotateAxis = camera.up;
      mat4.rotate(
        rotateCamera,
        rotateCamera,
        Math.PI / 180.0 * viewState.horizontal,
        horizontalRotateAxis
      );
    }
    if (Math.floor(viewState.vertical) !== 0) {
      const eyeLine = vec3.create();
      vec3.subtract(eyeLine, camera.target, camera.position);
      const verticalRotateAxis = vec3.create();
      vec3.cross(verticalRotateAxis, eyeLine, camera.up);
      mat4.rotate(
        rotateCamera,
        rotateCamera,
        Math.PI / 180.0 * viewState.vertical,
        verticalRotateAxis
      );
    }
    mat4.translate(rotateCamera, rotateCamera, [
      -camera.target[0],
      -camera.target[1],
      -camera.target[2]
    ]);
    vec4.transformMat4(camera.position, camera.position, rotateCamera);

    // zoom
    camera.zoom = viewState.zoom || 1.0;

    // ---------------------------
    // - prepare default camera
    // ---------------------------
    const baseMatrix = this.baseMatrix();
    vec4.transformMat4(camera.position, camera.position, baseMatrix);
    vec4.transformMat4(camera.target, camera.target, baseMatrix);

    // --------------------

    return camera;
  }

  private baseMatrix(m?: mat4): mat4 {
    m = m || mat4.create();

    // 2. scale to world coords
    mat4.scale(m, m, [this.baseScale, this.baseScale, this.baseScale]);

    // 1. move to center(0,0,0) @ model coords system
    const [
      mmVolumeWidth,
      mmVolumeHeight,
      mmVolumeDepth
    ] = this.volume.getMmDimension();
    mat4.translate(m, m, [
      -mmVolumeWidth / 2,
      -mmVolumeHeight / 2,
      -mmVolumeDepth / 2
    ]);

    return m;
  }

  /**
   * Prepare a color mapping texture from the given transfer function
   * and send it to GPU. Each texel in the texture corresponds to
   * each intensity value in the original image represented as a Uint16 value.
   * The texture size is 256 x 256 x 4bpp (fixed) or 240KiB.
   */
  protected updateTransferFunction(transferFunction): void {
    const glh = this.glHandler;
    const gl = glh.gl;

    if (!this.transferFunctionTexture) {
      const texture = gl.createTexture();
      if (!texture)
        throw new Error('Failed to craete transfer function texture');
      this.transferFunctionTexture = texture;
    }

    gl.bindTexture(gl.TEXTURE_2D, this.transferFunctionTexture);

    const buffer = buildTransferFunctionMap(transferFunction, 65536);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      256,
      256,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      buffer
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // unbind texture
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /**
   * Packs the original volume into a (large) texture and send it to GPU.
   * Each Z-slice of the volume will be arranged as a tile.
   * As of WegGL 1.0, there is no straightforward texture format
   * to store 2-byte integers.
   * As a workaround, we use gl.LUMINANCE_ALPHA format
   * which is 16bit per texel. (We absolutely need to disable interpolation!)
   */
  public bufferVolumeTexture(gl, volume): VolumeTexture {
    const [width, height, depth] = volume.getDimension();

    // Calculates the number of tile rows and columns required to store the
    // entire volume.

    // Returns ceil(log2(n)).
    const getMinPower2 = n => {
      let m = 0;
      while (1 << ++m < n);
      return m;
    };

    const sliceSize: [number, number] = [
      1 << getMinPower2(width),
      1 << getMinPower2(height)
    ];

    // Calculates the number of tile rows and columns.
    // https://qiita.com/YVT/items/c695ab4b3cf7faa93885
    const zpow = getMinPower2(depth);
    const sliceGridSize: [number, number] = [
      1 << (Math.floor(zpow / 2) + zpow % 2),
      1 << Math.floor(zpow / 2)
    ];
    const getSliceGridIndex = (z: number) => [
      z % sliceGridSize[0],
      Math.floor(z / sliceGridSize[0])
    ];

    // The actual size in texels
    const textureSize: [number, number] = [
      sliceSize[0] * sliceGridSize[0],
      sliceSize[1] * sliceGridSize[1]
    ];

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const texBuffer = new Uint8Array((textureSize[0] * textureSize[1]) << 1);
    const volumeRaw = new Uint16Array(volume.data);

    // Copy volume data into the tiled texture
    for (let z = 0; z < depth; z++) {
      const gridIndex = getSliceGridIndex(z);
      const ox = gridIndex[0] * sliceSize[0];
      const oy = gridIndex[1] * sliceSize[1];

      for (let y = 0; y < height; y++) {
        const o = (oy + y) * textureSize[0] + ox;

        for (let x = 0; x < width; x++) {
          const srcOffset = x + (y + z * height) * width;
          const pixel = volumeRaw[srcOffset];

          const texOffset = (o + x) << 1;
          texBuffer[texOffset] = pixel & 0xff;
          texBuffer[texOffset + 1] = pixel >> 8;
        }
      }
    }

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE_ALPHA,
      textureSize[0],
      textureSize[1],
      0,
      gl.LUMINANCE_ALPHA,
      gl.UNSIGNED_BYTE,
      texBuffer
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, null);

    return { textureSize, sliceGridSize, sliceSize, texture };
  }

  private glSetup(): void {
    const glh = this.glHandler;
    const gl = glh.gl;

    glh.registerVertexShader(vertexShaderSource);
    glh.registerFragmentShader(fragmentShaderSource);

    glh.registerAttr('aVertexPosition');
    glh.registerAttr('aVertexColor');
    glh.registerUniform('uMVMatrix');
    glh.registerUniform('uPMatrix');

    glh.registerUniform('uVoxelSizeInverse');
    glh.registerUniform('uVolumeDimension');
    glh.registerUniform('uVolumeOffset');

    glh.registerUniform('uVolumeTextureSampler');
    glh.registerUniform('uTextureSize');
    glh.registerUniform('uSliceGridSize');

    glh.registerUniform('uTransferFunctionSampler');

    glh.registerUniform('uRayDirection');
    glh.registerUniform('uRayStepLength');
    glh.registerUniform('uRayIntensityCoef');
    glh.registerUniform('uMaxSteps');

    glh.registerUniform('uBackground');
    glh.registerUniform('uInterpolationMode');

    glh.setupShaders();

    this.volumeTexture = this.bufferVolumeTexture(
      this.glHandler.gl,
      this.volume
    );

    gl.enable(gl.DEPTH_TEST);
  }

  private updateVolumeBoxBuffer({ dimension, offset }): void {
    // calculated in world-coords

    const glh = this.glHandler;
    const gl = glh.gl;

    const [vw, vh, vd] = this.volume.getVoxelSize();
    const [ox, oy, oz] = [offset[0] * vw, offset[1] * vh, offset[2] * vd];
    const [w, h, d] = [dimension[0] * vw, dimension[1] * vh, dimension[2] * vd];

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

    // prettier-ignore
    const volumeVertexPosition = [
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
    glh.bufferData(
      'VolumeVertexPositionBuffer',
      new Float32Array(volumeVertexPosition),
      gl.STATIC_DRAW
    );

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
    glh.bufferData(
      'VolumeVertexPositionIndex',
      new Uint16Array(volumeVertexIndices),
      gl.STATIC_DRAW
    );

    // Vertex color array (for debugging purpose)
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
    glh.bufferData(
      'VolumeVertexColorBuffer',
      new Float32Array(volumeVertexColors),
      gl.STATIC_DRAW
    );
  }

  private glDrawVolumeBox(camera: Camera, viewState: VrViewState): void {
    const glh = this.glHandler;
    const gl = glh.gl;

    const [
      mmVolumeWidth,
      mmVolumeHeight,
      mmVolumeDepth
    ] = this.volume.getMmDimension();

    // Prepare model matrix
    const modelMatrix = mat4.create();
    mat4.scale(modelMatrix, modelMatrix, [
      this.baseScale * camera.zoom,
      this.baseScale * camera.zoom,
      this.baseScale * camera.zoom
    ]);

    // Place the box representing the (sub)volume at the target
    let target = vec3.create();
    if (viewState.target) {
      target.set([...viewState.target]);
    } else if (viewState.subVolume) {
      const [w, h, d] = this.volume.getVoxelSize();
      target.set([
        (viewState.subVolume.offset[0] +
          viewState.subVolume.dimension[0] * 0.5) *
          w,
        (viewState.subVolume.offset[1] +
          viewState.subVolume.dimension[1] * 0.5) *
          h,
        (viewState.subVolume.offset[2] +
          viewState.subVolume.dimension[2] * 0.5) *
          d
      ]);
    } else {
      target.set([
        mmVolumeWidth * 0.5,
        mmVolumeHeight * 0.5,
        mmVolumeDepth * 0.5
      ]);
    }
    vec3.scale(target, target, -1);
    mat4.translate(modelMatrix, modelMatrix, target);

    // Prepare view matrix
    const viewMatrix = mat4.create();

    try {
      mat4.lookAt(viewMatrix, camera.position, camera.target, camera.up);
    } catch (e) {
      mat4.identity(viewMatrix);
    }

    // Model view
    const modelViewMatrix = mat4.create();
    mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
    gl.uniformMatrix4fv(glh.uniformIndex['uMVMatrix'], false, modelViewMatrix);

    // Bind vertex and color buffers
    glh.bindBufferToAttr('VolumeVertexPositionBuffer', 'aVertexPosition');
    glh.bindBufferToAttr('VolumeVertexColorBuffer', 'aVertexColor');

    // Draw
    glh.drawBuffer('VolumeVertexPositionIndex', gl.TRIANGLES);
  }
}

/*
function bufferVolumeTextureDebugger(
  textureSize,
  texBuffer,
  ox = 0,
  oy = 0,
  sliceSize = [512, 512]
): void {
  const backCanvas: HTMLCanvasElement = document.createElement('canvas');
  [backCanvas.width, backCanvas.height] = sliceSize;
  backCanvas.style.border = '3px solid #f00';
  const wrapper: HTMLElement | null = document.querySelector('#back-canvas');
  if (wrapper) wrapper.insertBefore(backCanvas, wrapper.firstChild);

  const applyWindow = (width: number, level: number, pixel: number): number => {
    let value = Math.round((pixel - level + width / 2) * (255 / width));
    if (value > 255) {
      value = 255;
    } else if (value < 0) {
      value = 0;
    }
    return value;
  };

  const sliceBuf = new Uint8ClampedArray(512 * 512 * 4);
  for (let yy = 0; yy < 512; yy++) {
    for (let xx = 0; xx < 512; xx++) {
      const o = (512 * yy + xx) << 2;
      const texOffset = ((oy + yy) * textureSize[0] + (ox + xx)) << 1;

      const v = texBuffer[texOffset] + (texBuffer[texOffset + 1] << 8);

      const pixel = applyWindow(600, 300, v);

      sliceBuf[o] = pixel;
      sliceBuf[o + 1] = pixel;
      sliceBuf[o + 2] = pixel;
      sliceBuf[o + 3] = 0xff;
    }
  }

  const slice = new ImageData(sliceBuf, 512, 512);
  const ctx = backCanvas.getContext('2d');
  if (ctx && slice) ctx.putImageData(slice, 0, 0);
}
*/
