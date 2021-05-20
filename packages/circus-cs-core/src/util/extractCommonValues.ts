type KeyValues = { [key: string]: any };

const deepEqual = (x: any, y: any) => {
  if (x === y) {
    return true;
  } else if (
    typeof x == 'object' &&
    x != null &&
    typeof y == 'object' &&
    y != null
  ) {
    if (Object.keys(x).length !== Object.keys(y).length) return false;
    for (const prop in x) {
      if (y.hasOwnProperty(prop)) {
        if (!deepEqual(x[prop], y[prop])) return false;
      } else return false;
    }
    return true;
  } else return false;
};

const extractCommonValues = (
  input: KeyValues[]
): {
  common: KeyValues;
  unique: Array<KeyValues>;
} => {
  if (!input.length) return { common: {}, unique: [{}] };

  const common = { ...input[0] };

  for (let i = 1; i < input.length; i++) {
    for (const key of Object.keys(common)) {
      if (!deepEqual(common[key], input[i][key])) delete common[key];
    }
  }

  const unique = input.map(item => {
    const copy: any = {};
    for (const key in item) {
      if (!(key in common)) copy[key] = item[key];
    }
    return copy;
  });

  return { common, unique };
};

export default extractCommonValues;
