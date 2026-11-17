import type { z } from 'zod';
import type { seriesImportSummary } from '../../schemas/series.ts';
import type { Logger } from '@utrad-ical/circus-lib';
import parser from 'dicom-parser';
import type { ProgressReporter } from '../../createProgressManager.ts';
import type { DicomImporter } from '../../interface.ts';
import archiveEntries from '../../utils/archiveEntries.ts';
import isLikeDicom from '../../utils/isLikeDicom.ts';
import type { UploadedFile } from '../../utils/readMultipartFiles.ts';

export type ImportSummary = z.output<typeof seriesImportSummary>;

const mediaStorageDirectory = '1.2.840.10008.1.3.10';

const isDicomDir = (bytes: Uint8Array) => {
  try {
    const meta = parser.readPart10Header(bytes);
    return meta.string('x00020002') === mediaStorageDirectory;
  } catch {
    return false;
  }
};

/**
 * Imports the DICOM files in the uploaded files (or archives) one by one.
 * A broken file or archive is recorded, and the rest are still imported.
 * Throws only when the upload itself fails.
 */
const importUploadedFiles = async (
  files: AsyncIterable<UploadedFile>,
  options: {
    domain: string;
    maxEntryBytes: number;
    dicomImporter: DicomImporter;
    apiLogger: Logger;
    userEmail: string;
    reporter?: ProgressReporter;
  }
): Promise<ImportSummary> => {
  const { domain, maxEntryBytes, dicomImporter, apiLogger, userEmail } =
    options;
  const { reporter } = options;
  const summary: ImportSummary = { imported: 0, skipped: [], errors: [] };

  const skip = (file: string, reason: string) => {
    summary.skipped.push({ file, reason });
    reporter?.log('warn', `Skipped ${file}: ${reason}`);
  };
  const fail = (file: string, reason: string) => {
    summary.errors.push({ file, reason });
    reporter?.log('error', `Failed ${file}: ${reason}`);
    apiLogger.warn(
      `Upload failure (${userEmail}, domain ${domain}): ${file}: ${reason}`
    );
  };
  const report = () =>
    reporter?.report(
      `Imported ${summary.imported} file(s)` +
        (summary.skipped.length ? `, skipped ${summary.skipped.length}` : '') +
        (summary.errors.length ? `, failed ${summary.errors.length}` : '')
    );

  for await (const { filename, stream } of files) {
    try {
      for await (const entry of archiveEntries(stream, filename, {
        maxEntryBytes
      })) {
        let bytes: Uint8Array;
        try {
          bytes = await entry.bytes();
        } catch (err: any) {
          fail(entry.name, err.message);
          continue;
        }
        const buffer = bytes.buffer as ArrayBuffer;
        if (!isLikeDicom(buffer)) {
          skip(entry.name, 'Not a DICOM file');
        } else if (isDicomDir(bytes)) {
          skip(entry.name, 'DICOMDIR');
        } else {
          try {
            await dicomImporter.importDicom(buffer, domain);
            summary.imported++;
            reporter?.log('info', `Imported ${entry.name}`);
          } catch (err: any) {
            fail(entry.name, err.message);
          }
        }
        report();
      }
    } catch (err: any) {
      // The archive is broken; the rest of it is skipped
      fail(filename, `Invalid archive: ${err.message}`);
      await stream.cancel().catch(() => {});
    }
  }

  apiLogger.info(
    `Upload (${userEmail}, domain ${domain}): imported ${summary.imported}, ` +
      `skipped ${summary.skipped.length}, failed ${summary.errors.length}`
  );
  return summary;
};

export default importUploadedFiles;
