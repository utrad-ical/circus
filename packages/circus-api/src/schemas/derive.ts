import { z } from 'zod';
import { searchResultOf as sharedSearchResultOf } from '@utrad-ical/circus-api-schema';
import { dateField } from '@utrad-ical/circus-api-schema/formats';

// Helpers to derive schemas from the base ones

export const searchResultOf = (items: z.ZodType) => sharedSearchResultOf(items);

const asObject = (schema: z.ZodType): z.ZodObject => {
  if (!(schema instanceof z.ZodObject))
    throw new TypeError('Unsupported schema: an object schema is required');
  return schema;
};

/** Builds a mask for pick/omit/partial/required from existing keys */
const maskOf = (schema: z.ZodObject, keys: string[]): any =>
  Object.fromEntries(keys.filter(k => k in schema.shape).map(k => [k, true]));

/** Adds `createdAt` and `updatedAt` */
export const withDates = (schema: z.ZodType) =>
  asObject(schema).extend({ createdAt: dateField(), updatedAt: dateField() });

/** The search result of the items with `createdAt` and `updatedAt` */
export const searchResult = (schema: z.ZodType) =>
  searchResultOf(withDates(schema));

/** Makes all properties required except the given ones */
export const allRequiredExcept = (schema: z.ZodType, except: string[]) => {
  const obj = asObject(schema);
  const others = Object.keys(obj.shape).filter(k => !except.includes(k));
  return obj.partial(maskOf(obj, except)).required(maskOf(obj, others));
};

/** Keeps only the given properties */
export const only = (schema: z.ZodType, keys: string[]) =>
  z.strictObject(asObject(schema).pick(maskOf(asObject(schema), keys)).shape);

/** Removes the given properties */
export const exclude = (schema: z.ZodType, keys: string[]) =>
  asObject(schema).omit(maskOf(asObject(schema), keys));
