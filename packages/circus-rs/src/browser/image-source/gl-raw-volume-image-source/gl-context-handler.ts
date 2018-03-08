type GLContextHandlerOptions = {
  width: number;
  height: number;
};

/**
 * Generic utility wrapper to handle WebGL context
 * and various associated resources.
 */
export default class GLContextHandler {
  public gl: WebGLRenderingContext;
  public buffers: any = {};
  public attrIndex: any = {};
  public uniformIndex: any = {};

  private vertexShaderSource: string;
  private fragmentShaderSource: string;
  private attrNames: string[] = [];
  private uniformNames: string[] = [];

  constructor({ width, height }: GLContextHandlerOptions) {
    const backCanvas: HTMLCanvasElement = document.createElement('canvas');
    backCanvas.width = width;
    backCanvas.height = height;
    backCanvas.style.borderTop = '1px solid #666';

    // Handles lost contexts
    backCanvas.addEventListener(
      'webglcontextlost',
      this.glHandleContextLost.bind(this),
      false
    );
    backCanvas.addEventListener(
      'webglcontextrestored',
      this.glHandleContextRestored.bind(this),
      false
    );

    // Show the background canvas for debugging
    // const wrapper: HTMLElement | null = document.querySelector('#back-canvas');
    // if (wrapper) wrapper.insertBefore(backCanvas, wrapper.firstChild);

    // Retreives WebGL context
    const gl =
      backCanvas.getContext('webgl') ||
      backCanvas.getContext('experimental-webgl');
    if (!gl) throw new Error('Failed to get webgl context');

    gl.viewport(0, 0, width, height);

    this.gl = gl;
  }

  public registerVertexShader(source: string) {
    this.vertexShaderSource = source;
  }

  public registerFragmentShader(source: string) {
    this.fragmentShaderSource = source;
  }

  public registerAttr(name: string) {
    this.attrNames.push(name);
  }

  public registerUniform(name: string) {
    this.uniformNames.push(name);
  }

  public registerBuffer(name: string, target, type, itemSize: number = 1) {
    const gl = this.gl;

    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('Cannot create buffer');

    this.buffers[name] = {
      target: target,
      buffer: buffer,
      type: type,
      itemSize: itemSize,
      numItems: null
    };
  }

  public bufferData(name, srcData: ArrayBufferView, usage) {
    const gl = this.gl;

    if (!this.buffers[name]) throw Error('Not registered buffer: ' + name);

    if (srcData.byteLength % this.buffers[name].itemSize !== 0)
      throw Error('Invalid source data size');

    const { target, buffer, type, itemSize } = this.buffers[name];

    let typeSize;
    switch (type) {
      case gl.UNSIGNED_SHORT:
        typeSize = 2;
        break;
      case gl.FLOAT:
        typeSize = 4;
        break;
      default:
        throw Error('Unknown type');
    }

    this.buffers[name].numItems = srcData.byteLength / itemSize / typeSize;
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, srcData, usage);
  }

  public bindBufferToAttr(
    bufferName: string,
    attrName: string,
    normalized: boolean = false,
    stride: number = 0,
    offset: number = 0
  ) {
    const gl = this.gl;

    if (this.attrIndex[attrName] === undefined)
      throw Error('Not registered attribute: ' + attrName);

    if (!this.buffers[bufferName] === undefined)
      throw Error('Not registered buffer: ' + bufferName);

    const attrIndex = this.attrIndex[attrName];
    const { buffer, target, itemSize, type } = this.buffers[bufferName];

    gl.bindBuffer(target, buffer);

    gl.enableVertexAttribArray(attrIndex);
    gl.vertexAttribPointer(
      attrIndex,
      itemSize,
      type,
      normalized,
      stride,
      offset
    );
  }

  public drawBuffer(bufferName: string, mode, offset: number = 0) {
    const gl = this.gl;

    if (!this.buffers[bufferName])
      throw Error('Not registered buffer: ' + bufferName);

    const { buffer, target, type, numItems } = this.buffers[bufferName];
    gl.bindBuffer(target, buffer);

    if (target === gl.ELEMENT_ARRAY_BUFFER) {
      gl.drawElements(mode, numItems, type, offset);
    } else if (target === gl.ARRAY_BUFFER) {
      gl.drawArrays(mode, offset, numItems - offset);
    }
  }

  public setupShaders() {
    const gl = this.gl;

    // Compile shader sources
    if (!this.vertexShaderSource)
      throw Error('Vertex shader source is not registered.');

    if (!this.fragmentShaderSource)
      throw Error('Fragment shader source is not registered.');

    // Preparing vertex shader
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, this.vertexShaderSource);
    gl.compileShader(vertexShader);
    if (
      !gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS) &&
      !gl.isContextLost()
    )
      throw Error(
        gl.getShaderInfoLog(vertexShader) ||
          'Something went wrong while compiling vertex shader.'
      );

    // Preparing fragment shader
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, this.fragmentShaderSource);
    gl.compileShader(fragmentShader);
    if (
      !gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS) &&
      !gl.isContextLost()
    )
      throw Error(
        gl.getShaderInfoLog(fragmentShader) ||
          'Something went wrong while compiling fragment shader.'
      );

    // Create program, attach shaders, activate.
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (
      !gl.getProgramParameter(shaderProgram, gl.LINK_STATUS) &&
      !gl.isContextLost()
    )
      throw Error(
        'Failed to link shaders: ' + gl.getProgramInfoLog(shaderProgram)
      );
    gl.useProgram(shaderProgram);

    // Collect attributes, uniform location indices

    // attributes
    const attrIndex: any = {};
    this.attrNames.forEach(name => {
      const index = gl.getAttribLocation(shaderProgram, name);

      if (index !== null) {
        attrIndex[name] = index;
      } else {
        throw new Error('Invalid attribute name');
      }
    });
    this.attrIndex = attrIndex;

    // uniforms
    const uniformIndex: any = {};
    this.uniformNames.forEach(name => {
      const index = gl.getUniformLocation(shaderProgram, name);

      if (index !== null) {
        uniformIndex[name] = index;
      } else {
        throw new Error('Invalid uniformIndex name');
      }
    });
    this.uniformIndex = uniformIndex;
  }

  private glHandleContextLost(ev: Event) {
    ev.preventDefault();
    // cancelRequestAnimFrame(requestId);
    // suspend loading texture status
  }

  private glHandleContextRestored(ev: Event) {}
}
