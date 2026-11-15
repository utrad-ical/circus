import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';

export interface MultipartFile {
  filename: string;
  /** Called when the part is sent */
  data: () => AsyncIterable<Uint8Array>;
}

// Escapes as browsers do (see the HTML spec of form data)
const escapeFilename = (name: string) =>
  name.replace(/["\r\n]/g, c => encodeURIComponent(c));

/**
 * Makes a multipart/form-data body that streams the files one by one,
 * without knowing their sizes in advance.
 */
const multipartBody = (
  files: MultipartFile[],
  options: { fieldName?: string; onSent?: (bytes: number) => void } = {}
) => {
  const { fieldName = 'files', onSent } = options;
  const boundary = `----circus-cli-${randomBytes(16).toString('hex')}`;
  const encoder = new TextEncoder();
  async function* generate() {
    for (const { filename, data } of files) {
      yield encoder.encode(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${fieldName}"; ` +
          `filename="${escapeFilename(filename)}"\r\n` +
          'Content-Type: application/octet-stream\r\n\r\n'
      );
      for await (const chunk of data()) {
        yield chunk;
        onSent?.(chunk.byteLength);
      }
      yield encoder.encode('\r\n');
    }
    yield encoder.encode(`--${boundary}--\r\n`);
  }
  return {
    body: Readable.toWeb(
      Readable.from(generate())
    ) as ReadableStream<Uint8Array>,
    contentType: `multipart/form-data; boundary=${boundary}`
  };
};

export default multipartBody;
