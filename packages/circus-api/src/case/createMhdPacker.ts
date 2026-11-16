import type {
  DicomFileRepository,
  FunctionService,
  Logger
} from '@utrad-ical/circus-lib';
import {
  type DicomExtractorWorker,
  type PartialVolumeDescriptor,
  type Vector3D,
  RawData,
  generateMhdHeader,
  isValidPartialVolumeDescriptor,
  openSeriesVolume,
  partialVolumeDescriptorToArray,
  pixelFormatInfo
} from '@utrad-ical/circus-rs/server';
import httpStatus from 'http-status';
import * as mr from 'multi-integer-range';
import type { ProgressReporter } from '../createProgressManager.ts';
import type { Models } from '../interface.ts';
import type Storage from '../storage/Storage.ts';
import createArchiveWriter, {
  type ArchiveFormat,
  type ArchiveWriter
} from '../utils/createArchiveWriter.ts';
import zeroPad from '../utils/zeroPad.ts';

export interface CaseExportTarget {
  caseId: string;
  /** Index of `revisions`; the latest revision if omitted */
  revisionIndex?: number;
}

export type LabelPackType = 'isolated' | 'combined';
export type LineEndingType = 'lf' | 'crlf';

export interface PackOptions {
  /**
   * Exports all the images of the series as they are,
   * instead of the partial volume. Labels are always in the partial volume.
   */
  fullOriginalVolume: boolean;
  labelPackType: LabelPackType;
  mhdLineEnding: LineEndingType;
  compressionFormat: ArchiveFormat;
}

interface PreparedSeries {
  seriesUid: string;
  pvd: PartialVolumeDescriptor;
  /** Number of slices in the partial volume */
  pvdLength: number;
  labels: any[];
}

interface PreparedCase {
  caseData: any;
  revision: any;
  series: PreparedSeries[];
  /** `images` of each series in the DB */
  originalSeriesMeta: { [seriesUid: string]: { images: string } };
}

/**
 * The cases checked and loaded from the DB before exporting.
 */
export interface PreparedExport {
  cases: PreparedCase[];
  /** Number of slices to export in total */
  totalSlices: number;
}

export interface MhdPacker {
  /**
   * Loads and checks the cases.
   * Throws a 400 error if the cases or the series are invalid.
   */
  prepare: (
    targets: CaseExportTarget[],
    fullOriginalVolume: boolean
  ) => Promise<PreparedExport>;
  /**
   * Packs the cases into an archive.
   * The stream fails if an error occurs during packing.
   */
  pack: (
    prepared: PreparedExport,
    options: PackOptions,
    reporter?: ProgressReporter
  ) => ReadableStream<Uint8Array>;
}

const badRequest = (message: string) =>
  Object.assign(new Error(message), {
    status: httpStatus.BAD_REQUEST,
    expose: true
  });

/**
 * Turns `3` to `'003'`, etc.
 */
const pad = (num: number) => zeroPad(3, num);

// Same as the default in the web UI
const defaultPvd = (images: mr.MIR): PartialVolumeDescriptor => ({
  start: images[0][0],
  end: images[0][1],
  delta: 1
});

const createMhdPacker: FunctionService<
  MhdPacker,
  {
    models: Models;
    dicomFileRepository: DicomFileRepository;
    dicomExtractorWorker: DicomExtractorWorker;
    blobStorage: Storage;
    apiLogger: Logger;
  }
