const isPlainObject = obj =>
  Object.prototype.toString.call(obj) === '[object Object]';

const isScalarOrDate = val => {
  const t = typeof val;
  if (t === 'string' || t === 'number' || t === 'boolean') return true;
  if (isPlainObject(val)) {
    return (
      Object.keys(val).length === 1 &&
      '$date' in val &&
      typeof val.$date === 'string'
    );
  }
  return false;
};

/**
 * Checks if the given object is an acceptable mongodb filter.
 * @param {object} filter The valie to check.
 * @param {string[]} fields List of accepted fields.
 * @returns {boolean} `true` if valid.
 */
const checkFilter = (filter, fields) => {
  const checkKeyVal = (key, value) => {
    if (key === '$and' || key === '$or') {
      if (!Array.isArray(value)) return false;
      return value.every(item => checkFilter(item, fields));
    } else {
      if (fields.indexOf(key) < 0) return false;
      if (isScalarOrDate(value)) return true;
      if (isPlainObject(value)) {
        // Checks { $gt: 5}, { $ne: 'A' }, etc.
        const keys = Object.keys(value);
        return keys.every(k => {
          const ops = ['$gt', '$gte', '$lt', '$lte', '$ne', '$regex'];
          if (ops.indexOf(k) < 0) return false;
          return isScalarOrDate(value[k]);
        });
      }
      return false;
    }
  };

  if (!isPlainObject(filter)) return false;
  return Object.keys(filter).every(key => checkKeyVal(key, filter[key]));
};

export default checkFilter;
