import MemoryDicomFileRepository from './MemoryDicomFileRepository';

describe('MemoryDicomFileRepository', () => {
  test('save/load image', async () => {
    const dr = new MemoryDicomFileRepository({});
    const series = await dr.getSeries('2.4.6.8');
    expect(series.images).toBe('');
    const input = new Uint8Array(
      [].map.call('abcde', (c: string) => c.charCodeAt(0))
    );
    await series.save(1, input.buffer as ArrayBuffer);
    const output = await series.load(1);
    expect(series.images).toBe('1');
    expect(Buffer.from(output).equals(input)).toBe(true);
    await expect(series.load(10)).rejects.toThrow(RangeError);
  });
});
