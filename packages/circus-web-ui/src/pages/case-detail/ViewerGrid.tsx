import { Composition, MprViewState, Tool, Viewer, ViewState } from 'circus-rs';
import { toolFactory } from 'circus-rs/tool/tool-initializer';
import GridContainer, { LayoutInfo } from 'components/GridContainer';
import Icon from 'components/Icon';
import ImageViewer, {
  createStateChanger,
  setOrthogonalOrientation,
  StateChanger
} from 'components/ImageViewer';
import { Button, DropdownButton, MenuItem } from 'components/react-bootstrap';
import React, { useContext, useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { OrientationString } from 'circus-rs/section-util';
import { EditingDataUpdater } from './revisionData';

export interface ViewerDef {
  key: string;
  seriesIndex: number;
  orientation: 'axial' | 'sagittal' | 'coronal' | 'oblique';
  celestialRotateMode: boolean; // only applicable for oblique view
}

interface ViewerGridContextValue {
  compositions: { composition?: Composition }[];
  tool: Tool;
  activeSeriesIndex: number;
  stateChanger: StateChanger<MprViewState>;
  onCreateViewer: (viewer: Viewer, id?: string | number) => void;
  onDestroyViewer: (viewer: Viewer) => void;
  initialStateSetter: (viewer: Viewer, viewState: ViewState) => ViewState;
  onViewStateChange: (viewer: Viewer, id?: string | number) => void;
  updateEditingData: EditingDataUpdater;
}

/**
 * We use this context locally to pass shared values to Header/Content components
 */
const ViewerGridContext = React.createContext<ViewerGridContextValue | null>(
  null
);

const Header: React.FC<{ value: ViewerDef }> = React.memo(props => {
  const { key, seriesIndex, orientation, celestialRotateMode } = props.value;

  const { updateEditingData, activeSeriesIndex } = useContext(
    ViewerGridContext
  )!;

  const handleRotateClick = () => {
    updateEditingData(d => {
      const item = d.layoutItems.find(item => item.key === key)!;
      item.celestialRotateMode = !item.celestialRotateMode;
    }, 'layout');
  };

  const handleSelect = (selected: string) => {
    updateEditingData(d => {
      const item = d.layoutItems.find(item => item.key === key)!;
      item.orientation = selected as OrientationString;
      item.celestialRotateMode = selected === 'oblique';
    }, 'layout');
  };

  const active = seriesIndex === activeSeriesIndex;

  return (
    <HeaderDiv className={active ? 'active' : ''}>
      <span>
        Viewer: Series #{seriesIndex} {orientation}
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
          onSelect={handleSelect}
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
      </span>
    </HeaderDiv>
  );
});

const HeaderDiv = styled.div`
  &.active {
    background-color: #555500;
  }

  display: flex;
  justify-content: space-between;
  height: 27px;
  font-size: 15px;
  line-height: 25px;
  color: white;
  padding: 0 3px;
  background-color: #444444;
  border: 1px solid #888888;
  cursor: pointer;
`;

const celestialRotate = toolFactory('celestialRotate');

const Content: React.FC<{ value: ViewerDef }> = props => {
  const { key, seriesIndex, orientation, celestialRotateMode } = props.value;

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

  const combinedInitialStateSetter = (
    viewer: Viewer,
    viewState: MprViewState
  ) => {
    const s1 = orientationInitialStateSetters[orientation](viewer, viewState);
    const s2 = initialStateSetter(viewer, s1!);
    return s2;
  };

  const localStateChanger = useMemo(
    () => createStateChanger<MprViewState>(),
    []
  );

  useEffect(() => {
    stateChanger.on(localStateChanger);
    () => {
      stateChanger.off(localStateChanger);
    };
  }, [localStateChanger, stateChanger]);

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
  items: ViewerDef[];
  compositions: { composition?: Composition }[];
  layout: LayoutInfo;
  onLayoutChange: (layout: LayoutInfo) => void;
  tool?: Tool;
  activeSeriesIndex: number;
  stateChanger: StateChanger<MprViewState>;
  onCreateViewer: (viewer: Viewer, id?: string | number) => void;
  onDestroyViewer: (viewer: Viewer) => void;
  initialStateSetter: (viewer: Viewer, viewState: ViewState) => ViewState;
  onViewStateChange: (viewer: Viewer, id?: string | number) => void;
  updateEditingData: EditingDataUpdater;
}> = props => {
  const {
    items,
    compositions,
    tool,
    activeSeriesIndex,
    stateChanger,
    layout,
    onLayoutChange,
    onCreateViewer,
    onDestroyViewer,
    initialStateSetter,
    onViewStateChange,
    updateEditingData
  } = props;

  const gridContext: ViewerGridContextValue = useMemo(
    () => ({
      compositions,
      tool: tool!,
      activeSeriesIndex,
      stateChanger,
      onCreateViewer,
      onDestroyViewer,
      onViewStateChange,
      initialStateSetter,
      updateEditingData
    }),
    [
      compositions,
      tool,
      activeSeriesIndex,
      stateChanger,
      onCreateViewer,
      onDestroyViewer,
      onViewStateChange,
      initialStateSetter,
      updateEditingData
    ]
  );

  return (
    <ViewerGridContext.Provider value={gridContext}>
      <GridContainer<ViewerDef>
        items={items}
        layout={layout}
        renderHeader={Header}
        renderItem={Content}
        onLayoutChange={onLayoutChange}
        dragDataMimeType="text/x-circusdb-viewergrid"
        dragRemovable={true}
      />
    </ViewerGridContext.Provider>
  );
};

export default ViewerGrid;
