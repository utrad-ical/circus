import React from 'react';
import { api } from '../../utils/api';
import { ImageViewer } from '../../components/image-viewer';
import { PropertyEditor } from '../../components/property-editor';
import { Loading } from '../../components/loading';
import { LabelSelector } from './labels';

export class CaseDetail extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			projectData: null,
			caseData: null,
			editingRevision: null
		};
		this.revisionDataChange = this.revisionDataChange.bind(this);
	}

	async loadCase() {
		const caseID = this.props.params.cid;
		const caseData = await api('case/' + caseID);
		this.setState({ caseData });
		this.setState({ editingRevision: caseData.latestRevision });
	}

	async loadProject() {
		const projectID = this.state.caseData.projectID;
		const projectData = await api('project/' + projectID);
		this.setState({ projectData });
	}

	revisionDataChange(rev) {
		this.setState({ editingRevision: rev });
	}

	async componentDidMount() {
		await this.loadCase();
		await this.loadProject();
	}

	render() {
		if (!this.state.caseData || !this.state.projectData || !this.state.editingRevision) {
			return <Loading />;
		}

		const cid = this.props.params.cid;

		return <div>
			<div className="case-info">Case ID: {cid}</div>
			<RevisionData
				revision={this.state.editingRevision}
				projectData={this.state.projectData}
				onChange={this.revisionDataChange}
			/>
		</div>;
	}
}

export class RevisionData extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			activeSeriesIndex: 0,
			activeSeries: props.revision.series[0],
			activeLabelIndex: null
		};
	}

	componentWillReceiveProps(newProps) {
		if (this.props.revision.series[this.state.activeSeriesIndex] !== newProps.revision.series[this.state.activeSeriesIndex]) {
			this.changeActiveSeries(newProps.revision, 0);
		}
	}

	async changeActiveSeries(revision, index) {
		this.setState({
			activeSeriesIndex: index,
			activeSeries: revision.series[index]
		});
	}

	changeActiveLabel(label) {
		this.setState({ activeLabel: label });
	}

	labelAttributesChange(newValue) {
		const newLabel = {
			...this.activeLabel,
			attributes: newValue
		};
	}

	caseAttributesChange(newValue) {
		const newRevision = {
			...this.props.revision,
			caseAttributes: newValue
		};
		this.props.onChange(newRevision);
	}

	render () {
		const { projectData } = this.props;
		if (!this.state.activeSeries) return null;
		const seriesUID = this.state.activeSeries.seriesUID;
		return <div>
			<div className="case-revision-header">
				<LabelSelector
					revision={this.props.revision}
					activeSeries={this.state.activeSeries}
					activeLabel={this.state.activeLabel}
				/>
				<PropertyEditor properties={projectData.labelAttributesSchema} value={{}} />
				<PropertyEditor properties={projectData.caseAttributesSchema} value={{}} />
			</div>
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