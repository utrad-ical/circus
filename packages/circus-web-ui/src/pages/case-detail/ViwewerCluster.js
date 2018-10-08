import React from 'react';
import ImageViewer from '../../components/ImageViewer';
import styled from 'styled-components';

const TwoByTwoLayout = styled.div`
  flex: auto;
  display: flex;
  flex-direction: column;
  background: #333;

  .viewer-row {
    flex: 1 1 0;
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    &:first-child {
      margin-bottom: 2px;
    }
    min-height: 30px;
  }

  .image-viewer {
    flex: 1 1 0;
    overflow: hidden;
    &:first-child {
      margin-right: 2px;
    }
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
      <div className="viewer-row">
        {makeViewer('axial')}
        {makeViewer('sagittal')}
      </div>
      <div className="viewer-row">
        {makeViewer('coronal')}
        {makeViewer('axial', 'celestialRotate', 'celestialRotate')}
      </div>
    </TwoByTwoLayout>
  );
};

export default ViewerCluster;
