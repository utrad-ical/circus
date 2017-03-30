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
		const client = new rs.RsHttpClient(server);
		this.state = {
			client // RsHttpClient
		};
	}

	componentWillReceiveProps(newProps) {
		if (this.seriesUID !== newProps.seriesUID) {
			this.updateComposition(newProps.seriesUID);
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
			console.log(orientation);
			console.log(state);
			viewer.setState(state);
			viewer.removeListener('draw', setOrientation);
		}

		const container = this.refs.container;
		const viewer = new rs.Viewer(container);
		const src = new rs.HybridImageSource({
			client: this.state.client,
			series: this.props.seriesUID
		});

		const orientation = this.props.orientation || 'axial';
		const composition = new rs.Composition(src);

		viewer.on('draw', setOrientation);

		viewer.setComposition(composition);
		const initialTool = this.props.initialTool ? this.props.initialTool : 'pager';
		viewer.setActiveTool(initialTool);
	}

	render() {
		return <div ref="container"></div>;
	}
}
