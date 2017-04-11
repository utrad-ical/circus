import React from 'react';
import { api } from '../../utils/api';
import { ImageViewer } from '../../components/image-viewer';
import { PropertyEditor } from '../../components/property-editor';
import { Loading } from '../../components/loading';
import { TagList } from '../../components/tag';
import { Button, Glyphicon, DropdownButton, SplitButton, MenuItem } from '../../components/react-bootstrap';
import { LabelSelector } from './labels';
import { store } from 'store';
import * as rs from 'circus-rs';
import { alert, prompt, confirm } from '../../components/modal';
import * as crypto from 'crypto';
import { ShrinkSelect } from '../../components/shrink-select';
import merge from 'merge';
import classNames from 'classnames';
import EventEmitter from 'events';


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
			editingRevisionIndex: -1,
			editingData: null
		};
		this.revisionDataChange = this.revisionDataChange.bind(this);
		this.selectRevision = this.selectRevision.bind(this);
		this.saveRevision = this.saveRevision.bind(this);
		this.revertRevision = this.revertRevision.bind(this);
	}

	async selectRevision(index) {
		const { revisions } = this.state.caseData;
		const revision = revisions[index];
		this.setState({ busy: true, editingRevisionIndex: index });

		const data = merge(true, {}, revision);
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
				cloud.alpha = 'alpha' in label.data ? parseFloat(label.data.alpha) : 1;
				cloud.debugPoint = true;
				label.cloud = cloud;
				// console.log('Cloud loaded', cloud);
			}
		}

		this.setState({ editingData: data, busy: false });
	}

	async loadCase() {
		const caseID = this.props.params.cid;
		const caseData = await api('case/' + caseID);
		this.setState({ caseData }, () => {
			this.selectRevision(caseData.revisions.length - 1);
		});
	}

	async saveRevision() {
		const data = this.state.editingData;

		const desc = await prompt('Revision message', data.description);
		if (desc === null) return;
		data.description = desc;

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
			await api(
				`case/${caseID}/revision`,
				{ method: 'post', data, handleErrors: true }
			);
			await alert('Successfully registered a revision.');
			this.setState({ caseData: null, editingData: null });
			this.loadCase();
		} catch (err) {
			await alert('Error: ' + err.message);
		}
	}

	async revertRevision() {
		if (!(await confirm('Reload the current revision?'))) {
			return;
		}
		this.selectRevision(this.state.editingRevisionIndex);
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

		const { projectData: prj, caseData } = this.state;

		const cid = this.props.params.cid;

		const tags = (caseData.tags || []).map(tag => {
			const color = (prj.tags.find(t => t.name === tag) || {}).color || '#ffffff';
			return { name: tag, color };
		});

		return <div>
			<Card title='Case Info'>
				<ul>
					<li>Case ID: {cid}</li>
					<li>Case Created At: {caseData.createTime}</li>
					<li>Project Name: {prj.projectName}</li>
					<li>Tags: <TagList tags={tags} /></li>
				</ul>
			</Card>
			<MenuBar
				onSaveClick={this.saveRevision}
				onRevertClick={this.revertRevision}
				onRevisionSelect={this.selectRevision}
				revisions={this.state.caseData.revisions}
				currentRevision={this.state.editingRevisionIndex}
			/>
			<RevisionData
				busy={this.state.busy}
				revision={this.state.editingData}
				projectData={this.state.projectData}
				onChange={this.revisionDataChange}
			/>
		</div>;
	}
}

class RevisionSelector extends React.Component {
	constructor(props) {
		super(props);
		this.selected = this.selected.bind(this);
	}

	renderItem(revision, i) {
		return <span className="revision-selector-item">
			<span className="date">{revision.date}</span>
			<span className="status label label-default">{revision.status}</span>
			<span className="description">{revision.description}</span>
			<span className="creator">{revision.creator}</span>
		</span>;
	}

	selected(value) {
		const { onSelect } = this.props;
		const index = parseInt(/(\d+)$/.exec(value)[1]);
		onSelect(index);
	}

	render() {
		const { revisions = [], selected } = this.props;
		const opts = {};
		revisions.slice().reverse().forEach((r, i) => {
			const originalIndex = revisions.length - i - 1;
			opts[`rev${originalIndex}`] = this.renderItem(r, i);
		});
		const sel = `rev${selected}`;
		return <ShrinkSelect options={opts} value={sel} onChange={this.selected} />;
	}
}

class MenuBar extends React.Component {
	render() {
		const { onRevertClick, onSaveClick, revisions, onRevisionSelect, currentRevision } = this.props;
		return <div className="case-detail-menu">
			<div className="left">
				Revision:&ensp;
				<RevisionSelector
					revisions={revisions}
					selected={currentRevision}
					onSelect={onRevisionSelect}
				/>
			</div>
			<div className="right">
				<Button bsStyle="warning" onClick={onRevertClick} >
					<Glyphicon glyph="remove-circle" />
					Revert
				</Button>
				&ensp;
				<Button bsStyle="success" onClick={onSaveClick} >
					<Glyphicon glyph="save" />
					Save
				</Button>
			</div>
		</div>;
	}
}

