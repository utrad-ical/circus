const tinycolor = require('tinycolor2');

const mix = function(color1, color2, p) {
  var rgb1 = color1;
  var rgb2 = color2;

  var rgba = {
    r: Math.round((rgb2.r - rgb1.r) * p + rgb1.r),
    g: Math.round((rgb2.g - rgb1.g) * p + rgb1.g),
    b: Math.round((rgb2.b - rgb1.b) * p + rgb1.b),
    a: (rgb2.a - rgb1.a) * p + rgb1.a
  };

  return rgba;
};

export function buildTransferFunction(gradation, steps = 256) {
  if (!Array.isArray(gradation) || gradation.length == 0)
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
