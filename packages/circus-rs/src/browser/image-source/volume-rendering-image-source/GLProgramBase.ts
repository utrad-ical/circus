type ShaderType = 'fragment' | 'vertex';

export type SetUniform = {
  uniform1f(x: number): void;
  uniform1i(x: number): void;
  uniform2fv(v: number[]): void;
  uniform3fv(v: number[]): void;
  uniform4fv(v: number[]): void;
  uniformMatrix4fv: (v: number[]) => void;
};

export default abstract class GLProgramBase {
  protected gl: WebGLRenderingContext;
  protected abstract program: WebGLProgram;

  protected uniformLocationCache: Record<string, WebGLUniformLocation> = {};
  protected attribLocationCache: Record<string, number> = {};

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
  }

  public setViewport(x: number, y: number, width: number, height: number) {
    this.gl.viewport(x, y, width, height);
  }

  protected compileShader(shaderSource: string, shaderType: ShaderType) {
    const gl = this.gl;

    let shader: WebGLShader | null = null;
    switch (shaderType) {
      case 'fragment':
        shader = gl.createShader(gl.FRAGMENT_SHADER);
        break;
      case 'vertex':
        shader = gl.createShader(gl.VERTEX_SHADER);
        break;
      default:
        throw new TypeError('Invalid shader type: ' + shaderType);
    }

    if (!shader) throw new Error(`Creating ${shaderType} shader was Failed`);

    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    if (
      !gl.getShaderParameter(shader, gl.COMPILE_STATUS) &&
      !gl.isContextLost()
    ) {
      throw Error(
        gl.getShaderInfoLog(shader) ||
          `Something went wrong while compiling ${shaderType} shader.`
      );
    }
    return shader;
  }

  protected activateProgram(shaders: WebGLShader[]) {
    const gl = this.gl;
    const shaderProgram = gl.createProgram();
    if (!shaderProgram) throw new Error('Creating shader program was Failed');

    shaders.forEach(shader => gl.attachShader(shaderProgram, shader));

    gl.linkProgram(shaderProgram);
    if (
      !gl.getProgramParameter(shaderProgram, gl.LINK_STATUS) &&
      !gl.isContextLost()
    ) {
      throw Error(
        'Failed to link shaders: ' + gl.getProgramInfoLog(shaderProgram)
      );
    }
    gl.useProgram(shaderProgram);

    return shaderProgram;
  }

  protected getUniformLocation(name: string) {
    if (name in this.uniformLocationCache)
      return this.uniformLocationCache[name];

    const location = this.gl.getUniformLocation(this.program, name);
    if (location === null) throw new Error('Undefined uniform: ' + name);

    this.uniformLocationCache[name] = location;
    return location;
  }

  protected uniform1i(name: string): SetUniform['uniform1i'] {
    return v => {
      try {
        this.gl.uniform1i(this.getUniformLocation(name), v);
      } catch (e) {
        console.error(e);
      }
    };
  }
  protected uniform1f(name: string): SetUniform['uniform1f'] {
    return v => {
      try {
        this.gl.uniform1f(this.getUniformLocation(name), v);
      } catch (e) {
        console.error(e);
      }
    };
  }
  protected uniform2fv(name: string): SetUniform['uniform2fv'] {
    return v => {
      try {
        this.gl.uniform2fv(this.getUniformLocation(name), v);
      } catch (e) {
        console.error(e);
      }
    };
  }
  protected uniform3fv(name: string): SetUniform['uniform3fv'] {
    return v => {
      try {
        this.gl.uniform3fv(this.getUniformLocation(name), v);
      } catch (e) {
        console.error(e);
      }
    };
  }
  protected uniform4fv(name: string): SetUniform['uniform4fv'] {
    return v => {
      try {
        this.gl.uniform4fv(this.getUniformLocation(name), v);
      } catch (e) {
        console.error(e);
      }
    };
  }
  protected uniformMatrix4fv(
    name: string,
    transpose: boolean
  ): SetUniform['uniformMatrix4fv'] {
    return v => {
      try {
        this.gl.uniformMatrix4fv(this.getUniformLocation(name), transpose, v);
      } catch (e) {
        console.error(e);
      }
    };
  }

  protected createBuffer() {
    const buffer = this.gl.createBuffer();
    if (!buffer) throw new Error('Cannot create buffer');
    return buffer;
  }
  protected getAttribLocation(name: string) {
    if (name in this.attribLocationCache) return this.attribLocationCache[name];

    const location = this.gl.getAttribLocation(this.program, name);
    if (location === null) throw new Error('Undefined attribute: ' + name);

    this.attribLocationCache[name] = location;
    return location;
  }

  protected createTexture() {
    const texture = this.gl.createTexture();
    if (!texture) throw new Error('Failed to craete transfer function texture');
    return texture;
  }

  public resolveImageData() {
    const gl = this.gl;
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

    const imageData = new ImageData(
      Uint8ClampedArray.from(pixels),
      gl.drawingBufferWidth,
      gl.drawingBufferHeight
    );

    return imageData;
  }
}
