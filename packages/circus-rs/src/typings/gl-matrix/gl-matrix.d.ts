// Type definitions for gl-matrix 2.3.2
// Project: http://glmatrix.net/
// Definitions by: chuntaro <https://github.com/chuntaro/>
// Definitions: https://github.com/chuntaro/gl-matrix.d.ts
/* eslint-disable */

interface glMatrix {
  EPSILON: number;
  ARRAY_TYPE: Float32Array | Array<number>;
  RANDOM: () => number;
  ENABLE_SIMD: boolean;
  SIMD_AVAILABLE: boolean;
  USE_SIMD: boolean;

  /**
   * Sets the type of array used when creating new vectors and matrices
   *
   * @param {Type} type Array type, such as Float32Arary or Array
   */
  setMatrixArrayType<T>(type: T): void;

  /**
   * Convert Degree To Radian
   *
   * @param {Number} Angle in Degrees
   */
  toRadian(a: number): number;
}
declare let glMatrix: glMatrix;

declare module 'gl-matrix' {
  type floats = number[];

  interface vec2 {
    /**
     * Creates a new, empty vec2
     *
     * @returns {vec2} a new 2D vector
     */
    create(): floats;

    /**
     * Creates a new vec2 initialized with values from an existing vector
     *
     * @param {vec2} a vector to clone
     * @returns {vec2} a new 2D vector
     */
    clone(a: floats): floats;

    /**
     * Creates a new vec2 initialized with the given values
     *
     * @param {Number} x X component
     * @param {Number} y Y component
     * @returns {vec2} a new 2D vector
     */
    fromValues(x: number, y: number): floats;

    /**
     * Copy the values from one vec2 to another
     *
     * @param {vec2} out the receiving vector
     * @param {vec2} a the source vector
     * @returns {vec2} out
     */
    copy(out: floats, a: floats): floats;

    /**
     * Set the components of a vec2 to the given values
     *
     * @param {vec2} out the receiving vector
     * @param {Number} x X component
     * @param {Number} y Y component
     * @returns {vec2} out
     */
    set(out: floats, x: number, y: number): floats;

    /**
     * Adds two vec2's
     *
     * @param {vec2} out the receiving vector
     * @param {vec2} a the first operand
     * @param {vec2} b the second operand
     * @returns {vec2} out
     */
    add(out: floats, a: floats, b: floats): floats;

    /**
     * Subtracts vector b from vector a
     *
     * @param {vec2} out the receiving vector
     * @param {vec2} a the first operand
     * @param {vec2} b the second operand
     * @returns {vec2} out
     */
    subtract(out: floats, a: floats, b: floats): floats;

    /**
     * Subtracts vector b from vector a
     *
     * @param {vec2} out the receiving vector
     * @param {vec2} a the first operand
     * @param {vec2} b the second operand
     * @returns {vec2} out
     */
    sub(out: floats, a: floats, b: floats): floats;

    /**
     * Multiplies two vec2's
     *
     * @param {vec2} out the receiving vector
     * @param {vec2} a the first operand
     * @param {vec2} b the second operand
     * @returns {vec2} out
     */
    multiply(out: floats, a: floats, b: floats): floats;

    /**
     * Multiplies two vec2's
     *
     * @param {vec2} out the receiving vector
     * @param {vec2} a the first operand
     * @param {vec2} b the second operand
     * @returns {vec2} out
     */
    mul(out: floats, a: floats, b: floats): floats;

    /**
     * Divides two vec2's
     *
     * @param {vec2} out the receiving vector
     * @param {vec2} a the first operand
     * @param {vec2} b the second operand
     * @returns {vec2} out
     */
    divide(out: floats, a: floats, b: floats): floats;

    /**
     * Divides two vec2's
     *
     * @param {vec2} out the receiving vector
     * @param {vec2} a the first operand
     * @param {vec2} b the second operand
     * @returns {vec2} out
     */
    div(out: floats, a: floats, b: floats): floats;

    /**
     * Returns the minimum of two vec2's
     *
     * @param {vec2} out the receiving vector
     * @param {vec2} a the first operand
     * @param {vec2} b the second operand
     * @returns {vec2} out
     */
    min(out: floats, a: floats, b: floats): floats;

    /**
     * Returns the maximum of two vec2's
     *
     * @param {vec2} out the receiving vector
     * @param {vec2} a the first operand
     * @param {vec2} b the second operand
     * @returns {vec2} out
     */
    max(out: floats, a: floats, b: floats): floats;

    /**
     * Scales a vec2 by a scalar number
     *
     * @param {vec2} out the receiving vector
     * @param {vec2} a the vector to scale
     * @param {Number} b amount to scale the vector by
     * @returns {vec2} out
     */
    scale(out: floats, a: floats, b: number): floats;

    /**
     * Adds two vec2's after scaling the second operand by a scalar value
     *
     * @param {vec2} out the receiving vector
     * @param {vec2} a the first operand
     * @param {vec2} b the second operand
     * @param {Number} scale the amount to scale b by before adding
     * @returns {vec2} out
     */
    scaleAndAdd(out: floats, a: floats, b: floats, scale: number): floats;

    /**
     * Calculates the euclidian distance between two vec2's
     *
     * @param {vec2} a the first operand
     * @param {vec2} b the second operand
     * @returns {Number} distance between a and b
     */
    distance(a: floats, b: floats): number;

    /**
     * Calculates the euclidian distance between two vec2's
     *
     * @param {vec2} a the first operand
     * @param {vec2} b the second operand
     * @returns {Number} distance between a and b
     */
    dist(a: floats, b: floats): number;

    /**
     * Calculates the squared euclidian distance between two vec2's
     *
     * @param {vec2} a the first operand
     * @param {vec2} b the second operand
     * @returns {Number} squared distance between a and b
     */
    squaredDistance(a: floats, b: floats): number;

    /**
     * Calculates the squared euclidian distance between two vec2's
     *
     * @param {vec2} a the first operand
     * @param {vec2} b the second operand
     * @returns {Number} squared distance between a and b
     */
    sqrDist(a: floats, b: floats): number;

    /**
     * Calculates the length of a vec2
     *
     * @param {vec2} a vector to calculate length of
     * @returns {Number} length of a
     */
    length(a: floats): number;

    /**
     * Calculates the length of a vec2
     *
     * @param {vec2} a vector to calculate length of
     * @returns {Number} length of a
     */
    len(a: floats): number;

    /**
     * Calculates the squared length of a vec2
     *
     * @param {vec2} a vector to calculate squared length of
     * @returns {Number} squared length of a
     */
    squaredLength(a: floats): number;

    /**
     * Calculates the squared length of a vec2
     *
     * @param {vec2} a vector to calculate squared length of
     * @returns {Number} squared length of a
     */
    sqrLen(a: floats): number;

    /**
     * Negates the components of a vec2
     *
     * @param {vec2} out the receiving vector
     * @param {vec2} a vector to negate
     * @returns {vec2} out
     */
    negate(out: floats, a: floats): floats;

    /**
     * Returns the inverse of the components of a vec2
     *
     * @param {vec2} out the receiving vector
     * @param {vec2} a vector to invert
     * @returns {vec2} out
     */
    inverse(out: floats, a: floats): floats;

    /**
     * Normalize a vec2
     *
     * @param {vec2} out the receiving vector
     * @param {vec2} a vector to normalize
     * @returns {vec2} out
     */
    normalize(out: floats, a: floats): floats;

