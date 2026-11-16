import * as mr from 'multi-integer-range';
import {
  type PartialVolumeDescriptor,
  isValidPartialVolumeDescriptor,
  partialVolumeDescriptorToArray
} from '@utrad-ical/circus-rs/server';
import type { SeriesEntry } from '@utrad-ical/circus-cs-core';
import status from 'http-status';
import { Readable } from 'node:stream';
import type {
  CircusContext,
  RouteMiddleware
} from '../../typings/middlewares.ts';
import { ValidationError } from '../../createValidator.ts';
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

interface CsVolumeQuery {
  series: { seriesUid: string; start?: number; end?: number; delta?: number }[];
  compressionFormat: 'tgz' | 'zip';
}

const exposedError = (statusCode: number, message: string) =>
  Object.assign(new Error(message), { status: statusCode, expose: true });

export const handleGetExportCsVolume: RouteMiddleware = ({
  models,
  dicomVoxelDumper,
  progressManager,
  validator,
  logger
}) => {
  return async ctx => {
    // Errors before the download, including invalid queries,
    // are also shown in the progress
    const { progressId } = ctx.request.query;
    const reporter =
      typeof progressId === 'string'
        ? progressManager.claim(progressId, ctx.user.userEmail)
        : undefined;
    let query: CsVolumeQuery;
    const entries: SeriesEntry[] = [];
    try {
      try {
        query = await validator.validate(
          'seriesExportCsVolumeQuery',
          ctx.request.query,
          'toDate'
        );
      } catch (err: any) {
        err.phase = 'request';
        throw err;
      }
      for (const { seriesUid, start, end, delta } of query.series) {
        const series = await models.series.findById(seriesUid);
        if (!series)
          throw exposedError(
            status.NOT_FOUND,
            `Series ${seriesUid} not found.`
          );
        if (!ctx.userPrivileges.domains.includes(series.domain))
          throw exposedError(
            status.FORBIDDEN,
            'You do not have privilege to access this series.'
          );
        const images = mr.parse(series.images);
        const pvd: PartialVolumeDescriptor =
          start === undefined
            ? { start: images[0][0], end: images[0][1], delta: 1 }
            : { start, end: end!, delta: delta! };
        // Checks the bounds before expanding the range into an array
        const inBounds = (pvd: PartialVolumeDescriptor) =>
          Math.min(pvd.start, pvd.end) >= mr.min(images)! &&
          Math.max(pvd.start, pvd.end) <= mr.max(images)! &&
          (pvd.end - pvd.start) / pvd.delta + 1 <= mr.length(images);
        if (
          !isValidPartialVolumeDescriptor(pvd) ||
          !inBounds(pvd) ||
          !mr.has(images, mr.normalize(partialVolumeDescriptorToArray(pvd)))
        )
          throw exposedError(
            status.BAD_REQUEST,
            `The image range of series ${seriesUid} is invalid.`
          );
        entries.push({ seriesUid, partialVolumeDescriptor: pvd });
      }
    } catch (err: any) {
      reporter?.fail(
        err.expose || err instanceof ValidationError
          ? err.message
          : 'An internal error occurred.'
      );
      throw err;
    }

    const count = entries.length;
    const { stream: tar, events } = dicomVoxelDumper.dump(entries);
    events.on('volume', (i: number) =>
      reporter?.report(`Exporting volume #${i + 1}`, i, count)
    );
    const zip = query.compressionFormat === 'zip';
    const archive = zip
      ? tarToZip(tar)
      : tar.pipeThrough(
          new CompressionStream('gzip') as TransformStream<
            Uint8Array,
            Uint8Array
          >
        );
    const reader = archive.getReader();
    const stream = new ReadableStream<Uint8Array>(
      {
        pull: async controller => {
          try {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              reporter?.finish(`Exported ${count} volume(s).`);
            } else controller.enqueue(value);
          } catch (err: any) {
            logger.error(`CS volume export error: ${err?.message}`);
            reporter?.fail(
              'An internal error occurred while exporting the volume.'
            );
            controller.error(err);
          }
        },
        cancel: async reason => {
          reporter?.fail('The download was canceled.');
          await reader.cancel(reason);
        }
      },
      { highWaterMark: 0 }
    );

    // Named after the primary series
    const baseName = entries[0].seriesUid;
    ctx.attachment(baseName + (zip ? '.zip' : '.tar.gz'));
    ctx.type = zip ? 'application/zip' : 'application/gzip';
    const body = Readable.fromWeb(stream as any);
    // Koa leaves the response open when the stream fails after the headers
    body.once('error', () => ctx.res.destroy());
    ctx.body = body;
  };
};
