import { Box2, Vector2 } from 'three';
import { DirectedSegment } from '../../../common/geometry/Line';
import { FontStyle } from './fontStyle';

/**
 * Draw a point.
 */
export function drawPoint(
  ctx: CanvasRenderingContext2D,
  point: Vector2 | undefined,
  style: { radius: number; color: string }
) {
  if (!point) return;
  if (style.radius <= 0) return;

  ctx.save();
  try {
    ctx.fillStyle = style.color;

    ctx.beginPath();
    ctx.arc(point.x, point.y, style.radius, 0, Math.PI * 2);
    ctx.closePath();

    ctx.fill();
  } finally {
    ctx.restore();
  }
}

/**
 * Draw a line.
 */
export function drawLine(
  ctx: CanvasRenderingContext2D,
  directedSegment: DirectedSegment | undefined,
  style: { lineWidth: number; strokeStyle: string }
): void {
  if (!directedSegment) return;
  if (style.lineWidth <= 0) return;

  ctx.save();
  try {
    ctx.lineWidth = style.lineWidth;
    ctx.strokeStyle = style.strokeStyle;

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
 */
export function drawPolygon(
  ctx: CanvasRenderingContext2D,
  vertices: Vector2[] | undefined,
  style: { lineWidth: number; strokeStyle: string; fillStyle?: string }
): void {
  if (!vertices) return;

  ctx.save();
  try {
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    vertices.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();

    if (style.lineWidth > 0) {
      ctx.lineWidth = style.lineWidth;
      ctx.strokeStyle = style.strokeStyle;
      ctx.stroke();
    }
    if (style.fillStyle) {
      ctx.fillStyle = style.fillStyle;
      ctx.fill();
    }
  } finally {
    ctx.restore();
  }
}

/**
 * Draw a rectangle.
 */
export function drawRectangle(
  ctx: CanvasRenderingContext2D,
  box: Box2 | undefined,
  style: {
    lineWidth: number;
    strokeStyle: string;
    fillStyle?: string;
    lineDash?: number[];
  }
) {
  if (!box) return;

  ctx.save();
  try {
    ctx.beginPath();
    if (style.lineDash) ctx.setLineDash(style.lineDash);
    ctx.moveTo(box.min.x, box.min.y);
    ctx.lineTo(box.min.x, box.max.y);
    ctx.lineTo(box.max.x, box.max.y);
    ctx.lineTo(box.max.x, box.min.y);
    ctx.lineTo(box.min.x, box.min.y);
    ctx.closePath();

    if (style.lineWidth > 0) {
      ctx.lineWidth = style.lineWidth;
      ctx.strokeStyle = style.strokeStyle;
      ctx.stroke();
    }
    if (style.fillStyle) {
      ctx.fillStyle = style.fillStyle;
      ctx.fill();
    }
  } finally {
    ctx.restore();
  }
}

/**
 * Draw a ellipse.
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
  style: {
    lineWidth: number;
    strokeStyle: string;
    fillStyle?: string;
  }
) {
  if (!ellipse) return;
  const { origin, radiusX: xRadius, radiusY: yRadius, rotate } = ellipse;

  ctx.save();
  try {
    ctx.beginPath();
    ctx.ellipse(origin.x, origin.y, xRadius, yRadius, rotate, 0, 2 * Math.PI);
    ctx.closePath();

    if (style.lineWidth > 0) {
      ctx.lineWidth = style.lineWidth;
      ctx.strokeStyle = style.strokeStyle;
      ctx.stroke();
    }
    if (style.fillStyle) {
      ctx.fillStyle = style.fillStyle;
      ctx.fill();
    }
  } finally {
    ctx.restore();
  }
}

/**
 * Draw a square araund the point.
 */
export function drawSquareAroundPoint(
  ctx: CanvasRenderingContext2D,
  point: Vector2 | undefined,
  squareSize: number,
  style: { lineWidth: number; strokeStyle: string; fillStyle?: string }
): void {
  if (!point) return;

  ctx.save();
  try {
    ctx.beginPath();
    ctx.rect(
      point.x - squareSize,
      point.y - squareSize,
      squareSize * 2,
      squareSize * 2
    );
    ctx.closePath();

    if (style.lineWidth > 0) {
      ctx.lineWidth = style.lineWidth;
      ctx.strokeStyle = style.strokeStyle;
      ctx.stroke();
    }
    if (style.fillStyle) {
      ctx.fillStyle = style.fillStyle;
      ctx.fill();
    }
  } finally {
    ctx.restore();
  }
}

/**
 * Draw an simple figure of polygon, line, or point
 */
export function drawSimpleFigure(
  ctx: CanvasRenderingContext2D,
  vertices: Vector2[] | undefined,
  style: { lineWidth: number; strokeStyle: string; fillStyle?: string }
): void {
  if (!vertices) return;
  if (style.lineWidth <= 0 && !style.fillStyle) return;

  switch (vertices.length) {
    case 0:
      return;

    case 1: {
      // draw Point
      const radius = style.lineWidth;
      const color =
        style.lineWidth > 0 || !style.fillStyle
          ? style.strokeStyle
          : style.fillStyle;
      drawPoint(ctx, vertices[0], { radius, color });
      return;
    }
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

export function drawFillText(
  ctx: CanvasRenderingContext2D,
  text: string | undefined,
  origin: Vector2 | undefined,
  style: FontStyle
): { textBoundaryHitTest: (p: Vector2) => boolean } {
  if (!text) text = '';
  if (!origin) origin = new Vector2();
  ctx.save();
  try {
    let [fontSize, fontFamily] = ctx.font.split(' ');
    if (style.fontSize) fontSize = style.fontSize;
    if (style.fontFamily) fontFamily = style.fontFamily;
    ctx.font = fontSize + ' ' + fontFamily;
    if (style.color) ctx.fillStyle = style.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, origin.x, origin.y);

    const textMetrics = ctx.measureText(text);
    const {
      width,
      actualBoundingBoxAscent,
      actualBoundingBoxDescent
    } = textMetrics;
    const height = actualBoundingBoxAscent + actualBoundingBoxDescent;

    const box = new Box2(
      new Vector2(0, -height),
      new Vector2(width, 0)
    ).translate(origin);

    return { textBoundaryHitTest: (p: Vector2) => box.containsPoint(p) };
  } finally {
    ctx.restore();
  }
}
