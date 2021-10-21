export interface ImageDataCacheOption {
  maxSize?: number;
}

export default class ImageDataCache {
  private _imageData: Map<string, ImageData>;
  private _maxSize: number | undefined;

  constructor(option: ImageDataCacheOption = {}) {
    const { maxSize } = option;
    this._imageData = new Map();
    this._maxSize = maxSize && maxSize > 0 ? maxSize : undefined;
  }

  public async getImage(key: string): Promise<ImageData | undefined> {
    return this._imageData.get(key);
  }

  public async putImage(key: string, data: ImageData): Promise<void> {
    if (this._imageData.has(key)) {
      this._imageData.delete(key);
    }
    this._imageData.set(key, data);
    if (this._maxSize && this._imageData.size > this._maxSize) {
      const deleteCacheKey = this._imageData.keys().next().value;
      this._imageData.delete(deleteCacheKey);
    }
  }
}
