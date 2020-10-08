import { Viewer } from '..';
import ViewState from '../ViewState';
import ImageSource, { DrawResult } from './ImageSource';

export default class MockDraftImageSource extends ImageSource {
  public initialState() {
    return ({} as any) as ViewState;
  }

  public async draw(
    viewer: Viewer,
    viewState: ViewState,
    abortSignal: AbortSignal
  ) {
    const [w, h] = viewer.getResolution();

    const mosaic = (size: number) => {
      const imageData = new ImageData(w, h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const color = x % size > size / 2 ? 255 : 0;
          const index = 4 * (y * w + x);
          imageData.data[index] = color;
          imageData.data[index + 1] = color;
          imageData.data[index + 2] = color;
          imageData.data[index + 3] = 255; // alpha
        }
      }
      return imageData;
    };

    let size = 10;
    const nextResult = (): DrawResult => {
      if (size === 1) return mosaic(1);
      else {
        size--;
        return {
          draft: mosaic(size),
          next: new Promise(resolve => {
            if (abortSignal.aborted) return;
            setTimeout(() => resolve(nextResult()), 500);
          })
        };
      }
    };

    return nextResult();
  }
}
