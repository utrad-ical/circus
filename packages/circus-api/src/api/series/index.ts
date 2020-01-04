import status from 'http-status';
import performSearch from '../performSearch';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as JSZip from 'jszip';
import { EJSON } from 'bson';
import checkFilter from '../../utils/checkFilter';
import generateUniqueId from '../../utils/generateUniqueId';
import { RouteMiddleware, CircusContext } from '../../typings/middlewares';

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
  const importFromBuffer = async (buffer: Buffer, domain: string) => {
    const signature = buffer.length > 0x80 && buffer.readUInt32BE(0x80);
    if (signature !== 0x4449434d) {
      return; // Non-DICOM file
    }
    const tmpFile = path.join(
      dicomImporter!.workDir,
      `${generateUniqueId()}.dcm`
    );
    await fs.writeFile(tmpFile, buffer);
    try {
      await dicomImporter!.importFromFile(tmpFile, domain);
    } finally {
      await fs.unlink(tmpFile);
    }
  };

  return async (ctx, next) => {
    if (!dicomImporter) {
      ctx.throw(status.SERVICE_UNAVAILABLE);
    }

    const domain = ctx.params.domain;
    if (!ctx.userPrivileges.domains.some(d => d === domain)) {
      ctx.throw(status.FORBIDDEN, 'You cannot upload to this domain.');
    }

    // koa-multer sets loaded files to ctx.req, not ctx.request
    const files = ctx.req.files;
    let count = 0;
    for (const entry of files) {
      const signature = entry.buffer.readUInt32BE(0);
      if ([0x504b0304, 0x504b0304, 0x504b0708].some(s => s === signature)) {
        // ZIP file detected.
        const archive = await JSZip.loadAsync(entry.buffer);
        const filesInArchive: JSZip.JSZipObject[] = [];
        archive.forEach((r, f) => filesInArchive.push(f));
        for (const file of filesInArchive) {
          const buf = await file.async('nodebuffer');
          await importFromBuffer(buf, domain);
          count++;
        }
      } else {
        await importFromBuffer(entry.buffer, domain);
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

    await performSearch(models.series, filter, ctx, { transform });
  };
};
