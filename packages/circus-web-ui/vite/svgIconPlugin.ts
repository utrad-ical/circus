import fs from 'node:fs/promises';
import type { Plugin } from 'vite';

const suffix = '?icon';

const shapeElements = ['path', 'circle', 'ellipse', 'polygon', 'rect'];
const shapeAttributes = [
  'd',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'points',
  'x',
  'y',
  'width',
  'height'
];

const parseAttributes = (source: string, file: string) => {
  const attributes: Record<string, string> = {};
  for (const [, name, value] of source.matchAll(/([\w:-]+)="([^"]*)"/g)) {
    attributes[name] = value;
  }
  for (const name of Object.keys(attributes)) {
    if (!shapeAttributes.includes(name)) {
      throw new Error(`Unsupported attribute "${name}" in ${file}`);
    }
  }
  return attributes;
};

/**
 * Turns a single-color SVG file into plain data that `Icon` renders
 * (`import data from './x.svg?icon'`), keeping only its shapes.
 */
const convert = (svg: string, file: string) => {
  const viewBox = svg.match(/<svg\b[^>]*\bviewBox="([^"]+)"/)?.[1];
  if (!viewBox) throw new Error(`No viewBox in ${file}`);
  const body = svg
    .replace(/<\?xml[^>]*>|<!--[\s\S]*?-->/g, '')
    .replace(/<title>[\s\S]*?<\/title>/g, '');
  const shapes: [string, Record<string, string>][] = [];
  for (const [, tag, rest] of body.matchAll(/<(\w+)\b([^>]*)>/g)) {
    if (tag === 'svg' || tag === 'g') continue;
    if (!shapeElements.includes(tag)) {
      throw new Error(`Unsupported element <${tag}> in ${file}`);
    }
    shapes.push([tag, parseAttributes(rest.replace(/\/$/, ''), file)]);
  }
  return `export default ${JSON.stringify({ viewBox, shapes })};`;
};

const svgIconPlugin = (): Plugin => ({
  name: 'circus-svg-icon',
  enforce: 'pre',
  async resolveId(source, importer) {
    if (!source.endsWith(suffix)) return null;
    const resolved = await this.resolve(
      source.slice(0, -suffix.length),
      importer,
      {
        skipSelf: true
      }
    );
    return resolved ? resolved.id + suffix : null;
  },
  async load(id) {
    if (!id.endsWith(suffix)) return null;
    const file = id.slice(0, -suffix.length);
    const code = convert(await fs.readFile(file, 'utf8'), file);
    return { code, moduleType: 'js' };
  }
});

export default svgIconPlugin;
