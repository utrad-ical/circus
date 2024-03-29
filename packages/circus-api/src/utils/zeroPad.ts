const zeroPad = (digits: number, num: number) => {
  const str = '' + num;
  if (str.length >= digits) return str;
  return '0'.repeat(digits - str.length) + str;
};

export default zeroPad;
