import type { z } from 'zod';
import type { readDicomTags } from './utils/createDicomTagReader.ts';
import type { Disposable } from '@utrad-ical/circus-lib';
import type { CollectionAccessor } from './db/createCollectionAccessor.ts';
import type * as mongo from 'mongodb';

/**
 * - `default`: checks the data as stored in the server (with `Date`s)
 * - `toDate`: checks a request and converts ISO date strings into `Date`s
 * - `fromDate`: checks a response and converts `Date`s into ISO strings
 */
export type ValidationMode = 'default' | 'toDate' | 'fromDate';

export interface Validator {
  validate: (
    schema: string | z.ZodType,
    data: any,
    mode?: ValidationMode,
    options?: {
      /** Ignores unknown properties (used when reading the DB) */
      allowUnknownKeys?: boolean;
    }
  ) => Promise<any>;
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
  plugin: any;
  pluginJob: any;
  myList: any;
  onetimeUrl: any;
}

export type Models = {
  [key in keyof ModelEntries]: CollectionAccessor<ModelEntries[key]>;
};

/**
 * mongo.Db instance with `dispose()` method attached for disconnecting.
 */
export interface Database extends Disposable {
  db: mongo.Db;
  connection: mongo.MongoClient;
}

type AuthResult =
  | { result: 'OK'; authenticatedUserEmail: string }
  | { result: 'NG' };

export interface AuthProvider {
  check(id: string, password: string): Promise<AuthResult>;
  describe(): string;
}

export interface TransactionManager {
  withTransaction: (fn: (models: Models) => Promise<void>) => Promise<void>;
}
