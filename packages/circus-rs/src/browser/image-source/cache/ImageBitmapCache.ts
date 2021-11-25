export interface ImageBitmapCacheOption {
  maxSize?: number;
}

export default class ImageBitmapCache {
  private _image: Map<string, ImageBitmap>;
  private _maxSize: number | undefined;

  constructor(option: ImageBitmapCacheOption = {}) {
    const { maxSize } = option;
    this._image = new Map();
    this._maxSize = maxSize && maxSize > 0 ? maxSize : undefined;
  }

  public async getImage(key: string): Promise<ImageBitmap | undefined> {
    if (this._image.has(key)) {
      const value = this._image.get(key)!;
      this._image.delete(key);
      this._image.set(key, value);
      return value;
    }
    return undefined;
  }

  public async putImage(key: string, value: ImageBitmap): Promise<void> {
    this._image.set(key, value);
    if (this._maxSize && this._image.size > this._maxSize) {
      const deleteCacheKey = this._image.keys().next().value;
      this._image.delete(deleteCacheKey);
    }
  }
}
