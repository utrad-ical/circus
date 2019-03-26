import React, { useState, useEffect, useImperativeHandle } from 'react';
import styled from 'styled-components';
import * as rs from 'circus-rs';
// import classnames from 'classnames';
import useImageSource from 'utils/useImageSource';
import ImageViewer from 'components/ImageViewer';

const Locator = React.forwardRef((props, ref) => {
  const { job, onChange, isConsensual, value = [], disabled, options } = props;
  const { title = 'FN Input', volumeId = 0 } = options;

  // Exports "methods" for this FB listener
  useImperativeHandle(ref, () => ({
    mergePersonalFeedback: personalFeedback => {
      return [];
    },
    validate: value => true
  }));

  const seriesUid = job.series[volumeId].seriesUid;
  const [composition, setComposition] = useState(null);
  const imageSource = useImageSource(seriesUid);

  useEffect(
    () => {
      if (!imageSource) return;
      const comp = new rs.Composition(imageSource);
      setComposition(comp);
    },
    [imageSource]
  );

  return (
    <StyledDiv>
      <h3>{title}</h3>
      <div className="side">
        <ImageViewer className="locator" composition={composition} />
        <div>
          <table className="locations table">
            <tbody>
              <tr>
                <th>#</th>
                <th>Position</th>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </StyledDiv>
  );
});

const StyledDiv = styled.div`
  .side {
    display: flex;
    flex-direction: row;
  }
  .locator {
    width: 512px;
    height: 512px;
  }
`;

export default Locator;