    /**
     * Calculates the dot product of two vec2's
     *
     * @param {vec2} a the first operand
     * @param {vec2} b the second operand
     * @returns {Number} dot product of a and b
     */
    dot(a: floats, b: floats): number;

    /**
     * Computes the cross product of two vec2's
     * Note that the cross product must by definition produce a 3D vector
     *
     * @param {vec3} out the receiving vector
     * @param {vec2} a the first operand
     * @param {vec2} b the second operand
     * @returns {vec3} out
     */
    cross(out: floats, a: floats, b: floats): floats;

    /**
     * Performs a linear interpolation between two vec2's
     *
     * @param {vec2} out the receiving vector
     * @param {vec2} a the first operand
     * @param {vec2} b the second operand
     * @param {Number} t interpolation amount between the two inputs
     * @returns {vec2} out
     */
    lerp(out: floats, a: floats, b: floats, t: number): floats;

    /**
     * Generates a random vector with the given scale
     *
     * @param {vec2} out the receiving vector
     * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
     * @returns {vec2} out
     */
    random(out: floats, scale: number): floats;

    /**
     * Transforms the vec2 with a mat2
     *
     * @param {vec2} out the receiving vector
     * @param {vec2} a the vector to transform
     * @param {mat2} m matrix to transform with
     * @returns {vec2} out
     */
    transformMat2(out: floats, a: floats, m: floats): floats;

    /**
     * Transforms the vec2 with a mat2d
     *
     * @param {vec2} out the receiving vector
     * @param {vec2} a the vector to transform
     * @param {mat2d} m matrix to transform with
     * @returns {vec2} out
     */
    transformMat2d(out: floats, a: floats, m: floats): floats;

    /**
     * Transforms the vec2 with a mat3
     * 3rd vector component is implicitly '1'
     *
     * @param {vec2} out the receiving vector
     * @param {vec2} a the vector to transform
     * @param {mat3} m matrix to transform with
     * @returns {vec2} out
     */
    transformMat3(out: floats, a: floats, m: floats): floats;

    /**
     * Transforms the vec2 with a mat4
     * 3rd vector component is implicitly '0'
     * 4th vector component is implicitly '1'
     *
     * @param {vec2} out the receiving vector
     * @param {vec2} a the vector to transform
     * @param {mat4} m matrix to transform with
     * @returns {vec2} out
     */
    transformMat4(out: floats, a: floats, m: floats): floats;

    /**
     * Perform some operation over an array of vec2s.
     *
     * @param {Array} a the array of vectors to iterate over
     * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
     * @param {Number} offset Number of elements to skip at the beginning of the array
     * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
     * @param {Function} fn Function to call for each vector in the array
     * @param {Object} [arg] additional argument to pass to fn
     * @returns {Array} a
     * @function
     */
    forEach<T>(
      a: floats[],
      stride: number,
      offset: number,
      count: number,
      fn: (a: floats, b: floats, arg: T) => void,
      arg: T
    ): floats[];

    /**
     * Returns a string representation of a vector
     *
     * @param {vec2} vec vector to represent as a string
     * @returns {String} string representation of the vector
     */
    str(a: floats): string;
  }
  export var vec2: vec2;

  interface vec3 {
    /**
     * Creates a new, empty vec3
     *
     * @returns {vec3} a new 3D vector
     */
    create(): floats;

    /**
     * Creates a new vec3 initialized with values from an existing vector
     *
     * @param {vec3} a vector to clone
     * @returns {vec3} a new 3D vector
     */
    clone(a: floats): floats;

    /**
     * Creates a new vec3 initialized with the given values
     *
     * @param {Number} x X component
     * @param {Number} y Y component
     * @param {Number} z Z component
     * @returns {vec3} a new 3D vector
     */
    fromValues(x: number, y: number, z: number): floats;

    /**
     * Copy the values from one vec3 to another
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the source vector
     * @returns {vec3} out
     */
    copy(out: floats, a: floats): floats;

    /**
     * Set the components of a vec3 to the given values
     *
     * @param {vec3} out the receiving vector
     * @param {Number} x X component
     * @param {Number} y Y component
     * @param {Number} z Z component
     * @returns {vec3} out
     */
    set(out: floats, x: number, y: number, z: number): floats;

    /**
     * Adds two vec3's
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @returns {vec3} out
     */
    add(out: floats, a: floats, b: floats): floats;

    /**
     * Subtracts vector b from vector a
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @returns {vec3} out
     */
    subtract(out: floats, a: floats, b: floats): floats;

    /**
     * Subtracts vector b from vector a
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @returns {vec3} out
     */
    sub(out: floats, a: floats, b: floats): floats;

    /**
     * Multiplies two vec3's
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @returns {vec3} out
     */
    multiply(out: floats, a: floats, b: floats): floats;

    /**
     * Multiplies two vec3's
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @returns {vec3} out
     */
    mul(out: floats, a: floats, b: floats): floats;

    /**
     * Divides two vec3's
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @returns {vec3} out
     */
    divide(out: floats, a: floats, b: floats): floats;

    /**
     * Divides two vec3's
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @returns {vec3} out
     */
    div(out: floats, a: floats, b: floats): floats;

    /**
     * Returns the minimum of two vec3's
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @returns {vec3} out
     */
    min(out: floats, a: floats, b: floats): floats;

    /**
     * Returns the maximum of two vec3's
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @returns {vec3} out
     */
    max(out: floats, a: floats, b: floats): floats;

    /**
     * Scales a vec3 by a scalar number
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the vector to scale
     * @param {Number} b amount to scale the vector by
     * @returns {vec3} out
     */
    scale(out: floats, a: floats, b: number): floats;

    /**
     * Adds two vec3's after scaling the second operand by a scalar value
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @param {Number} scale the amount to scale b by before adding
     * @returns {vec3} out
     */
    scaleAndAdd(out: floats, a: floats, b: floats, scale: number): floats;

    /**
     * Calculates the euclidian distance between two vec3's
     *
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @returns {Number} distance between a and b
     */
    distance(a: floats, b: floats): number;

    /**
     * Calculates the euclidian distance between two vec3's
     *
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @returns {Number} distance between a and b
     */
    dist(a: floats, b: floats): number;

    /**
     * Calculates the squared euclidian distance between two vec3's
     *
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @returns {Number} squared distance between a and b
     */
    squaredDistance(a: floats, b: floats): number;

    /**
     * Calculates the squared euclidian distance between two vec3's
     *
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @returns {Number} squared distance between a and b
     */
    sqrDist(a: floats, b: floats): number;

    /**
     * Calculates the length of a vec3
     *
     * @param {vec3} a vector to calculate length of
     * @returns {Number} length of a
     */
    length(a: floats): number;

    /**
     * Calculates the length of a vec3
     *
     * @param {vec3} a vector to calculate length of
     * @returns {Number} length of a
     */
    len(a: floats): number;

    /**
     * Calculates the squared length of a vec3
     *
     * @param {vec3} a vector to calculate squared length of
     * @returns {Number} squared length of a
     */
    squaredLength(a: floats): number;

    /**
     * Calculates the squared length of a vec3
     *
     * @param {vec3} a vector to calculate squared length of
     * @returns {Number} squared length of a
     */
    sqrLen(a: floats): number;

    /**
     * Negates the components of a vec3
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a vector to negate
     * @returns {vec3} out
     */
    negate(out: floats, a: floats): floats;

    /**
     * Returns the inverse of the components of a vec3
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a vector to invert
     * @returns {vec3} out
     */
    inverse(out: floats, a: floats): floats;

    /**
     * Normalize a vec3
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a vector to normalize
     * @returns {vec3} out
     */
    normalize(out: floats, a: floats): floats;

