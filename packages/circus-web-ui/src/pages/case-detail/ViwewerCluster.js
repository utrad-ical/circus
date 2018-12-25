import React from 'react';
import ImageViewer from 'components/ImageViewer';
import styled from 'styled-components';
import { toolFactory } from 'circus-rs/tool/tool-initializer';

const TwoByTwoLayout = styled.div`
  flex: 1 1 0;
  display: grid;
  grid-template: 1fr 1fr / 1fr 1fr;
  grid-gap: 2px;
  flex-direction: column;
  background: #333;

  .image-viewer {
    flex: 1 1 0;
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

const ViewerCluster = props => {
  const {
    composition,
    tool,
    stateChanger,
    layout,
    onCreateViewer,
    onDestroyViewer,
    onImageReady
  } = props;

  function makeViewer(orientation, initialTool, fixTool) {
    return (
      <ImageViewer
        className={`viewer-${orientation}`}
        orientation={orientation}
        composition={composition}
        tool={fixTool ? fixTool : tool}
        initialTool={initialTool}
        stateChanger={stateChanger}
        onCreateViewer={onCreateViewer}
        onDestroyViewer={onDestroyViewer}
        onImageReady={onImageReady}
      />
    );
  }

  switch (layout) {
    case 'twoByTwo':
      return (
        <TwoByTwoLayout>
          {makeViewer('axial')}
          {makeViewer('sagittal')}
          {makeViewer('coronal')}
          {makeViewer('axial', celestialRotate, celestialRotate)}
        </TwoByTwoLayout>
      );
    case 'one':
    default:
      return <OneLayout>{makeViewer('axial')}</OneLayout>;
  }
};

export default ViewerCluster;
