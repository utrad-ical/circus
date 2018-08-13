import { createHash } from 'crypto';

export const escapeRegExp = str => {
  str = str + '';
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
};

export const sha1 = arrayBuf => {
  const sha = createHash('sha1');
  sha.update(Buffer.from(arrayBuf));
  return sha.digest('hex');
};