    /**
     * Calculates the dot product of two vec3's
     *
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @returns {Number} dot product of a and b
     */
    dot(a: floats, b: floats): number;

    /**
     * Computes the cross product of two vec3's
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @returns {vec3} out
     */
    cross(out: floats, a: floats, b: floats): floats;

    /**
     * Performs a linear interpolation between two vec3's
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @param {Number} t interpolation amount between the two inputs
     * @returns {vec3} out
     */
    lerp(out: floats, a: floats, b: floats, t: number): floats;

    /**
     * Performs a hermite interpolation with two control points
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @param {vec3} c the third operand
     * @param {vec3} d the fourth operand
     * @param {Number} t interpolation amount between the two inputs
     * @returns {vec3} out
     */
    hermite(
      out: floats,
      a: floats,
      b: floats,
      c: floats,
      d: floats,
      t: number
    ): floats;

    /**
     * Performs a bezier interpolation with two control points
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @param {vec3} c the third operand
     * @param {vec3} d the fourth operand
     * @param {Number} t interpolation amount between the two inputs
     * @returns {vec3} out
     */
    bezier(
      out: floats,
      a: floats,
      b: floats,
      c: floats,
      d: floats,
      t: number
    ): floats;

    /**
     * Generates a random vector with the given scale
     *
     * @param {vec3} out the receiving vector
     * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
     * @returns {vec3} out
     */
    random(out: floats, scale: number): floats;

    /**
     * Transforms the vec3 with a mat4.
     * 4th vector component is implicitly '1'
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the vector to transform
     * @param {mat4} m matrix to transform with
     * @returns {vec3} out
     */
    transformMat4(out: floats, a: floats, m: floats): floats;

    /**
     * Transforms the vec3 with a mat3.
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the vector to transform
     * @param {mat4} m the 3x3 matrix to transform with
     * @returns {vec3} out
     */
    transformMat3(out: floats, a: floats, m: floats): floats;

    /**
     * Transforms the vec3 with a quat
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the vector to transform
     * @param {quat} q quaternion to transform with
     * @returns {vec3} out
     */
    transformQuat(out: floats, a: floats, q: floats): floats;

    /**
     * Rotate a 3D vector around the x-axis
     * @param {vec3} out The receiving vec3
     * @param {vec3} a The vec3 point to rotate
     * @param {vec3} b The origin of the rotation
     * @param {Number} c The angle of rotation
     * @returns {vec3} out
     */
    rotateX(out: floats, a: floats, b: floats, c: number): floats;

    /**
     * Rotate a 3D vector around the y-axis
     * @param {vec3} out The receiving vec3
     * @param {vec3} a The vec3 point to rotate
     * @param {vec3} b The origin of the rotation
     * @param {Number} c The angle of rotation
     * @returns {vec3} out
     */
    rotateY(out: floats, a: floats, b: floats, c: number): floats;

    /**
     * Rotate a 3D vector around the z-axis
     * @param {vec3} out The receiving vec3
     * @param {vec3} a The vec3 point to rotate
     * @param {vec3} b The origin of the rotation
     * @param {Number} c The angle of rotation
     * @returns {vec3} out
     */
    rotateZ(out: floats, a: floats, b: floats, c: number): floats;

    /**
     * Perform some operation over an array of vec3s.
     *
     * @param {Array} a the array of vectors to iterate over
     * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
     * @param {Number} offset Number of elements to skip at the beginning of the array
     * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
     * @param {Function} fn Function to call for each vector in the array
     * @param {Object} [arg] additional argument to pass to fn
     * @returns {Array} a
     * @function
     */
    forEach<T>(
      a: floats[],
      stride: number,
      offset: number,
      count: number,
      fn: (a: floats, b: floats, arg: T) => void,
      arg: T
    ): floats[];

    /**
     * Get the angle between two 3D vectors
     * @param {vec3} a The first operand
     * @param {vec3} b The second operand
     * @returns {Number} The angle in radians
     */
    angle(a: floats, b: floats): number;

    /**
     * Returns a string representation of a vector
     *
     * @param {vec3} vec vector to represent as a string
     * @returns {String} string representation of the vector
     */
    str(a: floats): string;
  }
  export var vec3: vec3;

  interface vec4 {
    /**
     * Creates a new, empty vec4
     *
     * @returns {vec4} a new 4D vector
     */
    create(): floats;

    /**
     * Creates a new vec4 initialized with values from an existing vector
     *
     * @param {vec4} a vector to clone
     * @returns {vec4} a new 4D vector
     */
    clone(a: floats): floats;

    /**
     * Creates a new vec4 initialized with the given values
     *
     * @param {Number} x X component
     * @param {Number} y Y component
     * @param {Number} z Z component
     * @param {Number} w W component
     * @returns {vec4} a new 4D vector
     */
    fromValues(x: number, y: number, z: number, w: number): floats;

    /**
     * Copy the values from one vec4 to another
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a the source vector
     * @returns {vec4} out
     */
    copy(out: floats, a: floats): floats;

    /**
     * Set the components of a vec4 to the given values
     *
     * @param {vec4} out the receiving vector
     * @param {Number} x X component
     * @param {Number} y Y component
     * @param {Number} z Z component
     * @param {Number} w W component
     * @returns {vec4} out
     */
    set(out: floats, x: number, y: number, z: number, w: number): floats;

    /**
     * Adds two vec4's
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a the first operand
     * @param {vec4} b the second operand
     * @returns {vec4} out
     */
    add(out: floats, a: floats, b: floats): floats;

    /**
     * Subtracts vector b from vector a
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a the first operand
     * @param {vec4} b the second operand
     * @returns {vec4} out
     */
    subtract(out: floats, a: floats, b: floats): floats;

    /**
     * Subtracts vector b from vector a
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a the first operand
     * @param {vec4} b the second operand
     * @returns {vec4} out
     */
    sub(out: floats, a: floats, b: floats): floats;

    /**
     * Multiplies two vec4's
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a the first operand
     * @param {vec4} b the second operand
     * @returns {vec4} out
     */
    multiply(out: floats, a: floats, b: floats): floats;

    /**
     * Multiplies two vec4's
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a the first operand
     * @param {vec4} b the second operand
     * @returns {vec4} out
     */
    mul(out: floats, a: floats, b: floats): floats;

    /**
     * Divides two vec4's
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a the first operand
     * @param {vec4} b the second operand
     * @returns {vec4} out
     */
    divide(out: floats, a: floats, b: floats): floats;

    /**
     * Divides two vec4's
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a the first operand
     * @param {vec4} b the second operand
     * @returns {vec4} out
     */
    div(out: floats, a: floats, b: floats): floats;

    /**
     * Returns the minimum of two vec4's
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a the first operand
     * @param {vec4} b the second operand
     * @returns {vec4} out
     */
    min(out: floats, a: floats, b: floats): floats;

    /**
     * Returns the maximum of two vec4's
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a the first operand
     * @param {vec4} b the second operand
     * @returns {vec4} out
     */
    max(out: floats, a: floats, b: floats): floats;

    /**
     * Scales a vec4 by a scalar number
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a the vector to scale
     * @param {Number} b amount to scale the vector by
     * @returns {vec4} out
     */
    scale(out: floats, a: floats, b: number): floats;

    /**
     * Adds two vec4's after scaling the second operand by a scalar value
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a the first operand
     * @param {vec4} b the second operand
     * @param {Number} scale the amount to scale b by before adding
     * @returns {vec4} out
     */
    scaleAndAdd(out: floats, a: floats, b: floats, scale: number): floats;

