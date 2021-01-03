import { Composition, MprViewState, Tool, Viewer, ViewState } from 'circus-rs';
import { toolFactory } from 'circus-rs/tool/tool-initializer';
import GridContainer, { LayoutInfo } from 'components/GridContainer';
import IconButton from 'components/IconButton';
import ImageViewer, {
  setOrthogonalOrientation,
  StateChanger
} from 'components/ImageViewer';
import { Button } from 'components/react-bootstrap';
import React, { useContext, useEffect, useMemo } from 'react';
import styled from 'styled-components';

export interface ViewerDef {
  key: string;
  orientation: 'axial' | 'sagittal' | 'coronal' | 'oblique';
  celestialRotateMode: boolean; // only applicable for oblique view
  composition: Composition;
}

interface ViewerGridContextValue {
  tool: Tool;
  stateChanger: StateChanger<MprViewState>;
  onCreateViewer: (viewer: Viewer, id?: string | number) => void;
  onDestroyViewer: (viewer: Viewer) => void;
  initialStateSetter: (viewer: Viewer, viewState: ViewState) => ViewState;
  onViewStateChange: (viewer: Viewer, id?: string | number) => void;
}

/**
 * We use this context locally to pass shared values to Header/Content components
 */
const ViewerGridContext = React.createContext<ViewerGridContextValue | null>(
  null
);

const Header: React.FC<{ value: ViewerDef }> = props => {
  const { orientation, celestialRotateMode } = props.value;
  return (
    <HeaderDiv>
      <span>
        Viewer: {props.value.key} {props.value.orientation}
      </span>
      <span>
        {orientation === 'oblique' && (
          <Button
            bsSize="xs"
            bsStyle={celestialRotateMode ? 'primary' : 'default'}
          >
            Rotate
          </Button>
        )}
        <IconButton bsSize="xs" icon="glyphicon-option-horizontal" />
      </span>
    </HeaderDiv>
  );
};

const HeaderDiv = styled.div`
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
  const { key, orientation, composition, celestialRotateMode } = props.value;

  const {
    tool,
    stateChanger,
    initialStateSetter,
    onCreateViewer,
    onDestroyViewer,
    onViewStateChange
  } = useContext(ViewerGridContext)!;

  const combinedInitialStateSetter = (
    viewer: Viewer,
    viewState: MprViewState
  ) => {
    const s1 = orientationInitialStateSetters[orientation](viewer, viewState);
    const s2 = initialStateSetter(viewer, s1!);
    return s2;
  };

  return (
    <ImageViewer
      id={key}
      key={key}
      className={`viewer-${orientation}`}
      composition={composition}
      tool={celestialRotateMode ? tool : celestialRotate}
      initialStateSetter={combinedInitialStateSetter}
      stateChanger={stateChanger}
      onCreateViewer={onCreateViewer}
      onDestroyViewer={onDestroyViewer}
      onViewStateChange={onViewStateChange}
    />
  );
};

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
  layout: LayoutInfo;
  setLayout: (layout: LayoutInfo) => void;
  tool?: Tool;
  stateChanger: StateChanger<MprViewState>;
  onCreateViewer: (viewer: Viewer, id?: string | number) => void;
  onDestroyViewer: (viewer: Viewer) => void;
  initialStateSetter: (viewer: Viewer, viewState: ViewState) => ViewState;
  onViewStateChange: (viewer: Viewer, id?: string | number) => void;
}> = props => {
  const {
    items,
    tool,
    stateChanger,
    layout,
    setLayout,
    onCreateViewer,
    onDestroyViewer,
    onViewStateChange,
    initialStateSetter
  } = props;

  const gridContext: ViewerGridContextValue = useMemo(
    () => ({
      tool: tool!,
      stateChanger,
      onCreateViewer,
      onDestroyViewer,
      onViewStateChange,
      initialStateSetter
    }),
    [
      tool,
      stateChanger,
      onCreateViewer,
      onDestroyViewer,
      onViewStateChange,
      initialStateSetter
    ]
  );

  return (
    <ViewerGridContext.Provider value={gridContext}>
      <GridContainer<ViewerDef>
        items={items}
        layout={layout}
        renderHeader={Header}
        renderItem={Content}
        onLayoutChange={setLayout}
        dragRemovable={false}
      />
    </ViewerGridContext.Provider>
  );
};

export default ViewerGrid;
