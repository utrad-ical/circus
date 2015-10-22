/**
 * MPR Image generator Action class
 */

import DicomVolume from '../DicomVolume';
import VolumeBasedController from './VolumeBasedController';
import { ValidatorRules } from '../Validator';

import http = require('http');

import logger from '../Logger';

export default class MPRAction extends VolumeBasedController {

	protected getRules(): ValidatorRules
	{
		return {
			series: ['Series UID', null, 'isLength:1:200', null],
			target: ['Slice index', 1, 'isFloat', 'toFloat'],
			ww: ['Window width', null, 'isFloat', 'toFloat'],
			wl: ['Window width', null, 'isFloat', 'toFloat'],
			mode: ['Axis', 'axial', /^axial|coronal|sagittal$/, (s) => s.toLowerCase()]
		};
	}

	protected processVolume(query: any, vol: DicomVolume, res: http.ServerResponse): void
	{
		var {ww, wl, target, mode} = query;

		if (ww === null) ww = vol.ww;
		if (wl === null) wl = vol.wl;

		var { buffer, outWidth, outHeight } = vol.orthogonalMpr(mode, target, ww, wl);
		this.respondImage(res, buffer, outWidth, outHeight);
	}

}
