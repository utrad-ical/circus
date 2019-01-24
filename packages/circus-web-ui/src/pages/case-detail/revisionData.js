import * as rs from 'circus-rs';
import { sha1 } from 'utils/util.js';
import update from 'immutability-helper';

/**
 * Like Array#map(), but works with an async function.
 */
const asyncMap = async (array, callback) => {
  return Promise.all(array.map(async item => await callback(item)));
};

export const createEmptyVoxelLabel = () => {
  return {
    origin: [0, 0, 0],
    size: [16, 16, 16],
    volumeArrayBuffer: new ArrayBuffer(16 * 16 * 16 / 8)
  };
};

/**
 * Adds actual `volumeArrayBuffer` data to label.data.
 * If label is unpainted, make an empty buffer.
 */
const augumentLabelData = async (label, api) => {
  if (label.type !== 'voxel') return label;
  if (label.data.voxels) {
    const volumeArrayBuffer = await api(`blob/${label.data.voxels}`, {
      responseType: 'arraybuffer'
    });
    return update(label, { data: { $merge: { volumeArrayBuffer } } });
  } else {
    // Empty label
    return update(label, { data: { $merge: createEmptyVoxelLabel() } });
  }
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
  const isNotEmpty = cloud.shrinkToMinimum();
  return isNotEmpty ? { origin: cloud.origin, rawData: cloud.volume } : null;
};

const prepareLabelSaveData = async (label, api) => {
  if (label.type !== 'voxel') return label;
  const shrinkResult = voxelShrinkToMinimum(label.data);
  const newLabel = {
    type: 'voxel',
    data: {
      color: label.data.color,
      alpha: label.data.alpha,
      voxels: null
    }
  };
  if (shrinkResult !== null) {
    // There are painted voxels
    const { origin, rawData } = shrinkResult;
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
