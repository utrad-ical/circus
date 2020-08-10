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
import produce from 'immer';
import React, {
  useEffect,
  useReducer,
  useRef,
  useMemo,
  useState,
  useCallback
} from 'react';
import { useSelector } from 'react-redux';
import { useApi } from 'utils/api';
import shallowEqual from 'utils/shallowEqual';
import LabelSelector from './LabelSelector';
import {
  EditingData,
  LabelEntry,
  loadLabels,
  PlaneFigureLabel,
  Revision,
  saveRevision,
  SolidFigureLabel,
  VoxelLabel
} from './revisionData';
import RevisionSelector from './RevisionSelector';
import SideContainer from './SideContainer';
import ToolBar from './ToolBar';
import ViewerCluster, { Layout } from './ViwewerCluster';
import { useParams } from 'react-router-dom';
import caseStoreReducer, * as c from './caseStore';
import Project from 'types/Project';
import { useStateChanger } from 'components/ImageViewer';

const CaseDetail: React.FC<{}> = props => {
  const caseId = useParams<any>().caseId;
  const [caseStore, caseDispatch] = useReducer(
    caseStoreReducer,
    caseStoreReducer(undefined as any, { type: 'dummy' }) // gets initial state
  );
  const api = useApi();

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

  const handleDataChange = useCallback(
    (newData: EditingData, pushToHistory: any = false) => {
      caseDispatch(c.change({ newData, pushToHistory }));
    },
    []
  );

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

interface ViewOptions {
  layout: Layout;
  showReferenceLine: boolean;
  interpolationMode: InterpolationMode;
}

const Editor: React.FC<{
  editingData: EditingData;
  onChange: (newData: EditingData, pushToHistory?: any) => void;
  projectData: Project;
  busy: boolean;
}> = props => {
  const { editingData, onChange, projectData, busy } = props;

  const viewersRef = useRef<{ [key: string]: Viewer }>({});
  const viewers = viewersRef.current;
  const server = useSelector(state => state.loginUser.data!.dicomImageServer);
  const rsHttpClient = useMemo(() => new rs.RsHttpClient(server), [server]);
  const toolsRef = useRef<{ [key: string]: ToolBaseClass }>({});
  const tools = toolsRef.current;
  const stateChanger = useStateChanger<rs.MprViewState>();

  const [viewOptions, setViewOptions] = useState<ViewOptions>({
    layout: 'twoByTwo',
    showReferenceLine: false,
    interpolationMode: 'trilinear'
  });
  const [composition, setComposition] = useState<Composition | null>(null);
  const [lineWidth, setLineWidth] = useState(1);
  const [toolName, setToolName] = useState('');
  const [tool, setTool] = useState<any>(null);
  const [activeSeriesUid, setActiveSeriesUid] = useState<string | null>(
    editingData.revision.series[editingData.activeSeriesIndex].seriesUid
  );

  const handleAnnotationChange = (
    annotation: rs.VoxelCloud | rs.SolidFigure | rs.PlaneFigure
  ) => {
    const { revision, activeSeriesIndex } = editingData;
    const labelIndex = revision.series[activeSeriesIndex].labels.findIndex(
      v => v.temporarykey === annotation.id
    );

    const newLabel = () => {
      const label = revision.series[activeSeriesIndex].labels[labelIndex];
      if (annotation instanceof rs.VoxelCloud && annotation.volume) {
        return produce(label, (l: any) => {
          l.data.origin = annotation.origin;
          l.data.size = annotation.volume!.getDimension();
          l.data.volumeArrayBuffer = annotation.volume!.data;
        });
      } else if (
        annotation instanceof rs.SolidFigure &&
        annotation.validate()
      ) {
        return produce(label, (l: any) => {
          l.data.min = annotation.min;
          l.data.max = annotation.max;
        });
      } else if (
        annotation instanceof rs.PlaneFigure &&
        annotation.validate()
      ) {
        return produce(label, (l: any) => {
          l.data.min = annotation.min;
          l.data.max = annotation.max;
          l.data.z = annotation.z;
        });
      } else {
        return label;
      }
    };

    onChange(
      produce(editingData, d => {
        d.revision.series[activeSeriesIndex].labels[labelIndex] = newLabel();
      }),
      true
    );
  };

  const latestHandleAnnotationChange = useRef<any>();
  useEffect(() => {
    latestHandleAnnotationChange.current = handleAnnotationChange;
  });
  useEffect(() => {
    if (!activeSeriesUid) return;
    const changeActiveSeries = async () => {
      const volumeLoader = new rs.RsVolumeLoader({
        rsHttpClient,
        seriesUid: activeSeriesUid,
        estimateWindowType: 'none'
      });
      const src = new rs.HybridMprImageSource({
        volumeLoader,
        rsHttpClient,
        seriesUid: activeSeriesUid,
        estimateWindowType: 'none'
      });
      const composition = new Composition(src);
      composition.on('annotationChange', () =>
        latestHandleAnnotationChange.current()
      );
      await src.ready();
      setComposition(composition);
    };
    changeActiveSeries();
  }, [rsHttpClient, activeSeriesUid]);

  useEffect(() => {
    if (!composition) return;
    const { revision, activeSeriesIndex, activeLabelIndex } = editingData;
    const activeSeries = revision.series[activeSeriesIndex];
    const activeLabel = activeSeries.labels[activeLabelIndex];

    composition.annotations.forEach(antn => {
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
    if (viewOptions.showReferenceLine) {
      const lineColors: { [index: string]: string } = {
        axial: '#8888ff',
        sagittal: '#ff6666',
        coronal: '#88ff88',
        oblique: '#ffff88'
      };
      Object.keys(viewers).forEach(k => {
        composition.addAnnotation(
          new rs.ReferenceLine(viewers[k], { color: lineColors[k] })
        );
      });
    }
    composition.annotationUpdated();
  }, [composition, editingData, viewOptions.showReferenceLine, viewers]);

  useEffect(() => {
    stateChanger.emit('change', viewState => ({
      ...viewState,
      interpolationMode: viewOptions.interpolationMode
    }));
  }, [stateChanger, viewOptions.interpolationMode]);

  const changeActiveLabel = (seriesIndex: number, labelIndex: number) => {
    onChange(
      produce(editingData, d => {
        d.activeLabelIndex = seriesIndex;
        d.activeLabelIndex = labelIndex;
      }),
      false
    );
  };

  const labelAttributesChange = (value: any, isTextInput: boolean) => {
    const { activeSeriesIndex, activeLabelIndex } = editingData;
    onChange(
      produce(editingData, d => {
        d.revision.series[activeSeriesIndex].labels[
          activeLabelIndex
        ].attributes = value;
      }),
      !isTextInput
    );
  };

  const handleLabelAttributesTextBlur = () => {
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

  const caseAttributesChange = (value: any, isTextInput: boolean) => {
    onChange(
      produce(editingData, d => {
        d.revision.attributes = value;
      }),
      !isTextInput
    );
  };

  const handleCaseAttributesTextBlur = () => {
    onChange(editingData, (old: { revision: { attributes: any } }) => {
      return !shallowEqual(
        old.revision.attributes,
        editingData.revision.attributes
      );
    });
  };

  const getTool = (toolName: string): ToolBaseClass => {
    const tool = tools[toolName] || rs.toolFactory(toolName);
    tools[toolName] = tool;
    return tool;
  };

  const changeTool = (toolName: string) => {
    setToolName(toolName);
    setTool(getTool(toolName));
  };

  const handleChangeViewOptions = (viewOptions: ViewOptions) => {
    setViewOptions(viewOptions);
  };

  const handleApplyWindow = (window: any) => {
    stateChanger.emit('change', state => ({ ...state, window }));
  };

  const handleSetLineWidth = (lineWidth: number) => {
    setLineWidth(lineWidth);
    getTool('brush').setOptions({ width: lineWidth });
    getTool('eraser').setOptions({ width: lineWidth });
  };

  const handleCreateViwer = (viewer: Viewer, id: string | number) => {
    viewers[id] = viewer;
  };

  const handleDestroyViewer = (viewer: Viewer) => {
    Object.keys(viewers).forEach(k => {
      if (viewers[k] === viewer) delete viewers[k];
    });
  };

  const handleSeriesChange = (
    newData: EditingData,
    pushToHistory: boolean = false
  ) => {
    onChange(newData, pushToHistory);
  };

  const initialWindowSetter = (viewer: any, viewState: rs.ViewState) => {
    const src = viewer.composition.imageSource;
    const windowPriority = projectData.windowPriority || 'auto';
    const priorities = windowPriority.split(',');
    for (const type of priorities) {
      switch (type) {
        case 'auto': {
          const window = src.metadata.estimatedWindow;
          if (window) {
            return { ...viewState, window };
          }
          break;
        }
        case 'dicom': {
          const window = src.metadata.dicomWindow;
          if (window) {
            return { ...viewState, window };
          }
          break;
        }
        case 'preset': {
          const window =
            Array.isArray(projectData.windowPresets) &&
            projectData.windowPresets[0];
          if (window) {
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

  const { revision, activeSeriesIndex, activeLabelIndex } = editingData;
  const activeSeries = revision.series[activeSeriesIndex];

  if (!activeSeries || !composition) return null;
  const activeLabel = activeSeries.labels[activeLabelIndex];
  const brushEnabled = activeLabel ? activeLabel.type === 'voxel' : false;

  return (
    <div className={classNames('case-revision-data', { busy })}>
      <SideContainer>
        <Collapser title="Series / Labels" className="labels">
          <LabelSelector
            editingData={editingData}
            composition={composition}
            onChange={handleSeriesChange}
            activeSeries={activeSeries}
            activeLabel={activeLabel}
            onChangeActiveLabel={changeActiveLabel}
            viewers={viewers}
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
                onChange={labelAttributesChange}
                onTextBlur={handleLabelAttributesTextBlur}
              />
            </div>
          )}
        </Collapser>
        <Collapser title="Case Attributes" className="case-attributes">
          <JsonSchemaEditor
            schema={projectData.caseAttributesSchema}
            value={revision.attributes}
            onChange={caseAttributesChange}
            onTextBlur={handleCaseAttributesTextBlur}
          />
        </Collapser>
      </SideContainer>

      <div className="case-revision-main">
        <ToolBar
          active={toolName}
          onChangeTool={changeTool}
          viewOptions={viewOptions}
          onChangeViewOptions={handleChangeViewOptions}
          lineWidth={lineWidth}
          setLineWidth={handleSetLineWidth}
          windowPresets={projectData.windowPresets}
          onApplyWindow={handleApplyWindow}
          brushEnabled={brushEnabled}
        />
        <ViewerCluster
          composition={composition}
          layout={viewOptions.layout}
          stateChanger={stateChanger}
          tool={tool!}
          onCreateViewer={handleCreateViwer}
          onDestroyViewer={handleDestroyViewer}
          initialWindowSetter={initialWindowSetter}
        />
      </div>
    </div>
  );
};
