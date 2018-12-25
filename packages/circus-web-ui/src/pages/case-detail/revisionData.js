import { api } from 'utils/api';
import * as rs from 'circus-rs';
import { sha1 } from 'utils/util.js';
import update from 'immutability-helper';

/**
 * Like Array#map(), but works with an async function.
 */
const asyncMap = async (array, callback) => {
  return Promise.all(array.map(async item => await callback(item)));
};

/**
 * Adds actual `volumeArrayBuffer` data to label.data.
 */
const augumentLabelData = async label => {
  if (label.type !== 'voxel') return label;
  const volumeArrayBuffer = await api(`blob/${label.data.voxels}`, {
    responseType: 'arraybuffer'
  });
  return update(label, {
    data: { volumeArrayBuffer: { $set: volumeArrayBuffer } }
  });
};

/**
 * Asynchronously loads voxel data from API
 * and assigns it to the given label cache.
 */
export const loadVolumeLabelData = async revision => {
  return update(revision, {
    series: {
      $set: await asyncMap(revision.series, async series => {
        return update(series, {
          labels: {
            $set: await asyncMap(series.labels, augumentLabelData)
          }
        });
      })
    }
  });
};

/**
 * Saves revision data on the API server.
 */
export const saveRevision = async (caseId, revision) => {
  for (const series of revision.series) {
    for (const label of series.labels) {
      try {
        label.cloud.shrinkToMinimum();
        const bb = rs.scanBoundingBox(label.cloud.volume);
        const newLabelData = {
          voxels: null,
          color: label.cloud.color,
          alpha: label.cloud.alpha
        };
        if (bb !== null) {
          // save painted voxels
          const voxels = label.cloud.volume.data;
          const hash = sha1(voxels);
          if (hash === label.data.voxels) {
            // console.log('Skipping unchanged voxel data.');
          } else {
            // needs to save the new voxel data.
            await api('blob/' + hash, {
              method: 'put',
              handleErrors: true,
              data: voxels,
              headers: { 'Content-Type': 'application/octet-stream' }
            });
          }
          newLabelData.voxels = hash;
          newLabelData.origin = label.cloud.origin;
          newLabelData.size = label.cloud.volume.getDimension();
        }
        label.data = newLabelData;
        delete label.cloud;
      } catch (err) {
        await alert('Could not save label volume data: \n' + err.message);
        return;
      }
    }
  }

  // post new revision data
  await api(`cases/${caseId}/revision`, {
    method: 'post',
    revision,
    handleErrors: true
  });
};
