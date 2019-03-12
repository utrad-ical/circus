import React from 'react';
import ImageViewer, { setOrthogonalOrientation } from 'components/ImageViewer';
import styled from 'styled-components';
import { toolFactory } from 'circus-rs/tool/tool-initializer';

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

const orientationInitialStateSetters = {
  axial: setOrthogonalOrientation('axial'),
  sagittal: setOrthogonalOrientation('sagittal'),
  coronal: setOrthogonalOrientation('coronal')
};

const ViewerCluster = props => {
  const {
    composition,
    tool,
    stateChanger,
    layout,
    onCreateViewer,
    onDestroyViewer,
    initialWindowSetter
  } = props;

  function makeViewer(orientation, id, initialTool, fixTool) {
    const initialStateSetter = (viewer, viewState) => {
      const s1 = orientationInitialStateSetters[orientation](viewer, viewState);
      const s2 = initialWindowSetter(viewer, s1);
      return s2;
    };

    return (
      <ImageViewer
        id={id}
        key={id}
        className={`viewer-${orientation}`}
        composition={composition}
        tool={fixTool ? fixTool : tool}
        initialTool={initialTool}
        initialStateSetter={initialStateSetter}
        stateChanger={stateChanger}
        onCreateViewer={onCreateViewer}
        onDestroyViewer={onDestroyViewer}
      />
    );
  }

  switch (layout) {
    case 'twoByTwo':
      return (
        <TwoByTwoLayout>
          {makeViewer('axial', 'axial')}
          {makeViewer('sagittal', 'sagittal')}
          {makeViewer('coronal', 'coronal')}
          {makeViewer('axial', 'oblique', celestialRotate, celestialRotate)}
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
