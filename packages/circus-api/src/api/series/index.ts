import * as mr from 'multi-integer-range';
import type { PartialVolumeDescriptor } from '@utrad-ical/circus-rs/server';
import status from 'http-status';
import { Readable } from 'node:stream';
import type {
  CircusContext,
  RouteMiddleware
} from '../../typings/middlewares.ts';
import checkFilter from '../../utils/checkFilter.ts';
import readMultipartFiles from '../../utils/readMultipartFiles.ts';
import tarToZip from '../../utils/tarToZip.ts';
import importUploadedFiles, {
  type ImportSummary
} from './importUploadedFiles.ts';
import {
  extractFilter,
  isPatientInfoInFilter,
  performAggregationSearch
} from '../performSearch.ts';

const maskPatientInfo = (ctx: CircusContext) => {
  return (series: any) => {
    const show =
      ctx.userPrivileges.globalPrivileges.includes('personalInfoView') &&
      ctx.user.preferences.personalInfoView;
    if (!show) {
      delete series.patientInfo;
    }
    return series;
  };
};

export const handleGet: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const uid = ctx.params.seriesUid;
    const series = await models.series.findByIdOrFail(uid);
    if (ctx.userPrivileges.domains.indexOf(series.domain) < 0) {
      ctx.throw(
        status.FORBIDDEN,
        'You do not have privilege to access this series.'
      );
    }
    ctx.body = maskPatientInfo(ctx)(series);
  };
};

export const handleGetOrientation: RouteMiddleware = ({
  models,
  seriesOrientationResolver
}) => {
  return async (ctx, next) => {
    const uid = ctx.params.seriesUid;
    const series = await models.series.findByIdOrFail(uid);
    const images = mr.initialize(series.images);

    const getInt = (param: any): number | undefined => {
      if (param === undefined) return undefined;
      if (!/^[1-9]\d*$/.test(param))
        throw ctx.throw(status.BAD_REQUEST, 'Invalid string');
      return Number(param);
    };
    const start = getInt(ctx.request.query.start) ?? mr.min(images)!;
    const end = getInt(ctx.request.query.end) ?? mr.max(images)!;

    if (
      !mr.has(images, mr.normalize(start)) ||
      !mr.has(images, mr.normalize(end))
    ) {
      ctx.throw(
        status.BAD_REQUEST,
        'The given start/end number is out of bounds.'
      );
    }

    if (ctx.userPrivileges.domains.indexOf(series.domain) < 0) {
      ctx.throw(
        status.FORBIDDEN,
        'You do not have privilege to access this series.'
      );
    }

    try {
      const result = await seriesOrientationResolver(
        series.seriesUid,
        start,
        end
      );

      const resolvedOrientation =
        result.delta >= 1 ? 'head-first' : 'foot-first';
      ctx.body = { orientation: resolvedOrientation };
    } catch (err: any) {
      ctx.throw(status.INTERNAL_SERVER_ERROR, err);
    }
  };
};

const checkDomain = (ctx: CircusContext) => {
  const domain = ctx.params.domain;
  if (!ctx.userPrivileges.domains.some(d => d === domain)) {
    ctx.throw(status.FORBIDDEN, 'You cannot upload to this domain.');
  }
  return domain;
};

export const handlePost: RouteMiddleware = ({
  dicomImporter,
  progressManager,
  logger,
  uploadFileSizeMaxBytes
}) => {
  return async ctx => {
    const { progressId } = ctx.request.query;
    const reporter =
      typeof progressId === 'string'
        ? progressManager.claim(progressId, ctx.user.userEmail)
        : undefined;
    let summary: ImportSummary;
    try {
      if (!dicomImporter) ctx.throw(status.SERVICE_UNAVAILABLE);
      const domain = checkDomain(ctx);
      summary = await importUploadedFiles(readMultipartFiles(ctx.req), {
        domain,
        maxEntryBytes: uploadFileSizeMaxBytes,
        dicomImporter,
        apiLogger: logger,
        userEmail: ctx.user.userEmail,
        reporter
      });
    } catch (err: any) {
      reporter?.fail(err.expose ? err.message : 'The upload was interrupted.');
      throw err;
    }
    const { imported, skipped, errors } = summary;
    reporter?.finish(
      `Imported ${imported} file(s)` +
        (skipped.length ? `, skipped ${skipped.length}` : '') +
        (errors.length ? `, failed ${errors.length}` : '') +
        '.'
    );
    ctx.status = errors.length
      ? status.UNPROCESSABLE_ENTITY // 422
      : imported
        ? status.CREATED // 201
        : status.BAD_REQUEST; // 400, no DICOM files
    ctx.body = summary;
  };
};

