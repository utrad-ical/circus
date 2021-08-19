import {
  Composition,
  MprViewState,
  Tool,
  Viewer
} from '@utrad-ical/circus-rs/src/browser';
import { OrientationString } from '@utrad-ical/circus-rs/src/browser/section-util';
import { toolFactory } from '@utrad-ical/circus-rs/src/browser/tool/tool-initializer';
import { Section } from '@utrad-ical/circus-rs/src/common/geometry';
import classnames from 'classnames';
import GridContainer, {
  LayoutInfo,
  layoutReducer
} from 'components/GridContainer';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import ImageViewer, {
  createStateChanger,
  InitialStateSetterFunc,
  setOrthogonalOrientation,
  StateChanger
} from 'components/ImageViewer';
import { Button, DropdownButton, MenuItem } from 'components/react-bootstrap';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef
} from 'react';
import styled from 'styled-components';
import { EditingData, EditingDataUpdater, seriesColors } from './revisionData';

export interface ViewerDef {
  key: string;
  seriesIndex: number;
  orientation: 'axial' | 'sagittal' | 'coronal' | 'oblique';
  celestialRotateMode: boolean; // only applicable for oblique view
  initialSection?: Section;
}

interface ViewerGridContextValue {
  editingData: EditingData;
  updateEditingData: EditingDataUpdater;
  compositions: { composition?: Composition }[];
  tool: Tool;
  stateChanger: StateChanger<MprViewState>;
  onCreateViewer: (viewer: Viewer, id?: string | number) => void;
  onDestroyViewer: (viewer: Viewer) => void;
  initialStateSetter: InitialStateSetterFunc<MprViewState>;
  onViewStateChange: (viewer: Viewer, id?: string | number) => void;
  multipleSeriesShown: boolean;
}

/**
 * We use this context locally to pass shared values to Header/Content components
 */
const ViewerGridContext = React.createContext<ViewerGridContextValue | null>(
  null
);

const Header: React.FC<{ value: ViewerDef }> = React.memo(props => {
  const { key, seriesIndex, orientation, celestialRotateMode } = props.value;
  const { updateEditingData, editingData, multipleSeriesShown } = useContext(
    ViewerGridContext
  )!;
  const { activeSeriesIndex, activeLayoutKey, revision } = editingData;

  const handleClick = () => {
    updateEditingData(d => {
      d.activeLayoutKey = key;
      if (d.activeSeriesIndex !== seriesIndex) {
        d.activeSeriesIndex = seriesIndex;
        d.activeLabelIndex =
          revision.series[seriesIndex].labels.length > 0 ? 0 : -1;
      }
    }, 'select active editor');
  };

  const handleRotateClick: React.MouseEventHandler<Button> = ev => {
    updateEditingData(d => {
      const item = d.layoutItems.find(item => item.key === key)!;
      item.celestialRotateMode = !item.celestialRotateMode;
    }, 'layout');
    ev.stopPropagation();
  };

  const handleSelectLayoutKind = (selected: string, ev: React.MouseEvent) => {
    updateEditingData(d => {
      const item = d.layoutItems.find(item => item.key === key)!;
      item.orientation = selected as OrientationString;
      item.celestialRotateMode = selected === 'oblique';
    }, 'layout');
    ev.stopPropagation();
  };

  const handleRemoveClick: React.MouseEventHandler<Button> = ev => {
    updateEditingData(d => {
      if (Object.keys(d.layout.positions).length <= 1) return;
      delete d.layout.positions[key];
      const idx = d.layoutItems.findIndex(item => item.key === key);
      const removed = d.layoutItems.splice(idx, 1)[0];
      if (d.activeLayoutKey === key) {
        // Choose next selected item as follows
        // 1. First item of the same series
        // 2. First item in the layout
        const sameSeriesKeys = Object.keys(d.layout.positions).filter(
          key =>
            d.layoutItems.find(item => item.key === key)!.seriesIndex ===
            removed.seriesIndex
        );
        const keys =
          sameSeriesKeys.length > 0 ? sameSeriesKeys : Object.keys(d.layout);
        const first = keys
          .map(k => [k, d.layout.positions[k]] as const)
          .sort((a, b) => a[1] - b[1])[0];
        d.activeLayoutKey = first[0];
        d.activeSeriesIndex = d.layoutItems.find(
          item => item.key === first[0]
        )!.seriesIndex;
        d.activeLabelIndex =
          d.revision.series[d.activeSeriesIndex].labels.length > 0 ? 0 : -1;
      }
      d.layout = layoutReducer(d.layout, { type: 'pruneEmptyTracks' });
    });
    ev.stopPropagation();
  };

  const active = key === activeLayoutKey;
  const selectedSeries = seriesIndex === activeSeriesIndex;

  const color = multipleSeriesShown
    ? seriesColors[Math.min(seriesIndex, seriesColors.length - 1)]
    : '#ffffff';

  return (
    <HeaderDiv
      className={classnames({ active, 'selected-series': selectedSeries })}
      onClick={handleClick}
    >
      <span>
        {multipleSeriesShown && (
          <div className="box" style={{ backgroundColor: color }} />
        )}
        Series #{seriesIndex} {orientation}
      </span>
      <span>
        {orientation === 'oblique' && (
          <Button
            bsSize="xs"
            bsStyle={celestialRotateMode ? 'primary' : 'default'}
            onClick={handleRotateClick}
          >
            Rotate
          </Button>
        )}
        <DropdownButton
          bsSize="xs"
          title={<Icon icon="glyphicon-option-horizontal" />}
          id={`viewergrid-header-dropdown-${key}`}
          pullRight
          noCaret
          onSelect={handleSelectLayoutKind as any}
        >
          <MenuItem eventKey="axial">
            <Icon icon="circus-orientation-axial" /> Axial
          </MenuItem>
          <MenuItem eventKey="sagittal">
            <Icon icon="circus-orientation-sagittal" /> Sagittal
          </MenuItem>
          <MenuItem eventKey="coronal">
            <Icon icon="circus-orientation-coronal" /> Coronal
          </MenuItem>
          <MenuItem eventKey="oblique">
            <Icon icon="circus-orientation-oblique" /> Oblique
          </MenuItem>
        </DropdownButton>
        <IconButton
          bsSize="xs"
          icon="glyphicon-remove"
          onClick={handleRemoveClick}
          disabled={Object.keys(editingData.layout.positions).length <= 1}
        />
      </span>
    </HeaderDiv>
  );
});

