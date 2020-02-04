import Command from './Command';
import fs from 'fs-extra';
import { DicomTagReader } from '../utils/createDicomTagReader';

export const help = () => {
  return (
    'Dumps the content of the specified DICOM file.\n' +
    'You can use this to check if a DICOM file is valid\n' +
    'and loadable to the CIRCUS system.\n\n' +
    'Usage: node circus.js dump-dicom [file]'
  );
};

export const command: Command<{
  dicomTagReader: DicomTagReader;
}> = async (opts, { dicomTagReader }) => {
  return async (options: any) => {
    if (!Array.isArray(options._args) || options._args.length !== 1)
      throw new Error('Specify one DICOM file.');
    const buf = await fs.readFile(options._args[0]);
    const result = await dicomTagReader(buf.buffer);
    console.log(result);
  };
};

command.dependencies = ['dicomTagReader'];
