import JsonSchemaEditor from '@smikitky/rb-components/lib/JsonSchemaEditor';
import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';
import * as rs from '@utrad-ical/circus-rs/src/browser';
import { Composition, Viewer } from '@utrad-ical/circus-rs/src/browser';
import classNames from 'classnames';
import Collapser from 'components/Collapser';
import Icon from 'components/Icon';
import { createStateChanger } from 'components/ImageViewer';
import produce from 'immer';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import Project from 'types/Project';
import {
  stringifyPartialVolumeDescriptor,
  usePendingVolumeLoader,
  VolumeLoaderCacheContext
} from 'utils/useImageSource';
import * as c from './caseStore';
import LabelSelector from './LabelSelector';
import {
  buildAnnotation,
  EditingData,
  EditingDataUpdater,
  InternalLabel,
  labelTypes,
  SeriesEntryWithLabels
} from './revisionData';
import SideContainer from './SideContainer';
import ToolBar, { ViewOptions } from './ToolBar';
import ViewerCluster from './ViewerCluster';
import IconButton from '@smikitky/rb-components/lib/IconButton';
import { Modal } from '../../components/react-bootstrap';
import SeriesSelectorDialog from './SeriesSelectorDialog';
import styled from 'styled-components';
import LabelMenu from './LabelMenu';
import { debounce } from 'lodash';
import useLocalPreference from 'utils/useLocalPreference';
import isTouchDevice from 'utils/isTouchDevice';
import useToolbar from 'utils/useToolbar';

const useComposition = (
  seriesUid: string,
  partialVolumeDescriptor: PartialVolumeDescriptor
): { composition: Composition | undefined; volumeLoaded: boolean } => {
  const { rsHttpClient } = useContext(VolumeLoaderCacheContext)!;

  const volumeLoader = usePendingVolumeLoader(
    seriesUid,
    partialVolumeDescriptor
  );

  const pvdStr = stringifyPartialVolumeDescriptor(partialVolumeDescriptor);

  const composition = useMemo(
    () => {
      const imageSource = new rs.HybridMprImageSource({
        rsHttpClient,
        seriesUid,
        partialVolumeDescriptor,
        volumeLoader,
        estimateWindowType: 'none'
      });
      const composition = new Composition(imageSource);
      return composition;
    },
    // eslint-disable-next-line
    [rsHttpClient, seriesUid, pvdStr, volumeLoader]
  );

  const [volumeLoaded, setVolumeLoaded] = useState<boolean>(false);
  useEffect(() => {
    volumeLoader
      .loadMeta()
      .then(() => volumeLoader.loadVolume())
      .then(() => setVolumeLoaded(true));
  }, [volumeLoader]);

  return { composition, volumeLoaded };
};

