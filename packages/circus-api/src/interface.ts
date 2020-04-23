import { readDicomTags } from './utils/createDicomTagReader';
import { CollectionAccessor } from './db/createCollectionAccessor';
import mongo from 'mongodb';

export interface Validator {
  validate: (schema: any, data: any, mode?: string) => Promise<any>;
  getSchema: (key: string) => any;
  filterSchema: (schemaDef: string | object) => any;
}

export interface DicomImporter {
  importDicom: (fileContent: ArrayBuffer, domain: string) => Promise<void>;
}

export type DicomTagReader = (
  data: ArrayBuffer
) => ReturnType<typeof readDicomTags>;

export interface ModelEntries {
  user: any;
  group: any;
  project: any;
  series: any;
  clinicalCase: any;
  serverParam: any;
  token: any;
  task: any;
  plugin: any;
  pluginJob: any;
}

export type Models = {
  [key in keyof ModelEntries]: CollectionAccessor<ModelEntries[key]>;
};

/**
 * mongo.Db instance with `dispose()` method attached for disconnecting.
 */
export type DisposableDb = mongo.Db & {
  dispose: () => Promise<void>;
};
