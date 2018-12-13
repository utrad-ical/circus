import React from 'react';
import { api } from '../../utils/api';
import ViewerCluster from './ViwewerCluster';
import SideContainer from './SideContainer';
import JsonSchemaEditor from 'rb/JsonSchemaEditor';
import FullSpanContainer from 'components/FullSpanContainer';
import LoadingIndicator from 'rb/LoadingIndicator';
import {
  Button,
  DropdownButton,
  Glyphicon,
  MenuItem
} from 'components/react-bootstrap';
import Icon from 'components/Icon';
import LabelSelector from './LabelSelector';
import { store } from 'store';
import * as rs from 'circus-rs';
import { alert, prompt, confirm } from 'rb/modal';
import merge from 'merge';
import classNames from 'classnames';
import EventEmitter from 'events';
import { sha1 } from 'utils/util.js';
import ProjectDisplay from 'components/ProjectDisplay';
import Collapser from 'components/Collapser';
import RevisionSelector from './RevisionSelector';
import PatientInfoBox from 'components/PatientInfoBox';
import TimeDisplay from 'components/TimeDisplay';
import Tag from 'components/Tag';
import { connect } from 'react-redux';
import { toolFactory } from 'circus-rs/tool/tool-initializer';
import ToolBar from './ToolBar';
import update from 'immutability-helper';

