import { Vector3, Matrix4, Vector2 } from 'three';
import { mat4 } from 'gl-matrix';
import ShaderProgram, { SetUniform } from './ShaderProgram';
import { Section, vectorizeSection } from '../../../common/geometry/Section';
import { compileShader, createModelViewMatrix, createPojectionMatrix, createProgram } from './webgl-util';

export interface Camera {
  position: Vector3;
  target: Vector3;
  up: Vector3;
  zoom: number;
}

// WebGL shader source (GLSL)
const vertexShaderSource = require('./glsl/VolumeCube.vert');
const fragmentShaderSource = require('./glsl/VolumeCube.frag');

export default class VolumeCubeProgram extends ShaderProgram {
  private mmToWorldCoords?: number;

  private uBackground: SetUniform['uniform4fv'];
  private uMVPMatrix: SetUniform['uniformMatrix4fv'];

  private aVertexPositionBuffer: WebGLBuffer;
  private aVertexPositionLocation: number;
  private aVertexColorBuffer: WebGLBuffer;
  private aVertexColorLocation: number;
  private aVertexIndexBuffer: WebGLBuffer;
  private aVertexCount: number = 0;

  constructor(gl: WebGLRenderingContext) {
    super(gl, vertexShaderSource, fragmentShaderSource);
    gl.enable(gl.DEPTH_TEST);

    // Uniforms
    this.uBackground = this.uniform4fv('uBackground');
    this.uMVPMatrix = this.uniformMatrix4fv('uMVPMatrix', false);

    // Attributes
    this.aVertexPositionLocation = this.getAttribLocation('aVertexPosition');
    this.aVertexPositionBuffer = this.createBuffer();
    this.aVertexColorLocation = this.getAttribLocation('aVertexColor');
    this.aVertexColorBuffer = this.createBuffer();

    // Vertices
    this.aVertexIndexBuffer = this.createBuffer();

  }

  public use() {
    super.use();
    this.aVertexPositionLocation = this.getAttribLocation('aVertexPosition');
    this.aVertexColorLocation = this.getAttribLocation('aVertexColor');
  }

  public setWorldCoordsBaseLength(mmBaseLength: number) {
    this.mmToWorldCoords = 1.0 / mmBaseLength;
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

    const cube = new VolumeCube(
      [0.468748, 0.46875, 0.6],
      [512, 512, 132]
    );

    // position
    gl.bindBuffer(gl.ARRAY_BUFFER, this.aVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cube.positionBufferData(), gl.STREAM_DRAW);
    gl.vertexAttribPointer(
      this.aVertexPositionLocation,
      3, // size
      gl.FLOAT, // type
      false, // normalized
      0, // stride
      0 // offset
    );

    // color
    gl.bindBuffer(gl.ARRAY_BUFFER, this.aVertexColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cube.colorBufferData(), gl.STREAM_DRAW);
    gl.vertexAttribPointer(
      this.aVertexColorLocation,
      4, // size
      gl.FLOAT, // type
      false, // normalized
      0, // stride
      0 // offset
    );

    // Vertex indices buffer array
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.aVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cube.indicesBufferData(), gl.STATIC_DRAW);
    this.aVertexCount = cube.indicesBufferCount();

    // Enable attribute pointers
    gl.enableVertexAttribArray(this.aVertexColorLocation);
    gl.enableVertexAttribArray(this.aVertexPositionLocation);

    // Draw vertices
    // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.aVertexIndexBuffer!);
    gl.drawElements(
      gl.TRIANGLES,
      this.aVertexCount,
      gl.UNSIGNED_SHORT, // 2 [byte]
      0
    );

    // gl.bindBuffer(gl.ARRAY_BUFFER, vbo1);
    // gl.vertexAttribPointer(attribute1["noitisop"], 2, gl.FLOAT, false, 8, 0);
    // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo1);
    // gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_SHORT, 0);
    // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    // gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
}

// [WEbGLBuffer]
// https://developer.mozilla.org/ja/docs/Web/API/WebGLRenderingContext/bufferData
// target: GLenum, // ARRAY_BUFFER | ELEMENT_ARRAY_BUFFER
// usage: GLenum, // STATIC_DRAW | DYNAMIC_DRAW | STREAM_DRAW
// type: number, // UNSIGNED_SHORT | FLOAT
// size: number

class VolumeCube {

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

  constructor(
    voxelSize: number[],
    dimension: number[],
    offset: number[] = [0, 0, 0]
  ) {
    const [vw, vh, vd] = voxelSize;
    const [ox, oy, oz] = [offset[0] * vw, offset[1] * vh, offset[2] * vd];
    const [w, h, d] = [dimension[0] * vw, dimension[1] * vh, dimension[2] * vd];

    // prettier-ignore
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
  }

  public positionBufferData() {
    return new Float32Array(this.positions);
  }

  public indicesBufferData() {
    return new Uint16Array(this.indices);
  }

  public indicesBufferCount() {
    return this.indices.length;
  }

  public colorBufferData() {
    const colors = [
      [1.0, 1.0, 0.0, 0.1], // Front face  ... YELLOW
      [1.0, 0.0, 0.0, 0.1], // Back face ... RED
      [0.0, 1.0, 0.0, 0.1], // Top face   ... GREEN
      [0.0, 0.5, 0.5, 0.1], // Bottom face .. CYAN
      [1.0, 0.0, 1.0, 0.1], // Right face ... PURPLE
      [0.0, 0.0, 1.0, 0.1] // Left face  ... BLUE
    ];
    let volumeVertexColors: number[] = [];
    for (let i in colors) {
      let color = colors[i];
      for (let j = 0; j < 4; j++) {
        volumeVertexColors = volumeVertexColors.concat(color);
      }
    }

    return new Float32Array(volumeVertexColors);
  }
}