export class RevisionData extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			activeSeriesIndex: -1,
			activeLabelIndex: -1,
			tool: 'pager',
			showReferenceLine: false,
			composition: null,
			lineWidth: 1
		};
		this.changeTool = this.changeTool.bind(this);
		this.toggleReferenceLine = this.toggleReferenceLine.bind(this);
		this.setLineWidth = this.setLineWidth.bind(this);
		this.changeActiveLabel = this.changeActiveLabel.bind(this);
		this.updateLabels = this.updateLabels.bind(this);
		this.labelAttributesChange = this.labelAttributesChange.bind(this);
		this.caseAttributesChange = this.caseAttributesChange.bind(this);
		this.selectWindowPreset = this.selectWindowPreset.bind(this);

		const server = store.getState().loginUser.data.dicomImageServer;
		this.client = new rs.RsHttpClient(server);
		this.referenceLineAnnotation = new rs.ReferenceLine();
		this.referenceLineAnnotation.color = '#ff0000';

		this.stateChanger = new EventEmitter();
	}

	componentWillUpdate(newProps, newState) {
		if (this.props.revision.series[this.state.activeSeriesIndex].seriesUID !== newProps.revision.series[this.state.activeSeriesIndex].seriesUID) {
			this.changeActiveSeries(this.state.activeSeriesIndex);
		}
	}

	componentWillMount() {
		const { revision } = this.props;
		this.changeActiveSeries(0);
		const activeSeries = revision.series[this.state.activeSeriesIndex];
		if (activeSeries && activeSeries.labels instanceof Array && activeSeries.labels.length > 0) {
			this.setState({ activeLabelIndex: 0 });
		} else {
			this.setState({ activeLabelIndex: -1 });
		}
	}

	componentWillUpdate(nextProps, nextState) {
		if (
			this.state.activeSeriesIndex !== nextState.activeSeriesIndex ||
			this.state.activeLabelIndex !== nextState.activeLabelIndex || true
		) {
			this.updateLabels(nextProps, nextState);
		}
	}

	updateLabels(props, state) {
		const { revision } = props || this.props;
		const { composition, activeSeriesIndex, activeLabelIndex } = state || this.state;
		const activeSeries = revision.series[activeSeriesIndex];
		const labels = activeSeries.labels;
		const activeLabel = labels[activeLabelIndex];
		composition.removeAllAnnotations();
		labels.forEach(label => {
			if (!label.cloud) return;
			const cloud = label.cloud;
			if (activeLabel && (label === activeLabel)) {
				cloud.active = true;
			} else {
				cloud.active = false;
				if (cloud.expanded) cloud.shrinkToMinimum();
			}
			composition.addAnnotation(cloud);
		});
		if (this.state.showReferenceLine) { composition.addAnnotation(this.referenceLineAnnotation); }
		composition.annotationUpdated();
		// console.log('Annotations', composition.annotations);
	}

	changeActiveSeries(seriesIndex) {
		const activeSeries = this.props.revision.series[seriesIndex];
		const src = new rs.HybridImageSource({
			client: this.client,
			series: activeSeries.seriesUID
		});
		const composition = new rs.Composition(src);
		src.ready().then(this.updateLabels);
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

	labelAttributesChange(value) {
		const { revision, onChange } = this.props;
		const { activeSeriesIndex, activeLabelIndex } = this.state;
		const activeSeries = revision.series[activeSeriesIndex];
		if (!activeSeries) return null;
		const activeLabel = activeSeries.labels[activeLabelIndex];
		activeLabel.attributes = value;
		onChange(revision);
	}

	caseAttributesChange(value) {
		const { onChange, revision } = this.props;
		revision.attributes = value;
		onChange(revision);
	}

	changeTool(tool) {
		this.setState({ tool });
	}

	toggleReferenceLine(show) {
		this.setState({ showReferenceLine: show });
	}

	selectWindowPreset(preset) {
		const window = { level: preset.level, width: preset.width };
		this.stateChanger.emit('change', state => ({ ...state, window }));
	}

	setLineWidth(lineWidth) {
		const w = +lineWidth;
		this.setState({ lineWidth: w });
		rs.toolFactory('brush').setOptions({ width: w });
		rs.toolFactory('eraser').setOptions({ width: w });
	}

	render () {
		const { projectData, revision, onChange, busy } = this.props;
		const { tool, activeSeriesIndex, activeLabelIndex, composition } = this.state;
		const activeSeries = revision.series[activeSeriesIndex];
		if (!activeSeries) return null;
		const activeLabel = activeSeries.labels[activeLabelIndex];
		return <div className={classNames('case-revision-data', { busy })}>
			<div className="case-revision-header">
				<Card title="Series / Labels">
					<LabelSelector
						revision={revision}
						onChange={onChange}
						activeSeries={activeSeries}
						activeLabel={activeLabel}
						onChangeActiveLabel={this.changeActiveLabel}
					/>
				</Card>
				<Card title={`Label #${activeLabelIndex} of Series #${activeSeriesIndex}`}>
					{ activeLabel ?
						<PropertyEditor
							properties={projectData.labelAttributesSchema}
							value={activeLabel.attributes || {}}
							onChange={this.labelAttributesChange}
						/>
					: null }
				</Card>
				<Card title="Case Attributes">
					<PropertyEditor
						properties={projectData.caseAttributesSchema}
						value={revision.attributes}
						onChange={this.caseAttributesChange}
					/>
				</Card>
			</div>
			<ToolBar
				active={tool}
				changeTool={this.changeTool}
				showReferenceLine={this.state.showReferenceLine}
				toggleReferenceLine={this.toggleReferenceLine}
				lineWidth={this.state.lineWidth}
				setLineWidth={this.setLineWidth}
				windowPresets={projectData.windowPresets}
				selectWindowPreset={this.selectWindowPreset}
				brushEnabled={!!activeLabel}
			/>
			<ViewerCluster
				composition={composition}
				labels={activeSeries.labels}
				stateChanger={this.stateChanger}
				activeLabel={activeLabel}
				tool={tool}
			/>
		</div>;
	}
}

