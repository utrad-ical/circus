import stream from 'stream';

/**
 * Base image encoder class. An ImageEncoder receives a 8-bit grayscale
 * image from Buffer and writes common image file data (e.g., PNG)
 * into a given stream.
 */
export default interface ImageEncoder {
  mimeType: () => string;
  write: (
    image: Buffer,
    width: number,
    height: number
  ) => Promise<stream.Readable>;
}
