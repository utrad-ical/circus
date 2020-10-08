import { createHash } from 'crypto';

export const escapeRegExp = (str: string) => {
  str = str + '';
  return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
};

export const sha1 = (arrayBuf: ArrayBuffer) => {
  const sha = createHash('sha1');
  sha.update(Buffer.from(arrayBuf));
  return sha.digest('hex');
};

export const withCommas = (x: number) => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const capitalize = (str: string) => {
  return str[0].toUpperCase() + str.slice(1);
};
