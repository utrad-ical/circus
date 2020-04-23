import { BSONRegExp } from 'bson';

const isPlainObject = (obj: any): obj is { [key: string]: any } =>
  obj !== null &&
  typeof obj === 'object' &&
  'constructor' in obj &&
  obj.constructor.name === 'Object';

const isScalarOrDate = (
  val: any
): val is string | number | boolean | Date | BSONRegExp => {
  const t = typeof val;
  return (
    t === 'string' ||
    t === 'number' ||
    t === 'boolean' ||
    val instanceof Date ||
    val instanceof BSONRegExp
  );
};

/**
 * Checks if the given object is an acceptable mongodb filter.
 * The "value" part may include a `Date` object.
 * @param filter The value to check.
 * @param fields List of accepted fields.
 * @returns `true` if valid.
 */
const checkFilter: (filter: object, fields: string[]) => boolean = (
  filter,
  fields
) => {
  const checkKeyVal = (key: string, value: any) => {
    if (key === '$and' || key === '$or') {
      if (!Array.isArray(value)) return false;
      return value.every(item => checkFilter(item, fields));
    } else {
      if (fields.indexOf(key) < 0) return false;
      if (isScalarOrDate(value)) return true;
      if (isPlainObject(value)) {
        // Checks { $gt: 5 }, { $ne: 'A' }, etc.
        const keys = Object.keys(value);
        return keys.every(k => {
          const ops = ['$gt', '$gte', '$lt', '$lte', '$ne', '$in'];
          if (ops.indexOf(k) < 0) return false;
          return k === '$in'
            ? Array.isArray(value[k])
            : isScalarOrDate(value[k]);
        });
      }
      return false;
    }
  };

  if (!isPlainObject(filter)) return false;
  return Object.keys(filter).every(key => checkKeyVal(key, filter[key]));
};

export default checkFilter;
