import React from 'react';
import { store } from 'store';
import * as rs from 'circus-rs';

/**
 * Wraps CIRCUS RS Dicom Viewer.
 */
export class ImageViewer extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			client: null // RsHttpClient
		}
	}

	componentWillReceiveProps(newProps) {
		if (this.seriesUID !== newProps.seriesUID) {
			this.updateComposition(newProps.seriesUID);
		}
	}

	updateComposition(seriesUID) {
		if (seriesUID) {
			const src = new rs.DynamicImageSource({
				client: this.state.client,
				series: seriesUID
			});
			this.state.composition.setImageSource(src);
			this.state.viewer.setComposition(this.state.composition);
		} else {
			// this.viewer.setComposition(null);
		}
	}

	componentDidMount() {
		const container = this.refs.container;
		const viewer = new rs.Viewer(container);
		const composition = new rs.Composition();
		const server = store.getState().loginUser.data.dicomImageServer;
		const client = new rs.RsHttpClient(server);
		this.setState({
			viewer,
			client,
			composition
		});
		this.updateComposition(this.props.seriesUID);
	}

	render() {
		return <div ref="container"></div>;
	}
}
