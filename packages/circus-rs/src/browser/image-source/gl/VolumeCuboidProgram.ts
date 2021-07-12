import { mat4 } from 'gl-matrix';
import ShaderProgram, { AttribBufferer, AttributeBuffer, VertexIndicesBuffer, SetUniform, VertexElementBufferer } from './ShaderProgram';
// import VolumeCuboid from './object/VolumeCuboid';

// WebGL shader source (GLSL)
const vertexShaderSource = `
attribute vec4 aVertexPosition;
attribute vec4 aVertexColor;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
varying lowp vec4 vColor;
void main(void) {
  gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
  vColor = aVertexColor;
}
`;
const fragmentShaderSource = `
varying lowp vec4 vColor;
void main(void) {
  gl_FragColor = vColor;
}
`;

export default class VolumeCuboidProgram extends ShaderProgram {

  private indices: VertexIndicesBuffer;
  private aVertexPosition: AttributeBuffer;
  private aVertexColor: AttributeBuffer;

  private uProjectionMatrix: SetUniform['uniformMatrix4fv'];
  private uModelViewMatrix: SetUniform['uniformMatrix4fv'];

  constructor(gl: WebGLRenderingContext) {
    super(gl, vertexShaderSource, fragmentShaderSource);
    gl.enable(gl.DEPTH_TEST);

    // Buffers
    this.indices = this.vertexIndices();
    this.aVertexPosition = this.attribute('aVertexPosition', { size: 3, type: gl.FLOAT, usage: gl.STATIC_DRAW });
    this.aVertexColor = this.attribute('aVertexColor', { size: 4, type: gl.FLOAT, usage: gl.STATIC_DRAW });

    // Uniforms
    this.uProjectionMatrix = this.uniformMatrix4fv('uProjectionMatrix', false);
    this.uModelViewMatrix = this.uniformMatrix4fv('uModelViewMatrix', false);
  }

  // public createVolumeCuboidSample() {
  //   return new VolumeCuboid(
  //     [0.468748, 0.46875, 0.6],
  //     [512, 512, 132]
  //   );
  // }

  // public setVolumeCuboid(volumeCuboid: VolumeCuboid = this.createVolumeCuboidSample()) {
  public setVolumeCuboid() {

    const positions = [
      // Front face
      -1.0, -1.0, 1.0,
      1.0, -1.0, 1.0,
      1.0, 1.0, 1.0,
      -1.0, 1.0, 1.0,

      // Back face
      -1.0, -1.0, -1.0,
      -1.0, 1.0, -1.0,
      1.0, 1.0, -1.0,
      1.0, -1.0, -1.0,

      // Top face
      -1.0, 1.0, -1.0,
      -1.0, 1.0, 1.0,
      1.0, 1.0, 1.0,
      1.0, 1.0, -1.0,

      // Bottom face
      -1.0, -1.0, -1.0,
      1.0, -1.0, -1.0,
      1.0, -1.0, 1.0,
      -1.0, -1.0, 1.0,

      // Right face
      1.0, -1.0, -1.0,
      1.0, 1.0, -1.0,
      1.0, 1.0, 1.0,
      1.0, -1.0, 1.0,

      // Left face
      -1.0, -1.0, -1.0,
      -1.0, -1.0, 1.0,
      -1.0, 1.0, 1.0,
      -1.0, 1.0, -1.0,
    ];
    this.aVertexPosition.buffer(new Float32Array(positions));
    this.aVertexPosition.pointer();
    // this.aVertexPosition(volumeCuboid.attribPosition());

    // const colors = new Float32Array(
    //   [
    //     [1.0, 1.0, 1.0, 1.0],    // Front face: white
    //     [1.0, 0.0, 0.0, 1.0],    // Back face: red
    //     [0.0, 1.0, 0.0, 1.0],    // Top face: green
    //     [0.0, 0.0, 1.0, 1.0],    // Bottom face: blue
    //     [1.0, 1.0, 0.0, 1.0],    // Right face: yellow
    //     [1.0, 0.0, 1.0, 1.0],    // Left face: purple
    //   ].reduce(
    //     (collection, color) => [...collection, ...color, ...color, ...color, ...color],
    //     []
    //   )
    // );
    const faceColors = [
      [1.0, 1.0, 1.0, 1.0],    // Front face: white
      [1.0, 0.0, 0.0, 1.0],    // Back face: red
      [0.0, 1.0, 0.0, 1.0],    // Top face: green
      [0.0, 0.0, 1.0, 1.0],    // Bottom face: blue
      [1.0, 1.0, 0.0, 1.0],    // Right face: yellow
      [1.0, 0.0, 1.0, 1.0],    // Left face: purple
    ];
    let colors: number[] = [];
    for (let j = 0; j < faceColors.length; ++j) {
      const c = faceColors[j];
      colors = colors.concat(c, c, c, c);
    }
    this.aVertexColor.buffer(new Float32Array(colors));
    this.aVertexColor.pointer();
    // this.aVertexColorBuffer(volumeCuboid.attribColor());

    const indices = [
      0, 1, 2, 0, 2, 3,    // front
      4, 5, 6, 4, 6, 7,    // back
      8, 9, 10, 8, 10, 11,   // top
      12, 13, 14, 12, 14, 15,   // bottom
      16, 17, 18, 16, 18, 19,   // right
      20, 21, 22, 20, 22, 23,   // left
    ];
    this.indices.buffer(indices);
    this.indices.bind();
    // this.elementBuffer(volumeCuboid.vertexIndex());
  }

  public run(cubeRotation: number) {
    const gl = this.gl;
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const projectionMatrix = this.projection();
    const modelViewMatrix = this.modelView(cubeRotation);

    // Enable attribute pointers
    this.aVertexPosition.enable();
    this.aVertexColor.enable();

    // useProgram
    if (!this.active) this.activate();

    // Set the shader uniforms
    this.uProjectionMatrix(projectionMatrix);
    this.uModelViewMatrix(modelViewMatrix);

    // Draw
    this.indices.draw();
  }

  private projection() {
    const gl = this.gl;
    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = (gl.canvas as HTMLCanvasElement).clientWidth / (gl.canvas as HTMLCanvasElement).clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix,
      fieldOfView,
      aspect,
      zNear,
      zFar);

    return projectionMatrix;
  }

  private modelView(cubeRotation: number) {
    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix = mat4.create();

    // Now move the drawing position a bit to where we want to
    // start drawing the square.

    mat4.translate(modelViewMatrix,     // destination matrix
      modelViewMatrix,     // matrix to translate
      [-0.0, 0.0, -6.0]);  // amount to translate
    mat4.rotate(modelViewMatrix,  // destination matrix
      modelViewMatrix,  // matrix to rotate
      cubeRotation,     // amount to rotate in radians
      [0, 0, 1]);       // axis to rotate around (Z)
    mat4.rotate(modelViewMatrix,  // destination matrix
      modelViewMatrix,  // matrix to rotate
      cubeRotation * .7,// amount to rotate in radians
      [0, 1, 0]);       // axis to rotate around (X)

    return modelViewMatrix;
  }
}
