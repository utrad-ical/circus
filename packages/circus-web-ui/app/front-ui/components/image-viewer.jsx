import React from 'react';
import { store } from 'store';
import * as rs from 'circus-rs';

/**
 * Wraps CIRCUS RS Dicom Viewer.
 */
export class ImageViewer extends React.Component {
	constructor(props) {
		super(props);
		const server = store.getState().loginUser.data.dicomImageServer;
		this.client = new rs.RsHttpClient(server);
		this.viewer = null;
	}

	updateLabels() {
		const { activeLabel } = this.props;
		const comp = this.viewer.getComposition();
		comp.removeAllAnnotations();
		const labels = this.props.labels;
		labels.forEach(label => {
			const cloud = new rs.VoxelCloud();
			cloud.origin = label.origin;
			cloud.volume = label.volume;
			cloud.active = label === activeLabel;
			cloud.color = label.color;
			cloud.alpha = 1;
			comp.addAnnotation(cloud);
		});
	}

	componentWillReceiveProps(newProps) {
		if (this.seriesUID !== newProps.seriesUID) {
			this.updateComposition(newProps.seriesUID);
		}
		if (this.labels !== newProps.labels) {
			this.updateLabels();
		}
	}

	componentDidMount() {

		function setOrientation() {
			const state = viewer.getState();
			const mmDim = src.mmDim();
			state.section = rs.createOrthogonalMprSection(
				viewer.getResolution(),
				mmDim,
				orientation
			);
			viewer.setState(state);
			viewer.removeListener('draw', setOrientation);
		}

		const container = this.refs.container;
		const viewer = new rs.Viewer(container);
		const src = new rs.HybridImageSource({
			client: this.client,
			series: this.props.seriesUID
		});

		const orientation = this.props.orientation || 'axial';
		const composition = new rs.Composition(src);

		viewer.on('imageReady', setOrientation);

		viewer.setComposition(composition);
		const initialTool = this.props.initialTool ? this.props.initialTool : 'pager';
		viewer.setActiveTool(initialTool);

		this.viewer = viewer;
	}

	render() {
		return <div ref="container"></div>;
	}
}
