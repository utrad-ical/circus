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
		const container = this.refs.container;
		const viewer = new rs.Viewer(container);
		const src = new rs.HybridImageSource({
			client: this.state.client,
			series: this.props.seriesUID
		});
		const composition = new rs.Composition(src);
		viewer.setComposition(composition);
		const initialTool = this.props.initialTool ? this.props.initialTool : 'pager';
		viewer.setActiveTool(initialTool);
	}

	render() {
		return <div ref="container"></div>;
	}
}
