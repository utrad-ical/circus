import { Vector2, Vector3, Matrix4 } from 'three';
import { mat4 } from 'gl-matrix';
import { Section, vectorizeSection } from '../../../common/geometry/Section'

export interface Camera {
    position: Vector3;
    target: Vector3;
    up: Vector3;
    zoom: number;
}

export function resolveImageData(gl: WebGLRenderingContext) {
    console.time('resolveImageData');
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
        new Uint8ClampedArray(pixels.buffer),
        gl.drawingBufferWidth,
        gl.drawingBufferHeight
    );
    console.timeEnd('resolveImageData');

    return imageData;
}

export function createCamera(
    t: number[] = [256, 256, 66],
    p: number[] = [1000, 1000, 1000],
    zoom: number = 0.5,
    u: number[] = [0, 1, 0],
): Camera {
    const target = new Vector3().fromArray(t);
    const position = new Vector3().fromArray(p);
    const up = new Vector3().fromArray(u);
    return { position, target, up, zoom };
}

export function createCameraToLookDownXYPlane(
    section: Section,
    voxelCount: [number, number, number],
    voxelSize: [number, number, number]
): Camera {
    const { origin, xAxis, yAxis } = vectorizeSection(section);
    const volumeSizeMm = new Vector3(
        voxelCount[0] * voxelSize[0],
        voxelCount[1] * voxelSize[1],
        voxelCount[2] * voxelSize[2]
    );

    // The camera target is The center of the volume.
    const target = volumeSizeMm.clone().multiplyScalar(0.5);

    const position = new Vector3(volumeSizeMm.x * 0.6, volumeSizeMm.y * 0.6, volumeSizeMm.z * 300);
    const up = new Vector3(0, 1, 0);

    // Determine camera zoom from viewport diagonal length
    const origDiagonalLength = new Vector2(volumeSizeMm.x, volumeSizeMm.y).length();
    const currentDiagonalLength = new Vector3()
        .addVectors(xAxis, yAxis)
        .length();
    const zoom = origDiagonalLength / currentDiagonalLength;

    return { position, target, up, zoom };
}

export function createCameraToLookSection(
    section: Section,
    voxelCount: [number, number, number],
    voxelSize: [number, number, number]
): Camera {
    const { origin, xAxis, yAxis } = vectorizeSection(section);
    const [x, y, z] = voxelCount;
    const volumeSizeMm = new Vector3(
        voxelCount[0] * voxelSize[0],
        voxelCount[1] * voxelSize[1],
        voxelCount[2] * voxelSize[2]
    );

    // The camera target is The center of the section.
    const target = origin
        .clone()
        .addScaledVector(xAxis, 0.5)
        .addScaledVector(yAxis, 0.5);

    // Ensure the camera position is outside the (sub)volume.
    // And the position is preferably close to the volume to reduce the cost in the fragment shader.
    const distancesToEachVertex = [
        new Vector3(x, 0, 0),
        new Vector3(0, y, 0),
        new Vector3(0, 0, z),
        new Vector3(x, y, 0),
        new Vector3(0, y, z),
        new Vector3(x, 0, z),
        new Vector3(x, y, z),
    ].map(v => v.distanceTo(target));

    const farEnough = Math.max(...distancesToEachVertex);

    const eyeLine = new Vector3()
        .crossVectors(xAxis, yAxis)
        .normalize()
        .multiplyScalar(farEnough);

    const position = new Vector3().addVectors(target, eyeLine);

    const up = yAxis.clone().normalize();

    // Determine camera zoom from viewport diagonal length
    const origDiagonalLength = new Vector2(volumeSizeMm.x, volumeSizeMm.y).length();
    const currentDiagonalLength = new Vector3()
        .addVectors(xAxis, yAxis)
        .length();
    const zoom = origDiagonalLength / currentDiagonalLength;

    // Return the camera which is adjusted the coordinate system to gl coodinate system.
    return { position, target, up, zoom };
}

type ShaderType = 'fragment' | 'vertex';
export function compileShader(
    gl: WebGLRenderingContext,
    shaderType: ShaderType,
    shaderSource: string
) {
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
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw Error(info || `Something went wrong while compiling ${shaderType} shader.`);
    }
    return shader;
}

export function createProgram(
    gl: WebGLRenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
) {
    const program = gl.createProgram();
    if (!program) throw new Error('Creating shader program was Failed');

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
        const info = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw Error(
            'Failed to link shaders: ' + info
        );
    }

    return program;
}

export function createPojectionMatrix(camera: Camera) {
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
export function createModelViewMatrix(camera: Camera, scaleMmToNDC: number) {
    // Model to world coordinates size.
    const modelMatrix = new Matrix4()
        .makeScale(scaleMmToNDC, scaleMmToNDC, scaleMmToNDC)
        .toArray();

    // Prepare view matrix
    const viewMatrixWithGLMatrix = mat4.create();
    const [px, py, pz] = camera.position
        .clone()
        .multiplyScalar(scaleMmToNDC)
        .toArray();
    const [tx, ty, tz] = camera.target
        .clone()
        .multiplyScalar(scaleMmToNDC)
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

export function getWebGLContext(
    backCanvas: HTMLCanvasElement
): WebGLRenderingContext {
    const gl =
        backCanvas.getContext('webgl') ||
        backCanvas.getContext('experimental-webgl');
    if (!gl) throw new Error('Failed to get WegGL context');
    return gl as WebGLRenderingContext;
}

export class GLShaderProgram {
    private gl: WebGLRenderingContext;
    private program: WebGLProgram;

    protected uniformLocationCache: Record<string, WebGLUniformLocation> = {};
    protected attribLocationCache: Record<string, number> = {};

    protected active: boolean = false;

    constructor(
        gl: WebGLRenderingContext,
        vertexShaderSource: string,
        fragmentShaderSource: string
    ) {
        this.gl = gl;
        const vertexShader = compileShader(this.gl, 'vertex', vertexShaderSource);
        const fragmentShader = compileShader(this.gl, 'fragment', fragmentShaderSource);
        this.program = createProgram(gl, vertexShader, fragmentShader);
    }

    public begin() {
        this.gl.useProgram(this.program);
        this.active = true;
    }

    public cleanup() {
        this.attribLocationCache = {};
        this.active = false;
    }

    protected getUniformLocation(name: string) {
        if (name in this.uniformLocationCache)
            return this.uniformLocationCache[name];

        const location = this.gl.getUniformLocation(this.program, name);
        if (location === null) throw new Error('Undefined uniform: ' + name);

        this.uniformLocationCache[name] = location;
        return location;
    }

    protected getAttribLocation(name: string) {
        if (name in this.attribLocationCache) return this.attribLocationCache[name];

        const location = this.gl.getAttribLocation(this.program, name);
        if (location === null) throw new Error('Undefined attribute: ' + name);

        this.attribLocationCache[name] = location;
        return location;
    }
}

export const tooSmallToZero = (v: Vector3) => {
    -0.000000000001 < v.x && v.x < 0.000000000001 && (v.x = 0);
    -0.000000000001 < v.y && v.y < 0.000000000001 && (v.y = 0);
    -0.000000000001 < v.z && v.z < 0.000000000001 && (v.z = 0);
}