// HACK: Support-2d-image-source
export const createCanvasImageSource = (
  src: ImageData
): Promise<CanvasImageSource> =>
  new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = src.width;
    canvas.height = src.height;
    canvas.getContext('2d')?.putImageData(src, 0, 0);
    const img = new Image(src.width, src.height);
    img.src = canvas.toDataURL();
    img.onload = () => resolve(img);
  });
