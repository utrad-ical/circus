import JsonSchemaEditor from '@smikitky/rb-components/lib/JsonSchemaEditor';
import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';
import * as rs from '@utrad-ical/circus-rs/src/browser';
import { Composition, Viewer } from '@utrad-ical/circus-rs/src/browser';
import ToolBaseClass from '@utrad-ical/circus-rs/src/browser/tool/Tool';
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

const useComposition = (
  seriesUid: string,
  partialVolumeDescriptor: PartialVolumeDescriptor
): Composition | undefined => {
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

  return composition;
};

const RevisionEditor: React.FC<{
  editingData: EditingData;
  updateEditingData: EditingDataUpdater;
  caseDispatch: React.Dispatch<any>;
  projectData: Project;
  busy: boolean;
}> = props => {
  const {
    editingData,
    updateEditingData,
    caseDispatch,
    projectData,
    busy
  } = props;

  const viewersRef = useRef<{ [key: string]: Viewer }>({});
  const viewers = viewersRef.current;
  const toolsRef = useRef<{ [key: string]: ToolBaseClass }>({});
  const tools = toolsRef.current;
  const stateChanger = useMemo(() => createStateChanger<rs.MprViewState>(), []);
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);

  const [viewOptions, setViewOptions] = useState<ViewOptions>({
    layout: 'twoByTwo',
    showReferenceLine: false,
    interpolationMode: 'trilinear'
  });
  const [lineWidth, setLineWidth] = useState(1);
  const [toolName, setToolName] = useState('');
  const [tool, setTool] = useState<ToolBaseClass | null>(null);

  const editingSeries =
    editingData.revision.series[editingData.activeSeriesIndex];
  const composition = useComposition(
    editingSeries.seriesUid,
    editingSeries.partialVolumeDescriptor
  );

  const handleAnnotationChange = (
    annotation: rs.VoxelCloud | rs.SolidFigure | rs.PlaneFigure
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
    });
    composition.removeAllAnnotations();

    activeSeries.labels.forEach((label: InternalLabel) => {
      const isActive = activeLabel && label === activeLabel;
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
    return () => {
      composition.removeAllListeners('annotationChange');
    };
  }, [composition, editingData, viewOptions.showReferenceLine, viewers]);

  useEffect(() => {
    stateChanger(viewState => ({
      ...viewState,
      interpolationMode: viewOptions.interpolationMode
    }));
  }, [stateChanger, viewOptions.interpolationMode]);

  const getTool = useCallback(
    (toolName: string): ToolBaseClass => {
      const tool = tools[toolName] || rs.toolFactory(toolName);
      tools[toolName] = tool;
      return tool;
    },
    [tools]
  );

  useEffect(() => {
    if (composition && !tool) {
      setToolName('pager');
      setTool(getTool('pager'));
    }
  }, [composition, getTool, tool]);

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
    console.log('r', result);
    updateEditingData(d => {
      d.revision.series = result;
    });
  };

  const changeTool = useCallback(
    (toolName: string) => {
      setToolName(toolName);
      setTool(getTool(toolName));
    },
    [getTool]
  );

  const handleApplyWindow = useCallback(
    (window: rs.ViewWindow) => stateChanger(state => ({ ...state, window })),
    [stateChanger]
  );

  const handleSetLineWidth = useCallback(
    (lineWidth: number) => {
      setLineWidth(lineWidth);
      getTool('brush').setOptions({ width: lineWidth });
      getTool('eraser').setOptions({ width: lineWidth });
    },
    [getTool]
  );

  const handleCreateViwer = (viewer: Viewer, id?: string | number) => {
    viewers[id!] = viewer;
  };

  const handleDestroyViewer = (viewer: Viewer) => {
    Object.keys(viewers).forEach(k => {
      if (viewers[k] === viewer) delete viewers[k];
    });
  };

  const initialWindowSetter = (
    viewer: Viewer,
    viewState: rs.ViewState
  ): rs.MprViewState => {
    const src = viewer.getComposition()!.imageSource as rs.MprImageSource;
    if (!src.metadata || viewState.type !== 'mpr') throw new Error();
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
    return viewState; // do not update view state (should not happen)
  };

  const { revision, activeSeriesIndex, activeLabelIndex } = editingData;
  const activeSeries = revision.series[activeSeriesIndex];

  if (!activeSeries || !composition) return null;
  const activeLabel = activeSeries.labels[activeLabelIndex];
  const brushEnabled = activeLabel ? activeLabel.type === 'voxel' : false;

  return (
    <StyledDiv className={classNames('case-revision-data', { busy })}>
      <SideContainer>
        <Collapser title="Series / Labels" className="labels" noPadding>
          <LabelSelector
            editingData={editingData}
            composition={composition}
            updateEditingData={updateEditingData}
            viewers={viewers}
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
                key={activeLabel.temporaryKey}
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
            key={revision.date}
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
          active={toolName}
          onChangeTool={changeTool}
          viewOptions={viewOptions}
          onChangeViewOptions={setViewOptions}
          lineWidth={lineWidth}
          setLineWidth={handleSetLineWidth}
          windowPresets={projectData.windowPresets}
          onApplyWindow={handleApplyWindow}
          brushEnabled={brushEnabled}
          disabled={busy}
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
