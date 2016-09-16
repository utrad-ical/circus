import { Annotation } from './annotation';
import { Viewer } from '../viewer/viewer';
import { ViewState } from '../view-state';
import { Sprite } from '../viewer/sprite';
import { intersectionOfTwoSections, convertVolumeCoordinateToScreenCoordinate } from '../geometry';
import { Vector3D } from '../../common/RawData';
import { vec3 } from 'gl-matrix';

export class ReferenceLine implements Annotation {
	draw(viewer: Viewer, viewState: ViewState): Sprite {
		const comp = viewer.getComposition();
		const siblingViewers = comp.viewers.filter(v => v !== viewer);
		
		const canvas = viewer.canvas;
		const ctx = canvas.getContext('2d');
		const res = viewer.getResolution();
		
		try {
			ctx.save();
			ctx.strokeStyle = 'magenta';
			ctx.lineWidth = 1;
	
			siblingViewers.forEach(sib => {
				const sibState = sib.getState();
				const refLine = intersectionOfTwoSections(
					viewState.section, sibState.section
				);
				const from = convertVolumeCoordinateToScreenCoordinate(
					viewState.section,
					res,
					refLine.origin
				);
				const to = convertVolumeCoordinateToScreenCoordinate(
					viewState.section,
					res,
					vec3.add(vec3.create(), refLine.origin, refLine.vector) as Vector3D
				);
				ctx.moveTo(from[0], from[1]);
				ctx.lineTo(to[0], to[1]);
			});
		} finally {
			ctx.restore();
		}
		return null;
	}
}
