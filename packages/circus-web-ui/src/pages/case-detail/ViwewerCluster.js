import React from 'react';
import ImageViewer from '../../components/ImageViewer';
import styled from 'styled-components';

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

const ViewerCluster = props => {
  const { composition, tool, stateChanger } = props;

  function makeViewer(orientation, initialTool, fixTool) {
    return (
      <ImageViewer
        className={`viewer-${orientation}`}
        orientation={orientation}
        composition={composition}
        tool={fixTool ? fixTool : tool}
        initialTool={initialTool}
        stateChanger={stateChanger}
      />
    );
  }

  return (
    <TwoByTwoLayout>
      {makeViewer('axial')}
      {makeViewer('sagittal')}
      {makeViewer('coronal')}
      {makeViewer('axial', 'celestialRotate', 'celestialRotate')}
    </TwoByTwoLayout>
  );
};

export default ViewerCluster;
