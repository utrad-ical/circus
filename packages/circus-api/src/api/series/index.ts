import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';
import archiver from 'archiver';
import { EJSON } from 'bson';
import status from 'http-status';
import { CircusContext, RouteMiddleware } from '../../typings/middlewares';
import checkFilter from '../../utils/checkFilter';
import { fileOrZipIterator } from '../../utils/directoryIterator';
import { performAggregationSearch } from '../performSearch';

const maskPatientInfo = (ctx: CircusContext) => {
  return (series: any) => {
    const show =
      ctx.userPrivileges.globalPrivileges.some(p => p === 'personalInfoView') &&
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

export const handlePost: RouteMiddleware = ({ dicomImporter, taskManager }) => {
  return async (ctx, next) => {
    if (!dicomImporter) {
      ctx.throw(status.SERVICE_UNAVAILABLE);
    }

    const domain = ctx.params.domain;
    if (!ctx.userPrivileges.domains.some(d => d === domain)) {
      ctx.throw(status.FORBIDDEN, 'You cannot upload to this domain.');
    }

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
          for await (const entry of fileOrZipIterator(
            file.buffer.buffer,
            file.filename
          )) {
            const signature =
              entry.buffer.byteLength > 0x80 &&
              new DataView(entry.buffer).getUint32(0x80, false);
            if (signature !== 0x4449434d) {
              continue; // Non-DICOM file
            }
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

export const handleSearch: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const urlQuery = ctx.request.query;
    let customFilter: object;
    try {
      customFilter = urlQuery.filter ? EJSON.parse(urlQuery.filter) : {};
    } catch (err) {
      ctx.throw(status.BAD_REQUEST, 'Filter string could not be parsed.');
    }
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
  models,
  dicomFileRepository
}) => {
  return async (ctx, next) => {
    const uid = ctx.params.seriesUid;

    const pluginJob = models.pluginJob.find({ 'series.seriesUid': uid });
    if (await pluginJob.hasNext())
      ctx.throw(
        status.BAD_REQUEST,
        'There is a plug-in job associated with this series.'
      );

    const clinicalCase = models.clinicalCase.find({
      'revisions.series.seriesUid': uid
    });
    if (await clinicalCase.hasNext())
      ctx.throw(
        status.BAD_REQUEST,
        'There is a case associated with this series.'
      );

    await dicomFileRepository.deleteSeries(uid);

    const result = await models.series.deleteOne({ seriesUid: uid });
    if (result.deletedCount !== 1) ctx.throw(status.NOT_FOUND);
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
