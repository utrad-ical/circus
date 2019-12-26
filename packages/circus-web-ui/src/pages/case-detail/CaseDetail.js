import React from 'react';
import { api } from 'utils/api';
import ViewerCluster from './ViwewerCluster';
import SideContainer from './SideContainer';
import JsonSchemaEditor from 'rb/JsonSchemaEditor';
import LoadingIndicator from 'rb/LoadingIndicator';
import FullSpanContainer from 'components/FullSpanContainer';
import {
  Button,
  DropdownButton,
  Glyphicon,
  MenuItem
} from 'components/react-bootstrap';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import LabelSelector from './LabelSelector';
import { store } from 'store';
import * as rs from 'circus-rs';
import { alert, prompt, confirm } from 'rb/modal';
import classNames from 'classnames';
import EventEmitter from 'events';
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
import { createHistoryStore } from './revisionHistory';
import { loadVolumeLabelData, saveRevision } from './revisionData';
import shallowEqual from 'utils/shallowEqual';

class CaseDetailView extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      busy: false,
      projectData: null,
      caseData: null,
      editingRevisionIndex: -1,
      editingData: null
    };

    /**
     * Takes care of undo/redo history.
     */
    this.historyStore = createHistoryStore();
  }

  selectRevision = async index => {
    const { revisions } = this.state.caseData;
    const revision = revisions[index];
    this.setState({ busy: true, editingRevisionIndex: index });

    // Loads actual volume data
    const data = await loadVolumeLabelData(revision, api);

    const editingData = {
      revision: data,
      activeSeriesIndex: 0,
      activeLabelIndex: (revision.series[0].labels || []).length > 0 ? 0 : -1
    };

    this.historyStore.registerNew(editingData);
    this.setState({ editingData, busy: false });
  };

  async loadCase() {
    const caseId = this.props.match.params.caseId;
    const caseData = await api('cases/' + caseId);
    const project = this.props.accessibleProjects.find(
      p => p.projectId === caseData.projectId
    );
    if (!project) {
      throw new Error('You do not have access to this project.');
    }
    this.setState({ caseData, projectData: project.project }, () => {
      this.selectRevision(caseData.revisions.length - 1);
    });
  }

  saveRevision = async () => {
    const revision = this.state.editingData.revision;
    const caseId = this.state.caseData.caseId;

    const desc = await prompt('Revision message', revision.description);
    if (desc === null) return;

    try {
      await saveRevision(caseId, revision, desc, api);
      await alert('Successfully registered a revision.');
      // For now, perform a full case reload.
      // TODO: Optimize this
      this.setState({ caseData: null, editingData: null });
      this.loadCase();
    } catch (err) {
      await alert('Error: ' + err.message);
      throw err;
    }
  };

  revertRevision = async () => {
    if (!(await confirm('Reload the current revision?'))) {
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

  handleDataChange = (newData, pushToHistory = false) => {
    if (pushToHistory === true) {
      this.historyStore.push(newData);
    } else if (typeof pushToHistory === 'function') {
      if (pushToHistory(this.historyStore.current())) {
        this.historyStore.push(newData);
      }
    }
    this.setState({
      editingData: newData,
      canUndo: this.historyStore.canUndo(),
      canRedo: this.historyStore.canRedo()
    });
  };

  handleUndoClick = () => {
    this.historyStore.undo();
    this.setState({
      editingData: this.historyStore.current(),
      canUndo: this.historyStore.canUndo(),
      canRedo: this.historyStore.canRedo()
    });
  };

  handleRedoClick = () => {
    this.historyStore.redo();
    this.setState({
      editingData: this.historyStore.current(),
      canUndo: this.historyStore.canUndo(),
      canRedo: this.historyStore.canRedo()
    });
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

    const { projectData: prj, caseData, canUndo, canRedo } = this.state;
    const caseId = caseData.caseId;

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
          canUndo={canUndo}
          onUndoClick={this.handleUndoClick}
          canRedo={canRedo}
          onRedoClick={this.handleRedoClick}
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
    canUndo,
    onUndoClick,
    canRedo,
    onRedoClick,
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
        <IconButton
          bsStyle="default"
          icon="step-backward"
          disabled={!canUndo}
          onClick={onUndoClick}
        />
        <IconButton
          bsStyle="default"
          icon="step-forward"
          disabled={!canRedo}
          onClick={onRedoClick}
        />
        &ensp;
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
            <Icon icon="remove" />
            &ensp;Revert
          </MenuItem>
          <MenuItem divider />
          <MenuItem header>Export</MenuItem>
          <MenuItem onSelect={onExportMhdClick}>
            <Icon icon="export" />
            Export as MHD
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
      viewOptions: {
        layout: 'twoByTwo',
        showReferenceLine: false,
        interpolationMode: 'trilinear'
      },
      composition: null,
      lineWidth: 1
    };
    this.viewers = {};
    this.tools = {};

    const server = store.getState().loginUser.data.dicomImageServer;
    this.client = new rs.RsHttpClient(server);

    this.stateChanger = new EventEmitter();
  }

  componentDidMount() {
    const {
      editingData: { activeSeriesIndex }
    } = this.props;
    this.changeTool('pager');
    this.changeActiveSeries(activeSeriesIndex);
  }

  componentDidUpdate(prevProps, prevState) {
    const { editingData } = this.props;
    const { editingData: prevData } = prevProps;
    if (!editingData) return;
    if (editingData !== prevData) {
      if (
        editingData.revision.series[editingData.activeSeriesIndex].seriesUid !==
        prevData.revision.series[prevData.activeSeriesIndex].seriesUid
      ) {
        this.changeActiveSeries();
      } else if (editingData !== prevData) {
        this.updateComposition();
      }
    }
    if (
      this.stateChanger &&
      prevState.viewOptions.interpolationMode !==
        this.state.viewOptions.interpolationMode
    ) {
      this.stateChanger.emit('change', viewState => {
        return {
          ...viewState,
          interpolationMode: this.state.viewOptions.interpolationMode
        };
      });
    }
  }

  updateComposition = () => {
    const {
      editingData: { revision, activeSeriesIndex, activeLabelIndex }
    } = this.props;
    const {
      composition,
      viewOptions: { showReferenceLine }
    } = this.state;
    const activeSeries = revision.series[activeSeriesIndex];
    const activeLabel = activeSeries.labels[activeLabelIndex];
    composition.annotations.forEach(antn => {
      if (antn instanceof rs.ReferenceLine) antn.dispose();
    });
    composition.removeAllAnnotations();
    activeSeries.labels.forEach(label => {
      switch (label.type) {
        case 'voxel': {
          const isActive = activeLabel && label === activeLabel;
          const volume = new rs.RawData(label.data.size, rs.PixelFormat.Binary);
          volume.assign(
            isActive
              ? label.data.volumeArrayBuffer.slice(0)
              : label.data.volumeArrayBuffer
          );
          const cloud = new rs.VoxelCloud();
          cloud.origin = label.data.origin;
          cloud.volume = volume;
          cloud.color = label.data.color || '#ff0000';
          cloud.alpha =
            'alpha' in label.data ? parseFloat(label.data.alpha) : 1;
          cloud.active = isActive;
          composition.addAnnotation(cloud);
          break;
        }
      }
    });
    if (showReferenceLine) {
      const lineColors = {
        axial: '#8888ff',
        sagittal: '#ff6666',
        coronal: '#88ff88',
        oblique: '#ffff88'
      };
      Object.keys(this.viewers).forEach(k => {
        composition.addAnnotation(
          new rs.ReferenceLine(this.viewers[k], { color: lineColors[k] })
        );
      });
    }
    composition.annotationUpdated();
  };

  changeActiveSeries = async () => {
    const {
      editingData: { revision, activeSeriesIndex }
    } = this.props;
    const activeSeries = revision.series[activeSeriesIndex];
    const volumeLoader = new rs.RsVolumeLoader({
      rsHttpClient: this.client,
      seriesUid: activeSeries.seriesUid,
      estimateWindowType: 'full'
    });
    const src = new rs.HybridMprImageSource({
      volumeLoader,
      rsHttpClient: this.client,
      seriesUid: activeSeries.seriesUid,
      estimateWindowType: 'full'
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
    onChange(
      {
        ...editingData,
        revision: update(revision, {
          series: {
            [activeSeriesIndex]: {
              labels: {
                [activeLabelIndex]: {
                  data: {
                    $merge: {
                      origin: annotation.origin,
                      size: annotation.volume.getDimension(),
                      volumeArrayBuffer: annotation.volume.data
                    }
                  }
                }
              }
            }
          }
        })
      },
      true
    );
  };

  changeActiveLabel = (seriesIndex, labelIndex) => {
    const { editingData, onChange } = this.props;
    onChange(
      update(editingData, {
        $merge: {
          activeSeriesIndex: seriesIndex,
          activeLabelIndex: labelIndex
        }
      }),
      false
    );
  };

  labelAttributesChange = (value, isTextInput) => {
    const { editingData, onChange } = this.props;
    const { activeSeriesIndex, activeLabelIndex } = editingData;
    onChange(
      update(editingData, {
        revision: {
          series: {
            [activeSeriesIndex]: {
              labels: { [activeLabelIndex]: { attributes: { $set: value } } }
            }
          }
        }
      }),
      !isTextInput
    );
  };

  handleLabelAttributesTextBlur = () => {
    const { editingData, onChange } = this.props;
    const { revision, activeSeriesIndex, activeLabelIndex } = editingData;
    onChange(editingData, old => {
      return !shallowEqual(
        old.revision.series[activeSeriesIndex].labels[activeLabelIndex]
          .attributes,
        revision.series[activeSeriesIndex].labels[activeLabelIndex].attributes
      );
    });
  };

  caseAttributesChange = (value, isTextInput) => {
    const { editingData, onChange } = this.props;
    onChange(
      update(editingData, { revision: { attributes: { $set: value } } }),
      !isTextInput
    );
  };

  handleCaseAttributesTextBlur = () => {
    const { editingData, onChange } = this.props;
    onChange(editingData, old => {
      return !shallowEqual(
        old.revision.attributes,
        editingData.revision.attributes
      );
    });
  };

  getTool = toolName => {
    const tool = this.tools[toolName] || toolFactory(toolName);
    this.tools[toolName] = tool;
    return tool;
  };

  changeTool = toolName => {
    this.setState({ toolName, tool: this.getTool(toolName) });
  };

  handleChangeViewOptions = viewOptions => {
    this.setState({ viewOptions }, () => {
      this.updateComposition();
    });
  };

  handleApplyWindow = window => {
    this.stateChanger.emit('change', state => ({ ...state, window }));
  };

  setLineWidth = lineWidth => {
    this.setState({ lineWidth });
    this.getTool('brush').setOptions({ width: lineWidth });
    this.getTool('eraser').setOptions({ width: lineWidth });
  };

  handleCreateViwer = (viewer, id) => {
    this.viewers[id] = viewer;
  };

  handleDestroyViewer = viewer => {
    Object.keys(this.viewers).forEach(k => {
      if (this.viewers[k] === viewer) delete this.viewers[k];
    });
  };

  handleSeriesChange = (newData, pushToHistory = false) => {
    const { onChange } = this.props;
    onChange(newData, pushToHistory);
    this.updateComposition();
  };

  initialWindowSetter = (viewer, viewState) => {
    const { projectData } = this.props;
    const src = viewer.composition.imageSource;
    const windowPriority = projectData.windowPriority || 'auto';
    const priorities = windowPriority.split(',');
    for (const type of priorities) {
      switch (type) {
        case 'auto': {
          const window = src.metadata.estimatedWindow;
          if (window) {
            // console.log('applying auto window', window);
            return { ...viewState, window };
          }
          break;
        }
        case 'dicom': {
          const window = src.metadata.dicomWindow;
          if (window) {
            // console.log('applying dicom window', window);
            return { ...viewState, window };
          }
          break;
        }
        case 'preset': {
          const window =
            Array.isArray(projectData.windowPresets) &&
            projectData.windowPresets[0];
          if (window) {
            // console.log('applying preset window', window);
            return {
              ...viewState,
              window: { level: window.level, width: window.width }
            };
          }
          break;
        }
      }
    }
    return undefined; // do not update view state (should not happen)
  };

  render() {
    const { projectData, editingData, busy } = this.props;
    const { revision, activeSeriesIndex, activeLabelIndex } = editingData;
    const { toolName, tool, viewOptions, composition } = this.state;
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
                  onTextBlur={this.handleLabelAttributesTextBlur}
                />
              </div>
            )}
          </Collapser>
          <Collapser title="Case Attributes" className="case-attributes">
            <JsonSchemaEditor
              schema={projectData.caseAttributesSchema}
              value={revision.attributes}
              onChange={this.caseAttributesChange}
              onTextBlur={this.handleCaseAttributesTextBlur}
            />
          </Collapser>
        </SideContainer>
        <div className="case-revision-main">
          <ToolBar
            active={toolName}
            onChangeTool={this.changeTool}
            viewOptions={viewOptions}
            onChangeViewOptions={this.handleChangeViewOptions}
            lineWidth={this.state.lineWidth}
            setLineWidth={this.setLineWidth}
            windowPresets={projectData.windowPresets}
            onApplyWindow={this.handleApplyWindow}
            brushEnabled={!!activeLabel}
          />
          <ViewerCluster
            composition={composition}
            layout={viewOptions.layout}
            labels={activeSeries.labels}
            stateChanger={this.stateChanger}
            activeLabel={activeLabel}
            tool={tool}
            onCreateViewer={this.handleCreateViwer}
            onDestroyViewer={this.handleDestroyViewer}
            initialWindowSetter={this.initialWindowSetter}
          />
        </div>
      </div>
    );
  }
}