    /**
     * Calculates the euclidian distance between two vec4's
     *
     * @param {vec4} a the first operand
     * @param {vec4} b the second operand
     * @returns {Number} distance between a and b
     */
    distance(a: floats, b: floats): number;

    /**
     * Calculates the euclidian distance between two vec4's
     *
     * @param {vec4} a the first operand
     * @param {vec4} b the second operand
     * @returns {Number} distance between a and b
     */
    dist(a: floats, b: floats): number;

    /**
     * Calculates the squared euclidian distance between two vec4's
     *
     * @param {vec4} a the first operand
     * @param {vec4} b the second operand
     * @returns {Number} squared distance between a and b
     */
    squaredDistance(a: floats, b: floats): number;

    /**
     * Calculates the squared euclidian distance between two vec4's
     *
     * @param {vec4} a the first operand
     * @param {vec4} b the second operand
     * @returns {Number} squared distance between a and b
     */
    sqrDist(a: floats, b: floats): number;

    /**
     * Calculates the length of a vec4
     *
     * @param {vec4} a vector to calculate length of
     * @returns {Number} length of a
     */
    length(a: floats): number;

    /**
     * Calculates the length of a vec4
     *
     * @param {vec4} a vector to calculate length of
     * @returns {Number} length of a
     */
    len(a: floats): number;

    /**
     * Calculates the squared length of a vec4
     *
     * @param {vec4} a vector to calculate squared length of
     * @returns {Number} squared length of a
     */
    squaredLength(a: floats): number;

    /**
     * Calculates the squared length of a vec4
     *
     * @param {vec4} a vector to calculate squared length of
     * @returns {Number} squared length of a
     */
    sqrLen(a: floats): number;

    /**
     * Negates the components of a vec4
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a vector to negate
     * @returns {vec4} out
     */
    negate(out: floats, a: floats): floats;

    /**
     * Returns the inverse of the components of a vec4
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a vector to invert
     * @returns {vec4} out
     */
    inverse(out: floats, a: floats): floats;

    /**
     * Normalize a vec4
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a vector to normalize
     * @returns {vec4} out
     */
    normalize(out: floats, a: floats): floats;

    /**
     * Calculates the dot product of two vec4's
     *
     * @param {vec4} a the first operand
     * @param {vec4} b the second operand
     * @returns {Number} dot product of a and b
     */
    dot(a: floats, b: floats): number;

    /**
     * Performs a linear interpolation between two vec4's
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a the first operand
     * @param {vec4} b the second operand
     * @param {Number} t interpolation amount between the two inputs
     * @returns {vec4} out
     */
    lerp(out: floats, a: floats, b: floats, t: number): floats;

    /**
     * Generates a random vector with the given scale
     *
     * @param {vec4} out the receiving vector
     * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
     * @returns {vec4} out
     */
    random(out: floats, scale: number): floats;

    /**
     * Transforms the vec4 with a mat4.
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a the vector to transform
     * @param {mat4} m matrix to transform with
     * @returns {vec4} out
     */
    transformMat4(out: floats, a: floats, m: floats): floats;

    /**
     * Transforms the vec4 with a quat
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a the vector to transform
     * @param {quat} q quaternion to transform with
     * @returns {vec4} out
     */
    transformQuat(out: floats, a: floats, q: floats): floats;

    /**
     * Perform some operation over an array of vec4s.
     *
     * @param {Array} a the array of vectors to iterate over
     * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
     * @param {Number} offset Number of elements to skip at the beginning of the array
     * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
     * @param {Function} fn Function to call for each vector in the array
     * @param {Object} [arg] additional argument to pass to fn
     * @returns {Array} a
     * @function
     */
    forEach<T>(
      a: floats[],
      stride: number,
      offset: number,
      count: number,
      fn: (a: floats, b: floats, arg: T) => void,
      arg: T
    ): floats[];

    /**
     * Returns a string representation of a vector
     *
     * @param {vec4} vec vector to represent as a string
     * @returns {String} string representation of the vector
     */
    str(a: floats): string;
  }
  export var vec4: vec4;

  interface mat2 {
    /**
     * Creates a new identity mat2
     *
     * @returns {mat2} a new 2x2 matrix
     */
    create(): floats;

    /**
     * Creates a new mat2 initialized with values from an existing matrix
     *
     * @param {mat2} a matrix to clone
     * @returns {mat2} a new 2x2 matrix
     */
    clone(a: floats): floats;

    /**
     * Copy the values from one mat2 to another
     *
     * @param {mat2} out the receiving matrix
     * @param {mat2} a the source matrix
     * @returns {mat2} out
     */
    copy(out: floats, a: floats): floats;

    /**
     * Set a mat2 to the identity matrix
     *
     * @param {mat2} out the receiving matrix
     * @returns {mat2} out
     */
    identity(out: floats): floats;

    /**
     * Transpose the values of a mat2
     *
     * @param {mat2} out the receiving matrix
     * @param {mat2} a the source matrix
     * @returns {mat2} out
     */
    transpose(out: floats, a: floats): floats;

    /**
     * Inverts a mat2
     *
     * @param {mat2} out the receiving matrix
     * @param {mat2} a the source matrix
     * @returns {mat2} out
     */
    invert(out: floats, a: floats): floats;

    /**
     * Calculates the adjugate of a mat2
     *
     * @param {mat2} out the receiving matrix
     * @param {mat2} a the source matrix
     * @returns {mat2} out
     */
    adjoint(out: floats, a: floats): floats;

    /**
     * Calculates the determinant of a mat2
     *
     * @param {mat2} a the source matrix
     * @returns {Number} determinant of a
     */
    determinant(a: floats): number;

    /**
     * Multiplies two mat2's
     *
     * @param {mat2} out the receiving matrix
     * @param {mat2} a the first operand
     * @param {mat2} b the second operand
     * @returns {mat2} out
     */
    multiply(out: floats, a: floats, b: floats): floats;

    /**
     * Multiplies two mat2's
     *
     * @param {mat2} out the receiving matrix
     * @param {mat2} a the first operand
     * @param {mat2} b the second operand
     * @returns {mat2} out
     */
    mul(out: floats, a: floats, b: floats): floats;

    /**
     * Rotates a mat2 by the given angle
     *
     * @param {mat2} out the receiving matrix
     * @param {mat2} a the matrix to rotate
     * @param {Number} rad the angle to rotate the matrix by
     * @returns {mat2} out
     */
    rotate(out: floats, a: floats, rad: number): floats;

    /**
     * Scales the mat2 by the dimensions in the given vec2
     *
     * @param {mat2} out the receiving matrix
     * @param {mat2} a the matrix to rotate
     * @param {vec2} v the vec2 to scale the matrix by
     * @returns {mat2} out
     **/
    scale(out: floats, a: floats, v: floats): floats;

    /**
     * Creates a matrix from a given angle
     * This is equivalent to (but much faster than):
     *
     *     mat2.identity(dest);
     *     mat2.rotate(dest, dest, rad);
     *
     * @param {mat2} out mat2 receiving operation result
     * @param {Number} rad the angle to rotate the matrix by
     * @returns {mat2} out
     */
    fromRotation(out: floats, rad: number): floats;

    /**
     * Creates a matrix from a vector scaling
     * This is equivalent to (but much faster than):
     *
     *     mat2.identity(dest);
     *     mat2.scale(dest, dest, vec);
     *
     * @param {mat2} out mat2 receiving operation result
     * @param {vec2} v Scaling vector
     * @returns {mat2} out
     */
    fromScaling(out: floats, v: floats): floats;