class CaseDetailView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      busy: false,
      projectData: null,
      caseData: null,
      editingRevisionIndex: -1,
      editingData: null
    };
  }

  selectRevision = async index => {
    const { revisions } = this.state.caseData;
    const revision = revisions[index];
    this.setState({ busy: true, editingRevisionIndex: index });

    const data = merge(true, {}, revision);
    delete data.date;
    delete data.creator;

    // Load all label volume data in the latest revision
    for (const series of data.series) {
      for (const label of series.labels) {
        if (label.type !== 'voxel') continue;
        if (label.data.voxels !== null) {
          try {
            const buffer = await api('blob/' + label.data.voxels, {
              handleErrors: true,
              responseType: 'arraybuffer'
            });
            const volume = new rs.RawData(
              label.data.size,
              rs.PixelFormat.Binary
            );
            volume.assign(buffer);
            label.data.voxelRawData = volume;
          } catch (err) {
            await alert('Could not load label volume data: \n' + err.message);
          }
        }
      }
    }

    const editingData = {
      revision: data,
      activeSeriesIndex: 0,
      activeLabelIndex: (revision.series[0].labels || []).length > 0 ? 0 : -1
    };

    this.setState({ editingData, busy: false });
  };

  async loadCase() {
    const caseId = this.props.match.params.caseId;
    const caseData = await api('cases/' + caseId);
    const project = this.props.accessibleProjects.find(
      p => p.projectId === caseData.projectId
    );
    this.setState({ caseData, projectData: project.project }, () => {
      this.selectRevision(caseData.revisions.length - 1);
    });
  }

  saveRevision = async () => {
    const data = this.state.editingData.revision;

    const desc = await prompt('Revision message', data.description);
    if (desc === null) return;
    data.description = desc;

    const voxelShrinkToMinimum = labelData => {
      const cloud = new rs.VoxelCloud(); // temporary
      cloud.origin = labelData.origin;
      cloud.volume = labelData.voxelRawData;
      cloud.shrinkToMinimum();
      return { origin: cloud.origin, voxelRawData: cloud.volume };
    };

    // save all label volume data
    for (const series of data.series) {
      for (const label of series.labels) {
        try {
          const { origin, voxelRawData } = voxelShrinkToMinimum(label.data);
          const bb = rs.scanBoundingBox(voxelRawData);
          let voxels = null;
          if (bb !== null) {
            // save painted voxels
            voxels = sha1(voxelRawData.data);
            if (voxels === label.data.voxels) {
              // console.log('Skipping unchanged voxel data.');
            } else {
              await api('blob/' + voxels, {
                method: 'put',
                handleErrors: true,
                data: voxelRawData.data,
                headers: { 'Content-Type': 'application/octet-stream' }
              });
            }
            label.data = {
              color: label.data.color,
              alpha: label.data.alpha,
              voxels,
              origin,
              size: voxelRawData.getDimension()
            };
          } else {
            label.data = {
              color: label.data.color,
              alpha: label.data.alpha,
              voxels: null
            };
          }
        } catch (err) {
          await alert('Could not save label volume data: \n' + err.message);
          return;
        }
      }
    }

    // prepare revision data
    data.status = 'approved';
    const caseId = this.state.caseData.caseId;
    console.log('sending', data);
    try {
      await api(`cases/${caseId}/revision`, {
        method: 'post',
        data,
        handleErrors: true
      });
      await alert('Successfully registered a revision.');
      this.setState({ caseData: null, editingData: null });
      this.loadCase();
    } catch (err) {
      await alert('Error: ' + err.message);
    }
  };

  revertRevision = async () => {
    if (!await confirm('Reload the current revision?')) {
      return;
    }
    this.selectRevision(this.state.editingRevisionIndex);
  };

  exportMhd = async () => {
    const caseId = this.state.caseData.caseId;
    const blob = await api(`cases/${caseId}/export-mhd`, {
      responseType: 'blob'
    });
    const a = document.createElement('a');
    document.body.appendChild(a);
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = 'export.zip';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  handleDataChange = newData => {
    this.setState({ editingData: newData });
  };

  async componentDidMount() {
    await this.loadCase();
  }

  render() {
    if (
      !this.state.caseData ||
      !this.state.projectData ||
      !this.state.editingData
    ) {
      return this.state.busy ? <LoadingIndicator /> : null;
    }

    const { projectData: prj, caseData } = this.state;

    const caseId = this.props.match.params.caseId;

    return (
      <FullSpanContainer>
        <Collapser title="Case Info" className="case-info">
          <ProjectDisplay projectId={prj.projectId} withName size="xl" />
          <PatientInfoBox value={caseData.patientInfoCache} />
          <div className="tag-list">
            {caseData.tags.map(t => (
              <Tag projectId={prj.projectId} tag={t} key={t} />
            ))}
          </div>
          <div>
            Case: {caseId}
            <br />
            (Create: <TimeDisplay value={caseData.createdAt} />)
          </div>
        </Collapser>
        <MenuBar
          onSaveClick={this.saveRevision}
          onRevertClick={this.revertRevision}
          onExportMhdClick={this.exportMhd}
          onRevisionSelect={this.selectRevision}
          revisions={this.state.caseData.revisions}
          currentRevision={this.state.editingRevisionIndex}
        />
        <Editor
          key={this.state.editingRevisionIndex}
          busy={this.state.busy}
          editingData={this.state.editingData}
          projectData={this.state.projectData}
          onChange={this.handleDataChange}
        />
      </FullSpanContainer>
    );
  }
}

const CaseDetail = connect(state => ({
  accessibleProjects: state.loginUser.data.accessibleProjects
}))(CaseDetailView);
export default CaseDetail;

const MenuBar = props => {
  const {
    onRevertClick,
    onSaveClick,
    onExportMhdClick,
    revisions,
    onRevisionSelect,
    currentRevision
  } = props;
  return (
    <div className="case-detail-menu">
      <div className="left">
        Revision:&ensp;
        <RevisionSelector
          revisions={revisions}
          selected={currentRevision}
          onSelect={onRevisionSelect}
        />
      </div>
      <div className="right">
        <Button bsStyle="success" onClick={onSaveClick}>
          <Glyphicon glyph="save" />
          Save
        </Button>
        <DropdownButton
          id="submenu"
          bsStyle="link"
          title={<Icon icon="menu-hamburger" />}
          pullRight
          noCaret
        >
          <MenuItem eventKey="1" onSelect={onRevertClick}>
            <Icon icon="remove" />&ensp;Revert
          </MenuItem>
          <MenuItem divider />
          <MenuItem header>Export</MenuItem>
          <MenuItem onSelect={onExportMhdClick}>
            <Icon icon="export" />Export as MHD
          </MenuItem>
        </DropdownButton>
      </div>
    </div>
  );
};

