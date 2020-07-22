import { Job } from '../types';
import * as rs from 'circus-rs';

const applyDisplayOptions = (
  state: rs.MprViewState,
  job: Job,
  volumeId: number
) => {
  const displayOptions =
    job.results.metadata &&
    Array.isArray(job.results.metadata.displayOptions) &&
    job.results.metadata.displayOptions.find(
      (o: any) => o.volumeId === volumeId
    );
  if (!displayOptions) return state;
  if (displayOptions.window) {
    state = { ...state, window: { ...displayOptions.window } };
  }
  /*if (displayOptions.crop) {
      const crop = displayOptions.crop;
      const voxelSize = composition.imageSource.metadata.voxelSize;
      const os = state.section;
      const section = {
        origin: [
          crop.origin[0] * voxelSize[0],
          crop.origin[1] * voxelSize[1],
          os.origin[2]
        ],
        xAxis: [crop.size[0] * voxelSize[0], os.xAxis[1], os.xAxis[2]],
        yAxis: [os.yAxis[0], crop.size[1] * voxelSize[1], os.yAxis[2]]
      };
      state = { ...state, section };
    }*/
  return state;
};

export default applyDisplayOptions;
