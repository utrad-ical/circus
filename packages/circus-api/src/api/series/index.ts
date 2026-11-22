import { httpError } from '../../middleware/errorHandler.ts';
import * as mr from 'multi-integer-range';
import {
  type PartialVolumeDescriptor,
  isValidPartialVolumeDescriptor,
  partialVolumeDescriptorToArray
} from '@utrad-ical/circus-rs/server';
import type { SeriesEntry } from '@utrad-ical/circus-cs-core';
import status from 'http-status';
import loadMyList from '../../mylist/loadMyList.ts';
import type {
  CircusContext,
  Deps,
  RouteMiddleware
} from '../../typings/middlewares.ts';
import { ValidationError } from '../../createValidator.ts';
import {
  seriesDoc,
  seriesExportCsVolumeQuery
} from '@utrad-ical/circus-api-schema';
import { fieldsOf, mongoFilter } from '../../schemas/mongoFilter.ts';
import type * as routes from './routes.ts';
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

/** Removes the patient info unless the user can and wants to see it */
const maskPatientInfo = (ctx: CircusContext) => {
  const show =
    ctx.var.userPrivileges.globalPrivileges.includes('personalInfoView') &&
    ctx.var.user.preferences.personalInfoView;
  return <T extends { patientInfo?: unknown }>(series: T) => {
    if (show) return series;
    const { patientInfo, ...rest } = series;
    return rest;
  };
};

export const handleGet: RouteMiddleware<typeof routes.getSeries> = ({
  models
}) => {
  return async (ctx, json) => {
    const uid = ctx.req.param().seriesUid;
    const series = await models.series.findByIdOrFail(uid);
    if (ctx.var.userPrivileges.domains.indexOf(series.domain) < 0) {
      throw httpError(
        status.FORBIDDEN,
        'You do not have privilege to access this series.'
      );
    }
    return json(maskPatientInfo(ctx)(series));
  };
};

export const handleGetOrientation: RouteMiddleware<
  typeof routes.getSeriesOrientation