const HeaderDiv = styled.div`
  &.selected-series {
    background-color: #666666;
  }

  &.active {
    background-color: #555500;
  }

  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 27px;
  font-size: 15px;
  line-height: 25px;
  color: white;
  padding: 0 3px;
  background-color: #333333;
  border: 1px solid #888888;
  cursor: pointer;

  .box {
    display: inline-block;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    margin-right: 3px;
  }
`;

const celestialRotate = toolFactory('celestialRotate');

const Content: React.FC<{ value: ViewerDef }> = props => {
  const {
    key,
    seriesIndex,
    orientation,
    celestialRotateMode,
    initialSection
  } = props.value;

  const {
    compositions,
    tool,
    stateChanger,
    initialStateSetter,
    onCreateViewer,
    onDestroyViewer,
    onViewStateChange
  } = useContext(ViewerGridContext)!;

  const composition = compositions[seriesIndex].composition;

  const combinedInitialStateSetter = useCallback(
    (viewer: Viewer, viewState: MprViewState) => {
      const s1 = initialSection
        ? {
            ...orientationInitialStateSetters[orientation](viewer, viewState)!,
            section: initialSection
          }
        : orientationInitialStateSetters[orientation](viewer, viewState);
      const s2 = initialStateSetter(viewer, s1!, key);
      return s2;
    },
    [initialStateSetter, orientation, key, initialSection]
  );

  const localStateChanger = useMemo(
    () => createStateChanger<MprViewState>(),
    []
  );

  useEffect(() => {
    stateChanger.on(localStateChanger);
    return () => {
      stateChanger.off(localStateChanger);
    };
  }, [localStateChanger, stateChanger, key]);

  const initialRender = useRef<boolean>(true);
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    // Triggers only when orientation changes after initial render
    localStateChanger((state, viewer) => {
      return orientationInitialStateSetters[orientation](viewer, state)!;
    });
  }, [orientation, localStateChanger, key]);

  return (
    <StyledImageViewer
      id={key}
      key={key}
      className={`viewer-${orientation}`}
      composition={composition}
      tool={celestialRotateMode ? celestialRotate : tool}
      initialStateSetter={combinedInitialStateSetter}
      stateChanger={localStateChanger}
      onCreateViewer={onCreateViewer}
      onDestroyViewer={onDestroyViewer}
      onViewStateChange={onViewStateChange}
    />
  );
};

const StyledImageViewer = styled(ImageViewer)`
  overflow: hidden;
`;

const orientationInitialStateSetters: {
  [orientatin: string]: ReturnType<typeof setOrthogonalOrientation>;
} = {
  axial: setOrthogonalOrientation('axial'),
  sagittal: setOrthogonalOrientation('sagittal'),
  coronal: setOrthogonalOrientation('coronal'),
  oblique: setOrthogonalOrientation('axial')
};

export type Layout = 'twoByTwo' | 'axial' | 'sagittal' | 'coronal';

const ViewerGrid: React.FC<{
  editingData: EditingData;
  updateEditingData: EditingDataUpdater;
  compositions: { composition?: Composition }[];
  tool?: Tool;
  stateChanger: StateChanger<MprViewState>;
  onCreateViewer: (viewer: Viewer, id?: string | number) => void;
  onDestroyViewer: (viewer: Viewer) => void;
  initialStateSetter: InitialStateSetterFunc<MprViewState>;
  onViewStateChange: (viewer: Viewer, id?: string | number) => void;
  multipleSeriesShown: boolean;
}> = props => {
  const {
    editingData,
    updateEditingData,
    compositions,
    tool,
    stateChanger,
    onCreateViewer,
    onDestroyViewer,
    initialStateSetter,
    onViewStateChange,
    multipleSeriesShown
  } = props;

  const gridContext: ViewerGridContextValue = useMemo(
    () => ({
      editingData,
      updateEditingData,
      compositions,
      tool: tool!,
      stateChanger,
      onCreateViewer,
      onDestroyViewer,
      onViewStateChange,
      initialStateSetter,
      multipleSeriesShown
    }),
    [
      editingData,
      updateEditingData,
      compositions,
      tool,
      stateChanger,
      onCreateViewer,
      onDestroyViewer,
      onViewStateChange,
      initialStateSetter,
      multipleSeriesShown
    ]
  );

  const handleLayoutChange = (layout: LayoutInfo) => {
    updateEditingData(d => {
      d.layout = layout;
    }, 'layout');
  };

  return (
    <ViewerGridContext.Provider value={gridContext}>
      <GridContainer<ViewerDef>
        items={editingData.layoutItems}
        layout={editingData.layout}
        renderHeader={Header}
        renderItem={Content}
        onLayoutChange={handleLayoutChange}
        dragDataMimeType="text/x-circusdb-viewergrid"
      />
    </ViewerGridContext.Provider>
  );
};

export default ViewerGrid;
