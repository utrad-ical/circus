import Command from './Command';
import { Models, DicomTagReader } from '../interface';
import { multirange } from 'multi-integer-range';
import { DicomFileRepository } from '@utrad-ical/circus-lib';

export const options = () => {
  return [
    {
      names: ['maxDate'],
      help: 'Add parameters before the specified date.',
      type: 'string'
    }
  ];
};

export const help = () => {
  return 'Scans imported DICOM files and add parameters to the database.';
};

export const command: Command<{
  models: Models;
  dicomTagReader: DicomTagReader;
  dicomFileRepository: DicomFileRepository;
}> = async (_, { models, dicomTagReader, dicomFileRepository }) => {
  return async options => {
    const filter = options.maxDate
      ? { createdAt: { $lte: options.maxDate } }
      : {};
    const cursor = models.series.findAsCursor(filter);
    while (await cursor.hasNext()) {
      const series = await cursor.next();
      const repoSeries = await dicomFileRepository.getSeries(series.seriesUid);
      const firstImage = await repoSeries.load(
        multirange(series.images).min()!
      );
      const tags = await dicomTagReader(firstImage);
      models.series.modifyOne(series.seriesUid, {
        parameters: tags.parameters,
        updatedAt: series.updatedAt
      });
    }
  };
};

command.dependencies = ['models', 'dicomTagReader', 'dicomFileRepository'];
