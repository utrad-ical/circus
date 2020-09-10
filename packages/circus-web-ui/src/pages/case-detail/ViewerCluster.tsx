import { Composition, MprViewState, Tool, Viewer, ViewState } from 'circus-rs';
import { toolFactory } from 'circus-rs/tool/tool-initializer';
import ImageViewer, {
  setOrthogonalOrientation,
  StateChanger
} from 'components/ImageViewer';
import React from 'react';
import styled from 'styled-components';

const TwoByTwoLayout = styled.div`
  flex: 1 1 0;
  display: grid;
  grid-template: 1fr 1fr / 1fr 1fr;
  grid-gap: 2px;
  flex-direction: column;
  background: #333;
  min-height: 0;
  min-width: 0;

  .image-viewer {
    overflow: hidden;
  }
`;

const OneLayout = styled.div`
  flex: 1 1 0;
  background: #333;
  .image-viewer {
    width: 100%;
    height: 100%;
  }
`;

const celestialRotate = toolFactory('celestialRotate');

const orientationInitialStateSetters: {
  [orientatin: string]: ReturnType<typeof setOrthogonalOrientation>;
} = {
  axial: setOrthogonalOrientation('axial'),
  sagittal: setOrthogonalOrientation('sagittal'),
  coronal: setOrthogonalOrientation('coronal')
};

export type Layout = 'twoByTwo' | 'axial' | 'sagittal' | 'coronal';

const ViewerCluster: React.FC<{
  composition: Composition;
  tool: Tool;
  stateChanger: StateChanger<MprViewState>;
  layout: Layout;
  onCreateViewer: (viewer: Viewer, id?: string | number) => void;
  onDestroyViewer: (viewer: Viewer) => void;
  initialWindowSetter: (viewer: Viewer, viewState: ViewState) => ViewState;
}> = props => {
  const {
    composition,
    tool,
    stateChanger,
    layout,
    onCreateViewer,
    onDestroyViewer,
    initialWindowSetter
  } = props;

  const makeViewer = (orientation: string, id: string, fixTool?: Tool) => {
    const initialStateSetter = (viewer: Viewer, viewState: MprViewState) => {
      const s1 = orientationInitialStateSetters[orientation](viewer, viewState);
      const s2 = initialWindowSetter(viewer, s1!);
      return s2;
    };

    return (
      <ImageViewer
        id={id}
        key={id}
        className={`viewer-${orientation}`}
        composition={composition}
        tool={fixTool ? fixTool : tool}
        initialStateSetter={initialStateSetter}
        stateChanger={stateChanger}
        onCreateViewer={onCreateViewer}
        onDestroyViewer={onDestroyViewer}
      />
    );
  };

  switch (layout) {
    case 'twoByTwo':
      return (
        <TwoByTwoLayout>
          {makeViewer('axial', 'axial')}
          {makeViewer('sagittal', 'sagittal')}
          {makeViewer('coronal', 'coronal')}
          {makeViewer('axial', 'oblique', celestialRotate)}
        </TwoByTwoLayout>
      );
    case 'axial':
      return <OneLayout>{makeViewer('axial', 'one-axial')}</OneLayout>;
    case 'sagittal':
      return <OneLayout>{makeViewer('sagittal', 'one-sagittal')}</OneLayout>;
    case 'coronal':
      return <OneLayout>{makeViewer('coronal', 'one-coronal')}</OneLayout>;
    default:
      return null;
  }
};

export default ViewerCluster;
