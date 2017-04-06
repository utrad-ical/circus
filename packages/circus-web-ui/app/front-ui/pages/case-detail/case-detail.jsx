import React from 'react';
import { api } from '../../utils/api';
import { ImageViewer } from '../../components/image-viewer';
import { PropertyEditor } from '../../components/property-editor';
import { Loading } from '../../components/loading';
import { Button, Glyphicon } from '../../components/react-bootstrap';
import { LabelSelector } from './labels';
import { store } from 'store';
import * as rs from 'circus-rs';
import { showMessage } from '../../actions/message-box';
import { alert, prompt } from '../../components/modal';
import * as crypto from 'crypto';

function sha1(arrayBuf) {
	const sha = crypto.createHash('sha1');
	sha.update(Buffer.from(arrayBuf));
	return sha.digest('hex');
}

export class CaseDetail extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			busy: false,
			projectData: null,
			caseData: null,
			editingData: null
		};
		this.revisionDataChange = this.revisionDataChange.bind(this);
		this.saveRevision = this.saveRevision.bind(this);
		this.revertRevision = this.revertRevision.bind(this);
	}

	createEditData(revision) {
		return {
			...revision
		};
	}

	async loadCase() {
		this.setState({ busy: true });
		const caseID = this.props.params.cid;
		const caseData = await api('case/' + caseID);
		this.setState({ caseData });

		const data = this.createEditData(caseData.latestRevision);

		// Load all label volume data in the latest revision
		for (let series of data.series) {
			for (let label of series.labels) {
				if (label.type !== 'voxel') continue;
				const cloud = new rs.VoxelCloud();
				cloud.volume = new rs.RawData([8, 8, 8], rs.PixelFormat.Binary);
				cloud.origin = [0, 0, 0];
				if (label.data.voxels !== null) {
					try {
						const buffer = await api(
							'blob/' + label.data.voxels,
							{ handleErrors: true, responseType: 'arraybuffer' }
						);
						const volume = new rs.RawData(label.data.size, rs.PixelFormat.Binary);
						volume.assign(buffer);
						cloud.volume = volume;
						cloud.origin = label.data.origin;
					} catch (err) {
						await alert('Could not load label volume data: \n' + err.message);
						label.data.cloud = null;
					}
				}
				cloud.color = label.data.color || '#ff0000';
				cloud.alpha = parseFloat(label.data.alpha);
				cloud.debugPoint = true;
				label.cloud = cloud;
				// console.log('Cloud loaded', cloud);
			}
		}

		this.setState({ editingData: data, busy: false });
	}

	async saveRevision() {
		const data = this.state.editingData;

		// save all label volume data
		for (let series of data.series) {
			for (let label of series.labels) {
				try {
					label.cloud.shrinkToMinimum();
					const bb = rs.scanBoundingBox(label.cloud.volume);
					const newLabelData = {
						voxels: null,
						color: label.cloud.color,
						alpha: label.cloud.alpha
					};
					if (bb !== null) {
						// save painted voxels
						const voxels = label.cloud.volume.data;
						const hash = sha1(voxels);
						if (hash === label.data.voxels) {
							// console.log('Skipping unchanged voxel data.');
						} else {
							// needs to save the new voxel data.
							await api(
								'blob/' + hash,
								{
									method: 'put',
									handleErrors: true,
									data: voxels,
									headers: { 'Content-Type': 'application/json' }
								}
							);
						}
						newLabelData.voxels = hash;
						newLabelData.origin = label.cloud.origin;
						newLabelData.size = label.cloud.volume.getDimension();
					}
					label.data = newLabelData;
					delete label.cloud;
				} catch (err) {
					await alert('Could not save label volume data: \n' + err.message);
					return;
				}
			}
		}

		// prepare revision data
		data.status = 'approved';
		const caseID = this.state.caseData.caseID;
		try {
			const result = await api(
				`case/${caseID}/revision`,
				{ method: 'post', data, handleErrors: true }
			);
			await alert('Successfully registered a revision.');
		} catch (err) {
			await alert('Error: ' + err.message);
		}
		this.loadCase();
	}

	async revertRevision() {

	}

	async loadProject() {
		const projectID = this.state.caseData.projectID;
		const projectData = await api('project/' + projectID);
		this.setState({ projectData });
	}

	revisionDataChange(revision) {
		this.setState({ editingData: revision });
	}

	async componentDidMount() {
		await this.loadCase();
		await this.loadProject();
	}

	render() {
		if (!this.state.caseData || !this.state.projectData || !this.state.editingData) {
			return <Loading />;
		}

		const cid = this.props.params.cid;

		return <div>
			<div className="case-info">Case ID: {cid}</div>
			<MenuBar onSaveClick={this.saveRevision} onRevertClick={this.revertRevision} />
			<RevisionData
				revision={this.state.editingData}
				projectData={this.state.projectData}
				onChange={this.revisionDataChange}
			/>
		</div>;
	}
}