    /**
     * Returns a string representation of a mat2
     *
     * @param {mat2} mat matrix to represent as a string
     * @returns {String} string representation of the matrix
     */
    str(a: floats): string;

    /**
     * Returns Frobenius norm of a mat2
     *
     * @param {mat2} a the matrix to calculate Frobenius norm of
     * @returns {Number} Frobenius norm
     */
    frob(a: floats): number;

    /**
     * Returns L, D and U matrices (Lower triangular, Diagonal and Upper triangular) by factorizing the input matrix
     * @param {mat2} L the lower triangular matrix
     * @param {mat2} D the diagonal matrix
     * @param {mat2} U the upper triangular matrix
     * @param {mat2} a the input matrix to factorize
     */
    LDU(L: floats, D: floats, U: floats, a: floats): floats[];
  }
  export var mat2: mat2;

  interface mat2d {
    /**
     * Creates a new identity mat2d
     *
     * @returns {mat2d} a new 2x3 matrix
     */
    create(): floats;

    /**
     * Creates a new mat2d initialized with values from an existing matrix
     *
     * @param {mat2d} a matrix to clone
     * @returns {mat2d} a new 2x3 matrix
     */
    clone(a: floats): floats;

    /**
     * Copy the values from one mat2d to another
     *
     * @param {mat2d} out the receiving matrix
     * @param {mat2d} a the source matrix
     * @returns {mat2d} out
     */
    copy(out: floats, a: floats): floats;

    /**
     * Set a mat2d to the identity matrix
     *
     * @param {mat2d} out the receiving matrix
     * @returns {mat2d} out
     */
    identity(out: floats): floats;

    /**
     * Inverts a mat2d
     *
     * @param {mat2d} out the receiving matrix
     * @param {mat2d} a the source matrix
     * @returns {mat2d} out
     */
    invert(out: floats, a: floats): floats;

    /**
     * Calculates the determinant of a mat2d
     *
     * @param {mat2d} a the source matrix
     * @returns {Number} determinant of a
     */
    determinant(a: floats): number;

    /**
     * Multiplies two mat2d's
     *
     * @param {mat2d} out the receiving matrix
     * @param {mat2d} a the first operand
     * @param {mat2d} b the second operand
     * @returns {mat2d} out
     */
    multiply(out: floats, a: floats, b: floats): floats;

    /**
     * Multiplies two mat2d's
     *
     * @param {mat2d} out the receiving matrix
     * @param {mat2d} a the first operand
     * @param {mat2d} b the second operand
     * @returns {mat2d} out
     */
    mul(out: floats, a: floats, b: floats): floats;

    /**
     * Rotates a mat2d by the given angle
     *
     * @param {mat2d} out the receiving matrix
     * @param {mat2d} a the matrix to rotate
     * @param {Number} rad the angle to rotate the matrix by
     * @returns {mat2d} out
     */
    rotate(out: floats, a: floats, rad: number): floats;

    /**
     * Scales the mat2d by the dimensions in the given vec2
     *
     * @param {mat2d} out the receiving matrix
     * @param {mat2d} a the matrix to translate
     * @param {vec2} v the vec2 to scale the matrix by
     * @returns {mat2d} out
     **/
    scale(out: floats, a: floats, v: floats): floats;

    /**
     * Translates the mat2d by the dimensions in the given vec2
     *
     * @param {mat2d} out the receiving matrix
     * @param {mat2d} a the matrix to translate
     * @param {vec2} v the vec2 to translate the matrix by
     * @returns {mat2d} out
     **/
    translate(out: floats, a: floats, v: floats): floats;

    /**
     * Creates a matrix from a given angle
     * This is equivalent to (but much faster than):
     *
     *     mat2d.identity(dest);
     *     mat2d.rotate(dest, dest, rad);
     *
     * @param {mat2d} out mat2d receiving operation result
     * @param {Number} rad the angle to rotate the matrix by
     * @returns {mat2d} out
     */
    fromRotation(out: floats, rad: number): floats;

    /**
     * Creates a matrix from a vector scaling
     * This is equivalent to (but much faster than):
     *
     *     mat2d.identity(dest);
     *     mat2d.scale(dest, dest, vec);
     *
     * @param {mat2d} out mat2d receiving operation result
     * @param {vec2} v Scaling vector
     * @returns {mat2d} out
     */
    fromScaling(out: floats, v: floats): floats;

    /**
     * Creates a matrix from a vector translation
     * This is equivalent to (but much faster than):
     *
     *     mat2d.identity(dest);
     *     mat2d.translate(dest, dest, vec);
     *
     * @param {mat2d} out mat2d receiving operation result
     * @param {vec2} v Translation vector
     * @returns {mat2d} out
     */
    fromTranslation(out: floats, v: floats): floats;

    /**
     * Returns a string representation of a mat2d
     *
     * @param {mat2d} a matrix to represent as a string
     * @returns {String} string representation of the matrix
     */
    str(a: floats): string;

    /**
     * Returns Frobenius norm of a mat2d
     *
     * @param {mat2d} a the matrix to calculate Frobenius norm of
     * @returns {Number} Frobenius norm
     */
    frob(a: floats): number;
  }
  export var mat2d: mat2d;

  interface mat3 {
    /**
     * Creates a new identity mat3
     *
     * @returns {mat3} a new 3x3 matrix
     */
    create(): floats;

    /**
     * Copies the upper-left 3x3 values into the given mat3.
     *
     * @param {mat3} out the receiving 3x3 matrix
     * @param {mat4} a   the source 4x4 matrix
     * @returns {mat3} out
     */
    fromMat4(out: floats, a: floats): floats;

    /**
     * Creates a new mat3 initialized with values from an existing matrix
     *
     * @param {mat3} a matrix to clone
     * @returns {mat3} a new 3x3 matrix
     */
    clone(a: floats): floats;

    /**
     * Copy the values from one mat3 to another
     *
     * @param {mat3} out the receiving matrix
     * @param {mat3} a the source matrix
     * @returns {mat3} out
     */
    copy(out: floats, a: floats): floats;

    /**
     * Set a mat3 to the identity matrix
     *
     * @param {mat3} out the receiving matrix
     * @returns {mat3} out
     */
    identity(out: floats): floats;

    /**
     * Transpose the values of a mat3
     *
     * @param {mat3} out the receiving matrix
     * @param {mat3} a the source matrix
     * @returns {mat3} out
     */
    transpose(out: floats, a: floats): floats;

    /**
     * Inverts a mat3
     *
     * @param {mat3} out the receiving matrix
     * @param {mat3} a the source matrix
     * @returns {mat3} out
     */
    invert(out: floats, a: floats): floats;

    /**
     * Calculates the adjugate of a mat3
     *
     * @param {mat3} out the receiving matrix
     * @param {mat3} a the source matrix
     * @returns {mat3} out
     */
    adjoint(out: floats, a: floats): floats;

    /**
     * Calculates the determinant of a mat3
     *
     * @param {mat3} a the source matrix
     * @returns {Number} determinant of a
     */
    determinant(a: floats): number;

    /**
     * Multiplies two mat3's
     *
     * @param {mat3} out the receiving matrix
     * @param {mat3} a the first operand
     * @param {mat3} b the second operand
     * @returns {mat3} out
     */
    multiply(out: floats, a: floats, b: floats): floats;

    /**
     * Multiplies two mat3's
     *
     * @param {mat3} out the receiving matrix
     * @param {mat3} a the first operand
     * @param {mat3} b the second operand
     * @returns {mat3} out
     */
    mul(out: floats, a: floats, b: floats): floats;

