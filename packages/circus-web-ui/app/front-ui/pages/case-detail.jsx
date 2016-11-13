import React from 'react';
import {api} from '../utils/api';
import {ImageViewer} from '../components/image-viewer';

export class CaseDetail extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			caseData: null,
			activeSeries: null
		};
	}

	async componentDidMount() {
		const caseID = this.props.params.cid;
		const caseData = await api('case/' + caseID);
		this.setState({ caseData });
		this.setState({ activeSeries: caseData.latestRevision.series[0].seriesUID });
	}

	render() {
		const cid = this.props.params.cid;
		return <div>
			<h1>
				<span className="circus-icon-case"/>
				Case Detail: {cid}
			</h1>
			<div>
				<ImageViewer seriesUID={this.state.activeSeries}/>
			</div>
		</div>;
	}
}

