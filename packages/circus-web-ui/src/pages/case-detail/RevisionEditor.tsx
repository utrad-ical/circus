import IconButton from '@smikitky/rb-components/lib/IconButton';
import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';
import * as rs from '@utrad-ical/circus-rs/src/browser';
import { Composition, Viewer } from '@utrad-ical/circus-rs/src/browser';
import ModifierKeyBehaviors from '@utrad-ical/circus-rs/src/browser/annotation/ModifierKeyBehaviors';
import {
  DicomVolumeMetadata,
  ProgressEventListener
} from '@utrad-ical/circus-rs/src/browser/image-source/volume-loader/DicomVolumeLoader';
import {
  sectionFrom2dViewState,
  sectionTo2dViewState
} from '@utrad-ical/circus-rs/src/browser/section-util';
import { InterpolationMode } from '@utrad-ical/circus-rs/src/browser/ViewState';
import classNames from 'classnames';
import Collapser from 'components/Collapser';
import Icon from 'components/Icon';
import { createStateChanger } from 'components/ImageViewer';
import StyledJsonSchemaEditor from 'components/StyledJsonSchemaEditor';
import produce from 'immer';
import { debounce } from 'lodash';
import useToolbar from 'pages/case-detail/useToolbar';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import styled from 'styled-components';
import Project from 'types/Project';
import Series from 'types/Series';
import isTouchDevice from 'utils/isTouchDevice';
import { useUserPreferences } from 'utils/useLoginUser';
import { useVolumeLoaders } from 'utils/useVolumeLoader';
import { Modal } from '../../components/react-bootstrap';
import {
  ScrollBarsSettings,
  WindowPropagationScope
} from '../../store/loginUser';
import * as c from './caseStore';
import {
  buildAnnotation,
  InternalLabel,
  InternalLabelDataOf,
  labelTypes,
  setRecommendedDisplay
} from './labelData';
import LabelMenu from './LabelMenu';
import LabelSelector from './LabelSelector';
import {
  EditingData,
  EditingDataLayoutInitializer,
  EditingDataUpdater,
  SeriesEntryWithLabels
} from './revisionData';
import SeriesSelectorDialog from './SeriesSelectorDialog';
import SideContainer from './SideContainer';
import ToolBar, { ViewOptions, zDimmedThresholdOptions } from './ToolBar';
import ViewerGrid from './ViewerGrid';
import { ViewWindow } from './ViewWindowEditor';

const useCompositions = (
  series: {
    seriesUid: string;
    partialVolumeDescriptor: PartialVolumeDescriptor;
  }[]
) => {
  const [results, setResults] = useState<
    {
      metadata?: DicomVolumeMetadata;
      composition?: Composition;
      progress: number;
    }[]
  >(() =>
    series.map(() => ({
      metadata: undefined,
      composition: undefined,
      progress: 0
    }))
  );

  const volumeLoaders = useVolumeLoaders(series);

  useEffect(() => {
    const abortController = new AbortController();

    series.forEach(async ({}, volId) => {
      const volumeLoader = volumeLoaders[volId];

      const metadata = await volumeLoader.loadMeta();
      if (abortController.signal.aborted) return;

      const src = (() => {
        switch (metadata.mode) {
          case '2d':
            return new rs.TwoDimensionalImageSource({
              volumeLoader,
              maxCacheSize: 10
            });
          default:
            return new rs.WebGlRawVolumeMprImageSource({ volumeLoader });
        }
      })();

      const composition = new Composition(src);
      abortController.signal.addEventListener('abort', () =>
        composition.dispose()
      );

      setResults(results => [
        ...results.slice(0, volId),
        { ...results[volId], metadata, composition },
        ...results.slice(volId + 1)
      ]);

      const progressListener: ProgressEventListener = ({ finished, total }) => {
        setResults(results =>
          produce(results, draft => {
            draft[volId].progress = (finished || 0) / (total || 1);
          })
        );
      };

      volumeLoader.loadController?.on('progress', progressListener);
      abortController.signal.addEventListener('abort', () =>
        volumeLoader.loadController?.off('progress', progressListener)
      );

      await volumeLoader.loadVolume();
      if (abortController.signal.aborted) return;

      setResults(results =>
        produce(results, draft => {
          draft[volId].progress = 1;
        })
      );
    });

    return () => abortController.abort();
  }, [series, volumeLoaders]);

  useEffect(() => {
    setResults(
      series.map(() => ({
        metadata: undefined,
        composition: undefined,
        progress: 0
      }))
    );
  }, [series]);

  return results;
};