    /**
     * Translate a mat3 by the given vector
     *
     * @param {mat3} out the receiving matrix
     * @param {mat3} a the matrix to translate
     * @param {vec2} v vector to translate by
     * @returns {mat3} out
     */
    translate(out: floats, a: floats, v: floats): floats;

    /**
     * Rotates a mat3 by the given angle
     *
     * @param {mat3} out the receiving matrix
     * @param {mat3} a the matrix to rotate
     * @param {Number} rad the angle to rotate the matrix by
     * @returns {mat3} out
     */
    rotate(out: floats, a: floats, rad: number): floats;

    /**
     * Scales the mat3 by the dimensions in the given vec2
     *
     * @param {mat3} out the receiving matrix
     * @param {mat3} a the matrix to rotate
     * @param {vec2} v the vec2 to scale the matrix by
     * @returns {mat3} out
     **/
    scale(out: floats, a: floats, v: floats): floats;

    /**
     * Creates a matrix from a vector translation
     * This is equivalent to (but much faster than):
     *
     *     mat3.identity(dest);
     *     mat3.translate(dest, dest, vec);
     *
     * @param {mat3} out mat3 receiving operation result
     * @param {vec2} v Translation vector
     * @returns {mat3} out
     */
    fromTranslation(out: floats, v: floats): floats;

    /**
     * Creates a matrix from a given angle
     * This is equivalent to (but much faster than):
     *
     *     mat3.identity(dest);
     *     mat3.rotate(dest, dest, rad);
     *
     * @param {mat3} out mat3 receiving operation result
     * @param {Number} rad the angle to rotate the matrix by
     * @returns {mat3} out
     */
    fromRotation(out: floats, rad: number): floats;

    /**
     * Creates a matrix from a vector scaling
     * This is equivalent to (but much faster than):
     *
     *     mat3.identity(dest);
     *     mat3.scale(dest, dest, vec);
     *
     * @param {mat3} out mat3 receiving operation result
     * @param {vec2} v Scaling vector
     * @returns {mat3} out
     */
    fromScaling(out: floats, v: floats): floats;

    /**
     * Copies the values from a mat2d into a mat3
     *
     * @param {mat3} out the receiving matrix
     * @param {mat2d} a the matrix to copy
     * @returns {mat3} out
     **/
    fromMat2d(out: floats, a: floats): floats;

    /**
     * Calculates a 3x3 matrix from the given quaternion
     *
     * @param {mat3} out mat3 receiving operation result
     * @param {quat} q Quaternion to create matrix from
     *
     * @returns {mat3} out
     */
    fromQuat(out: floats, q: floats): floats;

    /**
     * Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
     *
     * @param {mat3} out mat3 receiving operation result
     * @param {mat4} a Mat4 to derive the normal matrix from
     *
     * @returns {mat3} out
     */
    normalFromMat4(out: floats, a: floats): floats;

    /**
     * Returns a string representation of a mat3
     *
     * @param {mat3} mat matrix to represent as a string
     * @returns {String} string representation of the matrix
     */
    str(a: floats): string;

    /**
     * Returns Frobenius norm of a mat3
     *
     * @param {mat3} a the matrix to calculate Frobenius norm of
     * @returns {Number} Frobenius norm
     */
    frob(a: floats): number;
  }
  export var mat3: mat3;

  interface mat4 {
    /**
     * Creates a new identity mat4
     *
     * @returns {mat4} a new 4x4 matrix
     */
    create(): floats;

    /**
     * Creates a new mat4 initialized with values from an existing matrix
     *
     * @param {mat4} a matrix to clone
     * @returns {mat4} a new 4x4 matrix
     */
    clone(a: floats): floats;

    /**
     * Copy the values from one mat4 to another
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the source matrix
     * @returns {mat4} out
     */
    copy(out: floats, a: floats): floats;

    /**
     * Set a mat4 to the identity matrix
     *
     * @param {mat4} out the receiving matrix
     * @returns {mat4} out
     */
    identity(out: floats): floats;

    /**
     * Transpose the values of a mat4 using SIMD
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the source matrix
     * @returns {mat4} out
     */
    transpose(out: floats, a: floats): floats;

    /**
     * Inverts a mat4 using SIMD
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the source matrix
     * @returns {mat4} out
     */
    invert(out: floats, a: floats): floats;

    /**
     * Calculates the adjugate of a mat4 using SIMD
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the source matrix
     * @returns {mat4} out
     */
    adjoint(out: floats, a: floats): floats;

    /**
     * Calculates the determinant of a mat4
     *
     * @param {mat4} a the source matrix
     * @returns {Number} determinant of a
     */
    determinant(a: floats): number;

    /**
     * Multiplies two mat4's explicitly not using SIMD
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the first operand
     * @param {mat4} b the second operand
     * @returns {mat4} out
     */
    multiply(out: floats, a: floats, b: floats): floats;

    /**
     * Multiplies two mat4's explicitly not using SIMD
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the first operand
     * @param {mat4} b the second operand
     * @returns {mat4} out
     */
    mul(out: floats, a: floats, b: floats): floats;

    /**
     * Translates a mat4 by the given vector using SIMD
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the matrix to translate
     * @param {vec3} v vector to translate by
     * @returns {mat4} out
     */
    translate(out: floats, a: floats, v: floats): floats;

    /**
     * Scales the mat4 by the dimensions in the given vec3 using vectorization
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the matrix to scale
     * @param {vec3} v the vec3 to scale the matrix by
     * @returns {mat4} out
     **/
    scale(out: floats, a: floats, v: floats): floats;

    /**
     * Rotates a mat4 by the given angle around the given axis
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the matrix to rotate
     * @param {Number} rad the angle to rotate the matrix by
     * @param {vec3} axis the axis to rotate around
     * @returns {mat4} out
     */
    rotate(out: floats, a: floats, rad: number, axis: floats): floats;

    /**
     * Rotates a matrix by the given angle around the X axis using SIMD
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the matrix to rotate
     * @param {Number} rad the angle to rotate the matrix by
     * @returns {mat4} out
     */
    rotateX(out: floats, a: floats, rad: number): floats;

    /**
     * Rotates a matrix by the given angle around the Y axis using SIMD
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the matrix to rotate
     * @param {Number} rad the angle to rotate the matrix by
     * @returns {mat4} out
     */
    rotateY(out: floats, a: floats, rad: number): floats;

    /**
     * Rotates a matrix by the given angle around the Z axis using SIMD
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the matrix to rotate
     * @param {Number} rad the angle to rotate the matrix by
     * @returns {mat4} out
     */
    rotateZ(out: floats, a: floats, rad: number): floats;

    /**
     * Creates a matrix from a vector translation
     * This is equivalent to (but much faster than):
     *
     *     mat4.identity(dest);
     *     mat4.translate(dest, dest, vec);
     *
     * @param {mat4} out mat4 receiving operation result
     * @param {vec3} v Translation vector
     * @returns {mat4} out
     */
    fromTranslation(out: floats, v: floats): floats;

    /**
     * Creates a matrix from a vector scaling
     * This is equivalent to (but much faster than):
     *
     *     mat4.identity(dest);
     *     mat4.scale(dest, dest, vec);
     *
     * @param {mat4} out mat4 receiving operation result
     * @param {vec3} v Scaling vector
     * @returns {mat4} out
     */
    fromScaling(out: floats, v: floats): floats;

