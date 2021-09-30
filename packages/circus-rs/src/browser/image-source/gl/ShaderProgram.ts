import { compileShader, createProgram } from './webgl-util';

export type SetUniform = {
  uniform1f(x: number): void;
  uniform1i(x: number): void;
  uniform2fv(v: number[]): void;
  uniform3fv(v: number[]): void;
  uniform4fv(v: number[]): void;
  uniformMatrix4fv: (v: number[]) => void;
};

type AttrBufferOptions = {
  size: number;
  type?: number; // default: gl.FLOAT
  normalized?: boolean; // default: false
  stride?: number; // default: 0
  // offset?: number; // default 0 // Not assuming non zero offset on current version.
  usage?: number; // default: gl.STREAM_DRAW
};
export type AttribBufferer = (data?: BufferSource) => void;
export type VertexElementBufferer = (indices?: number[]) => WebGLBuffer;

export type AttributeBuffer = ReturnType<ShaderProgram['attribute']>;
export type VertexIndicesBuffer = ReturnType<ShaderProgram['vertexIndices']>;

export default abstract class ShaderProgram {
  protected gl: WebGLRenderingContext;
  protected program: WebGLProgram;
  protected buffers: WebGLBuffer[] = [];
  protected textures: WebGLTexture[] = [];

  protected uniformLocationCache: Record<string, WebGLUniformLocation> = {};
  protected attribLocationCache: Record<string, number> = {};
  protected markAsBuffered: Record<string, boolean> = {};

  protected active: boolean = false;

  constructor(
    gl: WebGLRenderingContext,
    vertexShaderSource: string,
    fragmentShaderSource: string
  ) {
    this.gl = gl;
    const vertexShader = compileShader(this.gl, 'vertex', vertexShaderSource);
    const fragmentShader = compileShader(
      this.gl,
      'fragment',
      fragmentShaderSource
    );
    this.program = createProgram(gl, vertexShader, fragmentShader);
  }

  public isActive() {
    return this.active;
  }

  public activate() {
    this.gl.useProgram(this.program);
    this.active = true;
  }

  public deactivate() {
    // this.uniformLocationCache = {};
    // this.attribLocationCache = {};
    this.markAsBuffered = {};
    this.active = false;
  }

  public dispose() {
    this.buffers.forEach(buffer => this.gl.deleteBuffer(buffer));
    this.textures.forEach(texture => this.gl.deleteTexture(texture));
    this.gl.deleteProgram(this.program);
  }

  //
  // Uniform
  //

  protected getUniformLocation(name: string) {
    if (name in this.uniformLocationCache)
      return this.uniformLocationCache[name];

    const location = this.gl.getUniformLocation(this.program, name);
    if (location === null) throw new Error('Undefined uniform: ' + name);

    this.uniformLocationCache[name] = location;
    return location;
  }
  protected uniform1i(name: string): (x: number) => void {
    return v => {
      try {
        this.gl.uniform1i(this.getUniformLocation(name), v);
      } catch (e) {
        console.error(`uniform1i(${name})`);
        console.error(e);
      }
    };
  }
  protected uniform1f(name: string): (x: number) => void {
    return v => {
      try {
        this.gl.uniform1f(this.getUniformLocation(name), v);
      } catch (e) {
        console.error(`uniform1f(${name})`);
        console.error(e);
      }
    };
  }
  protected uniform2fv(name: string): (v: number[]) => void {
    return v => {
      try {
        this.gl.uniform2fv(this.getUniformLocation(name), v);
      } catch (e) {
        console.error(`uniform2fv(${name})`);
        console.error(e);
      }
    };
  }
  protected uniform3fv(name: string): (v: number[]) => void {
    return v => {
      try {
        this.gl.uniform3fv(this.getUniformLocation(name), v);
      } catch (e) {
        console.error(`uniform3fv(${name})`);
        console.error(e);
      }
    };
  }
  protected uniform4fv(name: string): (v: number[]) => void {
    return v => {
      try {
        this.gl.uniform4fv(this.getUniformLocation(name), v);
      } catch (e) {
        console.error(`uniform4fv(${name})`);
        console.error(e);
      }
    };
  }
  protected uniformMatrix4fv(
    name: string,
    transpose: boolean
  ): (v: number[]) => void {
    return v => {
      try {
        this.gl.uniformMatrix4fv(this.getUniformLocation(name), transpose, v);
      } catch (e) {
        console.error(`uniformMatrix4fv(${name})`);
        console.error(e);
      }
    };
  }

