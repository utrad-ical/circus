import { InvalidArgumentError, type Command } from 'commander';
import * as mr from 'multi-integer-range';
import { runCommand, type CommandService } from './Command.ts';
import type { Models, DicomTagReader } from '../interface.ts';
import type { DicomFileRepository } from '@utrad-ical/circus-lib';

interface Options {
  maxDate?: Date;
}

export const configure = (program: Command) =>
  program
    .command('refresh-parameters')
    .description('Scan imported DICOM files and update series parameters.')
    .option(
      '--max-date <date>',
      'Update only series created on or before this date.',
      (value: string) => {
        const timestamp = Date.parse(value);
        if (Number.isNaN(timestamp)) {
          throw new InvalidArgumentError('Enter a valid date for --max-date.');
        }
        return new Date(timestamp);
      }
    )
    .action((options: Options) => runCommand(command, options));

export const command: CommandService<
  {
    models: Models;
    dicomTagReader: DicomTagReader;
    dicomFileRepository: DicomFileRepository;
  },
  Options
> = async (_, { models, dicomTagReader, dicomFileRepository }) => {
  return async ({ maxDate }) => {
    const filter = maxDate ? { createdAt: { $lte: maxDate } } : {};
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
