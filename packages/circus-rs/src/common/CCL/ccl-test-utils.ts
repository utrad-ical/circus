export function mosaic(
  width: number,
  height: number,
  NSlice: number,
  neightbor: 6 | 26
): [Uint8Array, Uint16Array, number, Uint32Array, Uint16Array, Uint16Array] {
  const img = new Uint8Array(width * height * NSlice);
  const label = new Uint16Array(width * height * NSlice);
  const num = neightbor === 6 ? Math.floor((width * height * NSlice) / 2) : 1;
  const volume = new Uint32Array(num + 1);
  const UL = new Uint16Array((num + 1) * 3).map(() =>
    width < height
      ? height < NSlice
        ? NSlice
        : height
      : width < NSlice
      ? NSlice
      : width
  );
  const LR = new Uint16Array((num + 1) * 3);

  let sum = 0;
  for (let k = 0; k < NSlice; k++) {
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const pos = i + width * (j + k * height);
        if ((i % 2) + (j % 2) === 1) {
          img[pos] = 1 - (k % 2);
        } else {
          img[pos] = k % 2;
        }

        if (num === 1) {
          const p = img[pos];
          const p3 = p * 3;
          label[pos] = p === 1 ? 1 : 0;
          volume[p]++;
          if (i < UL[p3]) {
            UL[p3] = i;
          }
          if (LR[p3] < i) {
            LR[p3] = i;
          }
          if (j < UL[p3 + 1]) {
            UL[p3 + 1] = j;
          }
          if (LR[p3 + 1] < j) {
            LR[p3 + 1] = j;
          }
          if (k < UL[p3 + 2]) {
            UL[p3 + 2] = k;
          }
          if (LR[p3 + 2] < k) {
            LR[p3 + 2] = k;
          }
        } else {
          label[pos] = img[pos] === 1 ? ++sum : 0;
          const p = label[pos];
          const p3 = p * 3;
          volume[p]++;
          if (i < UL[p3]) {
            UL[p3] = i;
          }
          if (LR[p3] < i) {
            LR[p3] = i;
          }
          if (j < UL[p3 + 1]) {
            UL[p3 + 1] = j;
          }
          if (LR[p3 + 1] < j) {
            LR[p3 + 1] = j;
          }
          if (k < UL[p3 + 2]) {
            UL[p3 + 2] = k;
          }
          if (LR[p3 + 2] < k) {
            LR[p3 + 2] = k;
          }
        }
      }
    }
  }
  return [img, label, num, volume, UL, LR];
}

export function white(width: number, height: number, NSlice: number) {
  return new Uint8Array(width * height * NSlice).fill(1);
}

export function black(width: number, height: number, NSlice: number) {
  return new Uint8Array(width * height * NSlice);
}

