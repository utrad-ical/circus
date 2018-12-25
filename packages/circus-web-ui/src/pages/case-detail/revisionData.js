import React from 'react';
import { api } from 'utils/api';
import * as rs from 'circus-rs';
import { sha1 } from 'utils/util.js';
import wrapDisplayName from 'rb/utils/wrapDisplayName';

/**
 * Like Array#map(), but works with an async function.
 */
const asyncMap = async (array, callback) => {
  return Promise.all(array.map(async item => await callback(item)));
};

/**
 * Storage for voxel data. Each voxel data will be idenfied by a sequential ID.
 */
export const createVoxelCache = () => {
  const cache = new Map();
  let nextId = 0;
  const register = voxelData => {
    const id = nextId++;
    cache.set(id, voxelData);
    return id;
  };
  const get = id => cache.get(id);
  return { register, get };
};

/**
 * Asynchronously loads voxel data from API
 * and assigns it to the given label cache.
 */
export const loadVoxelLabelIntoCache = async (revision, cache) => {
  return {
    ...revision,
    series: await asyncMap(async series => {
      return {
        ...series,
        labels: await asyncMap(async label => {
          if (label.type !== 'voxel' || label.labelCacheId) return label;
          const voxelData = await api(`blob/${label.data.voxels}`, {
            responseType: 'arraybuffer'
          });
          const labelCacheId = cache.register(voxelData);
          return { ...label, labelCacheId };
        })
      };
    })
  };
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

/**
 * An HoC that asynchronously provides voxel data.
 * @param labelCache The cache instance created via `createVoxelCache`.
 */
export const provideVoxelData = labelCache => {
  return Base => {
    const Enhanced = class extends React.PureComponent {
      constructor(props) {
        super(props);
        this.state = { loading: true };
      }
      componentDidMount() {
        this.load();
      }
      componentDidUpdate(prevProps) {
        if (this.props.revision !== prevProps.revision) {
          this.load();
        }
      }
      load = async () => {
        const originalRevision = this.props.revision;
        if (!originalRevision) {
          this.setState({ revision: null, loading: false });
          return;
        }
        this.setState({ loading: true });
        const revision = await loadVoxelLabelIntoCache(
          originalRevision,
          labelCache
        );
        this.setState({ revision, loading: false });
      };
      render() {
        const { revision } = this.state; // revision with voxel label data
        const { revision: _, ...originalProps } = this.props;
        <Base
          {...originalProps}
          revisionLoading={this.state.loading}
          revision={revision}
        />;
      }
    };
    Enhanced.displayName = wrapDisplayName('provideVoxelData', Base);
    return Enhanced;
  };
};
