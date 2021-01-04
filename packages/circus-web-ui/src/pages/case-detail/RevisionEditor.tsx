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
  usePendingVolumeLoaders,
  VolumeLoaderCacheContext
} from 'utils/useImageSource';
import * as c from './caseStore';
import LabelSelector from './LabelSelector';
import {
  EditingData,
  EditingDataUpdater,
  SeriesEntryWithLabels
} from './revisionData';
import {
  InternalLabel,
  buildAnnotation,
  labelTypes,
  TaggedLabelDataOf,
  setRecommendedDisplay
} from './labelData';
import SideContainer from './SideContainer';
import ToolBar, { LayoutKind, ViewOptions } from './ToolBar';
import ViewerGrid, { ViewerDef } from './ViewerGrid';
import IconButton from '@smikitky/rb-components/lib/IconButton';
import { Modal } from '../../components/react-bootstrap';
import SeriesSelectorDialog from './SeriesSelectorDialog';
import styled from 'styled-components';
import LabelMenu from './LabelMenu';
import { debounce } from 'lodash';
import useLocalPreference from 'utils/useLocalPreference';
import isTouchDevice from 'utils/isTouchDevice';
import useToolbar from 'pages/case-detail/useToolbar';
import Series from 'types/Series';
import { LayoutInfo, layoutReducer } from 'components/GridContainer';
import { OrientationString } from 'circus-rs/section-util';

const useCompositions = (
  series: {
    seriesUid: string;
    partialVolumeDescriptor: PartialVolumeDescriptor;
  }[]
): { composition?: Composition; volumeLoaded: boolean }[] => {
  const { rsHttpClient } = useContext(VolumeLoaderCacheContext)!;
  const [results, setResults] = useState<
    { composition?: Composition; volumeLoaded: boolean }[]
  >(() => series.map(() => ({ composition: undefined, volumeLoaded: false })));

  const volumeLoaders = usePendingVolumeLoaders(series);

  useEffect(() => {
    const comps = series.map(
      ({ seriesUid, partialVolumeDescriptor }, volId) => {
        const volumeLoader = volumeLoaders[volId];
        const imageSource = new rs.HybridMprImageSource({
          rsHttpClient,
          seriesUid,
          partialVolumeDescriptor,
          volumeLoader,
          estimateWindowType: 'none'
        });
        volumeLoader
          .loadMeta()
          .then(() => volumeLoader.loadVolume())
          .then(() => {
            setResults(results =>
              produce(results, draft => {
                draft[volId].volumeLoaded = true;
              })
            );
          });
        const composition = new Composition(imageSource);
        return { composition, volumeLoaded: false };
      }
    );
    setResults(comps);
  }, [rsHttpClient, series, volumeLoaders]);

  return results;
};

