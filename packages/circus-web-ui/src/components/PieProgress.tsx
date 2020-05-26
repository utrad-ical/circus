import React, { useRef, useEffect } from 'react';

const PieProgress: React.FC<{
  max: number;
  value: number;
  size?: number;
  lineWidth?: number;
}> = props => {
  const { max, value, size = 30, lineWidth = 10 } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#00000000';
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    ctx.lineWidth = lineWidth;
    const d = (2 * Math.PI * value) / max;
    const r = size / 2;
    const zeroAngle = -Math.PI / 2;
    ctx.beginPath();
    ctx.strokeStyle = '#008800';
    ctx.arc(r, r, r - lineWidth / 2, zeroAngle, zeroAngle + d);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = '#bbbbbb';
    ctx.arc(r, r, r - lineWidth / 2, zeroAngle + d, zeroAngle + 2 * Math.PI);
    ctx.stroke();
  }, [max, value, size, lineWidth]);

  return (
    <canvas
      width={size}
      height={size}
      ref={canvasRef}
      style={{ verticalAlign: 'middle' }}
    />
  );
};

export default PieProgress;
