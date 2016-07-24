'use strict';

import { DicomMetadata } from '../../browser/interface/dicom-metadata';
import { ImageSource } from './image-source';
import { DynamicImageSource } from './dynamic-image-source';
import { RawVolumeImageSource } from './raw-volume-image-source';
import { ViewState } from '../view-state';
import { Viewer } from '../viewer/viewer';

export class HybridImageSource extends ImageSource {

	private dynSource: DynamicImageSource = null;
	private volSource: RawVolumeImageSource = null;
	private volumeReady: boolean = false;

	constructor(params) {
		super();
		this.volSource = new RawVolumeImageSource(params);
		this.volSource.ready().then(() => {
			this.volumeReady = true;
		});
		this.dynSource = new DynamicImageSource(params);
	}

	public draw(canvasDomElement, viewState) {
		const source = this.volumeReady ? this.volSource : this.dynSource;
		return source.draw(canvasDomElement, viewState);
	}

	public ready() {
		return this.dynSource.ready();
	}

	public initialState(viewer: Viewer): ViewState {
		return this.dynSource.initialState(viewer);
	}

}
