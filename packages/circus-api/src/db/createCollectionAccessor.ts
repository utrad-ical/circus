import status from 'http-status';
import mongo from 'mongodb';
import { Validator } from '../interface';

type CursorOptions = {
  sort?: object;
  limit?: number;
  skip?: number;
};

type WithDates<T> = T & { createdAt: Date; updatedAt: Date };

interface Options<T> {
  schema: object | string;
  collectionName: string;
  primaryKey: keyof T;
  session?: mongo.ClientSession;
}

interface CursorLike<T> {
  next: () => Promise<T>;
  hasNext: () => Promise<boolean>;
  count: () => Promise<number>;
}

interface FindOptions {
  withLock: boolean;
}

export interface CollectionAccessor<T = any> {
  deleteMany: (query?: object) => Promise<mongo.DeleteWriteOpResultObject>;
  deleteOne: (query?: object) => Promise<mongo.DeleteWriteOpResultObject>;
  findAll: (query?: object, options?: CursorOptions) => Promise<WithDates<T>[]>;
  findAsCursor: (
    query?: object,
    options?: CursorOptions
  ) => CursorLike<WithDates<T>>;
  findById: (
    id: string | number,
    options?: FindOptions
  ) => Promise<WithDates<T>>;
  findByIdOrFail: (
    id: string | number,
    options?: FindOptions
  ) => Promise<WithDates<T>>;
  insert: (data: T) => Promise<any>;
  upsert: (id: string | number, data: Partial<T>) => Promise<any>;
  aggregate: (pipeline: object[]) => Promise<any[]>;
  insertMany: (data: T[]) => Promise<any>;
  modifyOne: (id: string | number, updates: object) => Promise<any>;
  unsafe_updateMany: (filter: any, update: any) => Promise<any>;
  newSequentialId: () => Promise<number>;
  collectionName: () => string;
}

/**
 * Basic wrapper for Mongo collection that performs validation tasks.
 */
