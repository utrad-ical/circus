// shorthand ambient module definitions

declare module 'png';
declare module 'jpeg-lossless-decoder-js';
declare module 'merge';
declare module 'extend';

declare module 'gl-matrix/src/gl-matrix/vec3.js';
declare module 'gl-matrix/src/gl-matrix/vec4.js';
declare module 'gl-matrix/src/gl-matrix/mat4.js';

declare module 'axios/lib/adapters/http';

// Text files imported as strings (e.g., GLSL shaders).
// Handled by Vite natively, by webpack (`asset/source`) and by tsdown
// at publish time.
declare module '*?raw' {
  const content: string;
  export default content;
}
