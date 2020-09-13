import LoadingIndicator from '../interface/LoadingIndicator';

const defaultLoadingIndicator: LoadingIndicator = (ctx, time) => {
  const size = 48;
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  try {
    const angle = time / 200;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, size / 2, angle, angle + Math.PI);
    ctx.stroke();
  } finally {
    ctx.restore();
  }
};

export default defaultLoadingIndicator;
