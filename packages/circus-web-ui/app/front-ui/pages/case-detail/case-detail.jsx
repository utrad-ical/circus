import React from 'react';
import { api } from '../../utils/api';
import { ImageViewer } from '../../components/image-viewer';
import { LabelSelector } from './labels';

export class CaseDetail extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			caseData: null,
			activeRevision: null
		};
	}

	async componentDidMount() {
		const caseID = this.props.params.cid;
		const caseData = await api('case/' + caseID);
		this.setState({ caseData });
		this.setState({ activeRevision: caseData.latestRevision });
	}

	render() {
		const cid = this.props.params.cid;
		if (!this.state.activeRevision) {
			return null;
		}
		return <div>
			<div>Case ID: {cid}</div>
			<RevisionData revision={this.state.caseData.latestRevision} />
		</div>;
	}
}

export class RevisionData extends React.Component {

	constructor(props) {
		super(props);
		this.state = { activeSeries: null };
	}

	componentDidMount() {
		this.changeActiveSeries(this.props.revision, 0);
	}

	componentWillReceiveProps(props) {
		if (this.props.revision !== props.revision) {
			this.changeActiveSeries(props.revision, 0);
		}
	}

	async changeActiveSeries(revision, index) {
		this.setState({ activeSeries: revision.series[index] });
	}

	render () {
		if (!this.state.activeSeries) return null;
		const seriesUID = this.state.activeSeries.seriesUID;
		return <div>
			<LabelSelector
				revision={this.props.revision}
				activeSeries={this.state.activeSeries}
			/>
			<ViewerCluster seriesUID={seriesUID} />
		</div>;
	}
}

export class ViewerCluster extends React.Component {
	render() {
		const seriesUID = this.props.seriesUID;
		return <div className="viewer-cluster">
			<div className="viewer-row">
				<div className="viewer viewer-axial">
					<ImageViewer
						seriesUID={seriesUID}
						orientation="axial"
					/>
				</div>
				<div className="viewer viewer-sagittal">
					<ImageViewer
						seriesUID={seriesUID}
						orientation="sagittal"
					/>
				</div>
			</div>
			<div className="viewer-row">
				<div className="viewer viewer-coronal">
					<ImageViewer
						seriesUID={seriesUID}
						orientation="coronal"
					/>
				</div>
				<div className="viewer viewer-mpr">
					<ImageViewer
						seriesUID={seriesUID}
						orientation="axial"
						initialTool="celestialRotate"
					/>
				</div>
			</div>
		</div>;
	}
}