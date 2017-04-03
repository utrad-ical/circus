import React from 'react';
import * as rs from 'circus-rs';

/**
 * Wraps CIRCUS RS Dicom Viewer.
 */
export class ImageViewer extends React.Component {
	constructor(props) {
		super(props);
		this.viewer = null;
	}

	componentWillUpdate(nextProps) {
		if (this.props.seriesUID !== nextProps.seriesUID) {
			this.updateComposition(nextProps.seriesUID);
		}
		if (this.props.composition !== nextProps.composition) {
			this.viewer.setComposition(nextProps.composition);
		}
		this.viewer.setActiveTool(nextProps.tool);
	}

	componentDidMount() {
		const setOrientation = () => {
			const state = viewer.getState();
			const src = this.props.composition.imageSource;
			const mmDim = src.mmDim();
			state.section = rs.createOrthogonalMprSection(
				viewer.getResolution(),
				mmDim,
				orientation
			);
			viewer.setState(state);
			viewer.removeListener('draw', setOrientation);
		};

		const container = this.refs.container;
		const viewer = new rs.Viewer(container);

		const orientation = this.props.orientation || 'axial';

		viewer.on('imageReady', setOrientation);

		if (this.props.composition) {
			viewer.setComposition(this.props.composition);
		}
		const initialTool = this.props.initialTool ? this.props.initialTool : 'pager';
		viewer.setActiveTool(initialTool);

		this.viewer = viewer;
	}

	render() {
		return <div ref="container"></div>;
	}
}
