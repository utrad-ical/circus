'use strict';

const su = require('../src/browser/section-util');
const geo = require('../src/common/geometry');
const { Vector3, Vector2, Box3 } = require('three');
const assert = require('chai').assert;
const box = require('../src/common/geometry/Box');

describe('Section', function() {
  it('#parallelToX', function() {
    assert.isTrue(su.parallelToX(new Vector3(1, 0, 0)));
    assert.isTrue(su.parallelToX(new Vector3(-1, 0, 0)));
    assert.isFalse(su.parallelToX(new Vector3(0, 1, 0)));
    assert.isFalse(su.parallelToX(new Vector3(0, -1, 0)));
    assert.isFalse(su.parallelToX(new Vector3(0, 0, 1)));
    assert.isFalse(su.parallelToX(new Vector3(0, 0, -1)));
    assert.isFalse(su.parallelToX(new Vector3(0.5, 0.5, 0.5)));
  });

  it('#parallelToY', function() {
    assert.isFalse(su.parallelToY(new Vector3(1, 0, 0)));
    assert.isFalse(su.parallelToY(new Vector3(-1, 0, 0)));
    assert.isTrue(su.parallelToY(new Vector3(0, 1, 0)));
    assert.isTrue(su.parallelToY(new Vector3(0, -1, 0)));
    assert.isFalse(su.parallelToY(new Vector3(0, 0, 1)));
    assert.isFalse(su.parallelToY(new Vector3(0, 0, -1)));
    assert.isFalse(su.parallelToY(new Vector3(0.5, 0.5, 0.5)));
  });

  it('#parallelToZ', function() {
    assert.isFalse(su.parallelToZ(new Vector3(1, 0, 0)));
    assert.isFalse(su.parallelToZ(new Vector3(-1, 0, 0)));
    assert.isFalse(su.parallelToZ(new Vector3(0, 1, 0)));
    assert.isFalse(su.parallelToZ(new Vector3(0, -1, 0)));
    assert.isTrue(su.parallelToZ(new Vector3(0, 0, 1)));
    assert.isTrue(su.parallelToZ(new Vector3(0, 0, -1)));
    assert.isFalse(su.parallelToZ(new Vector3(0.5, 0.5, 0.5)));
  });

  it('#detectOrthogonalSection', function() {
    assert.equal(
      su.detectOrthogonalSection({
        xAxis: [1, 0, 0],
        yAxis: [0, 1, 0]
      }),
      'axial'
    );
    assert.equal(
      su.detectOrthogonalSection({
        xAxis: [0, 1, 0],
        yAxis: [0, 0, 1]
      }),
      'sagittal'
    );
    assert.equal(
      su.detectOrthogonalSection({
        xAxis: [1, 0, 0],
        yAxis: [0, 0, 1]
      }),
      'coronal'
    );
    assert.equal(
      su.detectOrthogonalSection({
        xAxis: [1, 2, 0],
        yAxis: [0, 1, 0]
      }),
      'oblique'
    );
  });

  describe('should handle section transformations', function() {
    function section() {
      return {
        origin: [1, 3, 5],
        xAxis: [2, 5, 9],
        yAxis: [8, 8, 10]
      };
    }

    it('#transform', function() {
      const s = section();
      const t = geo.translateSection(s, new Vector3(10, 11, 12));
      assert.deepEqual(t.origin, [11, 14, 17]);
    });
  });

  describe('adjustOnResized', function() {
    it('#axial', function() {
      const oldSection = {
        origin: [0, 0, 0],
        xAxis: [6, 0, 0],
        yAxis: [0, 6, 0]
      };
      const beforeResolution = [6, 6];
      const afterResolution = [12, 12];

      const newSection = su.adjustOnResized(
        oldSection,
        beforeResolution,
        afterResolution
      );
      assert.deepEqual(newSection, {
        origin: [-3, -3, 0],
        xAxis: [12, 0, 0],
        yAxis: [0, 12, 0]
      });
    });
    it('#smaller', function() {
      const oldSection = {
        origin: [3, 4, 0],
        xAxis: [0, 16, 12], // length: 20
        yAxis: [0, -12, 16] // length: 20
        // center is [6, 14]
        // origin to center is [0, 2, 14]
      };
      const beforeResolution = [20, 20];
      const afterResolution = [10, 10];

      const newSection = su.adjustOnResized(
        oldSection,
        beforeResolution,
        afterResolution
      );
      assert.deepEqual(newSection, {
        origin: [3, 5, 7], // origin + (origin to center) / 2
        xAxis: [0, 8, 6], // half of before
        yAxis: [0, -6, 8] // half of before
      });
    });
  });

  it('#sectionEquals', function() {
    const a = {
      origin: [0, 0, 1],
      xAxis: [1, 1, 1],
      yAxis: [2, 2, 2]
    };
    assert.isTrue(geo.sectionEquals(a, a));
    assert.isFalse(geo.sectionEquals(a, { ...a, origin: [0, 1, 1] }));
  });

  describe('sectionOverlapsVolume', function() {
    describe('by orthogonal section', function() {
      it('#axial', function() {
        const resolution = new Vector2(100, 100);
        const voxelSize = new Vector3(10, 10, 10);
        const voxelCount = new Vector3(10, 10, 10);

        it('#axial-01', function() {
          const mmSection = {
            origin: [-1, -1, 0],
            xAxis: [0.9, 0, 0],
            yAxis: [0, 0.9, 0]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'axial');
          assert.isFalse(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });

        it('#axial-02', function() {
          const mmSection = {
            origin: [-1, -1, 0],
            xAxis: [1, 0, 0],
            yAxis: [0, 1, 0]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'axial');
          assert.isTrue(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });

        it('#axial-03', function() {
          const mmSection = {
            origin: [0, 0, 0],
            xAxis: [-0.1, 0, 0],
            yAxis: [0, -0.1, 0]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'axial');
          assert.isTrue(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });

        it('#axial-04', function() {
          const mmSection = {
            origin: [0.9, 0.9, 0],
            xAxis: [0.1, 0, 0],
            yAxis: [0, 0.1, 0]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'axial');
          assert.isTrue(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });

        it('#axial-05', function() {
          const mmSection = {
            origin: [0, 0, 0],
            xAxis: [10, 0, 0],
            yAxis: [0, 10, 0]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'axial');
          assert.isTrue(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });

        it('#axial-06', function() {
          const mmSection = {
            origin: [100.1, 100.1, 0],
            xAxis: [-0.1, 0, 0],
            yAxis: [0, -0.1, 0]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'axial');
          assert.isTrue(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });

        it('#axial-07', function() {
          const mmSection = {
            origin: [100.1, 100.1, 0],
            xAxis: [0.1, 0, 0],
            yAxis: [0, 0.1, 0]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'axial');
          assert.isFalse(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });
      });

      it('#sagittal', function() {
        const resolution = new Vector2(100, 100);
        const voxelSize = new Vector3(10, 10, 10);
        const voxelCount = new Vector3(10, 10, 10);

        it('#sagittal-01', function() {
          const mmSection = {
            origin: [0, -1, -1],
            xAxis: [0, 0.9, 0],
            yAxis: [0, 0, 0.9]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'sagittal');
          assert.isFalse(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });

        it('#sagittal-02', function() {
          const mmSection = {
            origin: [0, -1, -1],
            xAxis: [0, 1, 0],
            yAxis: [0, 0, 1]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'sagittal');
          assert.isTrue(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });

        it('#sagittal-03', function() {
          const mmSection = {
            origin: [0, 0, 0],
            xAxis: [0, -0.1, 0],
            yAxis: [0, 0, -0.1]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'sagittal');
          assert.isTrue(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });

        it('#sagittal-04', function() {
          const mmSection = {
            origin: [0, 0.9, 0.9],
            xAxis: [0, 0.1, 0],
            yAxis: [0, 0, 0.1]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'sagittal');
          assert.isTrue(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });

        it('#sagittal-05', function() {
          const mmSection = {
            origin: [0, 0, 0],
            xAxis: [0, 10, 0],
            yAxis: [0, 0, 10]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'sagittal');
          assert.isTrue(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });

        it('#sagittal-06', function() {
          const mmSection = {
            origin: [0, 100.1, 100.1],
            xAxis: [0, -0.1, 0],
            yAxis: [0, 0, -0.1]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'sagittal');
          assert.isTrue(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });

        it('#sagittal-07', function() {
          const mmSection = {
            origin: [0, 100.1, 100.1],
            xAxis: [0, 0.1, 0],
            yAxis: [0, 0, 0.1]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'sagittal');
          assert.isFalse(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });
      });

      it('#coronal', function() {
        const resolution = new Vector2(100, 100);
        const voxelSize = new Vector3(10, 10, 10);
        const voxelCount = new Vector3(10, 10, 10);

        it('#coronal-01', function() {
          const mmSection = {
            origin: [-1, 0, -1],
            xAxis: [0.9, 0, 0],
            yAxis: [0, 0, 0.9]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'coronal');
          assert.isFalse(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });

        it('#coronal-02', function() {
          const mmSection = {
            origin: [-1, 0, -1],
            xAxis: [1, 0, 0],
            yAxis: [0, 0, 1]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'coronal');
          assert.isTrue(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });

        it('#coronal-03', function() {
          const mmSection = {
            origin: [0, 0, 0],
            xAxis: [-0.1, 0, 0],
            yAxis: [0, 0, -0.1]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'coronal');
          assert.isTrue(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });

        it('#coronal-04', function() {
          const mmSection = {
            origin: [0.9, 0, 0.9],
            xAxis: [0.1, 0, 0],
            yAxis: [0, 0, 0.1]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'coronal');
          assert.isTrue(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });

        it('#coronal-05', function() {
          const mmSection = {
            origin: [0, 0, 0],
            xAxis: [10, 0, 0],
            yAxis: [0, 0, 10]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'coronal');
          assert.isTrue(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });

        it('#coronal-06', function() {
          const mmSection = {
            origin: [100.1, 0, 100.1],
            xAxis: [-0.1, 0, 0],
            yAxis: [0, 0, -0.1]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'coronal');
          assert.isTrue(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });

        it('#coronal-07', function() {
          const mmSection = {
            origin: [100.1, 0, 100.1],
            xAxis: [0.1, 0, 0],
            yAxis: [0, 0, 0.1]
          };
          const vSection = geo.vectorizeSection(mmSection);
          assert.equal(vSection.xAxis.dot(vSection.yAxis), 0);
          assert.equal(su.detectOrthogonalSection(mmSection), 'coronal');
          assert.isFalse(
            su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            )
          );
        });
      });

      it('#oblique', function() {
        describe('Cross-sectional shape of volume : section contains one or more intersection points.', function() {
          it('#Hexagon', function() {
            const n = 10;
            const Op = new Vector3(n / 2, 0, 0);
            const Xv = new Vector3(0, 0, n / 2)
              .sub(Op)
              .normalize()
              .multiplyScalar(n);
            const Yv = new Vector3(n, n, n / 2)
              .sub(Op)
              .normalize()
              .multiplyScalar(n);
            assert.equal(Xv.dot(Yv), 0);
            const mmSection = {
              origin: Op.toArray(),
              xAxis: Xv.toArray(),
              yAxis: Yv.toArray()
            };
            const resolution = new Vector2(n, n);
            const voxelSize = new Vector3(1, 1, 1);
            const voxelCount = new Vector3(n, n, n);
            const mmVolume = new Box3(
              su.convertPointToMm(new Vector3(0, 0, 0), voxelSize),
              su.convertPointToMm(voxelCount, voxelSize)
            );
            const vertices = box.intersectionOfBoxAndPlane(mmVolume, mmSection);
            assert.equal(
              Array.from(new Set(vertices.map(JSON.stringify))).length,
              6,
              JSON.stringify(vertices)
            );
            assert.isTrue(
              vertices.some(p =>
                geo.intersectionPointWithinSection(mmSection, p)
              )
            );
            const result = su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            );
            assert.isTrue(result);
          });

          it('#Pentagon', function() {
            const n = 10;
            const axis = new Vector3(0, 0, 1);
            const Op = new Vector3(0, 0, 0);
            const Xv = new Vector3(10, 0, 10).applyAxisAngle(axis, Math.PI / 3);
            const Yv = new Vector3(0, 10, 0).applyAxisAngle(axis, Math.PI / 3);
            assert.equal(Xv.dot(Yv), 0);
            const mmSection = {
              origin: Op.toArray(),
              xAxis: Xv.toArray(),
              yAxis: Yv.toArray()
            };
            const resolution = new Vector2(n, n);
            const voxelSize = new Vector3(1, 1, 1);
            const voxelCount = new Vector3(n, n, n);
            const mmVolume = new Box3(
              su.convertPointToMm(new Vector3(0, 0, 0), voxelSize),
              su.convertPointToMm(voxelCount, voxelSize)
            );
            const vertices = box.intersectionOfBoxAndPlane(mmVolume, mmSection);
            assert.equal(
              Array.from(new Set(vertices.map(JSON.stringify))).length,
              5,
              JSON.stringify(vertices)
            );
            assert.isTrue(
              vertices.some(p =>
                geo.intersectionPointWithinSection(mmSection, p)
              )
            );
            const result = su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            );
            assert.isTrue(result);
          });

          it('#Square', function() {
            const n = 10;
            const Op = new Vector3(0, 0, 0);
            const Xv = new Vector3(10, 0, 10);
            const Yv = new Vector3(0, 10, 0);
            assert.equal(Xv.dot(Yv), 0);
            const mmSection = {
              origin: Op.toArray(),
              xAxis: Xv.toArray(),
              yAxis: Yv.toArray()
            };
            const resolution = new Vector2(n, n);
            const voxelSize = new Vector3(1, 1, 1);
            const voxelCount = new Vector3(n, n, n);
            const mmVolume = new Box3(
              su.convertPointToMm(new Vector3(0, 0, 0), voxelSize),
              su.convertPointToMm(voxelCount, voxelSize)
            );
            const vertices = box.intersectionOfBoxAndPlane(mmVolume, mmSection);
            assert.equal(
              Array.from(new Set(vertices.map(JSON.stringify))).length,
              4,
              JSON.stringify(vertices)
            );
            assert.isTrue(
              vertices.some(p =>
                geo.intersectionPointWithinSection(mmSection, p)
              )
            );
            const result = su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            );
            assert.isTrue(result);
          });

          it('#Triangle', function() {
            const n = 10;
            const axis = new Vector3(1, 0, 0);
            const Op = new Vector3(0, 0, 0);
            const Xv = new Vector3(10, 0, 10).applyAxisAngle(axis, Math.PI / 2);
            const Yv = new Vector3(0, 10, 0).applyAxisAngle(axis, Math.PI / 2);
            assert.equal(Xv.dot(Yv), 0);
            const mmSection = {
              origin: Op.toArray(),
              xAxis: Xv.toArray(),
              yAxis: Yv.toArray()
            };
            const resolution = new Vector2(n, n);
            const voxelSize = new Vector3(1, 1, 1);
            const voxelCount = new Vector3(n, n, n);
            const mmVolume = new Box3(
              su.convertPointToMm(new Vector3(0, 0, 0), voxelSize),
              su.convertPointToMm(voxelCount, voxelSize)
            );
            const vertices = box.intersectionOfBoxAndPlane(mmVolume, mmSection);
            assert.equal(
              Array.from(new Set(vertices.map(JSON.stringify))).length,
              3,
              JSON.stringify(vertices)
            );
            assert.isTrue(
              vertices.some(p =>
                geo.intersectionPointWithinSection(mmSection, p)
              )
            );
            const result = su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            );
            assert.isTrue(result);
          });
        });

        describe('Cross-sectional shape of volume : polygon created by intersections contains one or more points of section vertex.', function() {
          it('#Hexagon', function() {
            const n = 10;
            const Op = new Vector3(n / 2, 0, 0);
            const Xv = new Vector3(0, 0, n / 2)
              .sub(Op)
              .normalize()
              .multiplyScalar(n);
            const Yv = new Vector3(n, n, n / 2)
              .sub(Op)
              .normalize()
              .multiplyScalar(n);
            assert.equal(Xv.dot(Yv), 0);
            const mmSection = {
              origin: Op.add(Xv.normalize())
                .add(Yv.normalize())
                .toArray(),
              xAxis: Xv.toArray(),
              yAxis: Yv.toArray()
            };
            const resolution = new Vector2(n * 10, n * 10);
            const voxelSize = new Vector3(10, 10, 10);
            const voxelCount = new Vector3(n, n, n);
            const mmVolume = new Box3(
              su.convertPointToMm(new Vector3(0, 0, 0), voxelSize),
              su.convertPointToMm(voxelCount, voxelSize)
            );
            const vertices = box.intersectionOfBoxAndPlane(mmVolume, mmSection);
            assert.equal(
              Array.from(new Set(vertices.map(JSON.stringify))).length,
              6,
              JSON.stringify(vertices)
            );
            assert.isFalse(
              vertices.some(p =>
                geo.intersectionPointWithinSection(mmSection, p)
              )
            );
            const result = su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            );
            assert.isTrue(result);
          });

          it('#Pentagon', function() {
            const n = 10;
            const axis = new Vector3(0, 0, 1);
            const Op = new Vector3(0, 0, 1);
            const Xv = new Vector3(10, 0, 10).applyAxisAngle(axis, Math.PI / 3);
            const Yv = new Vector3(0, 10, 0).applyAxisAngle(axis, Math.PI / 3);
            assert.equal(Xv.dot(Yv), 0);
            const mmSection = {
              origin: Op.toArray(),
              xAxis: Xv.toArray(),
              yAxis: Yv.toArray()
            };
            const resolution = new Vector2(n * 10, n * 10);
            const voxelSize = new Vector3(10, 10, 10);
            const voxelCount = new Vector3(n, n, n);
            const mmVolume = new Box3(
              su.convertPointToMm(new Vector3(0, 0, 0), voxelSize),
              su.convertPointToMm(voxelCount, voxelSize)
            );
            const vertices = box.intersectionOfBoxAndPlane(mmVolume, mmSection);
            assert.equal(
              Array.from(new Set(vertices.map(JSON.stringify))).length,
              5,
              JSON.stringify(vertices)
            );
            assert.isFalse(
              vertices.some(p =>
                geo.intersectionPointWithinSection(mmSection, p)
              )
            );
            const result = su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            );
            assert.isTrue(result);
          });

          it('#Square', function() {
            const n = 10;
            const Op = new Vector3(1, 1, 1);
            const Xv = new Vector3(1, 0, 1);
            const Yv = new Vector3(0, 1, 0);
            assert.equal(Xv.dot(Yv), 0);
            const mmSection = {
              origin: Op.toArray(),
              xAxis: Xv.toArray(),
              yAxis: Yv.toArray()
            };
            const resolution = new Vector2(n * 10, n * 10);
            const voxelSize = new Vector3(10, 10, 10);
            const voxelCount = new Vector3(n, n, n);
            const mmVolume = new Box3(
              su.convertPointToMm(new Vector3(0, 0, 0), voxelSize),
              su.convertPointToMm(voxelCount, voxelSize)
            );
            const vertices = box.intersectionOfBoxAndPlane(mmVolume, mmSection);
            assert.equal(
              Array.from(new Set(vertices.map(JSON.stringify))).length,
              4,
              JSON.stringify(vertices)
            );
            assert.isFalse(
              vertices.some(p =>
                geo.intersectionPointWithinSection(mmSection, p)
              )
            );
            const result = su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            );
            assert.isTrue(result);
          });

          it('#Triangle', function() {
            const n = 10;
            const axis = new Vector3(1, 0, 0);
            const Op = new Vector3(0, 0, 1);
            const Xv = new Vector3(1, 0, 1).applyAxisAngle(axis, Math.PI / 2);
            const Yv = new Vector3(0, 1, 0).applyAxisAngle(axis, Math.PI / 2);
            assert.equal(Xv.dot(Yv), 0);
            const mmSection = {
              origin: Op.toArray(),
              xAxis: Xv.toArray(),
              yAxis: Yv.toArray()
            };
            const resolution = new Vector2(n * 10, n * 10);
            const voxelSize = new Vector3(10, 10, 10);
            const voxelCount = new Vector3(n, n, n);
            const mmVolume = new Box3(
              su.convertPointToMm(new Vector3(0, 0, 0), voxelSize),
              su.convertPointToMm(voxelCount, voxelSize)
            );
            const vertices = box.intersectionOfBoxAndPlane(mmVolume, mmSection);
            assert.equal(
              Array.from(new Set(vertices.map(JSON.stringify))).length,
              3,
              JSON.stringify(vertices)
            );
            assert.isFalse(
              vertices.some(p =>
                geo.intersectionPointWithinSection(mmSection, p)
              )
            );
            const result = su.sectionOverlapsVolume(
              mmSection,
              resolution,
              voxelSize,
              voxelCount
            );
            assert.isTrue(result);
          });
        });
      });
    });
  });
});
