import { Box3, Vector2, Vector3 } from 'three';
import { Section } from '../../../common/geometry/Section';
import { convertVolumeCoordinateToScreenCoordinate } from '../../section-util';
import { LineDrawStyle } from '../SolidFigure';

export default function drawBoundingBoxBones(
  ctx: CanvasRenderingContext2D,
  boundingBox3: Box3,
  resolution: Vector2, // new Vector2().fromArray(viewer.getResolution())
  section: Section,
  option: LineDrawStyle
): void {
  const { width: lineWidth, color: strokeStyle } = option;

  const map2vp = (p3: Vector3) =>
    convertVolumeCoordinateToScreenCoordinate(section, resolution, p3);

  const { min, max } = boundingBox3;
  const size = boundingBox3.getSize(new Vector3());

  const x = [
    new Vector3().set(0, size.y / 2, size.z / 2),
    new Vector3().set(size.x, size.y / 2, size.z / 2)
  ];
  const y = [
    new Vector3().set(size.x / 2, 0, size.z / 2),
    new Vector3().set(size.x / 2, size.y, size.z / 2)
  ];
  const z = [
    new Vector3().set(size.x / 2, size.y / 2, 0),
    new Vector3().set(size.x / 2, size.y / 2, size.z)
  ];
  ctx.save();
  try {
    ctx.beginPath();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    [x, y, z].forEach(([start, end]) => {
      const p0 = map2vp(min.clone().add(start));
      const p1 = map2vp(min.clone().add(end));
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
    });
    ctx.closePath();
    ctx.stroke();
  } finally {
    ctx.restore();
  }
}
