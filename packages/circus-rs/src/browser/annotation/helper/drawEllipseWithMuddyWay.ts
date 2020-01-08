import { Box2, Vector2, Vector3 } from 'three';
import { Ellipsoid } from '../../../common/geometry/Ellipsoid';
import { box2GrowSubpixel } from '../../../common/geometry/Rectangle';
import { Section } from '../../../common/geometry/Section';
import { convertScreenCoordinateToVolumeCoordinate } from '../../section-util';
import getShadowCanvas from './getShadowCanvas';

const defaultFillStyle = 'rgba(255, 255, 0, 0.3)'; // #ffff00 yellow

export default function drawEllipseWithMuddyWay(
  ctx: CanvasRenderingContext2D,
  epllipsoid: Ellipsoid,
  resolution: Vector2,
  section: Section,
  outBox2: Box2,
  option: {
    fillStyle?: string;
  }
): void {
  const color = parseStyle(
    option.fillStyle ? option.fillStyle : defaultFillStyle
  );
  const origin = epllipsoid.origin;
  const a = epllipsoid.radiusX;
  const b = epllipsoid.radiusY;
  const c = epllipsoid.radiusZ;

  const inEllipsoid = (p: Vector3): boolean => {
    p = p.sub(origin);
    return (
      (p.x * p.x) / (a * a) + (p.y * p.y) / (b * b) + (p.z * p.z) / (c * c) <= 1
    );
  };

  box2GrowSubpixel(outBox2);
  const outSize = outBox2.getSize(new Vector2());

  const map = (x: number, y: number) =>
    convertScreenCoordinateToVolumeCoordinate(
      section,
      resolution,
      new Vector2().set(x + outBox2.min.x, y + outBox2.min.y)
    );

  let imageData = ctx.createImageData(outSize.x, outSize.y);
  let srcidx = 0,
    dstidx;
  for (let y = 0; y < outSize.y; y++) {
    for (let x = 0; x < outSize.x; x++) {
      dstidx = srcidx << 2; // meaning multiply 4

      const point3 = map(x, y);

      if (inEllipsoid(point3)) {
        imageData.data[dstidx] = color[0];
        imageData.data[dstidx + 1] = color[1];
        imageData.data[dstidx + 2] = color[2];
        imageData.data[dstidx + 3] = color[3];
      }
      srcidx++;
    }
  }

  const shadow = getShadowCanvas(outSize);
  const shadowContext = shadow.getContext('2d');
  if (!shadowContext) throw new Error('Failed to get canvas context');
  shadowContext.clearRect(0, 0, outSize.x, outSize.y);
  shadowContext.putImageData(imageData, 0, 0);

  ctx.drawImage(
    shadow,
    0,
    0,
    outSize.x,
    outSize.y, // src
    outBox2.min.x,
    outBox2.min.y,
    outSize.x,
    outSize.y // dest
  );
}

function parseStyle(fillStyle: string) {
  if (
    fillStyle.match(
      /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d\.]+)\s*\)/
    )
  ) {
    return [
      Number(RegExp.$1),
      Number(RegExp.$2),
      Number(RegExp.$3),
      Math.round(Number(RegExp.$4) * 0xff)
    ];
  }

  if (fillStyle.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)) {
    return [Number(RegExp.$1), Number(RegExp.$2), Number(RegExp.$3), 0xff];
  }

  if (fillStyle.match(/^#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/)) {
    return [
      parseInt(RegExp.$1, 16),
      parseInt(RegExp.$2, 16),
      parseInt(RegExp.$3, 16),
      0xff
    ];
  }

  return [0, 0, 0, 0];
}