const RevisionEditor: React.FC<{
  editingData: EditingData;
  initEditingDataLayout: EditingDataLayoutInitializer;
  updateEditingData: EditingDataUpdater;
  caseDispatch: React.Dispatch<any>;
  seriesData: { [seriesUid: string]: Series };
  projectData: Project;
  refreshCounter: number;
  busy: boolean;
}> = props => {
  const {
    editingData,
    initEditingDataLayout,
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
  const [currentWindow, setCurrentWindow] = useState<ViewWindow>({
    level: 0,
    width: 0
  });

  const [touchDevice] = useState(() => isTouchDevice());
  const stateChanger = useMemo(
    () => createStateChanger<rs.MprViewState | rs.TwoDimensionalViewState>(),
    []
  );
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);

  // const preferences = useLoginUser().preferences;
  const [preferences, updatePreferences] = useUserPreferences();

  const [viewOptions, setViewOptions] = useState<ViewOptions>({
    showReferenceLine: preferences.referenceLine ?? false,
    scrollbar: (preferences.scrollBarsInfo &&
    preferences.scrollBarsInfo.visibility
      ? preferences.scrollBarsInfo
      : {
          visibility: 'none',
          size: 'small',
          position: 'right'
        }) as ScrollBarsSettings,
    interpolationMode: (preferences.interpolationMode ??
      'nearestNeighbor') as InterpolationMode,
    windowPropagationScope: preferences.windowPropagationScope ?? 'all'
  });

  const saveViewOptions = (newViewOptions: ViewOptions) => {
    setViewOptions(newViewOptions);
    updatePreferences({
      ...preferences,
      referenceLine: newViewOptions.showReferenceLine,
      scrollBarsInfo: newViewOptions.scrollbar,
      interpolationMode: newViewOptions.interpolationMode,
      windowPropagationScope: newViewOptions.windowPropagationScope
    });
  };

  const [modifierKeyBehaviors, setModifierKeyBehaviors] = useState({
    lockMaintainAspectRatio: preferences.maintainAspectRatio ?? false,
    lockFixCenterOfGravity: preferences.fixCenterOfGravity ?? false
  });

  const saveModifierKeyBehaviors = (
    newModifierKeyBehaviors: ModifierKeyBehaviors
  ) => {
    setModifierKeyBehaviors(newModifierKeyBehaviors);
    updatePreferences({
      ...preferences,
      maintainAspectRatio: newModifierKeyBehaviors.lockMaintainAspectRatio,
      fixCenterOfGravity: newModifierKeyBehaviors.lockFixCenterOfGravity
    });
  };

  const [planeFigureOption, setPlaneFigureOption] = useState({
    zDimmedThreshold: preferences.dimmedOutlineFor2DLabels
      ? zDimmedThresholdOptions.find(
          zDimmedThresholdOption =>
            zDimmedThresholdOption.key === preferences.dimmedOutlineFor2DLabels
        )!.value
      : 3
  });

  const savePlaneFigureOption = (newPlaneFigureOption: {
    zDimmedThreshold: number;
  }) => {
    setPlaneFigureOption(newPlaneFigureOption);
    updatePreferences({
      ...preferences,
      dimmedOutlineFor2DLabels:
        newPlaneFigureOption.zDimmedThreshold === 0
          ? 'hide'
          : isFinite(newPlaneFigureOption.zDimmedThreshold)
          ? 'infinity'
          : 'show'
    });
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

  const metaLoadedAll = compositions.every(comp => !!comp.metadata);
  const metadata = compositions.map(entry => entry.metadata);

  const volumeLoadingProgresses = compositions.map(entry => entry.progress);
  const activeSeriesMetadata =
    compositions[editingData.activeSeriesIndex].metadata;

  const wandEnabled =
    volumeLoadingProgresses[editingData.activeSeriesIndex] === 1;

  const windowEnabled = !(
    metaLoadedAll &&
    compositions.every(comp => comp.metadata!.pixelFormat === 'rgba8')
  );

  const layoutEnabled = !(metaLoadedAll && activeSeriesMetadata!.mode !== '3d');

  const layoutInitialized = !!(
    Object.keys(editingData.layout.positions).length > 0 &&
    editingData.layoutItems.length > 0 &&
    editingData.activeLayoutKey
  );

  useEffect(() => {
    if (!activeSeriesMetadata || layoutInitialized) return;
    initEditingDataLayout(d => {
      if (
        Object.keys(d.layout.positions).length > 0 &&
        d.layoutItems.length > 0 &&
        d.activeLayoutKey
      )
        return;
      const layoutKind = activeSeriesMetadata.mode !== '3d' ? '2d' : 'twoByTwo';
      const [layoutItems, layout] = c.performLayout(
        layoutKind,
        editingData.activeSeriesIndex
      );
      d.layout = layout;
      d.layoutItems = layoutItems;
      d.activeLayoutKey = layoutItems.length > 0 ? layoutItems[0].key : null;
    });
  }, [
    layoutInitialized,
    activeSeriesMetadata,
    editingData,
    initEditingDataLayout
  ]);

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
    const activeImageSource =
      compositions[editingData.activeSeriesIndex].composition?.imageSource;
    if (
      activeImageSource instanceof rs.TwoDimensionalImageSource &&
      (annotation instanceof rs.VoxelCloud ||
        annotation instanceof rs.SolidFigure)
    ) {
      alert('Unsupported image source.');
      return;
    }

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
    const { revision, activeSeriesIndex, activeLabelIndex, allLabelsHidden } =
      editingData;
    // wait until composition is synced
    if (compositions.length !== revision.series.length) return;
    const viewerId = editingData.activeLayoutKey;
    const viewState =
      viewerId && viewerId in viewers && viewers[viewerId].getState();
    viewState &&
      'window' in viewState &&
      viewState.window &&
      setCurrentWindow(viewState.window);
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

      if (
        viewOptions.scrollbar &&
        viewOptions.scrollbar.visibility &&
        viewOptions.scrollbar.visibility !== 'none'
      ) {
        Object.keys(viewers).forEach(key => {
          composition.addAnnotation(
            new rs.Scrollbar(viewers[key], {
              color: undefined,
              size: viewOptions.scrollbar!.size === 'large' ? 30 : 20,
              position: viewOptions.scrollbar!.position,
              visibility: viewOptions.scrollbar!.visibility as
                | 'always'
                | 'hover'
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
        if (antn instanceof rs.PlaneFigure) {
          antn.zDimmedThreshold = planeFigureOption.zDimmedThreshold;
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
    planeFigureOption,
    touchDevice,
    viewers
  ]);

  useEffect(() => {
    stateChanger(viewState => {
      switch (viewState.type) {
        case '2d': {
          return {
            ...viewState,
            interpolationMode: viewOptions.interpolationMode ?? 'none'
          } as rs.TwoDimensionalViewState;
        }
        case 'mpr':
        default:
          return {
            ...viewState,
            interpolationMode:
              viewOptions.interpolationMode ?? 'nearestNeighbor'
          } as rs.MprViewState;
      }
    });
  }, [stateChanger, viewOptions.interpolationMode]);

  const labelAttributesChange = (value: any) => {
    const { activeSeriesIndex, activeLabelIndex } = editingData;
    updateEditingData(d => {
      d.revision.series[activeSeriesIndex].labels[activeLabelIndex].attributes =
        value;
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
    const activeSeriesIndex = 0;
    const activeSeriesMetadata = metadata[activeSeriesIndex];
    if (!activeSeriesMetadata) return;
    const layoutKind = activeSeriesMetadata.mode !== '3d' ? '2d' : 'twoByTwo';
    setSeriesDialogOpen(false);
    if (result === null) return; // dialog cancelled
    updateEditingData(d => {
      d.revision.series = result;
      d.activeSeriesIndex = activeSeriesIndex;
      d.activeLabelIndex =
        d.revision.series[activeSeriesIndex].labels.length > 0 ? 0 : -1;
      const [layoutItems, layout] = c.performLayout(
        layoutKind,
        activeSeriesIndex
      );
      d.layoutItems = layoutItems;
      d.layout = layout;
      d.activeLayoutKey = layoutItems[0].key;
    });
  };

  const handleApplyWindow = useCallback(
    (window: rs.ViewWindow) => {
      const targetKeys =
        viewOptions.windowPropagationScope === 'viewer'
          ? editingData.activeLayoutKey
          : viewOptions.windowPropagationScope === 'series'
          ? editingData.layoutItems
              .filter(
                item => item.seriesIndex === editingData.activeSeriesIndex
              )
              .map(item => item.key)
          : editingData.layoutItems.map(item => item.key);
      if (!targetKeys) return;
      stateChanger((state, viewer, id) => {
        if (targetKeys.indexOf(id as string) < 0) return state;
        return { ...state, window };
      });
    },
    [
      stateChanger,
      editingData.activeLayoutKey,
      editingData.activeSeriesIndex,
      editingData.layoutItems,
      viewOptions.windowPropagationScope
    ]
  );

  const handleMagnify = useCallback(
    (magnitude: number) =>
      stateChanger(state => {
        switch (state.type) {
          case '2d': {
            const prevSection = sectionFrom2dViewState(state);
            const section = rs.scaleSectionFromCenter(
              prevSection,
              1 / magnitude
            );
            return { ...sectionTo2dViewState(state, section) };
          }
          case 'mpr': {
            const prevSection = state.section;
            const section = rs.scaleSectionFromCenter(
              prevSection,
              1 / magnitude
            );
            return { ...state, section };
          }
          default: {
            throw new Error('Unsupported view state.');
          }
        }
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
      debounce(
        (
          viewer: Viewer,
          id: string,
          windowPropagationScope: WindowPropagationScope
        ) => {
          if (windowPropagationScope === 'viewer') return;
          const viewState = viewer.getState();
          if (!viewState) return;
          const window =
            viewState.type === 'mpr' || viewState.type === '2d'
              ? viewState.window
              : undefined;
          const seriesIndex = editingData.layoutItems.find(
            item => item.key === id
          )!.seriesIndex;
          const targetKeys =
            windowPropagationScope === 'series'
              ? editingData.layoutItems
                  .filter(item => item.seriesIndex === seriesIndex)
                  .map(item => item.key)
              : editingData.layoutItems.map(item => item.key);
          stateChanger((state, viewer, id) => {
            if (targetKeys.indexOf(id as string) < 0) return state;
            if (!state.window) return state;
            if (!window) return state;
            if (
              state.window.width !== window.width ||
              state.window.level !== window.level
            ) {
              return { ...state, window };
            }
            return state;
          });
        },
        500
      ),
    [stateChanger, editingData.layoutItems]
  );

  const handleViewStateChange = useCallback(
    (viewer: Viewer, id?: string | number) => {
      if (!editingData.layoutItems || editingData.activeLayoutKey !== id)
        return;
      const seriesIndex = editingData.layoutItems.find(
        item => item.key === id
      )!.seriesIndex;
      const viewState = viewer.getState();
      if (!viewState) return;
      if (viewState.type !== 'mpr' && viewState.type !== '2d') return;
      const window = viewState.window;
      if (!window) return;
      setCurrentWindow(window);

      activeToolName === 'window' &&
        window.level !== viewWindows.current[seriesIndex].level &&
        window.width !== viewWindows.current[seriesIndex].width &&
        viewer.getDraggingState() &&
        propagateWindowState(
          viewer,
          id as string,
          viewOptions.windowPropagationScope ?? 'all'
        );
      viewWindows.current[seriesIndex] = window;
    },
    [
      propagateWindowState,
      editingData.layoutItems,
      viewOptions.windowPropagationScope,
      editingData.activeLayoutKey,
      activeToolName
    ]
  );

  const handleChangeActiveLayoutKey = (id?: string | number) => {
    if (!id || editingData.activeLayoutKey === id) return;
    const key = typeof id === 'string' ? id : editingData.layoutItems[id].key;
    const seriesIndex = editingData.layoutItems.find(
      item => item.key === key
    )!.seriesIndex;
    updateEditingData(d => {
      d.activeLayoutKey = key;
      if (d.activeSeriesIndex !== seriesIndex) {
        d.activeSeriesIndex = seriesIndex;
        d.activeLabelIndex =
          revision.series[seriesIndex].labels.length > 0 ? 0 : -1;
      }
    }, 'select active editor');
  };

  const getWindow = (metadata: DicomVolumeMetadata | undefined) => {
    if (!metadata) throw new Error('No metadata available.');
    const windowPriority = projectData.windowPriority || 'auto';
    const priorities = windowPriority.split(',');
    for (const type of priorities) {
      switch (type) {
        case 'auto': {
          const window = metadata.estimatedWindow;
          if (window) return window;
          break;
        }
        case 'dicom': {
          const window = metadata.dicomWindow;
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
  };

  const initialStateSetter = (
    viewer: Viewer,
    viewState: rs.ViewState,
    id: string | number | undefined
  ): rs.MprViewState | rs.TwoDimensionalViewState => {
    const seriesIndex = editingData.layoutItems.find(
      item => item.key === id
    )!.seriesIndex;

    switch (viewState.type) {
      case 'mpr': {
        const src = viewer.getComposition()!.imageSource;
        if (!(src instanceof rs.MprImageSource))
          throw new Error('Unsupported image source.');

        const interpolationMode =
          viewOptions.interpolationMode ?? 'nearestNeighbor';

        if (viewWindows.current[seriesIndex]) {
          return {
            ...viewState,
            window: viewWindows.current[seriesIndex],
            interpolationMode
          };
        }

        const window = getWindow(src.metadata);
        if (window) {
          viewWindows.current[seriesIndex] = window;
          setCurrentWindow(window);
          return { ...viewState, window, interpolationMode };
        }

        return viewState; // do not update view state (should not happen)
      }
      case '2d': {
        const src = viewer.getComposition()!.imageSource;
        if (!(src instanceof rs.TwoDimensionalImageSource))
          throw new Error('Unsupported image source.');

        const interpolationMode =
          viewOptions.interpolationMode &&
          viewOptions.interpolationMode !== 'nearestNeighbor'
            ? 'bilinear'
            : 'none';

        if (viewWindows.current[seriesIndex]) {
          return {
            ...viewState,
            window: viewWindows.current[seriesIndex],
            interpolationMode
          };
        }

        const window = getWindow(src.metadata);
        if (window) {
          viewWindows.current[seriesIndex] = window;
          setCurrentWindow(window);
          return { ...viewState, window, interpolationMode };
        }
        return viewState; // do not update view state
      }
      default: {
        throw new Error('Unsupported view state.');
      }
    }
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
            metadata={metadata}
          />
          <LabelSelector
            seriesData={seriesData}
            volumeLoadingProgresses={volumeLoadingProgresses}
            editingData={editingData}
            updateEditingData={updateEditingData}
            disabled={busy}
            multipleSeriesShown={multipleSeriesShown}
            metadata={metadata}
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
                <StyledJsonSchemaEditor
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
            <StyledJsonSchemaEditor
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
          onChangeViewOptions={saveViewOptions}
          modifierKeyBehaviors={modifierKeyBehaviors}
          onChangeModifierKeyBehaviors={saveModifierKeyBehaviors}
          planeFigureOption={planeFigureOption}
          onChangePlaneFigureOption={savePlaneFigureOption}
          onChangeLayoutKind={handleChangeLayoutKind}
          wandEnabled={wandEnabled}
          windowEnabled={windowEnabled}
          windowPresets={projectData.windowPresets}
          currentWindow={currentWindow}
          onApplyWindow={handleApplyWindow}
          onMagnify={handleMagnify}
          brushEnabled={editorEnabled}
          layoutEnabled={layoutEnabled}
          disabled={busy}
        />
        {activeSeriesMetadata && (
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
            onMouseDown={handleChangeActiveLayoutKey}
            multipleSeriesShown={multipleSeriesShown}
          />
        )}
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
