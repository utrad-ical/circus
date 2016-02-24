import DicomVolume from '../../common/DicomVolume';
import VolumeBasedController from './VolumeBasedController';
import { ValidatorRules } from '../../common/Validator';
import * as http from 'http';

/**
 * Handles 'mpr' endpoint which exports MPR image.
 * @deprecated
 */
export default class MPRAction extends VolumeBasedController {

	protected getRules(): ValidatorRules {
		return {
			series: ['Series UID', null, this.isUID, null],
			target: ['Slice index', 1, 'isFloat', 'toFloat'],
			ww: ['Window width', null, 'isFloat', 'toFloat'],
			wl: ['Window width', null, 'isFloat', 'toFloat'],
			mode: ['Axis', 'axial', /^axial|coronal|sagittal$/, (s) => s.toLowerCase()]
		};
	}

	protected processVolume(query: any, vol: DicomVolume, res: http.ServerResponse): void {
		let {ww, wl, target, mode} = query;

		if (ww === null) ww = vol.ww;
		if (wl === null) wl = vol.wl;

		vol.orthogonalMpr(mode, target, ww, wl)
			.then(({ image, outWidth, outHeight }) => {
				this.respondImage(res, new Buffer(image), outWidth, outHeight);
			});
	}

}
