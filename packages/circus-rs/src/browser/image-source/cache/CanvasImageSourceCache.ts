export interface CanvasImageSourceCacheOption {
  maxSize?: number;
}

export default class CanvasImageSourceCache {
  private _canvasImageSource: Map<string, CanvasImageSource>;
  private _maxSize: number | undefined;

  constructor(option: CanvasImageSourceCacheOption = {}) {
    const { maxSize } = option;
    this._canvasImageSource = new Map();
    this._maxSize = maxSize && maxSize > 0 ? maxSize : undefined;
  }

  public async getImage(key: string): Promise<CanvasImageSource | undefined> {
    return this._canvasImageSource.get(key);
  }

  public async putImage(key: string, data: CanvasImageSource): Promise<void> {
    if (this._canvasImageSource.has(key)) {
      this._canvasImageSource.delete(key);
    }
    this._canvasImageSource.set(key, data);
    if (this._maxSize && this._canvasImageSource.size > this._maxSize) {
      const deleteCacheKey = this._canvasImageSource.keys().next().value;
      this._canvasImageSource.delete(deleteCacheKey);
    }
  }
}
