const isLikeDicom = (buffer: ArrayBuffer) => {
  return (
    buffer.byteLength >= 0x84 &&
    new DataView(buffer).getUint32(0x80, false) === 0x4449434d
  );
};

export default isLikeDicom;
