declare module 'gl-matrix';
declare module 'jpeg-lossless-decoder-js';

// Converted by vite/svgIconPlugin.ts
interface SvgIconData {
  viewBox: string;
  shapes: [string, Record<string, string>][];
}
declare module '*.svg?icon' {
  const icon: SvgIconData;
  export default icon;
}
