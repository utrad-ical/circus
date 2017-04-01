import React from 'react';
import { api } from '../../utils/api';
import { ImageViewer } from '../../components/image-viewer';
import { PropertyEditor } from '../../components/property-editor';
import { Loading } from '../../components/loading';
import { Button, Glyphicon } from '../../components/react-bootstrap';
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
		this.setState({ editingRevision: { ... caseData.latestRevision } });
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

export class RevisionData extends React.PureComponent {

	constructor(props) {
		super(props);
		this.state = {
			activeSeriesIndex: 0,
			activeSeries: props.revision.series[0],
			activeLabelIndex: null,
			tool: 'pager'
		};
		this.changeTool = this.changeTool.bind(this);
		this.injectedLables = [];
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

	changeTool(tool) {
		this.setState({ tool });
	}

	render () {
		const { projectData, revision, onChange } = this.props;
		const { tool } = this.state;
		if (!this.state.activeSeries) return null;
		const seriesUID = this.state.activeSeries.seriesUID;
		return <div>
			<div className="case-revision-header">
				<LabelSelector
					revision={revision}
					onChange={onChange}
					activeSeries={this.state.activeSeries}
					activeLabel={this.state.activeLabel}
				/>
				<PropertyEditor properties={projectData.labelAttributesSchema} value={{}} />
				<PropertyEditor properties={projectData.caseAttributesSchema} value={{}} />
			</div>
			<ToolBar active={tool} changeTool={this.changeTool} />
			<ViewerCluster seriesUID={seriesUID} labels={this.injectedLabels} tool={tool} />
		</div>;
	}
}

class ToolBar extends React.Component {
	render() {
		const { active, changeTool } = this.props;

		return <div className="case-detail-toolbar">
			<ToolButton name="pager" changeTool={changeTool} active={active} />
			<ToolButton name="zoom" changeTool={changeTool} active={active} />
			<ToolButton name="hand" changeTool={changeTool} active={active} />
			<ToolButton name="window" changeTool={changeTool} active={active} />
			<ToolButton name="brush" changeTool={changeTool} active={active} />
			<ToolButton name="eraser" changeTool={changeTool} active={active} />
		</div>;
	}
}

class ToolButton extends React.Component {
	render() {
		const { icon, name, active, changeTool } = this.props;
		const style = active === name ? 'primary' : 'default';
		return <Button bsStyle={style} bsSize="sm" onClick={() => changeTool(name)}>
			{name}
		</Button>;
	}
}

export class ViewerCluster extends React.PureComponent {
	render() {
		const { seriesUID, labels, tool } = this.props;

		return <div className="viewer-cluster">
			<div className="viewer-row">
				<div className="viewer viewer-axial">
					<ImageViewer
						seriesUID={seriesUID}
						orientation="axial"
						labels={labels}
						tool={tool}
					/>
				</div>
				<div className="viewer viewer-sagittal">
					<ImageViewer
						seriesUID={seriesUID}
						orientation="sagittal"
						labels={labels}
						tool={tool}
					/>
				</div>
			</div>
			<div className="viewer-row">
				<div className="viewer viewer-coronal">
					<ImageViewer
						seriesUID={seriesUID}
						orientation="coronal"
						labels={labels}
						tool={tool}
					/>
				</div>
				<div className="viewer viewer-mpr">
					<ImageViewer
						seriesUID={seriesUID}
						orientation="axial"
						initialTool="celestialRotate"
						labels={labels}
						tool={tool}
					/>
				</div>
			</div>
		</div>;
	}
}