const RevisionEditor: React.FC<{
  editingData: EditingData;
  updateEditingData: EditingDataUpdater;
  caseDispatch: React.Dispatch<any>;
  projectData: Project;
  refreshCounter: number;
  busy: boolean;
}> = props => {
  const {
    editingData,
    updateEditingData,
    caseDispatch,
    projectData,
    refreshCounter,
    busy
  } = props;

  const viewersRef = useRef<{ [key: string]: Viewer }>({});
  const viewers = viewersRef.current;

  const viewWindows = useRef<{ [seriesUid: string]: rs.ViewWindow }>({});

  const [touchDevice] = useState(() => isTouchDevice());
  const stateChanger = useMemo(() => createStateChanger<rs.MprViewState>(), []);
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);

  const [viewOptions, setViewOptions] = useLocalPreference<ViewOptions>(
    'dbViewOptions',
    {
      layout: 'twoByTwo',
      showReferenceLine: false,
      scrollbar: 'none',
      interpolationMode: 'nearestNeighbor'
    }
  );

  const activeSeries =
    editingData.revision.series[editingData.activeSeriesIndex];
  const { composition, volumeLoaded } = useComposition(
    activeSeries.seriesUid,
    activeSeries.partialVolumeDescriptor
  );
  const { revision, activeLabelIndex } = editingData;

  const activeLabel = activeSeries.labels[activeLabelIndex];

  const [
    activeTool,
    { activeToolName, toolOptions },
    { setActiveTool, setToolOption }
  ] = useToolbar();

  const [editorEnabled, setEditorEnabled] = useState<boolean>(false);
  const toolNameAtEditorDisabledRef = useRef<string>();
  const activeToolIsEditor = [
    'brush',
    'eraser',
    'bucket',
    'wand',
    'wandEraser'
  ].some(t => t === activeToolName);
  const activeLabelIsVoxel = activeLabel && activeLabel.type === 'voxel';
  useEffect(() => {
    if (!editorEnabled && activeLabelIsVoxel) {
      setEditorEnabled(true);
      if (toolNameAtEditorDisabledRef.current) {
        setActiveTool(toolNameAtEditorDisabledRef.current);
        toolNameAtEditorDisabledRef.current = undefined;
      }
    } else if (editorEnabled && !activeLabelIsVoxel) {
      if (activeToolIsEditor) {
        toolNameAtEditorDisabledRef.current = activeToolName;
        setActiveTool('pager');
      }
      setEditorEnabled(false);
    }
  }, [
    activeLabelIsVoxel,
    activeToolIsEditor,
    editorEnabled,
    activeToolName,
    setActiveTool
  ]);

  const handleAnnotationChange = (
    annotation: rs.VoxelCloud | rs.SolidFigure | rs.PlaneFigure | rs.Point
  ) => {
    const { revision, activeSeriesIndex } = editingData;
    const labelIndex = revision.series[activeSeriesIndex].labels.findIndex(
      v => v.temporaryKey === annotation.id
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
      } else if (annotation instanceof rs.Point && annotation.validate()) {
        return produce(label, (l: any) => {
          l.data.origin = annotation.origin;
        });
      } else {
        return label;
      }
    };

    updateEditingData(d => {
      d.revision.series[activeSeriesIndex].labels[labelIndex] = newLabel();
    });
  };

  const latestHandleAnnotationChange = useRef<any>();
  useEffect(() => {
    latestHandleAnnotationChange.current = handleAnnotationChange;
  });

  const orientationColor = (id: string) => {
    const orientationColors: { [index: string]: string } = {
      axial: '#8888ff',
      sagittal: '#ff6666',
      coronal: '#88ff88',
      oblique: '#ffff88'
    };
    return orientationColors[id.replace(/one-/, '')];
  };

  useEffect(() => {
    if (!composition) return;

    composition.on('annotationChange', annotation =>
      latestHandleAnnotationChange.current(annotation)
    );

    const { revision, activeSeriesIndex, activeLabelIndex } = editingData;
    const activeSeries = revision.series[activeSeriesIndex];
    const activeLabel = activeSeries.labels[activeLabelIndex];

    composition.annotations.forEach(antn => {
      if (antn instanceof rs.ReferenceLine) antn.dispose();
      if (antn instanceof rs.Scrollbar) antn.dispose();
    });
    composition.removeAllAnnotations();

    activeSeries.labels.forEach((label: InternalLabel) => {
      const isActive = activeLabel && label === activeLabel;
      if (label.hidden) return;
      composition.addAnnotation(
        buildAnnotation(
          label,
          {
            color: label.data.color ?? '#ff0000',
            alpha: label.data.alpha ?? 1
          },
          isActive
        )
      );
    });

    if (viewOptions.showReferenceLine) {
      Object.keys(viewers).forEach(k => {
        composition.addAnnotation(
          new rs.ReferenceLine(viewers[k], { color: orientationColor(k) })
        );
      });
    }

    if (viewOptions.scrollbar !== 'none') {
      Object.keys(viewers).forEach(k => {
        composition.addAnnotation(
          new rs.Scrollbar(viewers[k], {
            color: orientationColor(k),
            size: viewOptions.scrollbar === 'large' ? 30 : 20,
            visibility: touchDevice ? 'always' : 'hover'
          })
        );
      });
    }

    composition.annotationUpdated();
    return () => {
      composition.removeAllListeners('annotationChange');
    };
  }, [
    composition,
    editingData,
    viewOptions.showReferenceLine,
    viewOptions.scrollbar,
    viewOptions.layout,
    touchDevice,
    viewers
  ]);

  useEffect(() => {
    stateChanger(viewState => ({
      ...viewState,
      interpolationMode: viewOptions.interpolationMode ?? 'nearestNeighbor'
    }));
  }, [stateChanger, viewOptions.interpolationMode]);

  const labelAttributesChange = (value: any) => {
    const { activeSeriesIndex, activeLabelIndex } = editingData;
    updateEditingData(d => {
      d.revision.series[activeSeriesIndex].labels[
        activeLabelIndex
      ].attributes = value;
    }, `Change label attributes: ${activeLabel.temporaryKey}`);
  };

  const caseAttributesChange = (value: any) => {
    updateEditingData(d => {
      d.revision.attributes = value;
    }, 'Change case attributes');
  };

  const handleModifySeries = () => {
    setSeriesDialogOpen(true);
  };

  const handleSeriesDialogResolve = (
    result: SeriesEntryWithLabels[] | null
  ) => {
    if (busy) return;
    setSeriesDialogOpen(false);
    if (result === null) return;
    updateEditingData(d => {
      d.revision.series = result;
    });
  };

  const handleApplyWindow = useCallback(
    (window: rs.ViewWindow) => stateChanger(state => ({ ...state, window })),
    [stateChanger]
  );

  const handleCreateViwer = (viewer: Viewer, id?: string | number) => {
    viewers[id!] = viewer;
  };

  const handleDestroyViewer = (viewer: Viewer) => {
    Object.keys(viewers).forEach(k => {
      if (viewers[k] === viewer) delete viewers[k];
    });
  };

  const propagateWindowState = useMemo(
    () =>
      debounce((viewer: Viewer) => {
        const window = (viewer.getState() as rs.MprViewState).window;
        stateChanger(state => {
          if (
            state.window.width !== window.width ||
            state.window.level !== window.level
          ) {
            return { ...state, window };
          } else {
            return state;
          }
        });
      }, 500),
    [stateChanger]
  );

  const handleViewStateChange = useCallback(
    (viewer: Viewer) => {
      viewWindows.current[
        activeSeries.seriesUid
      ] = (viewer.getState() as rs.MprViewState).window;
      propagateWindowState(viewer);
    },
    [propagateWindowState, activeSeries.seriesUid, viewWindows]
  );

  const initialStateSetter = (
    viewer: Viewer,
    viewState: rs.ViewState
  ): rs.MprViewState => {
    const src = viewer.getComposition()!.imageSource as rs.MprImageSource;
    if (!src.metadata || viewState.type !== 'mpr') throw new Error();
    const windowPriority = projectData.windowPriority || 'auto';
    const interpolationMode =
      viewOptions.interpolationMode ?? 'nearestNeighbor';
    if (viewWindows.current[activeSeries.seriesUid]) {
      return {
        ...viewState,
        window: viewWindows.current[activeSeries.seriesUid],
        interpolationMode
      };
    }
    const window = (() => {
      const priorities = windowPriority.split(',');
      for (const type of priorities) {
        switch (type) {
          case 'auto': {
            const window = src.metadata.estimatedWindow;
            if (window) return window;
            break;
          }
          case 'dicom': {
            const window = src.metadata.dicomWindow;
            if (window) return window;
            break;
          }
          case 'preset': {
            const window =
              Array.isArray(projectData.windowPresets) &&
              projectData.windowPresets[0];
            if (window) return { level: window.level, width: window.width };
            break;
          }
        }
      }
      return undefined;
    })();
    if (window) {
      viewWindows.current[activeSeries.seriesUid] = window;
      return { ...viewState, window, interpolationMode };
    }
    return viewState; // do not update view state (should not happen)
  };

  if (!activeSeries || !composition) return null;

  return (
    <StyledDiv className={classNames('case-revision-data', { busy })}>
      <SideContainer>
        <Collapser title="Series / Labels" className="labels" noPadding>
          <LabelMenu
            editingData={editingData}
            composition={composition}
            updateEditingData={updateEditingData}
            viewers={viewers}
            disabled={busy}
          />
          <LabelSelector
            editingData={editingData}
            updateEditingData={updateEditingData}
            disabled={busy}
          />

          <div className="add-series-pane">
            <IconButton
              bsSize="xs"
              icon="plus"
              onClick={handleModifySeries}
              disabled={busy}
            >
              Add series
            </IconButton>
          </div>

          {activeLabel && (
            <div className="label-attributes">
              <b>Attributes for</b>:{' '}
              <Icon icon={labelTypes[activeLabel.type].icon} />{' '}
              <span className="label-name">{activeLabel.name}</span>
              <JsonSchemaEditor
                key={activeLabel.temporaryKey + ':' + refreshCounter}
                schema={projectData.labelAttributesSchema}
                value={activeLabel.attributes || {}}
                onChange={labelAttributesChange}
                onValidate={valid =>
                  caseDispatch(c.validateLabelAttributes(valid))
                }
                disabled={busy}
              />
            </div>
          )}
        </Collapser>
        <Collapser title="Case Attributes" className="case-attributes">
          <JsonSchemaEditor
            key={refreshCounter}
            schema={projectData.caseAttributesSchema}
            value={revision.attributes}
            onChange={caseAttributesChange}
            onValidate={valid => caseDispatch(c.validateCaseAttributes(valid))}
            disabled={busy}
          />
        </Collapser>
      </SideContainer>
      <div className="case-revision-main">
        <ToolBar
          active={activeToolName}
          onChangeTool={setActiveTool}
          toolOptions={toolOptions}
          setToolOption={setToolOption}
          viewOptions={viewOptions}
          onChangeViewOptions={setViewOptions}
          wandEnabled={volumeLoaded}
          windowPresets={projectData.windowPresets}
          onApplyWindow={handleApplyWindow}
          brushEnabled={editorEnabled}
          disabled={busy}
        />
        <ViewerCluster
          composition={composition}
          layout={viewOptions.layout ?? 'twoByTwo'}
          stateChanger={stateChanger}
          tool={activeTool}
          onCreateViewer={handleCreateViwer}
          onDestroyViewer={handleDestroyViewer}
          initialStateSetter={initialStateSetter}
          onViewStateChange={handleViewStateChange}
        />
      </div>
      <Modal show={seriesDialogOpen} bsSize="lg">
        <SeriesSelectorDialog
          onResolve={handleSeriesDialogResolve}
          initialValue={editingData.revision.series}
        />
      </Modal>
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  height: 0px; // recalculated by flexbox
  flex: 1 1 0;
  display: flex;
  flex-direction: row;

  .case-revision-main {
    // tool bar and viewer grid
    height: 100%;
    width: 0px;
    flex: 1 0 0;
    display: flex;
    flex-direction: column;
  }

  &.busy {
    opacity: 0.5;
  }
  .add-series-pane {
    margin: 15px;
    text-align: right;
  }

  .label-attributes {
    margin: 15px;
    .label-name {
      overflow: visible;
      word-break: break-all;
    }
  }
`;

export default RevisionEditor;