const createCollectionAccessor = <T = any>(
  db: mongo.Db,
  validator: Validator,
  opts: Options<T>
) => {
  const { schema, collectionName, primaryKey, session } = opts;
  const sessionOpts = session ? { session } : {};
  const collection = db.collection<WithDates<T>>(collectionName);

  const dbEntrySchema =
    typeof schema === 'string'
      ? schema
          .split('/')
          .map(s => `${s}|dbEntry`)
          .join('/')
      : schema;

  /**
   * Inserts a single document after validation succeeds.
   * @param data The data to insert (excluding _id)
   */
  const insert = async (data: T) => {
    const date = new Date();
    const inserting: WithDates<T> = {
      ...data,
      createdAt: date,
      updatedAt: date
    };
    await validator.validate(dbEntrySchema, inserting);
    return await collection.insertOne(inserting as any, { ...sessionOpts });
  };

  /**
   * Upserts a single document after validation succeeds.
   * Partial update is not supported; you need to provide the whole document.
   * @param id The primary key.
   * @param data The data to upsert (excluding _id)
   */
  const upsert = async (id: string | number, data: Partial<T>) => {
    const date = new Date();
    const upserting = { createdAt: date, updatedAt: date, ...data };
    await validator.validate(dbEntrySchema, { [primaryKey]: id, ...upserting });
    return await collection.updateOne(
      { [primaryKey]: id } as mongo.FilterQuery<WithDates<T>>,
      { $set: upserting } as mongo.UpdateQuery<WithDates<T>>,
      { upsert: true, ...sessionOpts }
    );
  };

  /**
   * Inserts multiple documents after validation succeeds for each document.
   */
  const insertMany = async (data: T[]) => {
    const documents: WithDates<T>[] = [];
    const date = new Date();
    for (const doc of data) {
      const inserting = { ...doc, createdAt: date, updatedAt: date };
      await validator.validate(dbEntrySchema, inserting);
      documents.push(inserting);
    }
    return await collection.insertMany(documents as any, { ...sessionOpts });
  };

  /**
   * Fetches documents that matches the given query as an array.
   * The `_id` field will not be included.
   */
  const findAll = async (query: object = {}, options: CursorOptions = {}) => {
    const cursor = findAsCursor(query, options);
    const array: WithDates<T>[] = [];
    while (await cursor.hasNext()) {
      array.push((await cursor.next())!);
    }
    return array;
  };

  /**
   * Executes find and returns the matched documents as a cursor-like object.
   * Validation is performed for each document.
   * The `_id` field will not be included.
   */
  const findAsCursor = (query: object = {}, options: CursorOptions = {}) => {
    const { sort, limit, skip } = options;
    let cursor = collection.find(query, { ...sessionOpts }).project({ _id: 0 });
    if (sort) cursor = cursor.sort(sort);
    if (skip) cursor = cursor.skip(skip);
    if (limit) cursor = cursor.limit(limit);
    return {
      next: async () => {
        const next = await cursor.next();
        await validator.validate(dbEntrySchema, next);
        return next;
      },
      hasNext: () => cursor.hasNext(),
      count: () => cursor.count()
    } as CursorLike<WithDates<T>>;
  };

  /**
   * Provides direct access to MongoDB's aggregation framework.
   * Use this sparingly becuse this breaks encapsulation.
   * Validation is not performed.
   */
  const aggregate = async (pipeline: object[]) => {
    const cursor = await aggregateAsCursor(pipeline);
    const array = [];
    while (await cursor.hasNext()) {
      array.push(await cursor.next());
    }
    return array;
  };

  /**
   * Provides direct access to MongoDB's aggregation framework.
   * Use this sparingly becuse this breaks encapsulation.
   * Validation is not performed.
   */
  const aggregateAsCursor = async (pipeline: object[]) => {
    return collection.aggregate(pipeline, { ...sessionOpts });
  };

  /**
   * Fetches the single document that matches the primary key.
   */
  const findById = async (id: string | number, options?: FindOptions) => {
    const key = primaryKey ? primaryKey : '_id';
    if (options?.withLock) {
      if (!session) throw new Error('Cannot lock a document outside a session');
      await collection.findOneAndUpdate(
        { [key]: id } as mongo.FilterQuery<WithDates<T>>,
        {
          $set: { myLock: { pseudoRandom: new mongo.ObjectId() } }
        } as mongo.UpdateQuery<any>,
        { session }
      );
      await collection.updateOne(
        { [key]: id } as mongo.FilterQuery<WithDates<T>>,
        { $unset: { myLock: 1 } } as mongo.UpdateQuery<any>,
        { session }
      );
    }
    const docs = await collection
      .find({ [key]: id } as mongo.FilterQuery<WithDates<T>>, {
        ...sessionOpts
      })
      .project({ _id: 0 })
      .limit(1)
      .toArray();
    const result = docs[0];
    if (result !== undefined) {
      await validator.validate(dbEntrySchema, result);
    }
    return result;
  };

  const throw404 = () => {
    const err = new Error(`The requested ${schema} was not found.`);
    err.status = 404;
    err.expose = true;
    throw err;
  };

  /**
   * Fetches the single document by the primary key.
   * Throws an error with 404 status if nothing found.
   */
  const findByIdOrFail = async (id: string | number, options?: FindOptions) => {
    const result = await findById(id, options);
    if (result === undefined) throw404();
    return result;
  };

  /**
   * Modifies the document by the primary key.
   */
  const modifyOne = async (id: string | number, updates: object) => {
    const key = primaryKey ? (primaryKey as string) : '_id';
    const date = new Date();
    if (key in updates) {
      const err = TypeError('The primary key cannot be modified.');
      err.status = 400;
      err.expose = true;
      throw err;
    }
    const original = await collection.findOneAndUpdate(
      { [key]: id } as mongo.FilterQuery<WithDates<T>>,
      { $set: { updatedAt: date, ...updates } } as mongo.UpdateQuery<
        WithDates<T>
      >,
      { ...sessionOpts }
    );
    if (original.value === null) {
      const err = new Error('The request resource was not found.');
      err.status = status.NOT_FOUND;
      err.expose = true;
      throw err;
    }
    const updated: WithDates<T> & { _id: any; myLock: any } = {
      ...original.value,
      ...updates,
      updatedAt: date
    } as any;
    try {
      const { _id, myLock, ...updatedWithoutId } = updated;
      await validator.validate(dbEntrySchema, updatedWithoutId);
    } catch (err) {
      // validation failed, rollback
      await collection.findOneAndReplace(
        { [key]: id } as mongo.FilterQuery<WithDates<T>>,
        original.value!,
        { ...sessionOpts }
      );
      throw err;
    }
    return updated;
  };

  const unsafe_updateMany = async (filter: any, update: any) => {
    // This does not perform any validation, use with caution!
    const res = await collection.updateMany(filter, update, { ...sessionOpts });
    return res.modifiedCount;
  };

  const newSequentialId = async () => {
    // Note that this will not use sessoins
    // because $inc is always atomic
    if (session) throw new Error('Do not call this inside a transaction.');
    const date = new Date();
    const doc = await db.collection('sequences').findOneAndUpdate(
      { key: collectionName },
      { $inc: { value: 1 }, $set: { updatedAt: date } },
      {
        upsert: true,
        projection: { _id: false, value: true },
        returnDocument: 'after'
      }
    );
    if (doc.value !== null) {
      return doc.value.value as number;
    } else {
      await db.collection('sequences').insertOne({
        key: collectionName,
        value: 1,
        cratedAt: date,
        updatedAt: date
      });
      return 1;
    }
  };

  const deleteMany = (query: object) => {
    return collection.deleteMany(query, { ...sessionOpts });
  };

  const deleteOne = (query: object) => {
    return collection.deleteOne(query, { ...sessionOpts });
  };

  return {
    deleteMany,
    deleteOne,
    findAll,
    findAsCursor,
    findById,
    findByIdOrFail,
    insert,
    upsert,
    aggregate,
    insertMany,
    modifyOne,
    unsafe_updateMany,
    newSequentialId,
    collectionName: () => collectionName
  } as CollectionAccessor<T>;
};

export default createCollectionAccessor;
