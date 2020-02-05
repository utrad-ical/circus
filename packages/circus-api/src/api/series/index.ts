import { EJSON } from 'bson';
import status from 'http-status';
import { CircusContext, RouteMiddleware } from '../../typings/middlewares';
import checkFilter from '../../utils/checkFilter';
import { fileOrZipIterator } from '../../utils/directoryIterator';
import performSearch from '../performSearch';

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

export const handlePost: RouteMiddleware = ({ dicomImporter }) => {
  return async (ctx, next) => {
    if (!dicomImporter) {
      ctx.throw(status.SERVICE_UNAVAILABLE);
    }

    const domain = ctx.params.domain;
    if (!ctx.userPrivileges.domains.some(d => d === domain)) {
      ctx.throw(status.FORBIDDEN, 'You cannot upload to this domain.');
    }

    const sentFiles = ctx.request.files;
    let count = 0;
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
        count++;
      }
    }
    ctx.body = { uploaded: count };
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

    // Removes patient info according to the preference
    const transform = maskPatientInfo(ctx);

    await performSearch(models.series, filter, ctx, {
      transform,
      defaultSort: { createdAt: -1 }
    });
  };
};
