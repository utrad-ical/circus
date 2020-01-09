import { Box3, Vector2, Vector3 } from 'three';
import { Section } from '../../../common/geometry/Section';
import { convertVolumeCoordinateToScreenCoordinate } from '../../section-util';
import { LineDrawStyle } from '../SolidFigure';

export default function drawBoundingBoxOutline(
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

  const vertices = [
    [min.x, min.y, min.z],
    [max.x, min.y, min.z],
    [max.x, max.y, min.z],
    [min.x, max.y, min.z]
  ].map(xyz => new Vector3().fromArray(xyz));

  const z = new Vector3().set(0, 0, max.z - min.z);
  const aVertices = vertices.map(v => map2vp(v));
  const bVertices = vertices.map(v => map2vp(v.clone().add(z)));

  ctx.save();
  try {
    ctx.beginPath();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    for (let i = 0; i < vertices.length; i++) {
      const p0 = aVertices[i];
      const p1 = aVertices[(i + 1) % vertices.length];
      const p0z = bVertices[i];
      const p1z = bVertices[(i + 1) % vertices.length];
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.moveTo(p0z.x, p0z.y);
      ctx.lineTo(p1z.x, p1z.y);
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p0z.x, p0z.y);
    }
    ctx.closePath();
    ctx.stroke();
  } finally {
    ctx.restore();
  }
}
