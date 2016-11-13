import React from 'react';
import {api} from '../../utils/api';
import {ImageViewer} from '../../components/image-viewer';

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
		return <div className="viewer-cluster">
			<div>Case ID: {cid}</div>
			<div className="viewer-row">
				<div className="viewer viewer-axial">
					<ImageViewer
						seriesUID={this.state.activeSeries}
						orientation="axial"
					/>
				</div>
				<div className="viewer viewer-sagittal">
					<ImageViewer
						seriesUID={this.state.activeSeries}
						orientation="sagittal"
					/>
				</div>
			</div>
			<div className="viewer-row">
				<div className="viewer viewer-coronal">
					<ImageViewer
						seriesUID={this.state.activeSeries}
						orientation="coronal"
					/>
				</div>
				<div className="viewer viewer-mpr">
					<ImageViewer
						seriesUID={this.state.activeSeries}
						orientation="axial"
						initialTool="celestialRotate"
					/>
				</div>
			</div>
		</div>;
	}
}