class MenuBar extends React.Component {
	render() {
		const { onRevertClick, onSaveClick } = this.props;
		return <div className="case-detail-menu">
			<Button bsStyle="warning" onClick={onRevertClick} >
				<Glyphicon glyph="remove-circle" />
				Revert
			</Button>
			<Button bsStyle="success" onClick={onSaveClick} >
				<Glyphicon glyph="save" />
				Save
			</Button>
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
			showReferenceLine: false,
			composition: null
		};
		this.changeTool = this.changeTool.bind(this);
		this.toggleReferenceLine = this.toggleReferenceLine.bind(this);
		this.changeActiveLabel = this.changeActiveLabel.bind(this);
		this.updateLabels = this.updateLabels.bind(this);
		const server = store.getState().loginUser.data.dicomImageServer;
		this.client = new rs.RsHttpClient(server);
		this.referenceLineAnnotation = new rs.ReferenceLine();
		this.referenceLineAnnotation.color = '#ff0000';
	}

	componentWillUpdate(newProps, newState) {
		if (this.props.revision.series[this.state.activeSeriesIndex].seriesUID !== newProps.revision.series[this.state.activeSeriesIndex].seriesUID) {
			this.changeActiveSeries(this.state.activeSeriesIndex);
		}
	}

	componentDidMount() {
		this.updateLabels();
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
			if (!label.cloud) return;
			const cloud = label.cloud;
			cloud.active = activeLabel && (label === activeLabel);
			composition.addAnnotation(cloud);
		});
		if (this.state.showReferenceLine) { composition.addAnnotation(this.referenceLineAnnotation); }
		composition.annotationUpdated();
		// console.log('Annotations', composition.annotations);
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

	toggleReferenceLine(show) {
		this.setState({ showReferenceLine: show });
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
			<ToolBar
				active={tool}
				changeTool={this.changeTool}
				showReferenceLine={this.state.showReferenceLine}
				toggleReferenceLine={this.toggleReferenceLine}
			/>
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
		const { active, changeTool, showReferenceLine, toggleReferenceLine } = this.props;

		return <div className="case-detail-toolbar">
			<ToolButton name="pager" changeTool={changeTool} active={active} />
			<ToolButton name="zoom" changeTool={changeTool} active={active} />
			<ToolButton name="hand" changeTool={changeTool} active={active} />
			<ToolButton name="window" changeTool={changeTool} active={active} />
			<ToolButton name="brush" changeTool={changeTool} active={active} />
			<ToolButton name="eraser" changeTool={changeTool} active={active} />
			<ToolButton name="bucket" changeTool={changeTool} active={active} />
			&ensp;
			<label>
				<input
					type="checkbox"
					checked={showReferenceLine}
					onChange={ev => toggleReferenceLine(ev.target.checked)}
				/>
				Reference line
			</label>
		</div>;
	}
}

class ToolButton extends React.Component {
	render() {
		const { name, active, changeTool } = this.props;
		const style = active === name ? 'primary' : 'default';
		return <Button bsStyle={style} onClick={() => changeTool(name)}>
			<span className={'case-detail-tool-icon rs-icon-' + name} />
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