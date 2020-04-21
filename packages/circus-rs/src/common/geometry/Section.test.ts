import * as su from '../../browser/section-util';
import * as sect from './Section';
import { Vector2D } from './Vector';
import { Vector3, Vector2 } from 'three';

test('parallelToX', () => {
  expect(su.parallelToX(new Vector3(1, 0, 0))).toBe(true);
  expect(su.parallelToX(new Vector3(-1, 0, 0))).toBe(true);
  expect(su.parallelToX(new Vector3(0, 1, 0))).toBe(false);
  expect(su.parallelToX(new Vector3(0, -1, 0))).toBe(false);
  expect(su.parallelToX(new Vector3(0, 0, 1))).toBe(false);
  expect(su.parallelToX(new Vector3(0, 0, -1))).toBe(false);
  expect(su.parallelToX(new Vector3(0.5, 0.5, 0.5))).toBe(false);
});

test('parallelToY', () => {
  expect(su.parallelToY(new Vector3(1, 0, 0))).toBe(false);
  expect(su.parallelToY(new Vector3(-1, 0, 0))).toBe(false);
  expect(su.parallelToY(new Vector3(0, 1, 0))).toBe(true);
  expect(su.parallelToY(new Vector3(0, -1, 0))).toBe(true);
  expect(su.parallelToY(new Vector3(0, 0, 1))).toBe(false);
  expect(su.parallelToY(new Vector3(0, 0, -1))).toBe(false);
  expect(su.parallelToY(new Vector3(0.5, 0.5, 0.5))).toBe(false);
});

test('parallelToZ', () => {
  expect(su.parallelToZ(new Vector3(1, 0, 0))).toBe(false);
  expect(su.parallelToZ(new Vector3(-1, 0, 0))).toBe(false);
  expect(su.parallelToZ(new Vector3(0, 1, 0))).toBe(false);
  expect(su.parallelToZ(new Vector3(0, -1, 0))).toBe(false);
  expect(su.parallelToZ(new Vector3(0, 0, 1))).toBe(true);
  expect(su.parallelToZ(new Vector3(0, 0, -1))).toBe(true);
  expect(su.parallelToZ(new Vector3(0.5, 0.5, 0.5))).toBe(false);
});

test('detectOrthogonalSection', () => {
  expect(
    su.detectOrthogonalSection({
      origin: [0, 0, 0],
      xAxis: [1, 0, 0],
      yAxis: [0, 1, 0]
    })
  ).toBe('axial');
  expect(
    su.detectOrthogonalSection({
      origin: [0, 0, 0],
      xAxis: [0, 1, 0],
      yAxis: [0, 0, 1]
    })
  ).toBe('sagittal');
  expect(
    su.detectOrthogonalSection({
      origin: [0, 0, 0],
      xAxis: [1, 0, 0],
      yAxis: [0, 0, 1]
    })
  ).toBe('coronal');
  expect(
    su.detectOrthogonalSection({
      origin: [0, 0, 0],
      xAxis: [1, 2, 0],
      yAxis: [0, 1, 0]
    })
  ).toBe('oblique');
});

test('transform', () => {
  const section = {
    origin: [1, 3, 5],
    xAxis: [2, 5, 9],
    yAxis: [8, 8, 10]
  };
  const t = sect.translateSection(section, new Vector3(10, 11, 12));
  expect(t.origin).toEqual([11, 14, 17]);
});

describe('adjustOnResized', () => {
  test('axial', () => {
    const oldSection = {
      origin: [0, 0, 0],
      xAxis: [6, 0, 0],
      yAxis: [0, 6, 0]
    };
    const beforeResolution: Vector2D = [6, 6];
    const afterResolution: Vector2D = [12, 12];

    const newSection = su.adjustOnResized(
      oldSection,
      beforeResolution,
      afterResolution
    );
    expect(newSection).toEqual({
      origin: [-3, -3, 0],
      xAxis: [12, 0, 0],
      yAxis: [0, 12, 0]
    });
  });

  test('smaller', () => {
    const oldSection = {
      origin: [3, 4, 0],
      xAxis: [0, 16, 12], // length: 20
      yAxis: [0, -12, 16] // length: 20
      // center is [6, 14]
      // origin to center is [0, 2, 14]
    };
    const beforeResolution: Vector2D = [20, 20];
    const afterResolution: Vector2D = [10, 10];

    const newSection = su.adjustOnResized(
      oldSection,
      beforeResolution,
      afterResolution
    );
    expect(newSection).toEqual({
      origin: [3, 5, 7], // origin + (origin to center) / 2
      xAxis: [0, 8, 6], // half of before
      yAxis: [0, -6, 8] // half of before
    });
  });
});

test('distanceFromPointToSection', () => {
  const a = {
    origin: [0, 0, 0],
    xAxis: [2, 0, 0],
    yAxis: [0, 2, 0]
  };
  const p = new Vector3(2, 3, -5);
  const d = sect.distanceFromPointToSection(a, p);
  expect(d).toBe(5);
});

test('sectionEquals', () => {
  const a = {
    origin: [0, 0, 1],
    xAxis: [1, 1, 1],
    yAxis: [2, 2, 2]
  };
  expect(sect.sectionEquals(a, a)).toBe(true);
  expect(sect.sectionEquals(a, { ...a, origin: [0, 1, 1] })).toBe(false);
});

test('sectionOverlapsVolume', () => {
  const t = (mmSection: sect.Section, expected: boolean) => {
    const resolution = new Vector2(10, 10);
    const voxelSize = new Vector3(1, 1, 1);
    const voxelCount = new Vector3(10, 10, 10);
    const vSection = sect.vectorizeSection(mmSection);
    expect(vSection.xAxis.dot(vSection.yAxis)).toBe(0);
    const actual = su.sectionOverlapsVolume(
      mmSection,
      resolution,
      voxelSize,
      voxelCount
    );
    expect(actual).toBe(expected);
  };
  t(
    {
      origin: [10.1, 10.1, 0],
      xAxis: [10, 0, 0],
      yAxis: [0, 10, 0]
    },
    false
  );
  t(
    {
      origin: [10, 10, 0],
      xAxis: [10, 0, 0],
      yAxis: [0, 10, 0]
    },
    true
  );
  t(
    {
      origin: [0, 0, 0],
      xAxis: [10, 0, 0],
      yAxis: [0, 10, 0]
    },
    true
  );
  t(
    {
      origin: [1, 1, 1],
      xAxis: [1, 0, 0],
      yAxis: [0, 1, 0]
    },
    true
  );
  t(
    {
      origin: [-1, -1, 1],
      xAxis: [1000, 0, 0],
      yAxis: [0, 1000, 0]
    },
    true
  );
});
