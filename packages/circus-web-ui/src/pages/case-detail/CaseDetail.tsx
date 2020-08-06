import JsonSchemaEditor from '@smikitky/rb-components/lib/JsonSchemaEditor';
import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import { alert, confirm, prompt } from '@smikitky/rb-components/lib/modal';
import * as rs from '@utrad-ical/circus-rs/src/browser';
import { Composition, Viewer } from '@utrad-ical/circus-rs/src/browser';
import ToolBaseClass from '@utrad-ical/circus-rs/src/browser/tool/Tool';
import { InterpolationMode } from '@utrad-ical/circus-rs/src/browser/ViewState';
import classNames from 'classnames';
import Collapser from 'components/Collapser';
import FullSpanContainer from 'components/FullSpanContainer';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import PatientInfoBox from 'components/PatientInfoBox';
import ProjectDisplay from 'components/ProjectDisplay';
import {
  Button,
  DropdownButton,
  Glyphicon,
  MenuItem
} from 'components/react-bootstrap';
import Tag from 'components/Tag';
import TimeDisplay from 'components/TimeDisplay';
import { EventEmitter } from 'events';
import update from 'immutability-helper';
import React from 'react';
import { connect } from 'react-redux';
import { store } from 'store';
import { api } from 'utils/api';
import shallowEqual from 'utils/shallowEqual';
import LabelSelector from './LabelSelector';
import {
  LabelEntry,
  loadLabels,
  PlaneFigureLabel,
  PlaneFigureLabelData,
  Revision,
  saveRevision,
  SolidFigureLabel,
  SolidFigureLabelData,
  VoxelLabel,
  VoxelLabelData
} from './revisionData';
import { createHistoryStore, HistoryStore } from './revisionHistory';
import RevisionSelector from './RevisionSelector';
import SideContainer from './SideContainer';
import ToolBar from './ToolBar';
import ViewerCluster, { Layout } from './ViwewerCluster';

interface EditingData {
  revision: Revision;
  activeSeriesIndex: number;
  activeLabelIndex: number;
}

interface CaseDetailViewProps {
  accessibleProjects: any;
  editingData: EditingData;
  match: any;
}

interface CaseDetailViewState {
  busy: boolean;
  projectData?: any;
  caseData?: any;
  editingRevisionIndex: number;
  editingData?: EditingData | null;
  canUndo: boolean;
  canRedo: boolean;
}

class CaseDetailView extends React.PureComponent<
  CaseDetailViewProps,
  CaseDetailViewState