export class Editor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      viewOptions: { layout: 'twoByTwo', showReferenceLine: false },
      composition: null,
      lineWidth: 1
    };
    this.viewers = new Set();
    this.tools = {};

    const server = store.getState().loginUser.data.dicomImageServer;
    this.client = new rs.RsHttpClient(server);

    this.stateChanger = new EventEmitter();
  }

  componentDidMount() {
    const { editingData: { activeSeriesIndex } } = this.props;
    this.changeTool('pager');
    this.changeActiveSeries(activeSeriesIndex);
  }

  componentDidUpdate(prevProps) {
    const { editingData } = this.props;
    const { editingData: prevData } = prevProps;
    if (!editingData) return;
    if (editingData === prevData) return;
    if (
      editingData.revision.series[editingData.activeSeriesIndex].seriesUid !==
      prevData.revision.series[prevData.activeSeriesIndex].seriesUid
    ) {
      this.changeActiveSeries();
    } else if (editingData.activeLabelIndex !== prevData.activeLabelIndex) {
      this.updateComposition();
    }
  }

  updateComposition = () => {
    const {
      editingData: { revision, activeSeriesIndex, activeLabelIndex }
    } = this.props;
    const { composition, viewOptions: { showReferenceLine } } = this.state;
    const activeSeries = revision.series[activeSeriesIndex];
    const activeLabel = activeSeries.labels[activeLabelIndex];
    composition.removeAllAnnotations();
    activeSeries.labels.forEach(label => {
      switch (label.type) {
        case 'voxel': {
          const cloud = new rs.VoxelCloud();
          cloud.volume = label.data.voxelRawData;
          cloud.origin = label.data.origin;
          cloud.color = label.data.color || '#ff0000';
          cloud.alpha =
            'alpha' in label.data ? parseFloat(label.data.alpha) : 1;
          cloud.active = activeLabel && label === activeLabel;
          composition.addAnnotation(cloud);
          break;
        }
      }
    });
    if (showReferenceLine) {
      this.viewers.forEach(v => {
        composition.addAnnotation(
          new rs.ReferenceLine(v, { color: '#ffff88' })
        );
      });
    }
    composition.annotationUpdated();
  };

  changeActiveSeries = async () => {
    const { editingData: { revision, activeSeriesIndex } } = this.props;
    const activeSeries = revision.series[activeSeriesIndex];
    const volumeLoader = new rs.RsVolumeLoader({
      rsHttpClient: this.client,
      seriesUid: activeSeries.seriesUid
    });
    const src = new rs.HybridMprImageSource({
      volumeLoader,
      rsHttpClient: this.client,
      seriesUid: activeSeries.seriesUid
    });
    const composition = new rs.Composition(src);
    composition.on('annotationChange', this.handleAnnotationChange);
    await src.ready();
    this.setState({ composition }, this.updateComposition);
  };

  handleAnnotationChange = annotation => {
    const { editingData, onChange } = this.props;
    const { revision, activeSeriesIndex, activeLabelIndex } = editingData;
    if (!(annotation instanceof rs.VoxelCloud)) return;
    onChange({
      ...editingData,
      revision: update(revision, {
        series: {
          [activeSeriesIndex]: {
            labels: {
              [activeLabelIndex]: {
                data: {
                  origin: { $set: annotation.origin }
                }
              }
            }
          }
        }
      })
    });
  };

  changeActiveLabel = (seriesIndex, labelIndex) => {
    const { editingData, onChange } = this.props;
    onChange({
      ...editingData,
      activeSeriesIndex: seriesIndex,
      activeLabelIndex: labelIndex
    });
  };

  labelAttributesChange = value => {
    const { editingData, onChange } = this.props;
    const { revision, activeSeriesIndex, activeLabelIndex } = editingData;
    onChange({
      ...editingData,
      revision: update(revision, {
        series: {
          [activeSeriesIndex]: {
            labels: { [activeLabelIndex]: { attributes: { $set: value } } }
          }
        }
      })
    });
  };

  caseAttributesChange = value => {
    const { editingData, onChange } = this.props;
    const { revision } = editingData;
    onChange({ ...editingData, revision: { ...revision, attributes: value } });
  };

  getTool = toolName => {
    const tool = this.tools[toolName] || toolFactory(toolName);
    this.tools[toolName] = tool;
    return tool;
  };

  changeTool = toolName => {
    this.setState({ toolName, tool: this.getTool(toolName) });
  };

  toggleReferenceLine = show => {
    this.setState(
      { viewOptions: { ...this.state.viewOptions, showReferenceLine: show } },
      this.updateComposition
    );
  };

  handleSelectWindowPreset = preset => {
    const window = { level: preset.level, width: preset.width };
    this.stateChanger.emit('change', state => ({ ...state, window }));
  };

  setLineWidth = lineWidth => {
    this.setState({ lineWidth });
    this.getTool('brush').setOptions({ width: lineWidth });
    this.getTool('eraser').setOptions({ width: lineWidth });
  };

  handleCreateViwer = viewer => {
    this.viewers.add(viewer);
  };

  handleDestroyViewer = viewer => {
    this.viewers.delete(viewer);
  };

  handleSeriesChange = newData => {
    const { onChange } = this.props;
    onChange(newData);
    this.updateComposition();
  };

  render() {
    const { projectData, editingData, onChange, busy } = this.props;
    const { revision, activeSeriesIndex, activeLabelIndex } = editingData;
    const {
      toolName,
      tool,
      viewOptions: { layout, showReferenceLine },
      composition
    } = this.state;
    const activeSeries = revision.series[activeSeriesIndex];
    if (!activeSeries) return null;
    const activeLabel = activeSeries.labels[activeLabelIndex];
    return (
      <div className={classNames('case-revision-data', { busy })}>
        <SideContainer>
          <Collapser title="Series / Labels" className="labels">
            <LabelSelector
              editingData={editingData}
              onChange={this.handleSeriesChange}
              activeSeries={activeSeries}
              activeLabel={activeLabel}
              onChangeActiveLabel={this.changeActiveLabel}
            />
            {activeLabel && (
              <div className="label-attributes">
                <div>
                  Label #{activeLabelIndex} of Series #{activeSeriesIndex}
                </div>
                <JsonSchemaEditor
                  key={`${activeSeriesIndex}:${activeLabelIndex}`}
                  schema={projectData.labelAttributesSchema}
                  value={activeLabel.attributes || {}}
                  onChange={this.labelAttributesChange}
                />
              </div>
            )}
          </Collapser>
          <Collapser title="Case Attributes" className="case-attributes">
            <JsonSchemaEditor
              schema={projectData.caseAttributesSchema}
              value={revision.attributes}
              onChange={this.caseAttributesChange}
            />
          </Collapser>
        </SideContainer>
        <div className="case-revision-main">
          <ToolBar
            active={toolName}
            onChangeTool={this.changeTool}
            showReferenceLine={showReferenceLine}
            toggleReferenceLine={this.toggleReferenceLine}
            lineWidth={this.state.lineWidth}
            setLineWidth={this.setLineWidth}
            windowPresets={projectData.windowPresets}
            onSelectWindowPreset={this.handleSelectWindowPreset}
            brushEnabled={!!activeLabel}
          />
          <ViewerCluster
            composition={composition}
            layout={layout}
            labels={activeSeries.labels}
            stateChanger={this.stateChanger}
            activeLabel={activeLabel}
            tool={tool}
            onCreateViewer={this.handleCreateViwer}
            onDestroyViewer={this.handleDestroyViewer}
          />
        </div>
      </div>
    );
  }
}