class Card extends React.Component {
	constructor(props) {
		super(props);
		this.state = { open: true };
		this.toggleCollapse = this.toggleCollapse.bind(this);
	}

	toggleCollapse() {
		this.setState({ open: !this.state.open });
	}

	render() {
		const { title, children } = this.props;
		const { open } = this.state;
		return <div className="case-detail-card">
			<a className="case-detail-card-header" onClick={this.toggleCollapse}>
				{title}
				&ensp;
				{ open ?
					<Glyphicon glyph="triangle-bottom" />
				:
					<Glyphicon glyph="triangle-right" />
				}
			</a>
			{ open ?
				<div className="case-detail-card-body">
					{children}
				</div>
			: null }
		</div>;
	}
}

class ToolBar extends React.PureComponent {
	render() {
		const { active, changeTool, showReferenceLine, toggleReferenceLine,
			brushEnabled, lineWidth, setLineWidth, windowPresets = [], selectWindowPreset } = this.props;

		const widthOptions = [1, 3, 5, 7];

		return <div className="case-detail-toolbar">
			<ToolButton name="pager" changeTool={changeTool} active={active} />
			<ToolButton name="zoom" changeTool={changeTool} active={active} />
			<ToolButton name="hand" changeTool={changeTool} active={active} />
			<ToolButton name="window" changeTool={changeTool} active={active}>
				{windowPresets.map((p, i) => (
					<MenuItem
						key={i + 1}
						eventKey={i + 1}
						onClick={() => selectWindowPreset(p)}
					>
						<b>{p.label}</b> {`(L: ${p.level} / W: ${p.width})`}
					</MenuItem>
				))}
			</ToolButton>
			<ToolButton name="brush" changeTool={changeTool} active={active} disabled={!brushEnabled} />
			<ToolButton name="eraser" changeTool={changeTool} active={active} disabled={!brushEnabled} />
			<ShrinkSelect options={widthOptions} value={''+ lineWidth} onChange={setLineWidth} />
			<ToolButton name="bucket" changeTool={changeTool} active={active} disabled={!brushEnabled} />
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

class ToolButton extends React.PureComponent {
	render() {
		const { name, active, changeTool, disabled, children } = this.props;
		const style = active === name ? 'primary' : 'default';
		const icon = <span className={'case-detail-tool-icon rs-icon-' + name} />;
		const onClick = () => !disabled && changeTool(name);
		if (children) {
			return <SplitButton title={icon} bsStyle={style} onClick={onClick} disabled={disabled} >
				{children}
			</SplitButton>;

		} else {
			return <Button bsStyle={style} onClick={onClick} disabled={disabled} >
				{icon}
			</Button>;
		}
	}
}

export class ViewerCluster extends React.PureComponent {
	render() {
		const { composition, tool, stateChanger } = this.props;

		function makeViewer(orientation, initialTool, fixTool) {
			return <ImageViewer
				orientation={orientation}
				composition={composition}
				tool={fixTool ? fixTool : tool}
				initialTool={initialTool}
				stateChanger={stateChanger}
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
					{makeViewer('axial', 'celestialRotate', 'celestialRotate')}
				</div>
			</div>
		</div>;
	}
}