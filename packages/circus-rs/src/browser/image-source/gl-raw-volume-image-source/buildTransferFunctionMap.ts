import * as tinycolor from 'tinycolor2';
import { TransferFunction } from '../../view-state';

interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

const mix = function(
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

  let gi = -1;
  let left, right;
  const nextStep = () => {
    ++gi;
    const leftStep = gradation[gi];
    const rightStep = gi < numSteps ? gradation[gi + 1] : gradation[gi];
    left = {
      c: tinycolor(leftStep.color).toRgb(),
      p: Math.floor(leftStep.position * steps)
    };
    right = {
      c: tinycolor(rightStep.color).toRgb(),
      p: Math.ceil(rightStep.position * steps)
    };
  };
  nextStep();

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
