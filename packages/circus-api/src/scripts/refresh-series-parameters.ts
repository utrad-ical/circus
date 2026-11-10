import * as mr from 'multi-integer-range';
import type Command from './Command.ts';
import type { Models, DicomTagReader } from '../interface.ts';
import type { DicomFileRepository } from '@utrad-ical/circus-lib';

export const options = () => {
  return [
    {
      names: ['maxDate'],
      help: 'Updates series only before this date.',
      helpArg: 'ISO_DATE',
      type: 'string'
    }
  ];
};

export const help = () => {
  return 'Scans imported DICOM files and adds parameters to the database.';
};

export const command: Command<{
  models: Models;
  dicomTagReader: DicomTagReader;
  dicomFileRepository: DicomFileRepository;
}> = async (_, { models, dicomTagReader, dicomFileRepository }) => {
  return async options => {
    const filter = options.maxDate
      ? { createdAt: { $lte: new Date(options.maxDate) } }
      : {};
    const cursor = models.series.findAsCursor(filter);
    while (await cursor.hasNext()) {
      const series = await cursor.next();
      console.log(`Updating ${series.seriesUid}`);
      const repoSeries = await dicomFileRepository.getSeries(series.seriesUid);
      const firstImage = await repoSeries.load(
        mr.min(mr.initialize(series.images))!
      );
      const tags = await dicomTagReader(firstImage);
      await models.series.modifyOne(series.seriesUid, {
        parameters: tags.parameters,
        updatedAt: series.updatedAt
      });
    }
  };
};

command.dependencies = ['models', 'dicomTagReader', 'dicomFileRepository'];
