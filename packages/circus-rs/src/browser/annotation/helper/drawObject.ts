import { Box2, Vector2 } from 'three';
import { DirectedSegment } from '../../../common/geometry/Line';

/**
 * Draw a point.
 * @param ctx
 * @param point
 * @param radius
 * @param option
 */
export function drawPoint(
  ctx: CanvasRenderingContext2D,
  point: Vector2 | undefined,
  radius: number,
  option: { fillStyle: string }
) {
  if (!point) return;

  ctx.save();
  try {
    ctx.fillStyle = option.fillStyle;

    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.closePath();

    ctx.fill();
  } finally {
    ctx.restore();
  }
}

/**
 * Draw a line.
 * @param ctx
 * @param directedSegment
 * @param option
 */
export function drawLine(
  ctx: CanvasRenderingContext2D,
  directedSegment: DirectedSegment | undefined,
  option: { lineWidth?: number; strokeStyle?: string }
): void {
  if (!directedSegment) return;
  ctx.save();
  try {
    if (option.lineWidth) ctx.lineWidth = option.lineWidth;
    if (option.strokeStyle) ctx.strokeStyle = option.strokeStyle;

    ctx.beginPath();
    ctx.moveTo(directedSegment.from.x, directedSegment.from.y);
    ctx.lineTo(directedSegment.to.x, directedSegment.to.y);
    ctx.closePath();

    ctx.stroke();
  } finally {
    ctx.restore();
  }
}

/**
 * Draw a polygon.
 * @param ctx 
 * @param vertices 
 * @param option 
 */
export function drawPolygon(
  ctx: CanvasRenderingContext2D,
  vertices: Vector2[] | undefined,
  option: { lineWidth?: number; strokeStyle?: string; fillStyle?: string }
): void {
  if (!vertices) return;
  ctx.save();
  try {
    if (option.lineWidth) ctx.lineWidth = option.lineWidth;
    if (option.strokeStyle) ctx.strokeStyle = option.strokeStyle;
    if (option.fillStyle) ctx.fillStyle = option.fillStyle;

    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    vertices.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();

    if (option.strokeStyle || (!option.strokeStyle && !option.fillStyle))
      ctx.stroke();
    if (option.fillStyle) ctx.fill();
  } finally {
    ctx.restore();
  }
}

/**
 * Draw a rectangle.
 * @param ctx 
 * @param vertices 
 * @param option 
 */
export function drawRectangle(
  ctx: CanvasRenderingContext2D,
  box: Box2 | undefined,
  option: {
    strokeStyle?: string;
    lineWidth?: number;
    fillStyle?: string;
  }
) {
  if (!box) return;

  ctx.save();
  try {
    if (option.lineWidth) ctx.lineWidth = option.lineWidth;
    if (option.strokeStyle) ctx.strokeStyle = option.strokeStyle;
    if (option.fillStyle) ctx.fillStyle = option.fillStyle;

    ctx.beginPath();
    ctx.moveTo(box.min.x, box.min.y);
    ctx.lineTo(box.min.x, box.max.y);
    ctx.lineTo(box.max.x, box.max.y);
    ctx.lineTo(box.max.x, box.min.y);
    ctx.lineTo(box.min.x, box.min.y);
    ctx.closePath();

    if (option.strokeStyle || (!option.strokeStyle && !option.fillStyle))
      ctx.stroke();
    if (option.fillStyle) ctx.fill();
  } finally {
    ctx.restore();
  }
}

/**
 * Draw a ellipse.
 * @param ctx 
 * @param vertices 
 * @param option 
 */
export function drawEllipse(
  ctx: CanvasRenderingContext2D,
  ellipse:
    | {
        origin: Vector2;
        radiusX: number;
        radiusY: number;
        rotate: number;
      }
    | undefined,
  option: {
    strokeStyle?: string;
    lineWidth?: number;
    fillStyle?: string;
  }
) {
  if (!ellipse) return;
  const { origin, radiusX: xRadius, radiusY: yRadius, rotate } = ellipse;

  ctx.save();
  try {
    if (option.lineWidth) ctx.lineWidth = option.lineWidth;
    if (option.strokeStyle) ctx.strokeStyle = option.strokeStyle;
    if (option.fillStyle) ctx.fillStyle = option.fillStyle;

    ctx.beginPath();
    ctx.ellipse(origin.x, origin.y, xRadius, yRadius, rotate, 0, 2 * Math.PI);
    ctx.closePath();

    if (option.strokeStyle || (!option.strokeStyle && !option.fillStyle))
      ctx.stroke();
    if (option.fillStyle) ctx.fill();
  } finally {
    ctx.restore();
  }
}

/**
 * Draw a square araund the point.
 * @param ctx 
 * @param vertices 
 * @param option 
 */
export function drawSquareAroundPoint(
  ctx: CanvasRenderingContext2D,
  point: Vector2 | undefined,
  squareSize: number,
  option: { lineWidth?: number; strokeStyle?: string; fillStyle?: string }
): void {
  if (!point) return;

  ctx.save();
  try {
    if (option.lineWidth) ctx.lineWidth = option.lineWidth;
    if (option.strokeStyle) ctx.strokeStyle = option.strokeStyle;
    if (option.fillStyle) ctx.fillStyle = option.fillStyle;

    ctx.beginPath();
    ctx.rect(
      point.x - squareSize,
      point.y - squareSize,
      squareSize * 2,
      squareSize * 2
    );
    ctx.closePath();

    if (option.strokeStyle || (!option.strokeStyle && !option.fillStyle))
      ctx.stroke();
    if (option.fillStyle) ctx.fill();
  } finally {
    ctx.restore();
  }
}

/**
 * Draw an outlines (polygon, line, or point)
 * @param ctx 
 * @param vertices 
 * @param style 
 */
export function drawOutline(
  ctx: CanvasRenderingContext2D,
  vertices: Vector2[] | undefined,
  style: { strokeStyle: string; lineWidth: number }
): void {
  if (!vertices) return;

  switch (vertices.length) {
    case 0:
      return;

    case 1:
      // draw Point
      const radius = style.lineWidth;
      const pointStyle = { fillStyle: style.strokeStyle };
      drawPoint(ctx, vertices[0], radius, pointStyle);
      return;

    case 2:
      // draw Line
      drawLine(
        ctx,
        {
          from: vertices[0],
          to: vertices[1]
        },
        style
      );
      return;

    default:
      // draw Polygon
      drawPolygon(ctx, vertices, style);
      return;
  }
}
