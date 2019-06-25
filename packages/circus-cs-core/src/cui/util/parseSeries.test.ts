import ps from './parseSeries';

describe('parseSeries', () => {
  test('simple UID check', () => {
    expect(ps('1.3.5')).toEqual({
      seriesUid: '1.3.5'
    });
  });

  test('wrong UID throws', () => {
    expect(() => ps('1.x.5')).toThrow(/does not seem to be a valid DICOM UID/);
  });

  test('with partial volume descriptor', () => {
    expect(ps('1.3.5:50:100')).toEqual({
      seriesUid: '1.3.5',
      partialVolumeDescriptor: {
        start: 50,
        end: 100,
        delta: 1
      }
    });

    expect(ps('1.3.5:1:9:2')).toEqual({
      seriesUid: '1.3.5',
      partialVolumeDescriptor: {
        start: 1,
        end: 9,
        delta: 2
      }
    });
  });

  // test.skip('negative delta', () => {});
});
