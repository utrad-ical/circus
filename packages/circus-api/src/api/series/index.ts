import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';
import archiver from 'archiver';
import status from 'http-status';
import { multirange } from 'multi-integer-range';
import { CircusContext, RouteMiddleware } from '../../typings/middlewares';
import checkFilter from '../../utils/checkFilter';
import { fileOrArchiveIterator } from '../../utils/directoryIterator';
import isLikeDicom from '../../utils/isLikeDicom';
import {
  extractFilter,
  isPatientInfoInFilter,
  performAggregationSearch
} from '../performSearch';

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
    const images = multirange(series.images);

    const getInt = (param: any): number | undefined => {
      if (param === undefined) return undefined;
      if (!/^[1-9]\d*$/.test(param))
        throw ctx.throw(status.BAD_REQUEST, 'Invalid string');
      return Number(param);
    };
    const start = getInt(ctx.request.query.start) ?? images.min()!;
    const end = getInt(ctx.request.query.end) ?? images.max()!;

    if (!images.has(start) || !images.has(end)) {
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

export const handlePost: RouteMiddleware = ({ dicomImporter, taskManager }) => {
  return async (ctx, next) => {
    if (!dicomImporter) ctx.throw(status.SERVICE_UNAVAILABLE);
    const domain = checkDomain(ctx);

    const { emitter } = await taskManager.register(ctx, {
      name: 'Series import',
      userEmail: ctx.user.userEmail
    });

    const sentFiles = ctx.request.files;

    // The following code will keep running after this middleware returns
    (async () => {
      let fileCount = 0;
      let dicomCount = 0;
      try {
        for (const file of sentFiles) {
          for await (const entry of fileOrArchiveIterator(
            file.buffer.buffer,
            file.filename
          )) {
            if (entry.type === 'error') throw new Error(entry.message);
            if (!isLikeDicom(entry.buffer)) continue;
            await dicomImporter.importDicom(Buffer.from(entry.buffer), domain);
            dicomCount++;
            emitter.emit('progress', `Imported ${dicomCount} entities...`);
          }
          fileCount++;
        }
        emitter.emit(
          'finish',
          `Imported ${dicomCount} entities from ${fileCount} files.`
        );
      } catch (err) {
        emitter.emit(
          'error',
          `Error while processing file #${fileCount + 1}, entity #${
            dicomCount + 1
          }`
        );
      }
    })();
  };
};

export const handlePostSingle: RouteMiddleware = ({ dicomImporter }) => {
  return async (ctx, next) => {
    if (!dicomImporter) ctx.throw(status.SERVICE_UNAVAILABLE);
    const domain = checkDomain(ctx);

    if (ctx.request.files.length !== 1) {
      ctx.throw(status.BAD_REQUEST, 'Only one file is allowed.');
    }

    const { buffer } = ctx.request.files[0];
    const arrayBuffer = Buffer.from(buffer).buffer;
    if (!isLikeDicom(arrayBuffer)) {
      ctx.throw(
        status.BAD_REQUEST,
        'The file is not a DICOM file. You cannot use archived files.'
      );
    }
    try {
      await dicomImporter.importDicom(arrayBuffer, domain);
    } catch (err: any) {
      ctx.throw(
        status.INTERNAL_SERVER_ERROR,
        'Error while importing a DICOM file. ' +
          'This may mean the uploaded file is broken.'
      );
    }
    ctx.body = null;
    ctx.status = status.CREATED; // 201
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
  dicomVoxelDumper
}) => {
  return async (ctx, next) => {
    const request: ExportRequest = ctx.request.body;
    const zipMode = request.compressionFormat === 'zip';
    const pack = zipMode ? archiver('zip') : archiver('tar', { gzip: true });

    const { stream, events } = dicomVoxelDumper.dump(request.series, pack);

    const downloadFileType = zipMode ? 'application/zip' : 'application/x-tgz';
    const { emitter, downloadFileStream } = await taskManager.register(ctx, {
      name: 'Export DICOM data',
      userEmail: ctx.user.userEmail,
      downloadFileType
    });

    emitter.emit('progress', 'Processing volume #0');
    stream.pipe(downloadFileStream!);

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
