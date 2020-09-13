import LoadingIndicator from '../interface/LoadingIndicator';

const defaultLoadingIndicator: LoadingIndicator = (ctx, time) => {
  const size = 48;
  const lineWidth = 8;
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  try {
    const angle = time / 150;
    const angleDiff = (Math.sin(time / 400) * 0.5 + 1) * Math.PI;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, size / 2, angle, angle + angleDiff);
    ctx.stroke();
  } finally {
    ctx.restore();
  }
};

export default defaultLoadingIndicator;
