import React from 'react';
import * as rs from 'circus-rs';
import EventEmitter from 'events';

/**
 * Wraps CIRCUS RS Dicom Viewer.
 */
export class ImageViewer extends React.Component {
	constructor(props) {
		super(props);
		this.viewer = null;
		this.changeState = this.changeState.bind(this);
		if (this.props.stateChanger instanceof EventEmitter) {
			this.props.stateChanger.on('change', this.changeState);
		}
	}

	componentWillUpdate(nextProps) {
		if (this.props.stateChanger !== nextProps.stateChanger) {
			if (this.props.stateChanger instanceof EventEmitter) {
				this.props.stateChanger.removeAllListeners('change');
			}
			if (nextProps.stateChanger instanceof EventEmitter) {
				nextProps.stateChanger.on('change', this.changeState);
			}
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

	changeState(changer) {
		const state = this.viewer.getState();
		const newState = changer(state);
		this.viewer.setState(newState);
	}

	render() {
		return <div ref="container"></div>;
	}
}
