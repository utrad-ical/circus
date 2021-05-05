export const escapeRegExp = (str: string) => {
  str = str + '';
  return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
};

export const sha1 = async (arrayBuf: ArrayBuffer) => {
  const hash = await crypto.subtle.digest('sha1', arrayBuf);
  let hex = '';
  const h = '0123456789abcdef';
  new Uint8Array(hash).forEach(v => (hex += h[v >> 4] + h[v & 15]));
  return hex;
};

export const withCommas = (x: number) => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const capitalize = (str: string) => {
  return str[0].toUpperCase() + str.slice(1);
};
