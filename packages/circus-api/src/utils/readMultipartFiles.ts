import { parseMultipartRequest } from '@remix-run/multipart-parser/future';

export interface UploadedFile {
  /** The file name sent by the client, including its relative path */
  filename: string;
  stream: ReadableStream<Uint8Array>;
}

// Clients escape these in a file name (see the HTML spec of form data)
const decodeFilename = (name: string) =>
  name.replace(/%(22|0D|0A)/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

/**
 * Reads the files in a multipart request one by one, while receiving it.
 * Fields other than files are ignored.
 */
export default async function* readMultipartFiles(
  request: Request
): AsyncGenerator<UploadedFile> {
  const uploadError = (cause: unknown) =>
    request.signal.aborted
      ? new Error('The upload was interrupted.', { cause })
      : cause;

  try {
    const parts = parseMultipartRequest(request, {
      maxHeaderSize: 80 * 1024,
      // The importer limits individual DICOM files, including archive entries.
      maxFileSize: Infinity,
      maxTotalSize: Infinity,
      maxParts: Infinity
    });
    for await (const part of parts) {
      const filename = part.filename;
      if (filename === undefined) continue;

      // Keep control of the reader so a partly read file can be skipped.
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      const stream = new ReadableStream<Uint8Array>(
        {
          async pull(controller) {
            reader ??= part.body.getReader();
            try {
              const { done, value } = await reader.read();
              if (done) controller.close();
              else controller.enqueue(value);
            } catch (cause) {
              throw uploadError(cause);
            }
          },
          cancel: reason => reader?.cancel(reason)
        },
        { highWaterMark: 0 }
      );
      try {
        yield { filename: decodeFilename(filename), stream };
      } finally {
        if (reader) {
          await reader.cancel().catch(() => {});
          reader.releaseLock();
        }
      }
    }
  } catch (cause) {
    throw uploadError(cause);
  }
}
