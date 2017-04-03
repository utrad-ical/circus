import React from 'react';
import { api } from '../../utils/api';
import { ImageViewer } from '../../components/image-viewer';
import { PropertyEditor } from '../../components/property-editor';
import { Loading } from '../../components/loading';
import { Button, Glyphicon } from '../../components/react-bootstrap';
import { LabelSelector } from './labels';
import { store } from 'store';
import * as rs from 'circus-rs';

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

	revisionDataChange(revision) {
		this.setState({ editingRevision: revision });
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
			activeLabelIndex: null,
			tool: 'pager',
			composition: null
		};
		this.changeTool = this.changeTool.bind(this);
		this.changeActiveLabel = this.changeActiveLabel.bind(this);
		this.updateLabels = this.updateLabels.bind(this);
		const server = store.getState().loginUser.data.dicomImageServer;
		this.client = new rs.RsHttpClient(server);
	}

	componentWillUpdate(newProps, newState) {
		if (this.props.revision.series[this.state.activeSeriesIndex].seriesUID !== newProps.revision.series[this.state.activeSeriesIndex].seriesUID) {
			this.changeActiveSeries(this.state.activeSeriesIndex);
		}
	}

	componentDidUpdate() {
		this.updateLabels();
	}

	componentWillMount() {
		const { revision } = this.props;
		this.changeActiveSeries(0);
		const activeSeries = revision.series[this.state.activeSeriesIndex];
		if (activeSeries.labels instanceof Array && activeSeries.labels.length > 0) {
			this.setState({ activeLabelIndex: 0 });
		}
	}

	updateLabels() {
		const { revision } = this.props;
		const { composition } = this.state;
		const activeSeries = revision.series[this.state.activeSeriesIndex];
		const labels = activeSeries.labels;
		const activeLabel = labels[this.state.activeLabelIndex];
		composition.removeAllAnnotations();
		labels.forEach(label => {
			const cloud = new rs.VoxelCloud();
			cloud.origin = label.origin;
			const volume = new rs.AnisotropicRawData([64, 64, 64], rs.PixelFormat.Binary);
			volume.setVoxelSize(composition.imageSource.meta.voxelSize);
			volume.fillAll(1);
			cloud.volume = volume; // label.volume;
			cloud.active = activeLabel && (label === activeLabel);
			cloud.color = label.color;
			cloud.alpha = label.alpha;
			composition.addAnnotation(cloud);
		});
		composition.annotationUpdated();
	}

	changeActiveSeries(seriesIndex) {
		const activeSeries = this.props.revision.series[this.state.activeSeriesIndex];

		if (!activeSeries) {
			this.setState({
				activeSeriesIndex: seriesIndex,
				composition: null
			});
			return;
		}

		const src = new rs.HybridImageSource({
			client: this.client,
			series: activeSeries.seriesUID
		});
		const composition = new rs.Composition(src);
		composition.on('imageReady', this.updateLabels);

		this.setState({
			activeSeriesIndex: seriesIndex,
			composition
		});
	}

	changeActiveLabel(seriesIndex, labelIndex) {
		if (this.state.activeSeriesIndex !== seriesIndex) {
			this.changeActiveSeries(seriesIndex);
		}
		this.setState({
			activeLabelIndex: labelIndex
		});
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
		const { tool, activeSeriesIndex, activeLabelIndex, composition } = this.state;
		const activeSeries = revision.series[activeSeriesIndex];
		if (!activeSeries) return <span>Pinya?</span>;
		const activeLabel = activeSeries.labels[activeLabelIndex];
		return <div>
			<div className="case-revision-header">
				<LabelSelector
					revision={revision}
					onChange={onChange}
					activeSeries={activeSeries}
					activeLabel={activeLabel}
					onChangeActiveLabel={this.changeActiveLabel}
				/>
				<PropertyEditor properties={projectData.labelAttributesSchema} value={{}} />
				<PropertyEditor properties={projectData.caseAttributesSchema} value={{}} />
			</div>
			<ToolBar active={tool} changeTool={this.changeTool} />
			<ViewerCluster
				composition={composition}
				labels={activeSeries.labels}
				activeLabel={activeLabel}
				tool={tool}
			/>
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
			<ToolButton name="bucket" changeTool={changeTool} active={active} />
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
		const { composition, tool } = this.props;

		function makeViewer(orientation, initialTool) {
			return <ImageViewer
				orientation={orientation}
				composition={composition}
				tool={tool}
				initialTool={initialTool}
			/>;
		}

		return <div className="viewer-cluster">
			<div className="viewer-row">
				<div className="viewer viewer-axial">
					{makeViewer('axial')}
				</div>
				<div className="viewer viewer-sagittal">
					{makeViewer('sagittal')}
				</div>
			</div>
			<div className="viewer-row">
				<div className="viewer viewer-coronal">
					{makeViewer('coronal')}
				</div>
				<div className="viewer viewer-mpr">
					{makeViewer('axial', 'celestialRotate')}
				</div>
			</div>
		</div>;
	}
}