import { Vector2 } from 'three';

/**
 * Calculates the inverse matrix of a multidimensional matrix with sweeping method.
 * https://thira.plavox.info/inverse/
 * @param matrix
 */
export function getInverse(matrix: number[][]): number[][] {
  const n = matrix.length;
  const a: number[][] = new Array(n);
  const inv: number[][] = new Array(n);

  // Create identity matrix
  for (let i = 0; i < n; i++) {
    a[i] = matrix[i].concat();
    inv[i] = new Array(n);
    for (let j = 0; j < n; j++) {
      inv[i][j] = i == j ? 1.0 : 0.0;
    }
  }

  // Sweep method
  for (let i = 0; i < n; i++) {
    const buf = 1 / a[i][i];
    for (let j = 0; j < n; j++) {
      a[i][j] *= buf;
      inv[i][j] *= buf;
    }
    for (let j = 0; j < n; j++) {
      if (i != j) {
        const buf = a[j][i];
        for (let k = 0; k < n; k++) {
          a[j][k] -= a[i][k] * buf;
          inv[j][k] -= inv[i][k] * buf;
        }
      }
    }
  }

  return inv;
}

/**
 * Calculates eigenvalues.
 * http://yamatyuu.net/other/matrix/eigenvector.html?1&-1&-1&1
 * @param matrix
 */
export function getEigenvaluesOf2x2(matrix: number[][]): number[] {
  const b = -(matrix[0][0] + matrix[1][1]);
  const c = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  const k = Math.pow(b, 2) - 4 * c;

  const eigenValue1 = (-b + Math.sqrt(k)) / 2;
  const eigenValue2 = (-b - Math.sqrt(k)) / 2;
  return [eigenValue1, eigenValue2];
}

/**
 * Calculates eigenvectors (normalized).
 * http://yamatyuu.net/other/matrix/eigenvector.html?1&-1&-1&1
 * @param matrix
 */
export function getEigenvectorsOf2x2(matrix: number[][]): Vector2[] {
  const eigenValues: number[] = getEigenvaluesOf2x2(matrix);
  const eigenVectors: Vector2[] = _getEigenvectorsOf2x2(matrix, eigenValues);
  return eigenVectors;
}

/**
 * Calculates eigenvectors (normalized).
 * http://yamatyuu.net/other/matrix/eigenvector.html?1&-1&-1&1
 * @param matrix
 * @param eigenValues
 */
function _getEigenvectorsOf2x2(
  matrix: number[][],
  eigenValues: number[]
): Vector2[] {
  const eigenVectors: Vector2[] = [];
  eigenValues.forEach(eigenValue => {
    const y = matrix[0][0] - eigenValue - matrix[1][0];
    const x = matrix[1][1] - eigenValue - matrix[0][1];
    eigenVectors.push(new Vector2(x, y).normalize());
  });
  return eigenVectors;
}
