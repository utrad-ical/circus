import React from 'react';
import * as rs from 'circus-rs';

export class ImageViewer extends React.Component {
	render() {
		console.log(rs);
		return <div style={{backgroundColor: 'black', width: 512, height: 512}}>
		</div>;
	}
}