> = async (opts, deps) => {
  const { models, blobStorage, apiLogger } = deps;

  const prepareSeries = async (
    entry: any,
    fullOriginalVolume: boolean,
    originalSeriesMeta: PreparedCase['originalSeriesMeta']
  ) => {
    const seriesData = await models.series.findById(entry.seriesUid);
    if (!seriesData) throw badRequest(`Series ${entry.seriesUid} not found.`);
    const images = mr.parse(seriesData.images);
    if (!images.length) throw badRequest(`Series ${entry.seriesUid} is empty.`);
    const pvd: PartialVolumeDescriptor =
      entry.partialVolumeDescriptor ?? defaultPvd(images);
    if (
      !isValidPartialVolumeDescriptor(pvd) ||
      !mr.has(images, mr.normalize(partialVolumeDescriptorToArray(pvd)))
    )
      throw badRequest(`Invalid image range of ${entry.seriesUid}.`);
    originalSeriesMeta[entry.seriesUid] = { images: seriesData.images };
    const pvdLength = partialVolumeDescriptorToArray(pvd).length;
    const prepared: PreparedSeries = {
      seriesUid: entry.seriesUid,
      pvd,
      pvdLength,
      labels: entry.labels
    };
    return {
      prepared,
      slices: fullOriginalVolume ? mr.length(images) : pvdLength
    };
  };

  const prepare: MhdPacker['prepare'] = async (targets, fullOriginalVolume) => {
    const cases: PreparedCase[] = [];
    let totalSlices = 0;
    for (const { caseId, revisionIndex } of targets) {
      const caseData = await models.clinicalCase.findById(caseId);
      if (!caseData) throw badRequest('Some cases do not exist.');
      const revision =
        revisionIndex === undefined
          ? caseData.revisions.at(-1)
          : caseData.revisions[revisionIndex];
      if (!revision) throw badRequest('Invalid revision index.');
      const originalSeriesMeta = {};
      const series: PreparedSeries[] = [];
      for (const entry of revision.series) {
        const { prepared, slices } = await prepareSeries(
          entry,
          fullOriginalVolume,
          originalSeriesMeta
        );
        series.push(prepared);
        totalSlices += slices;
      }
      cases.push({ caseData, revision, series, originalSeriesMeta });
    }
    return { cases, totalSlices };
  };

  const readLabel = async (label: any) => {
    const buffer = await blobStorage.read(label.data.voxels);
    const labelVol = new RawData(label.data.size, 'binary');
    labelVol.assign(
      buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      ) as ArrayBuffer
    );
    return labelVol;
  };

  /**
   * Writes the voxel labels in the partial volume, without any conversion.
   */
  const putLabels = async (
    writer: ArchiveWriter,
    baseName: string,
    series: PreparedSeries,
    dimension: Vector3D,
    elementSpacing: Vector3D,
    options: PackOptions
  ) => {
    const putVolume = async (name: string, vol: RawData) => {
      await writer.add(name + '.raw', new Uint8Array(vol.data));
      await writer.add(
        name + '.mhd',
        generateMhdHeader(
          'uint8',
          dimension,
          elementSpacing,
          name.split('/').pop() + '.raw',
          options.mhdLineEnding
        )
      );
    };
    const voxelLabels = series.labels
      .map((label, labelId) => ({ label, labelId }))
      .filter(({ label }) => label.type === 'voxel' && label.data.voxels);
    if (!voxelLabels.length) return;
    if (options.labelPackType === 'combined') {
      const combined = new RawData(dimension, 'uint8');
      for (const { label, labelId } of voxelLabels) {
        combined.copy(
          await readLabel(label),
          undefined,
          label.data.origin,
          (src, dest) => (src > 0 ? labelId + 1 : dest)
        );
      }
      await putVolume(baseName, combined);
    } else {
      for (const { label, labelId } of voxelLabels) {
        const vol = new RawData(dimension, 'uint8');
        vol.copy(await readLabel(label), undefined, label.data.origin);
        await putVolume(baseName + pad(labelId), vol);
      }
    }
  };

  /**
   * Determines the spacing of the partial volume, reading only its first
   * two slices. A single slice keeps the spacing of the whole series.
   */
  const partialVolumeSpacing = async (
    series: PreparedSeries,
    seriesSpacing: Vector3D
  ) => {
    const { metadata, slices } = await openSeriesVolume(
      deps,
      series.seriesUid,
      series.pvd
    );
    await slices.cancel();
    return metadata.dimension[2] > 1 ? metadata.elementSpacing : seriesSpacing;
  };

  const pack: MhdPacker['pack'] = (prepared, options, reporter) => {
    const writer = createArchiveWriter(options.compressionFormat);
    let finished = 0;
    let canceled = false;

    const putCase = async (c: PreparedCase) => {
      const { caseId } = c.caseData;
      const exportObject = {
        caseId,
        createdAt: c.caseData.createdAt.toISOString(),
        updatedAt: c.caseData.updatedAt.toISOString(),
        projectId: c.caseData.projectId,
        revision: c.revision,
        originalSeriesMeta: c.originalSeriesMeta
      };
      await writer.add(
        `${caseId}/data.json`,
        JSON.stringify(exportObject, null, '  ')
      );
      for (let volId = 0; volId < c.series.length; volId++) {
        const series = c.series[volId];
        const { metadata, slices } = await openSeriesVolume(
          deps,
          series.seriesUid,
          options.fullOriginalVolume ? undefined : series.pvd
        );
        const { dimension, pixelFormat, elementSpacing } = metadata;
        const baseName = `${caseId}/vol${pad(volId)}`;
        let count = 0;
        const counted = slices.pipeThrough(
          new TransformStream<Uint8Array, Uint8Array>({
            transform: (chunk, controller) => {
              controller.enqueue(chunk);
              finished++;
              count++;
              reporter?.report(
                `Packing ${caseId} vol${pad(volId)} (${count}/${dimension[2]})`,
                finished,
                prepared.totalSlices
              );
            }
          })
        );
        const size =
          dimension[0] *
          dimension[1] *
          dimension[2] *
          pixelFormatInfo(pixelFormat).bpp;
        await writer.add(baseName + '.raw', counted, size);
        await writer.add(
          baseName + '.mhd',
          generateMhdHeader(
            pixelFormat,
            dimension,
            elementSpacing,
            `vol${pad(volId)}.raw`,
            options.mhdLineEnding
          )
        );
        // The labels stay in the partial volume
        const labelSpacing = options.fullOriginalVolume
          ? await partialVolumeSpacing(series, elementSpacing)
          : elementSpacing;
        await putLabels(
          writer,
          baseName + '-label',
          series,
          [dimension[0], dimension[1], series.pvdLength],
          labelSpacing,
          options
        );
      }
    };

    (async () => {
      try {
        for (const c of prepared.cases) await putCase(c);
        await writer.close();
        reporter?.finish(`Packed ${prepared.cases.length} case(s).`);
      } catch (err: any) {
        if (canceled) {
          reporter?.fail('The download was canceled.');
          return;
        }
        apiLogger.error(`Case export error: ${err?.message}`);
        reporter?.fail(
          'An internal error occurred while exporting the case data.'
        );
        writer.abort(err);
      }
    })();

    const reader = writer.readable.getReader();
    return new ReadableStream<Uint8Array>(
      {
        pull: async controller => {
          const { done, value } = await reader.read();
          if (done) controller.close();
          else controller.enqueue(value);
        },
        cancel: async reason => {
          canceled = true;
          await reader.cancel(reason);
        }
      },
      { highWaterMark: 0 }
    );
  };

  return { prepare, pack };
};

createMhdPacker.dependencies = [
  'models',
  'dicomFileRepository',
  'dicomExtractorWorker',
  'blobStorage',
  'apiLogger'
];

export default createMhdPacker;