export const handleSearch: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const customFilter = extractFilter(ctx);
    const fields = [
      'modality',
      'seriesUid',
      'studyUid',
      'seriesDescription',
      'patientInfo.patientId',
      'patientInfo.patientName',
      'patientInfo.age',
      'patientInfo.sex',
      'seriesDate',
      'createdAt'
    ];
    if (!checkFilter(customFilter!, fields))
      ctx.throw(status.BAD_REQUEST, 'Bad filter.');

    const canViewPersonalInfo =
      ctx.userPrivileges.globalPrivileges.includes('personalInfoView');

    if (!canViewPersonalInfo && isPatientInfoInFilter(customFilter))
      ctx.throw(
        status.BAD_REQUEST,
        'You cannot search using patient information.'
      );

    const domainFilter = {
      domain: { $in: ctx.userPrivileges.domains }
    };
    const filter = { $and: [customFilter!, domainFilter] };

    const myListId = ctx.params.myListId;
    const user = ctx.user;

    if (myListId) {
      const myList = user.myLists.find(
        (list: any) => myListId === list.myListId
      );
      if (!myList) ctx.throw(status.NOT_FOUND, 'This my list does not exist');

      if (myList.resourceType !== 'series')
        ctx.throw(status.BAD_REQUEST, 'This my list is not for series');
    }

    const searchByMyListStage: object[] = [
      { $match: { myListId } },
      { $unwind: { path: '$items' } },
      {
        $lookup: {
          from: 'series',
          localField: 'items.resourceId',
          foreignField: 'seriesUid',
          as: 'seriesDetail'
        }
      },
      {
        $replaceWith: {
          $mergeObjects: [
            { $arrayElemAt: ['$seriesDetail', 0] },
            { addedToListAt: '$items.createdAt' }
          ]
        }
      }
    ];

    const startModel = myListId ? models.myList : models.series;
    const lookupStages = myListId ? searchByMyListStage : [];
    const defaultSort = myListId ? { addedToListAt: -1 } : { createdAt: -1 };

    // Removes patient info according to the preference
    const transform = maskPatientInfo(ctx);

    await performAggregationSearch(
      startModel,
      filter,
      ctx,
      lookupStages,
      [{ $project: { _id: false, addedToListAt: false } }],
      {
        transform,
        defaultSort
      }
    );
  };
};

export const handleDelete: RouteMiddleware = ({
  transactionManager,
  dicomFileRepository
}) => {
  return async (ctx, next) => {
    const uid = ctx.params.seriesUid;
    await transactionManager.withTransaction(async models => {
      await models.series.findByIdOrFail(uid);

      const pluginJob = models.pluginJob.findAsCursor({
        'series.seriesUid': uid
      });
      if (await pluginJob.hasNext())
        ctx.throw(
          status.BAD_REQUEST,
          'There is a plug-in job associated with this series.'
        );

      const clinicalCase = models.clinicalCase.findAsCursor({
        'revisions.series.seriesUid': uid
      });
      if (await clinicalCase.hasNext())
        ctx.throw(
          status.BAD_REQUEST,
          'There is a case associated with this series.'
        );

      const result = await models.series.deleteOne({ seriesUid: uid });
      if (result.deletedCount !== 1) ctx.throw(status.NOT_FOUND);
    });
    await dicomFileRepository.deleteSeries(uid);
    ctx.body = null;
  };
};

interface ExportRequest {
  series: {
    seriesUid: string;
    partialVolumeDescriptor: PartialVolumeDescriptor;
  }[];
  compressionFormat: 'tgz' | 'zip';
}

export const handlePostExportCsVolume: RouteMiddleware = ({
  taskManager,
  dicomVoxelDumper,
  logger
}) => {
  return async (ctx, next) => {
    const request: ExportRequest = ctx.request.body;
    const zipMode = request.compressionFormat === 'zip';
    const { stream: tar, events } = dicomVoxelDumper.dump(request.series);
    const archive = zipMode
      ? tarToZip(tar)
      : tar.pipeThrough(
          new CompressionStream('gzip') as TransformStream<
            Uint8Array,
            Uint8Array
          >
        );

    const downloadFileType = zipMode ? 'application/zip' : 'application/x-tgz';
    const { emitter, downloadFileStream } = await taskManager.register(ctx, {
      name: 'Export DICOM data',
      userEmail: ctx.user.userEmail,
      downloadFileType
    });

    emitter.emit('progress', 'Processing volume #0');
    const source = Readable.fromWeb(archive as any);
    source.on('error', err => {
      logger.error(`CS volume export error: ${err.message}`);
      emitter.emit(
        'error',
        'An internal error occurred while exporting the volume.'
      );
      downloadFileStream!.destroy();
    });
    source.pipe(downloadFileStream!);

    events.on('volume', (i: number) => {
      emitter.emit(
        'progress',
        `Processing volume #${i + 1}`,
        i,
        request.series.length
      );
    });
    downloadFileStream!.on('close', () => {
      emitter.emit('finish', 'exported');
    });
  };
};
