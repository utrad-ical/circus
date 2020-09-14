export const toRgbaHexColorCode = (
  hexColorCode: string,
  alpha: number
): string =>
  hexColorCode +
  Math.floor(alpha * 255)
    .toString(16)
    .padStart(2, '0');

export function getOppositeColor(hexColorCode: string): string {
  return _rgbToHex(_rgbOppositeColor(_hexToRgb(hexColorCode)));
}

export function getComplementaryColor(hexColorCode: string): string {
  return _rgbToHex(_rgbComplementaryColor(_hexToRgb(hexColorCode)));
}

function _hexToRgb(hexColorCode: string): number[] {
  if (hexColorCode.slice(0, 1) == '#') hexColorCode = hexColorCode.slice(1);
  if (hexColorCode.length == 3)
    hexColorCode =
      hexColorCode.slice(0, 1) +
      hexColorCode.slice(0, 1) +
      hexColorCode.slice(1, 2) +
      hexColorCode.slice(1, 2) +
      hexColorCode.slice(2, 3) +
      hexColorCode.slice(2, 3);
  return [
    hexColorCode.slice(0, 2),
    hexColorCode.slice(2, 4),
    hexColorCode.slice(4, 6)
  ].map(str => {
    return parseInt(str, 16);
  });
}

function _rgbToHex(rgb: number[]) {
  return (
    '#' +
    rgb
      .map(value => {
        return ('0' + value.toString(16)).slice(-2);
      })
      .join('')
  );
}

const _rgbOppositeColor = (rgb: number[]): number[] => {
  return [...rgb].map(value => {
    return 255 - value;
  });
};

const _rgbComplementaryColor = (rgb: number[]): number[] => {
  return [...rgb].map(value => {
    return Math.max(...rgb) + Math.min(...rgb) - value;
  });
};
