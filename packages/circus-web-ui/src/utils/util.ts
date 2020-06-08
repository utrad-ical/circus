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
