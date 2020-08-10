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
import React, { useEffect, useReducer } from 'react';
import { useSelector } from 'react-redux';
import { store } from 'store';
import { api } from 'utils/api';
import shallowEqual from 'utils/shallowEqual';
import LabelSelector from './LabelSelector';
import {
  EditingData,
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
import RevisionSelector from './RevisionSelector';
import SideContainer from './SideContainer';
import ToolBar from './ToolBar';
import ViewerCluster, { Layout } from './ViwewerCluster';
import { useParams } from 'react-router-dom';
import caseStoreReducer, * as c from './caseStore';

const CaseDetail: React.FC<{}> = props => {
  const caseId = useParams<any>().caseId;
  const [caseStore, caseDispatch] = useReducer(
    caseStoreReducer,
    caseStoreReducer(undefined as any, { type: 'dummy' }) // gets initial state
  );

  const { busy, caseData, projectData, editingRevisionIndex } = caseStore;
  const editingData = c.current(caseStore);

  const accessibleProjects = useSelector(
    state => state.loginUser.data!.accessibleProjects
  );

  const loadRevisionData = async (revisions: Revision[], index: number) => {
    const revision = revisions[index];
    caseDispatch(c.setBusy(true));
    // Loads actual volume data and adds label temporary key.
    const data = await loadLabels(revision, api);
    caseDispatch(c.startEditing({ revision: data, revisionIndex: index }));
    caseDispatch(c.setBusy(false));
  };

  const loadCase = async () => {
    const caseData = await api('cases/' + caseId);
    const project = accessibleProjects.find(
      (p: { projectId: string }) => p.projectId === caseData.projectId
    );
    if (!project) {
      throw new Error('You do not have access to this project.');
    }
    caseDispatch(c.loadCaseData({ caseData, projectData: project.project }));
    await loadRevisionData(caseData.revisions, caseData.revisions.length - 1);
  };

  useEffect(() => {
    loadCase();
    // eslint-disable-next-line
  }, []);

  const handleRevisionSelect = async (index: number) => {
    await loadRevisionData(caseData.revisions, index);
  };

  const handleDataChange = (
    newData: EditingData,
    pushToHistory: any = false
  ) => {
    caseDispatch(c.change({ newData, pushToHistory }));
  };

  const handleMenuBarCommand = async (command: MenuBarCommand) => {
    switch (command) {
      case 'undo':
        caseDispatch(c.undo());
        break;
      case 'redo':
        caseDispatch(c.redo());
        break;
      case 'revert': {
        if (!(await confirm('Reload the current revision?'))) {
          return;
        }
        loadRevisionData(caseData.revisions, editingRevisionIndex);
        break;
      }
      case 'save': {
        if (!editingData) return;
        const revision = editingData.revision;
        const desc = await prompt('Revision message', revision.description);
        if (desc === null) return;
        try {
          await saveRevision(caseId, revision, desc, api);
          await alert('Successfully registered a revision.');
          // For now, perform a full case reload.
          // TODO: Optimize this
          loadCase();
        } catch (err) {
          await alert('Error: ' + err.message);
          throw err;
        }
        break;
      }
      case 'exportMhd': {
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
        break;
      }
    }
  };

  if (!caseData || !projectData || !editingData) {
    return busy ? <LoadingIndicator /> : null;
  }

  return (
    <FullSpanContainer>
      <Collapser title="Case Info" className="case-info">
        <ProjectDisplay
          projectId={projectData.projectId}
          withName
          withDescription
          size="xl"
        />
        <PatientInfoBox value={caseData.patientInfoCache} />
        <div className="tag-list">
          {caseData.tags.map((t: string | number | undefined) => (
            <Tag
              projectId={projectData.projectId}
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
        caseStore={caseStore}
        onCommand={handleMenuBarCommand}
        onRevisionSelect={handleRevisionSelect}
      />
      <Editor
        key={editingRevisionIndex}
        busy={busy}
        editingData={editingData}
        projectData={projectData}
        onChange={handleDataChange}
      />
    </FullSpanContainer>
  );
};

export default CaseDetail;

type MenuBarCommand = 'undo' | 'redo' | 'revert' | 'save' | 'exportMhd';

const MenuBar: React.FC<{
  caseStore: c.CaseDetailState;
  onCommand: (command: MenuBarCommand) => void;
  onRevisionSelect: (index: number) => Promise<void>;
}> = props => {
  const { caseStore, onCommand, onRevisionSelect } = props;
  return (
    <div className="case-detail-menu">
      <div className="left">
        Revision:&ensp;
        <RevisionSelector
          revisions={caseStore.caseData.revisions}
          selected={caseStore.editingRevisionIndex}
          onSelect={onRevisionSelect}
        />
      </div>
      <div className="right">
        <IconButton
          bsStyle="default"
          icon="step-backward"
          disabled={!c.canUndo(caseStore)}
          onClick={() => onCommand('undo')}
        />
        <IconButton
          bsStyle="default"
          icon="step-forward"
          disabled={!c.canRedo(caseStore)}
          onClick={() => onCommand('redo')}
        />
        &ensp;
        <Button bsStyle="success" onClick={() => onCommand('save')}>
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
          <MenuItem eventKey="1" onSelect={() => onCommand('revert')}>
            <Icon icon="remove" />
            &ensp;Revert
          </MenuItem>
          <MenuItem divider />
          <MenuItem header>Export</MenuItem>
          <MenuItem onSelect={() => onCommand('exportMhd')}>
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
      viewOptions: { showReferenceLine }
    } = this.state;
    const activeSeries = revision.series[activeSeriesIndex];
    const activeLabel = activeSeries.labels[activeLabelIndex];
    composition.annotations.forEach((antn: { dispose: () => void }) => {
      if (antn instanceof rs.ReferenceLine) antn.dispose();
    });
    composition.removeAllAnnotations();

    const rgbaColor = (rgb: string, alpha: number): string =>
      rgb +
      Math.floor(alpha * 255)
        .toString(16)
        .padStart(2, '0');

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
      fig.min = label.data.min;
      fig.max = label.data.max;
      fig.id = label.temporarykey;
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
      return fig;
    };

    activeSeries.labels.forEach((label: LabelEntry) => {
      const isActive = activeLabel && label === activeLabel;
      const alpha = label.data.alpha ?? 1;
      const color = label.data.color ?? '#ff0000';

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
