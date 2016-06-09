import React from 'react';

export class SeriesDetail extends React.Component {
	render() {
		const uid = this.props.params.uid;
		return <div>
			<h1>Series Detail</h1>
			<p>Series: {uid}</p>
		</div>;
	}
}
