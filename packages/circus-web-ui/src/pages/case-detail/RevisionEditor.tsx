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
  InternalLabelDataOf,
  setRecommendedDisplay
} from './labelData';
import SideContainer from './SideContainer';
import ToolBar, { ViewOptions } from './ToolBar';
import ViewerGrid from './ViewerGrid';
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
import ModifierKeyBehaviors from '@utrad-ical/circus-rs/src/browser/annotation/ModifierKeyBehaviors';

const useCompositions = (
  series: {
    seriesUid: string;
    partialVolumeDescriptor: PartialVolumeDescriptor;
  }[]
) => {
  const { rsHttpClient } = useContext(VolumeLoaderCacheContext)!;
  const [results, setResults] = useState<
    { composition?: Composition; volumeLoaded: boolean }[]
  >(() => series.map(() => ({ composition: undefined, volumeLoaded: false })));

  const volumeLoaders = usePendingVolumeLoaders(series);

  useEffect(() => {
    const compositions = series.map(
      ({ seriesUid, partialVolumeDescriptor }, volId) => {
        const volumeLoader = volumeLoaders[volId];
        const imageSource = new rs.WebGlHybridMprImageSource({
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
    setResults(compositions);
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

  const viewWindows = useRef<rs.ViewWindow[]>([]);

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

  const [modifierKeyBehaviors, setModifierKeyBehaviors] = useLocalPreference<
    ModifierKeyBehaviors
  >('dbModifierKeyBehaviors', {
    lockMaintainAspectRatio: false,
    lockFixCenterOfGravity: false
  });
  const handleChangeModifierKeyBehaviors = (
    shapeResizeOptions: ModifierKeyBehaviors
  ) => {
    setModifierKeyBehaviors(shapeResizeOptions);
  };

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
          s.seriesUid !== allSeries[i]?.seriesUid ||
          s.partialVolumeDescriptor !== allSeries[i]?.partialVolumeDescriptor
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

  const activeSeries =
    editingData.revision.series[editingData.activeSeriesIndex];

  const compositions = useCompositions(allSeries);

  const volumeLoadedStatus = compositions.map(entry => entry.volumeLoaded);
  const activeVolumeLoaded = volumeLoadedStatus[editingData.activeSeriesIndex];

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
    'bucketEraser',
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

  const handleChangeLayoutKind = (kind: c.LayoutKind) => {
    updateEditingData(d => {
      const [layoutItems, layout] = c.performLayout(
        kind,
        editingData.activeSeriesIndex
      );
      d.layoutItems = layoutItems;
      d.layout = layout;
      d.activeLayoutKey = layoutItems[0].key;
    });
  };

  const multipleSeriesShown = useMemo(() => {
    const seriesIndexes = Object.keys(editingData.layout.positions).map(
      key => editingData.layoutItems.find(item => item.key === key)!.seriesIndex
    );
    return new Set(seriesIndexes).size > 1;
  }, [editingData.layout, editingData.layoutItems]);

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
        return produce(label, (l: InternalLabelDataOf<'voxel'>) => {
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
          (l: InternalLabelDataOf<'ellipsoid' | 'cuboid'>) => {
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
          (l: InternalLabelDataOf<'rectangle' | 'ellipse'>) => {
            l.data.min = annotation.min!;
            l.data.max = annotation.max!;
            l.data.z = annotation.z as number;
          }
        );
      } else if (annotation instanceof rs.Point && annotation.validate()) {
        return produce(label, (l: InternalLabelDataOf<'point'>) => {
          l.data.location = annotation.location!;
        });
      } else if (annotation instanceof rs.Ruler && annotation.validate()) {
        return produce(label, (l: InternalLabelDataOf<'ruler'>) => {
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
    const {
      revision,
      activeSeriesIndex,
      activeLabelIndex,
      allLabelsHidden
    } = editingData;
    // wait until composition is synced
    if (compositions.length !== revision.series.length) return;
    compositions.forEach((entry, seriesIndex) => {
      const composition = entry.composition;
      if (!composition) return;

      composition.on('annotationChange', annotation =>
        latestHandleAnnotationChange.current(annotation)
      );

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
        if (label.hidden || allLabelsHidden) return;
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
        const layoutItems = editingData.layoutItems;
        Object.keys(viewers)
          .filter(key => {
            const item = layoutItems.find(item => item.key === key);
            return item && item.seriesIndex === seriesIndex;
          })
          .forEach(key => {
            const item = layoutItems.find(item => item.key === key);
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

      composition.annotations.forEach(antn => {
        if (
          antn instanceof rs.Cuboid ||
          antn instanceof rs.Ellipsoid ||
          antn instanceof rs.PlaneFigure
        ) {
          antn.lockMaintainAspectRatio =
            modifierKeyBehaviors.lockMaintainAspectRatio;
          antn.lockFixCenterOfGravity =
            modifierKeyBehaviors.lockFixCenterOfGravity;
        }
      });

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
    modifierKeyBehaviors,
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
    if (result === null) return; // dialog cancelled
    updateEditingData(d => {
      d.revision.series = result;
      d.activeSeriesIndex = 0;
      d.activeLabelIndex = d.revision.series[0].labels.length > 0 ? 0 : -1;
      const [layoutItems, layout] = c.performLayout('twoByTwo', 0);
      d.layoutItems = layoutItems;
      d.layout = layout;
      d.activeLayoutKey = layoutItems[0].key;
    });
  };

  const handleApplyWindow = useCallback(
    (window: rs.ViewWindow) => stateChanger(state => ({ ...state, window })),
    [stateChanger]
  );

  const handleMagnify = useCallback(
    (magnitude: number) =>
      stateChanger(state => {
        const section = rs.scaleSectionFromCenter(state.section, 1 / magnitude);
        return { ...state, section };
      }),
    [stateChanger]
  );

  const handleCreateViwer = useCallback(
    (viewer: Viewer, id?: string | number) => {
      viewers[id!] = viewer;
    },
    [viewers]
  );

  const handleDestroyViewer = useCallback(
    (viewer: Viewer) => {
      Object.keys(viewers).forEach(k => {
        if (viewers[k] === viewer) delete viewers[k];
      });
    },
    [viewers]
  );

  const handleReveal = () => {
    setRecommendedDisplay(
      compositions[editingData.activeSeriesIndex].composition!,
      Object.values(viewers),
      activeLabel
    );
  };

  const propagateWindowState = useMemo(
    () =>
      debounce((viewer: Viewer, id: string) => {
        const window = (viewer.getState() as rs.MprViewState).window;
        const seriesIndex = editingData.layoutItems.find(
          item => item.key === id
        )!.seriesIndex;
        const targetKeys = editingData.layoutItems
          .filter(item => item.seriesIndex === seriesIndex)
          .map(item => item.key);
        stateChanger((state, viewer, id) => {
          if (targetKeys.indexOf(id as string) < 0) return state;
          if (
            state.window.width !== window.width ||
            state.window.level !== window.level
          ) {
            return { ...state, window };
          }
          return state;
        });
      }, 500),
    [editingData.layoutItems, stateChanger]
  );

  const handleViewStateChange = useCallback(
    (viewer: Viewer, id?: string | number) => {
      const seriesIndex = editingData.layoutItems.find(item => item.key === id)!
        .seriesIndex;
      const window = (viewer.getState() as rs.MprViewState).window;
      viewWindows.current[seriesIndex] = window;
      propagateWindowState(viewer, id as string);
    },
    [editingData.layoutItems, propagateWindowState]
  );

  const initialStateSetter = (
    viewer: Viewer,
    viewState: rs.ViewState,
    id: string | number | undefined
  ): rs.MprViewState => {
    const src = viewer.getComposition()!.imageSource as rs.MprImageSource;
    if (!src.metadata || viewState.type !== 'mpr') throw new Error();
    const windowPriority = projectData.windowPriority || 'auto';
    const interpolationMode =
      viewOptions.interpolationMode ?? 'nearestNeighbor';
    const seriesIndex = editingData.layoutItems.find(item => item.key === id)!
      .seriesIndex;
    if (viewWindows.current[seriesIndex]) {
      return {
        ...viewState,
        window: viewWindows.current[seriesIndex],
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
      viewWindows.current[seriesIndex] = window;
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
            caseDispatch={caseDispatch}
            viewers={viewers}
            disabled={busy}
          />
          <LabelSelector
            seriesData={seriesData}
            volumeLoadedStatus={volumeLoadedStatus}
            editingData={editingData}
            updateEditingData={updateEditingData}
            disabled={busy}
            multipleSeriesShown={multipleSeriesShown}
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
                    caseDispatch(
                      c.validateLabelAttributes({
                        key: activeLabel.temporaryKey,
                        valid
                      })
                    )
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
          modifierKeyBehaviors={modifierKeyBehaviors}
          onChangeModifierKeyBehaviors={handleChangeModifierKeyBehaviors}
          onChangeLayoutKind={handleChangeLayoutKind}
          wandEnabled={activeVolumeLoaded}
          windowPresets={projectData.windowPresets}
          onApplyWindow={handleApplyWindow}
          onMagnify={handleMagnify}
          brushEnabled={editorEnabled}
          disabled={busy}
        />
        <ViewerGrid
          editingData={editingData}
          updateEditingData={updateEditingData}
          compositions={compositions}
          stateChanger={stateChanger}
          tool={activeTool}
          onCreateViewer={handleCreateViwer}
          onDestroyViewer={handleDestroyViewer}
          initialStateSetter={initialStateSetter}
          onViewStateChange={handleViewStateChange}
          multipleSeriesShown={multipleSeriesShown}
        />
      </div>
      {seriesDialogOpen && (
        <Modal show bsSize="lg" onHide={() => {}}>
          <SeriesSelectorDialog
            onResolve={handleSeriesDialogResolve}
            initialValue={editingData.revision.series}
          />
        </Modal>
      )}
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
    background-color: #333333;
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
