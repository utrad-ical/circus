import { Vector2 } from 'three';
import {
  centerDirectedSegment,
  DirectedSegment
} from '../../../common/geometry/Line';
import { toPolygon } from '../../../common/geometry/Polygon';
import { drawLine, drawPolygon, drawSquareAroundPoint } from './drawObject';

export const defaultHandleSize = 5;
const defaultLineWidth = 1;
const defaultStrokeStyle = '#ff0000';

export default function drawHandleFrame(
  ctx: CanvasRenderingContext2D,
  frameVertices: Vector2[],
  option: {
    handleSize?: number;
    lineWidth?: number;
    strokeStyle?: string;
  } = {}
): void {
  const polygon = toPolygon(frameVertices);
  if (!polygon) return;

  const drawStyle = {
    handleSize: option.handleSize ? option.handleSize : defaultHandleSize,
    lineWidth: option.lineWidth ? option.lineWidth : defaultLineWidth,
    strokeStyle: option.strokeStyle ? option.strokeStyle : defaultStrokeStyle
  };

  const drawHandlePoints: Vector2[] = [];
  polygon.sides.forEach(i => {
    drawHandlePoints.push(i.from);
    drawHandlePoints.push(centerDirectedSegment(i));
  });

  ctx.save();
  try {
    drawHandlePoints.forEach(i => {
      drawSquareAroundPoint(ctx, i, drawStyle.handleSize, drawStyle);
    });

    if (polygon.vertices.length === 4) {
      const lines: DirectedSegment[] = [];
      for (let i = 0; i < drawHandlePoints.length; i++) {
        const handleSize = drawStyle.handleSize;
        var from = drawHandlePoints[i].clone();
        var to =
          i + 1 < drawHandlePoints.length
            ? drawHandlePoints[i + 1].clone()
            : drawHandlePoints[0].clone();
        if (from.y === to.y && from.x < to.x) {
          from.x += handleSize;
          to.x -= handleSize;
        } else if (from.y === to.y) {
          from.x -= handleSize;
          to.x += handleSize;
        } else if (from.x === to.x && from.y < to.y) {
          from.y += handleSize;
          to.y -= handleSize;
        } else if (from.x === to.x) {
          from.y -= handleSize;
          to.y += handleSize;
        }
        lines.push({ from, to });
        lines.forEach(i => drawLine(ctx, i, drawStyle));
      }
    } else {
      drawPolygon(ctx, polygon.vertices, drawStyle);
    }
  } finally {
    ctx.restore();
  }
}
