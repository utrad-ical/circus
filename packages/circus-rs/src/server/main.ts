import config from './Config';
import createServer, { DicomReader } from './Server';
import loadModule, { ModuleType } from './ModuleLoader';
import DicomDumper from './dicom-dumpers/DicomDumper';
import DicomFileRepository from './dicom-file-repository/DicomFileRepository';
import AsyncLruCache from '../common/AsyncLruCache';
import DicomVolume from '../common/DicomVolume';
import * as http from 'http';
import createDicomReader from './createDicomReader';

function listen(app, ...args): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const httpServer = app.listen.call(app, ...args, err => {
      if (err) reject(err);
      else resolve(httpServer);
    });
  });
}

async function main(): Promise<void> {
  console.log('CIRCUS RS is starting up...');

  const logger = loadModule(ModuleType.Logger, config.logger);
  const imageEncoder = loadModule(ModuleType.ImageEncoder, config.imageEncoder);
  const dicomFileRepository: DicomFileRepository = loadModule(
    ModuleType.DicomFileRepository,
    config.dicomFileRepository
  );
  const dicomDumper: DicomDumper = loadModule(
    ModuleType.DicomDumper,
    config.dumper
  );
  const seriesReader = createDicomReader(
    dicomFileRepository,
    dicomDumper,
    config.cache.memoryThreshold
  );

  const loadedModuleNames: string[] = [
    config.logger.module,
    config.imageEncoder.module,
    config.dicomFileRepository.module,
    config.dumper.module
  ];

  const app = createServer({
    logger,
    imageEncoder,
    seriesReader,
    loadedModuleNames,
    authorization: config.authorization,
    globalIpFilter: config.globalIpFilter
  });

  const port = config.port;
  try {
    const httpServer = await listen(app, port, '0.0.0.0');
    const message = `Server running on port ${port}`;
    logger.info(message);
    console.log(message);
  } catch (e) {
    console.error('Server failed to start');
    console.error(e);
    logger.error(e);
    // This guarantees all the logs are flushed before actually exiting the program
    logger.shutdown().then(() => process.exit(1));
  }
}

main();