> {
  historyStore: HistoryStore<EditingData>;

  constructor(props: Readonly<CaseDetailViewProps>) {
    super(props);
    this.state = {
      busy: false,
      projectData: null,
      caseData: null,
      editingRevisionIndex: -1,
      editingData: null,
      canUndo: false,
      canRedo: false
    };

    /**
     * Takes care of undo/redo history.
     */
    this.historyStore = createHistoryStore();
  }

  selectRevision = async (index: number) => {
    const { revisions } = this.state.caseData;
    const revision = revisions[index];
    this.setState({ busy: true, editingRevisionIndex: index });

    // Loads actual volume data and adds label temporary key.
    const data = await loadLabels(revision, api);

    const editingData: EditingData = {
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
      (p: { projectId: string }) => p.projectId === caseData.projectId
    );
    if (!project) {
      throw new Error('You do not have access to this project.');
    }
    this.setState({ caseData, projectData: project.project }, () => {
      this.selectRevision(caseData.revisions.length - 1);
    });
  }

  saveRevision = async () => {
    if (!this.state.editingData) return;
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

  handleDataChange = (newData: EditingData, pushToHistory: any = false) => {
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
          <ProjectDisplay
            projectId={prj.projectId}
            withName
            withDescription
            size="xl"
          />
          <PatientInfoBox value={caseData.patientInfoCache} />
          <div className="tag-list">
            {caseData.tags.map((t: string | number | undefined) => (
              <Tag
                projectId={prj.projectId}
                tag={!t ? '' : t.toString()}
                key={t}
              />
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
  accessibleProjects: state.loginUser.data!.accessibleProjects
}))(CaseDetailView);
export default CaseDetail;

const MenuBar: React.FC<{
  canUndo: boolean;
  onUndoClick: () => void;
  canRedo: boolean;
  onRedoClick: () => void;
  onRevertClick: () => void;
  onSaveClick: () => void;
  onExportMhdClick: () => void;
  revisions: Revision[];
  onRevisionSelect: (index: number) => Promise<void>;
  currentRevision: number;
}> = props => {
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

interface EditorProps {
  editingData: EditingData;
  onChange: (revision: EditingData, series: any) => void;
  projectData: any;
  busy: boolean;
}

interface EditorState {
  toolName: string;
  tool: ToolBaseClass | null;
  viewOptions: {
    layout: Layout;
    showReferenceLine: boolean;
    interpolationMode: InterpolationMode;
  };
  composition: any;
  lineWidth: number;
}

export class Editor extends React.Component<EditorProps, EditorState> {
  viewers: { [index: string]: Viewer };
  tools: { [index: string]: ToolBaseClass };
  client: any;
  stateChanger: any;
  constructor(props: Readonly<EditorProps>) {
    super(props);
    this.state = {
      viewOptions: {
        layout: 'twoByTwo',
        showReferenceLine: false,
        interpolationMode: 'trilinear'
      },
      composition: null,
      lineWidth: 1,
      toolName: '',
      tool: null
    };
    this.viewers = {};
    this.tools = {};

    const server = store.getState().loginUser.data!.dicomImageServer;
    this.client = new rs.RsHttpClient(server);

    this.stateChanger = new EventEmitter();
  }

  componentDidMount() {
    this.changeTool('pager');
    this.changeActiveSeries();
  }

  componentDidUpdate(
    prevProps: { editingData: EditingData },
    prevState: { viewOptions: { interpolationMode: InterpolationMode } }
  ) {
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
      this.stateChanger.emit('change', (viewState: rs.ViewState) => {
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
      viewOptions: { layout, showReferenceLine }
    } = this.state;
    const activeSeries = revision.series[activeSeriesIndex];
    const activeLabel = activeSeries.labels[activeLabelIndex];
    composition.annotations.forEach((antn: { dispose: () => void }) => {
      if (antn instanceof rs.ReferenceLine) antn.dispose();
    });
    composition.removeAllAnnotations();

    const rgbaColor = (rgb: string, alpha: number): string => {
      return (
        'rgba(' +
        [
          parseInt(rgb.substr(1, 2), 16),
          parseInt(rgb.substr(3, 2), 16),
          parseInt(rgb.substr(5, 2), 16),
          alpha
        ].join(',') +
        ')'
      );
    };

    const createVoxelCloud = (
      label: VoxelLabel,
      color: string,
      alpha: number,
      isActive: boolean
    ): rs.VoxelCloud => {
      const volume = new rs.RawData(label.data.size!, 'binary');
      volume.assign(
        isActive
          ? label.data.volumeArrayBuffer!.slice(0)
          : label.data.volumeArrayBuffer!
      );
      const cloud = new rs.VoxelCloud();
      cloud.origin = label.data.origin;
      cloud.volume = volume;
      cloud.color = color;
      cloud.alpha = alpha;
      cloud.active = isActive;
      cloud.id = label.temporarykey;
      return cloud;
    };

    const createSolidFigure = (
      label: SolidFigureLabel,
      color: string,
      alpha: number,
      isActive: boolean
    ): rs.SolidFigure => {
      const fig =
        label.type === 'ellipsoid' ? new rs.Ellipsoid() : new rs.Cuboid();
      fig.editable = true;
      fig.color = rgbaColor(color, alpha);
      // fig.fillColor = rgbaColor(color, alpha);
      fig.min = label.data.min;
      fig.max = label.data.max;
      fig.id = label.temporarykey;
      // fig.width = 3;
      // fig.boundingBoxOutline = {
      //   width: 1,
      //   color: 'rgba(255,255,255,0.3)'
      // };
      // fig.boundingBoxCrossHair = {
      //   width: 2,
      //   color: 'rgba(255,255,255,0.8)'
      // };
      return fig;
    };

    const createPlaneFigure = (
      label: PlaneFigureLabel,
      color: string,
      alpha: number,
      isActive: boolean
    ): rs.PlaneFigure => {
      const fig = new rs.PlaneFigure();
      fig.type = label.type === 'ellipse' ? 'circle' : 'rectangle';
      fig.editable = true;
      fig.color = rgbaColor(color, alpha);
      fig.min = label.data.min;
      fig.max = label.data.max;
      fig.z = label.data.z;
      fig.id = label.temporarykey;
      // fig.width = 3;
      return fig;
    };

    activeSeries.labels.forEach((label: LabelEntry) => {
      const isActive = activeLabel && label === activeLabel;
      const alpha = label.data.alpha !== undefined ? label.data.alpha : 1;
      const color = label.data.color || '#ff0000';

      switch (label.type) {
        case 'voxel': {
          const cloud = createVoxelCloud(
            label as VoxelLabel,
            color,
            alpha,
            isActive
          );
          composition.addAnnotation(cloud);
          break;
        }
        case 'cuboid':
        case 'ellipsoid': {
          const fig = createSolidFigure(
            label as SolidFigureLabel,
            color,
            alpha,
            isActive
          );
          composition.addAnnotation(fig);
          composition.annotationUpdated();
          break;
        }
        case 'rectangle':
        case 'ellipse': {
          const fig = createPlaneFigure(
            label as PlaneFigureLabel,
            color,
            alpha,
            isActive
          );
          composition.addAnnotation(fig);
          composition.annotationUpdated();
          break;
        }
      }
    });
    if (showReferenceLine) {
      const lineColors: { [index: string]: string } = {
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
    const composition = new Composition(src);
    composition.on('annotationChange', this.handleAnnotationChange);
    await src.ready();
    this.setState({ composition }, this.updateComposition);
  };

  handleAnnotationChange = (
    annotation: rs.VoxelCloud | rs.SolidFigure | rs.PlaneFigure
  ) => {
    const { editingData, onChange } = this.props;
    const { revision, activeSeriesIndex } = editingData;
    const labelIndex = revision.series[activeSeriesIndex].labels.findIndex(
      v => v.temporarykey === annotation.id
    );

    const newLabel = () => {
      const label = revision.series[activeSeriesIndex].labels[labelIndex];
      if (annotation instanceof rs.VoxelCloud && annotation.volume) {
        return update(label, {
          data: {
            $merge: {
              origin: annotation.origin,
              size: annotation.volume.getDimension(),
              volumeArrayBuffer: annotation.volume.data
            } as VoxelLabelData
          }
        });
      } else if (
        annotation instanceof rs.SolidFigure &&
        annotation.validate()
      ) {
        return update(label, {
          data: {
            $merge: {
              min: annotation.min,
              max: annotation.max
            } as SolidFigureLabelData
          }
        });
      } else if (
        annotation instanceof rs.PlaneFigure &&
        annotation.validate()
      ) {
        return update(label, {
          data: {
            $merge: {
              min: annotation.min,
              max: annotation.max,
              z: annotation.z
            } as PlaneFigureLabelData
          }
        });
      } else {
        return label;
      }
    };

    onChange(
      {
        ...editingData,
        revision: update(revision, {
          series: {
            [activeSeriesIndex]: {
              labels: {
                [labelIndex]: {
                  $set: newLabel()
                }
              }
            }
          }
        })
      },
      true
    );
  };

  changeActiveLabel = (seriesIndex: number, labelIndex: number) => {
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

  labelAttributesChange = (value: any, isTextInput: boolean) => {
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
    onChange(
      editingData,
      (old: {
        revision: {
          series: {
            [x: string]: { labels: { [x: string]: { attributes: any } } };
          };
        };
      }) => {
        return !shallowEqual(
          old.revision.series[activeSeriesIndex].labels[activeLabelIndex]
            .attributes,
          revision.series[activeSeriesIndex].labels[activeLabelIndex].attributes
        );
      }
    );
  };

  caseAttributesChange = (value: any, isTextInput: boolean) => {
    const { editingData, onChange } = this.props;
    onChange(
      update(editingData, { revision: { attributes: { $set: value } } }),
      !isTextInput
    );
  };

  handleCaseAttributesTextBlur = () => {
    const { editingData, onChange } = this.props;
    onChange(editingData, (old: { revision: { attributes: any } }) => {
      return !shallowEqual(
        old.revision.attributes,
        editingData.revision.attributes
      );
    });
  };

  getTool = (toolName: string): ToolBaseClass => {
    const tool = this.tools[toolName] || rs.toolFactory(toolName);
    this.tools[toolName] = tool;
    return tool;
  };

  changeTool = (toolName: string) => {
    this.setState({ toolName, tool: this.getTool(toolName) });
  };

  handleChangeViewOptions = (viewOptions: any) => {
    this.setState({ viewOptions }, () => {
      this.updateComposition();
    });
  };

  handleApplyWindow = (window: any) => {
    this.stateChanger.emit('change', (state: any) => ({ ...state, window }));
  };

  setLineWidth = (lineWidth: number) => {
    this.setState({ lineWidth });
    this.getTool('brush').setOptions({ width: lineWidth });
    this.getTool('eraser').setOptions({ width: lineWidth });
  };

  handleCreateViwer = (viewer: Viewer, id: string | number) => {
    this.viewers[id] = viewer;
  };

  handleDestroyViewer = (viewer: Viewer) => {
    Object.keys(this.viewers).forEach(k => {
      if (this.viewers[k] === viewer) delete this.viewers[k];
    });
  };

  handleSeriesChange = (newData: EditingData, pushToHistory: any = false) => {
    const { onChange } = this.props;
    onChange(newData, pushToHistory);
    this.updateComposition();
  };

  initialWindowSetter = (viewer: any, viewState: rs.ViewState) => {
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
    const brushEnabled = activeLabel ? activeLabel.type === 'voxel' : false;

    return (
      <div className={classNames('case-revision-data', { busy })}>
        <SideContainer>
          <Collapser title="Series / Labels" className="labels">
            <LabelSelector
              editingData={editingData}
              composition={composition}
              onChange={this.handleSeriesChange}
              activeSeries={activeSeries}
              activeLabel={activeLabel}
              onChangeActiveLabel={this.changeActiveLabel}
              viewers={this.viewers}
            />
            {activeLabel && (
              <div className="label-attributes">
                <div>
                  Label #{activeLabelIndex} of Series #{activeSeriesIndex}
                  <br />
                </div>
                <div className="label-name">{activeLabel.name}</div>

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
            brushEnabled={brushEnabled}
          />
          <ViewerCluster
            composition={composition}
            layout={viewOptions.layout}
            stateChanger={this.stateChanger}
            tool={tool!}
            onCreateViewer={this.handleCreateViwer}
            onDestroyViewer={this.handleDestroyViewer}
            initialWindowSetter={this.initialWindowSetter}
          />
        </div>
      </div>
    );
  }
}