const RevisionEditor: React.FC<{
  editingData: EditingData;
  updateEditingData: EditingDataUpdater;
  caseDispatch: React.Dispatch<any>;
  seriesData: { [seriesUid: string]: Series };
  projectData: Project;
  refreshCounter: number;
  busy: boolean;
}> = props => {
  const {
    editingData,
    updateEditingData,
    caseDispatch,
    seriesData,
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
      showReferenceLine: false,
      scrollbar: 'none',
      interpolationMode: 'nearestNeighbor'
    }
  );

  // Keeps track of stable seriesUid-PVD pairs to avoid frequent comp changes
  const [allSeries, setAllSeries] = useState<
    {
      seriesUid: string;
      partialVolumeDescriptor: PartialVolumeDescriptor;
    }[]
  >(editingData.revision.series);
  useEffect(() => {
    const series = editingData.revision.series;
    if (
      series.some(
        (s, i) =>
          s.seriesUid !== allSeries[i].seriesUid ||
          s.partialVolumeDescriptor !== allSeries[i].partialVolumeDescriptor
      )
    ) {
      setAllSeries(
        series.map(({ seriesUid, partialVolumeDescriptor }) => ({
          seriesUid,
          partialVolumeDescriptor
        }))
      );
    }
  }, [allSeries, editingData.revision.series]);

  const [layoutableItems, setLayoutableItems] = useState<ViewerDef[]>([]);
  const [layout, setLayout] = useState<LayoutInfo>({
    columns: 2,
    rows: 2,
    positions: {}
  });

  const activeSeries =
    editingData.revision.series[editingData.activeSeriesIndex];

  const compositions = useCompositions(allSeries);
  // const { composition, volumeLoaded } = compositions[
  //   editingData.activeSeriesIndex
  // ];
  const activeVolumeLoaded =
    compositions[editingData.activeSeriesIndex].volumeLoaded;

  const registerNewViewerCellKey = useCallback(
    (volumeId: number, orientation: OrientationString) => {
      const key = new Array(16)
        .fill(0)
        .map(() => String.fromCharCode(97 + Math.floor(Math.random() * 26)))
        .join('');
      setLayoutableItems(layoutableItems =>
        produce(layoutableItems, draft => {
          draft.push({
            key,
            volumeId,
            orientation,
            celestialRotateMode: orientation === 'oblique'
          });
        })
      );
      return key;
    },
    []
  );

  const updateViewerCellKey = useCallback(
    (key: string, update: (current: ViewerDef) => ViewerDef | void) => {
      setLayoutableItems(layoutableItems => {
        const index = layoutableItems.findIndex(item => item.key === key);
        if (index < 0) return layoutableItems;
        const item = layoutableItems[index];
        const newItem = produce(item, update);
        return produce(layoutableItems, draft => {
          draft[index] = newItem;
        });
      });
    },
    []
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

  const performLayout = useCallback(
    (kind: LayoutKind, seriesIndex) => {
      if (compositions.some(c => !c.composition)) return;
      const layout: LayoutInfo = {
        columns: kind === 'twoByTwo' ? 2 : 1,
        rows: kind === 'twoByTwo' ? 2 : 1,
        positions: {}
      };
      const orientations: OrientationString[] =
        kind === 'twoByTwo'
          ? ['axial', 'sagittal', 'coronal', 'oblique']
          : [kind];
      let tmp = layout;
      orientations.forEach(orientation => {
        const key = registerNewViewerCellKey(seriesIndex, orientation);
        if (!key) return;
        tmp = layoutReducer(tmp, {
          type: 'insertItemToEmptyCell',
          payload: { key }
        });
      });
      setLayout(tmp);
    },
    [compositions, registerNewViewerCellKey]
  );

  // Performs initial viewer layout
  useEffect(() => {
    if (Object.keys(layout.positions).length) return;
    performLayout('twoByTwo', 0);
  }, [layout.positions, performLayout]);

  const handleChangeLayoutKind = (kind: LayoutKind) => {
    performLayout(kind, editingData.activeSeriesIndex);
  };

  const handleAnnotationChange = (
    annotation:
      | rs.VoxelCloud
      | rs.SolidFigure
      | rs.PlaneFigure
      | rs.Point
      | rs.Ruler
  ) => {
    const { revision } = editingData;
    const seriesIndex = revision.series.findIndex(
      s => s.labels.findIndex(v => v.temporaryKey === annotation.id) >= 0
    );
    const labelIndex = revision.series[seriesIndex].labels.findIndex(
      v => v.temporaryKey === annotation.id
    );

    const newLabel = () => {
      const label = revision.series[seriesIndex].labels[labelIndex];
      if (annotation instanceof rs.VoxelCloud && annotation.volume) {
        return produce(label, (l: TaggedLabelDataOf<'voxel'>) => {
          l.data.origin = annotation.origin;
          l.data.size = annotation.volume!.getDimension();
          l.data.volumeArrayBuffer = annotation.volume!.data;
        });
      } else if (
        annotation instanceof rs.SolidFigure &&
        annotation.validate()
      ) {
        return produce(
          label,
          (l: TaggedLabelDataOf<'ellipsoid' | 'cuboid'>) => {
            l.data.min = annotation.min!;
            l.data.max = annotation.max!;
          }
        );
      } else if (
        annotation instanceof rs.PlaneFigure &&
        annotation.validate()
      ) {
        return produce(
          label,
          (l: TaggedLabelDataOf<'rectangle' | 'ellipse'>) => {
            l.data.min = annotation.min!;
            l.data.max = annotation.max!;
            l.data.z = annotation.z as number;
          }
        );
      } else if (annotation instanceof rs.Point && annotation.validate()) {
        return produce(label, (l: TaggedLabelDataOf<'point'>) => {
          l.data.location = annotation.location!;
        });
      } else if (annotation instanceof rs.Ruler && annotation.validate()) {
        return produce(label, (l: TaggedLabelDataOf<'ruler'>) => {
          l.data.section = annotation.section!;
          l.data.start = annotation.start!;
          l.data.end = annotation.end!;
          l.data.labelPosition = annotation.labelPosition;
        });
      } else {
        return label;
      }
    };

    updateEditingData(d => {
      d.revision.series[seriesIndex].labels[labelIndex] = newLabel();
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
    compositions.forEach((entry, seriesIndex) => {
      const composition = entry.composition;
      if (!composition) return;

      composition.on('annotationChange', annotation =>
        latestHandleAnnotationChange.current(annotation)
      );

      const { revision, activeSeriesIndex, activeLabelIndex } = editingData;
      const activeLabel =
        revision.series[activeSeriesIndex].labels[activeLabelIndex];
      const series = revision.series[seriesIndex];

      composition.annotations.forEach(antn => {
        if (antn instanceof rs.ReferenceLine) antn.dispose();
        if (antn instanceof rs.Scrollbar) antn.dispose();
      });
      composition.removeAllAnnotations();

      series.labels.forEach((label: InternalLabel) => {
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
        Object.keys(viewers)
          .filter(key => {
            const item = layoutableItems.find(item => item.key === key);
            return item && item.volumeId === seriesIndex;
          })
          .forEach(key => {
            const item = layoutableItems.find(item => item.key === key);
            composition.addAnnotation(
              new rs.ReferenceLine(viewers[key], {
                color: orientationColor(item!.orientation)
              })
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
    });
    return () => {
      compositions.forEach(entry =>
        entry.composition?.removeAllListeners('annotationChange')
      );
    };
  }, [
    compositions,
    editingData,
    viewOptions.showReferenceLine,
    viewOptions.scrollbar,
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

  const handleReveal = () => {
    setRecommendedDisplay(
      compositions[editingData.activeSeriesIndex].composition!,
      Object.values(viewers),
      activeLabel
    );
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

  if (!activeSeries) return null;

  return (
    <StyledDiv className={classNames('case-revision-data', { busy })}>
      <SideContainer>
        <Collapser title="Series / Labels" className="labels" noPadding>
          <LabelMenu
            editingData={editingData}
            onReveal={handleReveal}
            updateEditingData={updateEditingData}
            viewers={viewers}
            disabled={busy}
          />
          <LabelSelector
            registerNewViewerCellKey={registerNewViewerCellKey}
            seriesData={seriesData}
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

          {activeLabel &&
            Object.keys(projectData.labelAttributesSchema.properties || {})
              .length > 0 && (
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
        {Object.keys(projectData.caseAttributesSchema.properties || {}).length >
          0 && (
          <Collapser title="Case Attributes" className="case-attributes">
            <JsonSchemaEditor
              key={refreshCounter}
              schema={projectData.caseAttributesSchema}
              value={revision.attributes}
              onChange={caseAttributesChange}
              onValidate={valid =>
                caseDispatch(c.validateCaseAttributes(valid))
              }
              disabled={busy}
            />
          </Collapser>
        )}
      </SideContainer>
      <div className="case-revision-main">
        <ToolBar
          active={activeToolName}
          onChangeTool={setActiveTool}
          toolOptions={toolOptions}
          setToolOption={setToolOption}
          viewOptions={viewOptions}
          onChangeViewOptions={setViewOptions}
          onChangeLayoutKind={handleChangeLayoutKind}
          wandEnabled={activeVolumeLoaded}
          windowPresets={projectData.windowPresets}
          onApplyWindow={handleApplyWindow}
          brushEnabled={editorEnabled}
          disabled={busy}
        />
        <ViewerGrid
          items={layoutableItems}
          compositions={compositions}
          layout={layout}
          setLayout={setLayout}
          stateChanger={stateChanger}
          tool={activeTool}
          activeSeriesIndex={editingData.activeSeriesIndex}
          onCreateViewer={handleCreateViwer}
          onDestroyViewer={handleDestroyViewer}
          initialStateSetter={initialStateSetter}
          onViewStateChange={handleViewStateChange}
          updateViewerCellKey={updateViewerCellKey}
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
