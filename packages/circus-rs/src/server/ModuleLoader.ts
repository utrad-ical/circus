import { ModuleDefinition } from './Configuration';

export enum ModuleType {
  Logger,
  DicomFileRepository,
  ImageEncoder,
  DicomDumper
}

export default function loadModule(
  moduleType: ModuleType,
  descriptor: ModuleDefinition
): any {
  let module: string;
  if (/\//.test(descriptor.module)) {
    // Load external module if module path is explicitly set
    module = descriptor.module;
  } else {
    // Load built-in modules
    const dir = {
      [ModuleType.Logger]: './loggers/',
      [ModuleType.DicomFileRepository]:
        '../../node_modules/@utrad-ical/circus-dicom-repository/lib/',
      [ModuleType.ImageEncoder]: './image-encoders/',
      [ModuleType.DicomDumper]: './dicom-dumpers/'
    }[moduleType];
    module = dir + descriptor.module;
  }
  let theClass = require(module).default;
  return new theClass(descriptor.options || {});
}
