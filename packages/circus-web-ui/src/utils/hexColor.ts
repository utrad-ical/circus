/**
 * Parses `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa` into
 * `[r, g, b, a]` (0-255 each), or returns `undefined`.
 */
export const parseHexColor = (
  color: string
): [number, number, number, number] | undefined => {
  const hex = color.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)?.[1];
  if (!hex) return undefined;
  const digits = hex.length <= 4 ? hex.replace(/./g, d => d + d) : hex;
  const [r, g, b, a = 255] = digits
    .match(/../g)!
    .map(pair => parseInt(pair, 16));
  return [r, g, b, a];
};

const toHex = (values: number[]) =>
  '#' + values.map(v => v.toString(16).padStart(2, '0')).join('');

/**
 * Returns `#rrggbb`, or the input as is if it is not a hex color.
 */
export const toHex6 = (color: string) => {
  const rgba = parseHexColor(color);
  return rgba ? toHex(rgba.slice(0, 3)) : color;
};

/**
 * Returns `#rrggbbaa` with the given alpha (0-1),
 * or the input as is if it is not a hex color.
 */
export const withAlpha = (color: string, alpha: number) => {
  const rgba = parseHexColor(color);
  return rgba ? toHex([...rgba.slice(0, 3), Math.round(alpha * 255)]) : color;
};

/**
 * Returns the alpha (0-1) of a hex color (1 if not a hex color).
 */
export const getAlpha = (color: string) =>
  (parseHexColor(color)?.[3] ?? 255) / 255;
