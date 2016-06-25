import React from 'react';
import { store } from 'store';
import * as rs from 'circus-rs';

/**
 * Wraps CIRCUS RS Dicom Viewer.
 */
export class ImageViewer extends React.Component {
	componentDidMount() {
		const viewer = this.refs.viewer;
		const comp = new rs.Composition();
		const server = store.getState().loginUser.data.dicomImageServer;
		const src = new rs.DynamicImageSource({
			server,
			series: this.props.seriesUID
		});
		console.log('SRC', src);
		src.ready().then(() => comp.renderAll());
		comp.setImageSource(src);
		comp.createViewer(viewer, { stateName: 'axial' });
		comp.setTool('Hand');
	}

	render() {
		return <div ref="viewer"></div>;
	}
}
