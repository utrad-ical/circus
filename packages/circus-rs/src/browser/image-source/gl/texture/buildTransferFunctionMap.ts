import type { TransferFunction } from '../../../ViewState.ts';

interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Parses `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`.
 */
const parseHexColor = (color: string): RgbaColor => {
  const hex = color.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)?.[1];
  if (!hex) throw new TypeError(`Invalid color: ${color}`);
  const digits = hex.length <= 4 ? hex.replace(/./g, d => d + d) : hex;
  const [r, g, b, a = 255] = digits
    .match(/../g)!
    .map(pair => parseInt(pair, 16));
  return { r, g, b, a: a / 255 };
};

const mix = function (
  color1: RgbaColor,
  color2: RgbaColor,
  p: number
): RgbaColor {
  return {
    r: Math.round((color2.r - color1.r) * p + color1.r),
    g: Math.round((color2.g - color1.g) * p + color1.g),
    b: Math.round((color2.b - color1.b) * p + color1.b),
    a: (color2.a - color1.a) * p + color1.a
  };
};

/**
 * Build a gradition as a list of colors.
 * @param gradation The gradient definition
 * @param steps Number of steps to split
 * @return The list of RGBA colors
 */
export default function buildTransferFunctionMap(
  gradation: TransferFunction,
  steps = 256
): Uint8Array {
  if (!Array.isArray(gradation) || gradation.length === 0)
    throw new TypeError('Invalid gradation object.');

  const numSteps = gradation.length;

  type Step = { c: RgbaColor; p: number } | undefined;

  let gi = -1;
  let left: Step, right: Step;
  const nextStep = () => {
    ++gi;
    const leftStep = gradation[gi];
    const rightStep = gi < numSteps ? gradation[gi + 1] : gradation[gi];
    left = {
      c: parseHexColor(leftStep.color),
      p: Math.floor(leftStep.position * steps)
    };
    right = {
      c: parseHexColor(rightStep.color),
      p: Math.ceil(rightStep.position * steps)
    };
  };
  nextStep();
  if (!left || !right) throw new TypeError();

  const buffer = new Uint8Array(steps * 4);
  for (let i = 0; i < steps; i++) {
    if (right.p <= i) {
      nextStep();
    }

    const w = (i - left.p) / (right.p - left.p);
    const { r, g, b, a } = mix(left.c, right.c, w);

    const offset = i << 2;
    buffer[offset] = r;
    buffer[offset + 1] = g;
    buffer[offset + 2] = b;
    buffer[offset + 3] = Math.round(a * 255.0);
  }
  return buffer;
}
