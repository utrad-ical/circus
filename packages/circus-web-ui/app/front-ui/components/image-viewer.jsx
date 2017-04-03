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

	updateLabels(props) {
		const { labels, activeLabel } = props;
		const comp = this.viewer.getComposition();
		comp.removeAllAnnotations();
		labels.forEach(label => {
			const cloud = new rs.VoxelCloud();
			cloud.origin = label.origin;
			const volume = new rs.AnisotropicRawData([64, 64, 64], rs.PixelFormat.Binary);
			volume.setVoxelSize(comp.imageSource.meta.voxelSize);
			volume.fillAll(1);
			cloud.volume = volume; // label.volume;
			cloud.active = label === activeLabel;
			cloud.color = label.color;
			cloud.alpha = label.alpha;
			comp.addAnnotation(cloud);
		});
		comp.annotationUpdated();
	}

	componentWillUpdate(nextProps) {
		if (this.props.seriesUID !== nextProps.seriesUID) {
			this.updateComposition(nextProps.seriesUID);
		}
		if (this.props.labels !== nextProps.labels || this.props.activeLabel !== nextProps.activeLabel) {
			this.updateLabels(nextProps);
		}
		this.viewer.setActiveTool(nextProps.tool);
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
		viewer.on('imageReady', () => this.updateLabels(this.props));

		viewer.setComposition(composition);
		const initialTool = this.props.initialTool ? this.props.initialTool : 'pager';
		viewer.setActiveTool(initialTool);

		this.viewer = viewer;
	}

	render() {
		return <div ref="container"></div>;
	}
}
