import { RsHttpLoaderImageSource } from '../../browser/image-source/rs-http-loader-image-source';
import { ViewState, ViewWindow } from '../view-state';
import { convertSectionToIndex } from '../section-util';
import { Vector2D, Section } from '../../common/geometry';

/**
 * DynamicImageSource fetches the MPR image from RS server.
 */
export class DynamicImageSource extends RsHttpLoaderImageSource {

	private requestScan(
		series: string,
		section: Section,
		useInterpolation: boolean,
		window: ViewWindow,
		size: Vector2D
	): Promise<Uint8Array> {
		return this.loader.request(
			'scan',
			{
				series: series,
				origin: section.origin.join(','),
				xAxis: section.xAxis.join(','),
				yAxis: section.yAxis.join(','),
				interpolation: useInterpolation ? '1' : '0',
				size: size.join(','),
				ww: window.width,
				wl: window.level
			},
			'arraybuffer'
		).then(res => new Uint8Array(res));
	}

	protected scan(viewState: ViewState, outSize: Vector2D): Promise<Uint8Array> {
		// convert from mm-coordinate to index-coordinate
		const indexSection: Section = convertSectionToIndex(viewState.section, this.voxelSize());
		return this.requestScan(
			this.series,
			indexSection,
			viewState.interpolationMode === 'trilinear',
			viewState.window,
			outSize
		);
	}
}
