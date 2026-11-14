import { createHash } from 'node:crypto';

const sha1 = (buf: Buffer) => {
  const sha1 = createHash('sha1');
  sha1.update(buf);
  return sha1.digest('hex');
};

export default sha1;
