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
const augumentLabelData = async (label, api) => {
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
export const loadVolumeLabelData = async (revision, api) => {
  return update(revision, {
    series: {
      $set: await asyncMap(revision.series, async series => {
        return update(series, {
          labels: {
            $set: await asyncMap(series.labels, label =>
              augumentLabelData(label, api)
            )
          }
        });
      })
    }
  });
};

const voxelShrinkToMinimum = labelData => {
  const volume = new rs.RawData(labelData.size, rs.PixelFormat.Binary);
  volume.assign(labelData.volumeArrayBuffer);
  const cloud = new rs.VoxelCloud(); // temporary
  cloud.origin = labelData.origin;
  cloud.volume = volume;
  cloud.shrinkToMinimum();
  return { origin: cloud.origin, rawData: cloud.volume };
};

const prepareLabelSaveData = async (label, api) => {
  if (label.type !== 'voxel') return label;
  const { origin, rawData } = voxelShrinkToMinimum(label.data);
  const bb = rs.scanBoundingBox(rawData);
  const newLabel = {
    type: 'voxel',
    data: {
      color: label.data.color,
      alpha: label.data.alpha,
      voxels: null
    }
  };
  if (bb !== null) {
    // There are painted voxels
    const voxels = sha1(rawData.data);
    if (voxels === label.data.voxels) {
      // Skipping unchanged label data
    } else {
      await api('blob/' + voxels, {
        method: 'put',
        handleErrors: true,
        data: rawData.data,
        headers: { 'Content-Type': 'application/octet-stream' }
      });
    }
    Object.assign(newLabel.data, {
      voxels,
      origin,
      size: rawData.getDimension()
    });
  }
  return newLabel;
};

const prepareSeriesSaveData = async (series, api) => {
  return update(series, {
    labels: {
      $set: await asyncMap(series.labels, async label =>
        prepareLabelSaveData(label, api)
      )
    }
  });
};

/**
 * Saves a new revision data on the API server.
 */
export const saveRevision = async (caseId, revision, description, api) => {
  const saveData = {
    description,
    attributes: revision.attributes,
    status: 'approved',
    series: await asyncMap(revision.series, async series =>
      prepareSeriesSaveData(series, api)
    )
  };

  await api(`cases/${caseId}/revision`, {
    method: 'post',
    data: saveData
  });
};
