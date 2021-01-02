import { Composition, MprViewState, Tool, Viewer, ViewState } from 'circus-rs';
import { toolFactory } from 'circus-rs/tool/tool-initializer';
import GridContainer, { LayoutInfo } from 'components/GridContainer';
import ImageViewer, {
  setOrthogonalOrientation,
  StateChanger
} from 'components/ImageViewer';
import React, { useContext, useMemo } from 'react';
import styled from 'styled-components';

interface ViewerDef {
  key: string;
  orientation: 'axial' | 'sagittal' | 'coronal' | 'oblique';
  composition: Composition;
  tool?: Tool;
  initialStateSetter: (viewer: Viewer, viewState: ViewState) => ViewState;
}

interface ViewerGridContextValue {
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
  return <HeaderDiv>Viewer: {props.value.orientation}</HeaderDiv>;
};

const HeaderDiv = styled.div`
  color: white;
  padding: 0 3px;
  background-color: #444444;
  border: 1px solid #888888;
  font-size: 80%;
  cursor: pointer;
`;

const Content: React.FC<{ value: ViewerDef }> = props => {
  const { key, orientation, composition, tool } = props.value;

  const {
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
      tool={tool}
      initialStateSetter={combinedInitialStateSetter}
      stateChanger={stateChanger}
      onCreateViewer={onCreateViewer}
      onDestroyViewer={onDestroyViewer}
      onViewStateChange={onViewStateChange}
    />
  );
};

const celestialRotate = toolFactory('celestialRotate');

const orientationInitialStateSetters: {
  [orientatin: string]: ReturnType<typeof setOrthogonalOrientation>;
} = {
  axial: setOrthogonalOrientation('axial'),
  sagittal: setOrthogonalOrientation('sagittal'),
  coronal: setOrthogonalOrientation('coronal')
};

export type Layout = 'twoByTwo' | 'axial' | 'sagittal' | 'coronal';

const ViewerGrid: React.FC<{
  composition: Composition;
  tool?: Tool;
  stateChanger: StateChanger<MprViewState>;
  layout: Layout;
  onCreateViewer: (viewer: Viewer, id?: string | number) => void;
  onDestroyViewer: (viewer: Viewer) => void;
  initialStateSetter: (viewer: Viewer, viewState: ViewState) => ViewState;
  onViewStateChange: (viewer: Viewer, id?: string | number) => void;
}> = props => {
  const {
    composition,
    tool,
    stateChanger,
    layout,
    onCreateViewer,
    onDestroyViewer,
    onViewStateChange,
    initialStateSetter
  } = props;

  const gridLayout = useMemo<LayoutInfo>(() => {
    if (layout === 'twoByTwo') {
      return {
        columns: 2,
        rows: 2,
        positions: { axial: 0, sagittal: 1, coronal: 2, oblique: 3 }
      };
    } else {
      return { columns: 1, rows: 1, positions: { [layout]: 1 } };
    }
  }, [layout]);

  const items = useMemo<ViewerDef[]>(() => {
    const keys: any[] = ['axial', 'sagittal', 'coronal', 'oblique'];
    return keys.map(k => ({
      key: k,
      orientation: k,
      composition,
      tool,
      initialStateSetter
    }));
  }, [composition, tool, initialStateSetter]);

  const gridContext: ViewerGridContextValue = useMemo(
    () => ({
      stateChanger,
      onCreateViewer,
      onDestroyViewer,
      onViewStateChange,
      initialStateSetter
    }),
    [
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
        layout={gridLayout}
        renderHeader={Header}
        renderItem={Content}
        onLayoutChange={() => {}}
      />
    </ViewerGridContext.Provider>
  );
};

export default ViewerGrid;