> = ({ models, seriesOrientationResolver }) => {
  return async (ctx, json) => {
    const uid = ctx.req.param().seriesUid;
    const series = await models.series.findByIdOrFail(uid);
    const images = mr.initialize(series.images);

    const getInt = (param: any): number | undefined => {
      if (param === undefined) return undefined;
      if (!/^[1-9]\d*$/.test(param))
        throw httpError(status.BAD_REQUEST, 'Invalid string');
      return Number(param);
    };
    const start = getInt(ctx.var.query.start) ?? mr.min(images)!;
    const end = getInt(ctx.var.query.end) ?? mr.max(images)!;

    if (
      !mr.has(images, mr.normalize(start)) ||
      !mr.has(images, mr.normalize(end))
    ) {
      throw httpError(
        status.BAD_REQUEST,
        'The given start/end number is out of bounds.'
      );
    }

    if (ctx.var.userPrivileges.domains.indexOf(series.domain) < 0) {
      throw httpError(
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
      return json({ orientation: resolvedOrientation });
    } catch (err: any) {
      throw httpError(status.INTERNAL_SERVER_ERROR, err);
    }
  };
};

const checkDomain = (ctx: CircusContext) => {
  const domain = ctx.req.param('domain');
  if (!domain || !ctx.var.userPrivileges.domains.includes(domain)) {
    throw httpError(status.FORBIDDEN, 'You cannot upload to this domain.');
  }
  return domain;
};

const importSeries = async (
  { dicomImporter, progressManager, logger, uploadFileSizeMaxBytes }: Deps,
  ctx: CircusContext
) => {
  const { progressId } = ctx.var.query;
  const reporter =
    typeof progressId === 'string'
      ? progressManager.claim(progressId, ctx.var.user.userEmail)
      : undefined;
  let summary: ImportSummary;
  try {
    if (!dicomImporter) throw httpError(status.SERVICE_UNAVAILABLE);
    const domain = checkDomain(ctx);
    summary = await importUploadedFiles(readMultipartFiles(ctx.req.raw), {
      domain,
      maxEntryBytes: uploadFileSizeMaxBytes,
      dicomImporter,
      logger,
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
  const responseStatus = errors.length
    ? status.UNPROCESSABLE_ENTITY // 422
    : imported
      ? status.CREATED // 201
      : status.BAD_REQUEST; // 400, no DICOM files
  return { summary, status: responseStatus };
};

export const handlePost: RouteMiddleware<typeof routes.importSeries> =
  deps => async (ctx, json) => {
    const result = await importSeries(deps, ctx);
    return json(result.summary, result.status);
  };

export const handlePostSingle: RouteMiddleware<
  typeof routes.importSeriesSingle
> = deps => async (ctx, json) => {
  const result = await importSeries(deps, ctx);
  // Legacy storage servers expect an empty response on success.
  if (result.status === status.CREATED) return ctx.body(null, 201);
  return json(result.summary, result.status);
};

const seriesFilter = mongoFilter(
  fieldsOf(seriesDoc, [
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
  ])
);

export const handleSearch: RouteMiddleware<
  typeof routes.searchSeries | typeof routes.searchSeriesInMyList
> = ({ models }) => {
  return async (ctx, json) => {
    const customFilter = extractFilter(ctx, seriesFilter);

    const canViewPersonalInfo =
      ctx.var.userPrivileges.globalPrivileges.includes('personalInfoView');

    if (!canViewPersonalInfo && isPatientInfoInFilter(customFilter))
      throw httpError(
        status.BAD_REQUEST,
        'You cannot search using patient information.'
      );

    const domainFilter = {
      domain: { $in: ctx.var.userPrivileges.domains }
    };
    const filter = { $and: [customFilter, domainFilter] };

    const myListId = ctx.req.param('myListId');
    if (myListId) {
      const { list, readable } = await loadMyList(ctx, models, myListId);
      if (!readable)
        throw httpError(
          status.UNAUTHORIZED,
          'You cannot read the items of this my list.'
        );
      if (list.resourceType !== 'series')
        throw httpError(status.BAD_REQUEST, 'This my list is not for series');
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

    return json(
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
      )
    );
  };
};

export const handleDelete: RouteMiddleware<typeof routes.deleteSeries> = ({
  transactionManager,
  dicomFileRepository
}) => {
  return async ctx => {
    const uid = ctx.req.param().seriesUid;
    await transactionManager.withTransaction(async models => {
      const series = await models.series.findByIdOrFail(uid);
      if (!ctx.var.userPrivileges.domains.includes(series.domain))
        throw httpError(
          status.FORBIDDEN,
          'You do not have privilege to access this series.'
        );

      const pluginJob = models.pluginJob.findAsCursor({
        'series.seriesUid': uid
      });
      if (await pluginJob.hasNext())
        throw httpError(
          status.BAD_REQUEST,
          'There is a plug-in job associated with this series.'
        );

      const clinicalCase = models.clinicalCase.findAsCursor({
        'revisions.series.seriesUid': uid
      });
      if (await clinicalCase.hasNext())
        throw httpError(
          status.BAD_REQUEST,
          'There is a case associated with this series.'
        );

      const result = await models.series.deleteOne({ seriesUid: uid });
      if (result.deletedCount !== 1) throw httpError(status.NOT_FOUND);
    });
    await dicomFileRepository.deleteSeries(uid);
    return ctx.body(null, 204);
  };
};

interface CsVolumeQuery {
  series: { seriesUid: string; start?: number; end?: number; delta?: number }[];
  compressionFormat: 'tgz' | 'zip';
}

const exposedError = (statusCode: number, message: string) =>
  Object.assign(new Error(message), { status: statusCode, expose: true });

export const handleGetExportCsVolume: RouteMiddleware<
  typeof routes.exportCsVolume
> = ({ models, dicomVoxelDumper, progressManager, validator, logger }) => {
  return async ctx => {
    // Errors before the download, including invalid queries,
    // are also shown in the progress
    const { progressId } = ctx.var.query;
    const reporter =
      typeof progressId === 'string'
        ? progressManager.claim(progressId, ctx.var.user.userEmail)
        : undefined;
    let query: CsVolumeQuery;
    const entries: SeriesEntry[] = [];
    try {
      try {
        query = await validator.validate(
          seriesExportCsVolumeQuery,
          ctx.var.query,
          'decode'
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
        if (!ctx.var.userPrivileges.domains.includes(series.domain))
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
    const totalSlices = entries.reduce(
      (sum, { partialVolumeDescriptor: { start, end, delta } }) =>
        sum + (end - start) / delta + 1,
      0
    );
    let finishedSlices = 0;
    const { stream: tar, events } = dicomVoxelDumper.dump(entries);
    events.on('slice', (i: number, slice: number, slices: number) =>
      reporter?.report(
        `Exporting volume #${i + 1} (${slice}/${slices})`,
        ++finishedSlices,
        totalSlices
      )
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
            logger.error({ err }, 'CS volume export failed');
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
    const filename = baseName + (zip ? '.zip' : '.tar.gz');
    return ctx.body(stream, 200, {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': zip ? 'application/zip' : 'application/gzip'
    });
  };
};
