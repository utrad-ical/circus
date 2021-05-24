import rusha from 'rusha';

export const escapeRegExp = (str: string) => {
  str = str + '';
  return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
};

export const sha1 = async (arrayBuffer: ArrayBuffer) => {
  const hash = rusha.createHash();
  hash.update(arrayBuffer);
  return hash.digest('hex');
};

export const withCommas = (x: number) => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const capitalize = (str: string) => {
  return str[0].toUpperCase() + str.slice(1);
};
