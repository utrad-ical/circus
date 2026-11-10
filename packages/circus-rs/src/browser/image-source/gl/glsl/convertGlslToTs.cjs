// import * as fs from 'fs';
const fs = require('fs');

const MprVertexShaderSource = fs.readFileSync('./mpr-section.vert', 'utf-8');
const MprFragmentShaderSource = [
  fs.readFileSync('./mpr-header.frag', 'utf-8'),
  fs.readFileSync('./pixel-value.frag', 'utf-8'),
  fs.readFileSync('./pixel-color.frag', 'utf-8'),
  fs.readFileSync('./mpr-main.frag', 'utf-8')
].join('\n');

const MprShaderSource = `const vertexShaderSource = '${MprVertexShaderSource.replace(
  /\n/g,
  '\\n'
)}';\nconst fragmentShaderSource = '${MprFragmentShaderSource.replace(
  /\n/g,
  '\\n'
)}';\nexport {vertexShaderSource, fragmentShaderSource};`;
fs.writeFile(
  './mprShaderSource.ts',
  MprShaderSource,
  'utf-8',
  function (err) {}
);

const VrVertexShaderSource = fs.readFileSync('./vr-volume.vert', 'utf-8');
const VrFragmentShaderSource = [
  fs.readFileSync('./vr-header.frag', 'utf-8'),
  fs.readFileSync('./vr-fn.frag', 'utf-8'),
  fs.readFileSync('./vr-main.frag', 'utf-8')
].join('\n');

const VrShaderSource = `const vertexShaderSource = '${VrVertexShaderSource.replace(
  /\n/g,
  '\\n'
)}';\nconst fragmentShaderSource = '${VrFragmentShaderSource.replace(
  /\n/g,
  '\\n'
)}';\nexport {vertexShaderSource, fragmentShaderSource};`;
fs.writeFile('./vrShaderSource.ts', VrShaderSource, 'utf-8', function (err) {});
