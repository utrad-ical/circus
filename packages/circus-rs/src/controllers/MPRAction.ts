/**
 * MPR Image generator Action class
 */

import RawData from '../RawData';
import VolumeBasedController from './VolumeBasedController';
import MPR from '../MPR';
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

	protected processVolume(query: any, raw: RawData, res: http.ServerResponse): void
	{
		var {ww, wl, target, mode} = query;
		var buffer;
		var out_width;
		var out_height;

		if (ww === null) ww = raw.ww;
		if (wl === null) wl = raw.wl;

		if (mode === 'axial') {
			out_width = raw.x;
			out_height = raw.y;
			buffer = MPR.makeAxial(raw, target, ww, wl);
		} else if (mode === 'coronal') {
			out_width = raw.x;
			out_height = raw.z;
			buffer = MPR.makeCoronal(raw, target, ww, wl);
		} else if (mode === 'sagittal') {
			out_width = raw.y;
			out_height = raw.z;
			buffer = MPR.makeSagittal(raw, target, ww, wl);
		} else {
			this.respondBadRequest(res, 'Invalid orientation.');
			return;
		}
		this.imageEncoder.write(res, buffer, out_width, out_height);
	}

}
