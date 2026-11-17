import type { z } from 'zod';
import type { readDicomTags } from './utils/createDicomTagReader.ts';
import type { Disposable } from '@utrad-ical/circus-lib';
import type { CollectionAccessor } from './db/createCollectionAccessor.ts';
import type * as mongo from 'mongodb';
import type { groupDoc } from './schemas/group.ts';
import type { projectDoc } from './schemas/project.ts';
import type { onetimeUrlDoc } from './schemas/onetimeUrl.ts';
import type { seriesDoc } from './schemas/series.ts';
import type { serverParamDoc } from './schemas/serverParam.ts';
import type { tokenDoc } from './schemas/token.ts';
import type { userDoc } from './schemas/user.ts';

/**
 * - `decode`: converts JSON (e.g., ISO strings) into data (e.g., `Date`s)
 * - `encode`: converts data into JSON
 * - `check`: checks data (e.g., from the database) without converting it
 */
export type ValidationMode = 'check' | 'decode' | 'encode';

export interface Validator {
  validate: (
    schema: z.ZodType,
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

/** A document without `createdAt` and `updatedAt`, which the models add */
type DocOf<S extends z.ZodType> = Omit<z.output<S>, 'createdAt' | 'updatedAt'>;

export interface ModelEntries {
  user: DocOf<typeof userDoc>;
  group: DocOf<typeof groupDoc>;
  project: DocOf<typeof projectDoc>;
  series: DocOf<typeof seriesDoc>;
  clinicalCase: any;
  serverParam: DocOf<typeof serverParamDoc>;
  token: DocOf<typeof tokenDoc>;
  plugin: any;
  pluginJob: any;
  myList: any;
  onetimeUrl: DocOf<typeof onetimeUrlDoc>;
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