    /**
     * Creates a matrix from a given angle around a given axis
     * This is equivalent to (but much faster than):
     *
     *     mat4.identity(dest);
     *     mat4.rotate(dest, dest, rad, axis);
     *
     * @param {mat4} out mat4 receiving operation result
     * @param {Number} rad the angle to rotate the matrix by
     * @param {vec3} axis the axis to rotate around
     * @returns {mat4} out
     */
    fromRotation(out: floats, rad: number, axis: floats): floats;

    /**
     * Creates a matrix from the given angle around the X axis
     * This is equivalent to (but much faster than):
     *
     *     mat4.identity(dest);
     *     mat4.rotateX(dest, dest, rad);
     *
     * @param {mat4} out mat4 receiving operation result
     * @param {Number} rad the angle to rotate the matrix by
     * @returns {mat4} out
     */
    fromXRotation(out: floats, rad: number): floats;

    /**
     * Creates a matrix from the given angle around the Y axis
     * This is equivalent to (but much faster than):
     *
     *     mat4.identity(dest);
     *     mat4.rotateY(dest, dest, rad);
     *
     * @param {mat4} out mat4 receiving operation result
     * @param {Number} rad the angle to rotate the matrix by
     * @returns {mat4} out
     */
    fromYRotation(out: floats, rad: number): floats;

    /**
     * Creates a matrix from the given angle around the Z axis
     * This is equivalent to (but much faster than):
     *
     *     mat4.identity(dest);
     *     mat4.rotateZ(dest, dest, rad);
     *
     * @param {mat4} out mat4 receiving operation result
     * @param {Number} rad the angle to rotate the matrix by
     * @returns {mat4} out
     */
    fromZRotation(out: floats, rad: number): floats;

    /**
     * Creates a matrix from a quaternion rotation and vector translation
     * This is equivalent to (but much faster than):
     *
     *     mat4.identity(dest);
     *     mat4.translate(dest, vec);
     *     var quatMat = mat4.create();
     *     quat4.toMat4(quat, quatMat);
     *     mat4.multiply(dest, quatMat);
     *
     * @param {mat4} out mat4 receiving operation result
     * @param {quat4} q Rotation quaternion
     * @param {vec3} v Translation vector
     * @returns {mat4} out
     */
    fromRotationTranslation(out: floats, q: floats, v: floats): floats;

    /**
     * Creates a matrix from a quaternion rotation, vector translation and vector scale
     * This is equivalent to (but much faster than):
     *
     *     mat4.identity(dest);
     *     mat4.translate(dest, vec);
     *     var quatMat = mat4.create();
     *     quat4.toMat4(quat, quatMat);
     *     mat4.multiply(dest, quatMat);
     *     mat4.scale(dest, scale)
     *
     * @param {mat4} out mat4 receiving operation result
     * @param {quat4} q Rotation quaternion
     * @param {vec3} v Translation vector
     * @param {vec3} s Scaling vector
     * @returns {mat4} out
     */
    fromRotationTranslationScale(
      out: floats,
      q: floats,
      v: floats,
      s: floats
    ): floats;

    /**
     * Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin
     * This is equivalent to (but much faster than):
     *
     *     mat4.identity(dest);
     *     mat4.translate(dest, vec);
     *     mat4.translate(dest, origin);
     *     var quatMat = mat4.create();
     *     quat4.toMat4(quat, quatMat);
     *     mat4.multiply(dest, quatMat);
     *     mat4.scale(dest, scale)
     *     mat4.translate(dest, negativeOrigin);
     *
     * @param {mat4} out mat4 receiving operation result
     * @param {quat4} q Rotation quaternion
     * @param {vec3} v Translation vector
     * @param {vec3} s Scaling vector
     * @param {vec3} o The origin vector around which to scale and rotate
     * @returns {mat4} out
     */
    fromRotationTranslationScaleOrigin(
      out: floats,
      q: floats,
      v: floats,
      s: floats,
      o: floats
    ): floats;

    /**
     * Calculates a 4x4 matrix from the given quaternion
     *
     * @param {mat4} out mat4 receiving operation result
     * @param {quat} q Quaternion to create matrix from
     *
     * @returns {mat4} out
     */
    fromQuat(out: floats, q: floats): floats;

    /**
     * Generates a frustum matrix with the given bounds
     *
     * @param {mat4} out mat4 frustum matrix will be written into
     * @param {Number} left Left bound of the frustum
     * @param {Number} right Right bound of the frustum
     * @param {Number} bottom Bottom bound of the frustum
     * @param {Number} top Top bound of the frustum
     * @param {Number} near Near bound of the frustum
     * @param {Number} far Far bound of the frustum
     * @returns {mat4} out
     */
    frustum(
      out: floats,
      left: number,
      right: number,
      bottom: number,
      top: number,
      near: number,
      far: number
    ): floats;

    /**
     * Generates a perspective projection matrix with the given bounds
     *
     * @param {mat4} out mat4 frustum matrix will be written into
     * @param {number} fovy Vertical field of view in radians
     * @param {number} aspect Aspect ratio. typically viewport width/height
     * @param {number} near Near bound of the frustum
     * @param {number} far Far bound of the frustum
     * @returns {mat4} out
     */
    perspective(
      out: floats,
      fovy: number,
      aspect: number,
      near: number,
      far: number
    ): floats;

    /**
     * Generates a perspective projection matrix with the given field of view.
     * This is primarily useful for generating projection matrices to be used
     * with the still experiemental WebVR API.
     *
     * @param {mat4} out mat4 frustum matrix will be written into
     * @param {number} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
     * @param {number} near Near bound of the frustum
     * @param {number} far Far bound of the frustum
     * @returns {mat4} out
     */
    perspectiveFromFieldOfView(
      out: floats,
      fov: number,
      near: number,
      far: number
    ): floats;

    /**
     * Generates a orthogonal projection matrix with the given bounds
     *
     * @param {mat4} out mat4 frustum matrix will be written into
     * @param {number} left Left bound of the frustum
     * @param {number} right Right bound of the frustum
     * @param {number} bottom Bottom bound of the frustum
     * @param {number} top Top bound of the frustum
     * @param {number} near Near bound of the frustum
     * @param {number} far Far bound of the frustum
     * @returns {mat4} out
     */
    ortho(
      out: floats,
      left: number,
      right: number,
      bottom: number,
      top: number,
      near: number,
      far: number
    ): floats;

    /**
     * Generates a look-at matrix with the given eye position, focal point, and up axis
     *
     * @param {mat4} out mat4 frustum matrix will be written into
     * @param {vec3} eye Position of the viewer
     * @param {vec3} center Point the viewer is looking at
     * @param {vec3} up vec3 pointing up
     * @returns {mat4} out
     */
    lookAt(out: floats, eye: floats, center: floats, up: floats): floats;

    /**
     * Returns a string representation of a mat4
     *
     * @param {mat4} mat matrix to represent as a string
     * @returns {String} string representation of the matrix
     */
    str(a: floats): string;

    /**
     * Returns Frobenius norm of a mat4
     *
     * @param {mat4} a the matrix to calculate Frobenius norm of
     * @returns {Number} Frobenius norm
     */
    frob(a: floats): number;
  }
  export var mat4: mat4;

  interface quat {
    /**
     * Creates a new identity quat
     *
     * @returns {quat} a new quaternion
     */
    create(): floats;

    /**
     * Sets a quaternion to represent the shortest rotation from one
     * vector to another.
     *
     * Both vectors are assumed to be unit length.
     *
     * @param {quat} out the receiving quaternion.
     * @param {vec3} a the initial vector
     * @param {vec3} b the destination vector
     * @returns {quat} out
     */
    rotationTo(out: floats, a: floats, b: floats): floats;