  //
  // Buffer (shared)
  //

  private createBuffer() {
    const buffer = this.gl.createBuffer();
    if (!buffer) throw new Error('Cannot create buffer');
    this.buffers.push(buffer);
    return buffer;
  }

  //
  // vertex buffer
  //

  protected getAttribLocation(name: string) {
    if (name in this.attribLocationCache) return this.attribLocationCache[name];

    const location = this.gl.getAttribLocation(this.program, name);
    if (location === null) throw new Error('Undefined attribute: ' + name);

    this.attribLocationCache[name] = location;
    return location;
  }

  /**
   * Define attribute buffer.
   */
  protected attribBuffer(
    name: string = 'position',
    {
      size,
      type = this.gl.FLOAT,
      normalized = false,
      stride = 0,
      usage = this.gl.STREAM_DRAW
    }: AttrBufferOptions
  ): AttribBufferer {
    const gl = this.gl;

    // Not assuming non zero offset on current version.
    const offset = 0;

    const buffer = this.createBuffer();

    return (data?: BufferSource) => {
      if (data) {
        if (!this.markAsBuffered[name]) {
          // Initialize buffer
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, data, usage);
          this.markAsBuffered[name] = true;
        } else {
          // Reuse buffer
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
        }
      }
      const location = this.getAttribLocation(name);
      gl.vertexAttribPointer(location, size, type, normalized, stride, offset);
      gl.enableVertexAttribArray(location);
    };
  }
  protected attribute(
    name: string = 'position',
    {
      size,
      type = this.gl.FLOAT,
      normalized = false,
      stride = 0,
      usage = this.gl.STREAM_DRAW
    }: AttrBufferOptions
  ) {
    const gl = this.gl;

    // Not assuming non zero offset on current version.
    const offset = 0;

    const buffer = this.createBuffer();
    const location = this.getAttribLocation(name);

    return {
      buffer: (data: BufferSource) => {
        if (!this.markAsBuffered[name]) {
          // Initialize buffer
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, data, usage);
          this.markAsBuffered[name] = true;
        } else {
          // Reuse buffer
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
        }
        return buffer;
      },
      bind: () => gl.bindBuffer(gl.ARRAY_BUFFER, buffer),
      pointer: () =>
        gl.vertexAttribPointer(
          location,
          size,
          type,
          normalized,
          stride,
          offset
        ),
      enable: () => gl.enableVertexAttribArray(location),
      disable: () => gl.disableVertexAttribArray(location)
    };
  }

  protected vertexIndices(type = this.gl.STATIC_DRAW) {
    const gl = this.gl;
    const buffer = this.createBuffer();

    const offset = 0;
    let count = 0;

    return {
      buffer: (indices: number[]) => {
        count = indices.length;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), type);
      },
      bind: () => {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
      },
      draw: () => {
        gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, offset);
      }
    };
  }

  protected vertexElementBuffer(
    type = this.gl.STATIC_DRAW
  ): VertexElementBufferer {
    const gl = this.gl;
    const buffer = this.createBuffer();

    return (indices?: number[]) => {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
      if (indices) {
        // Vertex index buffer array
        const data = new Uint16Array(indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, type);
      }
      return buffer;
    };
  }

  //
  protected createTexture() {
    const texture = this.gl.createTexture();
    if (!texture) throw new Error('Failed to craete transfer function texture');
    this.textures.push(texture);
    return texture;
  }
}