export function sampleImg(
  neighbor: number
): [Uint8Array, Uint8Array, number, Uint32Array, Uint16Array, Uint16Array] {
  const [width, height, NSlice] = [16, 16, 16];
  if (neighbor === 6 || neighbor === 26) {
    // prettier-ignore
    const img =  new Uint8Array([
      1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 1, 1, 1, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 1, 1, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 1, 0, 0, 0, 1, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
      0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
      0, 0, 0, 0, 0, 0, 0, 1, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 1, 0, 1, 0, 0, 0, 0, 0, 0,
      0, 0, 1, 1, 0, 0, 0, 0, 0, 0,
      0, 0, 1, 1, 0, 0, 1, 1, 0, 0,
      0, 0, 1, 1, 0, 0, 1, 0, 1, 0,
      0, 0, 0, 0, 0, 0, 1, 0, 0, 1,
      0, 0, 0, 0, 0, 0, 1, 0, 0, 1,
      0, 0, 0, 0, 0, 0, 1, 1, 1, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 1, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
      0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
      0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 1
    ]);
    if (neighbor === 6) {
      // prettier-ignore
      const label = new Uint8Array([
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 2, 2, 2, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 2, 2, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2, 0, 0, 0, 3, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 3, 3, 0,
        0, 0, 0, 0, 0, 0, 0, 3, 3, 0,
        0, 0, 0, 0, 0, 0, 0, 3, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 2, 0, 2, 0, 0, 0, 0, 0, 0,
        0, 0, 2, 2, 0, 0, 0, 0, 0, 0,
        0, 0, 2, 2, 0, 0, 3, 3, 0, 0,
        0, 0, 2, 2, 0, 0, 3, 0, 4, 0,
        0, 0, 0, 0, 0, 0, 3, 0, 0, 5,
        0, 0, 0, 0, 0, 0, 3, 0, 0, 5,
        0, 0, 0, 0, 0, 0, 3, 3, 3, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 3, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 3, 3, 0,
        0, 0, 0, 0, 0, 0, 0, 3, 3, 0,
        0, 0, 0, 0, 0, 0, 0, 3, 3, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 6
      ]);
      const volume = new Uint32Array([260, 1, 14, 21, 1, 2, 1]);
      // prettier-ignore
      const UL = new Uint16Array([0, 0, 0, 0, 0, 0, 1, 1, 0, 6, 3, 0, 8, 4, 1, 9, 5, 1, 9, 9, 2]);
      // prettier-ignore
      const LR = new Uint16Array([9, 9, 2, 0, 0, 0, 3, 4, 1, 8, 7, 2, 8, 4, 1, 9, 6, 1, 9, 9, 2]);
      return [img, label, 6, volume, UL, LR];
    } else {
      // prettier-ignore
      const label = new Uint8Array([
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 1, 1, 1, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 1, 1, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 1, 0, 0, 0, 2, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 2, 2, 0,
        0, 0, 0, 0, 0, 0, 0, 2, 2, 0,
        0, 0, 0, 0, 0, 0, 0, 2, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 1, 0, 1, 0, 0, 0, 0, 0, 0,
        0, 0, 1, 1, 0, 0, 0, 0, 0, 0,
        0, 0, 1, 1, 0, 0, 2, 2, 0, 0,
        0, 0, 1, 1, 0, 0, 2, 0, 2, 0,
        0, 0, 0, 0, 0, 0, 2, 0, 0, 2,
        0, 0, 0, 0, 0, 0, 2, 0, 0, 2,
        0, 0, 0, 0, 0, 0, 2, 2, 2, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 2, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 2, 2, 0,
        0, 0, 0, 0, 0, 0, 0, 2, 2, 0,
        0, 0, 0, 0, 0, 0, 0, 2, 2, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 3
      ]);
      const volume = new Uint32Array([260, 15, 24, 1]);
      // prettier-ignore
      const UL = new Uint16Array([0, 0, 0, 0, 0, 0, 6, 3, 0, 9, 9, 2]);
      // prettier-ignore
      const LR = new Uint16Array([9, 9, 2, 3, 4, 1, 9, 7, 2, 9, 9, 2]);
      return [img, label, 3, volume, UL, LR];
    }
  } else {
    // prettier-ignore
    const img =  new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]);
    if (neighbor === 4) {
      // prettier-ignore
      const label =  new Uint8Array([
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 4, 0, 0, 5, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 6, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 6, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7, 7, 7, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
      ]);
      const volume = new Uint32Array([236, 1, 6, 2, 3, 1, 2, 4, 1]);
      // prettier-ignore
      const UL = new Uint16Array([0, 0, 0, 15, 0, 0, 1, 3, 0, 7, 7, 0, 6, 8, 0, 9, 8, 0, 10, 9, 0, 7, 11, 0, 0, 15, 0]);
      // prettier-ignore
      const LR = new Uint16Array([15, 15, 0, 15, 0, 0, 3, 5, 0, 8, 7, 0, 6, 10, 0, 9, 8, 0, 10, 10, 0, 9, 12, 0, 0, 15, 0]);

      return [img, label, 8, volume, UL, LR];
    } else {
      // prettier-ignore
      const label =  new Uint8Array([
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 3, 0, 0, 3, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
      ]);
      const volume = new Uint32Array([236, 1, 6, 12, 1]);
      // prettier-ignore
      const UL = new Uint16Array([0, 0, 0, 15, 0, 0, 1, 3, 0, 6, 7, 0, 0, 15, 0]);
      // prettier-ignore
      const LR = new Uint16Array([15, 15, 0, 15, 0, 0, 3, 5, 0, 10, 12, 0, 0, 15, 0]);
      return [img, label, 4, volume, UL, LR];
    }
  }
}