    /**
     * Sets the specified quaternion with values corresponding to the given
     * axes. Each axis is a vec3 and is expected to be unit length and
     * perpendicular to all other specified axes.
     *
     * @param {vec3} view  the vector representing the viewing direction
     * @param {vec3} right the vector representing the local "right" direction
     * @param {vec3} up    the vector representing the local "up" direction
     * @returns {quat} out
     */
    setAxes(out: floats, view: floats, right: floats, up: floats): floats;

    /**
     * Creates a new vec4 initialized with values from an existing vector
     *
     * @param {vec4} a vector to clone
     * @returns {vec4} a new 4D vector
     */
    clone(a: floats): floats;

    /**
     * Creates a new vec4 initialized with the given values
     *
     * @param {Number} x X component
     * @param {Number} y Y component
     * @param {Number} z Z component
     * @param {Number} w W component
     * @returns {vec4} a new 4D vector
     */
    fromValues(x: number, y: number, z: number, w: number): floats;

    /**
     * Copy the values from one vec4 to another
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a the source vector
     * @returns {vec4} out
     */
    copy(out: floats, a: floats): floats;

    /**
     * Set the components of a vec4 to the given values
     *
     * @param {vec4} out the receiving vector
     * @param {Number} x X component
     * @param {Number} y Y component
     * @param {Number} z Z component
     * @param {Number} w W component
     * @returns {vec4} out
     */
    set(out: floats, x: number, y: number, z: number, w: number): floats;

    /**
     * Set a quat to the identity quaternion
     *
     * @param {quat} out the receiving quaternion
     * @returns {quat} out
     */
    identity(out: floats): floats;

    /**
     * Sets a quat from the given angle and rotation axis,
     * then returns it.
     *
     * @param {quat} out the receiving quaternion
     * @param {vec3} axis the axis around which to rotate
     * @param {Number} rad the angle in radians
     * @returns {quat} out
     **/
    setAxisAngle(out: floats, axis: floats, rad: number): floats;

    /**
     * Adds two vec4's
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a the first operand
     * @param {vec4} b the second operand
     * @returns {vec4} out
     */
    add(out: floats, a: floats, b: floats): floats;

    /**
     * Multiplies two quat's
     *
     * @param {quat} out the receiving quaternion
     * @param {quat} a the first operand
     * @param {quat} b the second operand
     * @returns {quat} out
     */
    multiply(out: floats, a: floats, b: floats): floats;

    /**
     * Multiplies two quat's
     *
     * @param {quat} out the receiving quaternion
     * @param {quat} a the first operand
     * @param {quat} b the second operand
     * @returns {quat} out
     */
    mul(out: floats, a: floats, b: floats): floats;

    /**
     * Scales a vec4 by a scalar number
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a the vector to scale
     * @param {Number} b amount to scale the vector by
     * @returns {vec4} out
     */
    scale(out: floats, a: floats, b: number): floats;

    /**
     * Rotates a quaternion by the given angle about the X axis
     *
     * @param {quat} out quat receiving operation result
     * @param {quat} a quat to rotate
     * @param {number} rad angle (in radians) to rotate
     * @returns {quat} out
     */
    rotateX(out: floats, a: floats, rad: number): floats;

    /**
     * Rotates a quaternion by the given angle about the Y axis
     *
     * @param {quat} out quat receiving operation result
     * @param {quat} a quat to rotate
     * @param {number} rad angle (in radians) to rotate
     * @returns {quat} out
     */
    rotateY(out: floats, a: floats, rad: number): floats;

    /**
     * Rotates a quaternion by the given angle about the Z axis
     *
     * @param {quat} out quat receiving operation result
     * @param {quat} a quat to rotate
     * @param {number} rad angle (in radians) to rotate
     * @returns {quat} out
     */
    rotateZ(out: floats, a: floats, rad: number): floats;

    /**
     * Calculates the W component of a quat from the X, Y, and Z components.
     * Assumes that quaternion is 1 unit in length.
     * Any existing W component will be ignored.
     *
     * @param {quat} out the receiving quaternion
     * @param {quat} a quat to calculate W component of
     * @returns {quat} out
     */
    calculateW(out: floats, a: floats): floats;

    /**
     * Calculates the dot product of two vec4's
     *
     * @param {vec4} a the first operand
     * @param {vec4} b the second operand
     * @returns {Number} dot product of a and b
     */
    dot(a: floats, b: floats): number;

    /**
     * Performs a linear interpolation between two vec4's
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a the first operand
     * @param {vec4} b the second operand
     * @param {Number} t interpolation amount between the two inputs
     * @returns {vec4} out
     */
    lerp(out: floats, a: floats, b: floats, t: number): floats;

    /**
     * Performs a spherical linear interpolation between two quat
     *
     * @param {quat} out the receiving quaternion
     * @param {quat} a the first operand
     * @param {quat} b the second operand
     * @param {Number} t interpolation amount between the two inputs
     * @returns {quat} out
     */
    slerp(out: floats, a: floats, b: floats, t: number): floats;

    /**
     * Performs a spherical linear interpolation with two control points
     *
     * @param {quat} out the receiving quaternion
     * @param {quat} a the first operand
     * @param {quat} b the second operand
     * @param {quat} c the third operand
     * @param {quat} d the fourth operand
     * @param {Number} t interpolation amount
     * @returns {quat} out
     */
    sqlerp(
      out: floats,
      a: floats,
      b: floats,
      c: floats,
      d: floats,
      t: number
    ): floats;

    /**
     * Calculates the inverse of a quat
     *
     * @param {quat} out the receiving quaternion
     * @param {quat} a quat to calculate inverse of
     * @returns {quat} out
     */
    invert(out: floats, a: floats): floats;

    /**
     * Calculates the conjugate of a quat
     * If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.
     *
     * @param {quat} out the receiving quaternion
     * @param {quat} a quat to calculate conjugate of
     * @returns {quat} out
     */
    conjugate(out: floats, a: floats): floats;

    /**
     * Calculates the length of a vec4
     *
     * @param {vec4} a vector to calculate length of
     * @returns {Number} length of a
     */
    length(a: floats): number;

    /**
     * Calculates the length of a quat
     *
     * @param {quat} a vector to calculate length of
     * @returns {Number} length of a
     * @function
     */
    len(a: floats): number;

    /**
     * Calculates the squared length of a vec4
     *
     * @param {vec4} a vector to calculate squared length of
     * @returns {Number} squared length of a
     */
    squaredLength(a: floats): number;

    /**
     * Calculates the squared length of a quat
     *
     * @param {quat} a vector to calculate squared length of
     * @returns {Number} squared length of a
     * @function
     */
    sqrLen(a: floats): number;

    /**
     * Normalize a vec4
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a vector to normalize
     * @returns {vec4} out
     */
    normalize(out: floats, a: floats): floats;

    /**
     * Creates a quaternion from the given 3x3 rotation matrix.
     *
     * NOTE: The resultant quaternion is not normalized, so you should be sure
     * to renormalize the quaternion yourself where necessary.
     *
     * @param {quat} out the receiving quaternion
     * @param {mat3} m rotation matrix
     * @returns {quat} out
     * @function
     */
    fromMat3(out: floats, m: floats): floats;

    /**
     * Returns a string representation of a quatenion
     *
     * @param {quat} vec vector to represent as a string
     * @returns {String} string representation of the vector
     */
    str(a: floats): string;
  }
  export var quat: quat;
}
