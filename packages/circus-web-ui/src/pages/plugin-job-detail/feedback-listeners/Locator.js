import * as rs from 'circus-rs';
import { toolFactory } from 'circus-rs/tool/tool-initializer';
import { ControlledCollapser } from 'components/Collapser';
import ImageViewer from 'components/ImageViewer';
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import styled from 'styled-components';
import useImageSource from 'utils/useImageSource';

const Locator = React.forwardRef((props, ref) => {
  const { job, onChange, isConsensual, value = [], disabled, options } = props;
  const { title = 'FN Input', volumeId = 0 } = options;

  const [composition, setComposition] = useState(null);
  const [open, setOpen] = useState(false);

  const toolRef = useRef();
  if (!toolRef.current) {
    toolRef.current = toolFactory('point');
  }

  // Exports "methods" for this FB listener
  useImperativeHandle(ref, () => ({
    mergePersonalFeedback: personalFeedback => {
      return [];
    },
    validate: value => true
  }));

  const seriesUid = job.series[volumeId].seriesUid;
  const imageSource = useImageSource(seriesUid);

  useEffect(
    () => {
      if (!imageSource) return;
      const comp = new rs.Composition(imageSource);
      setComposition(comp);
    },
    [imageSource]
  );

  useEffect(
    () => {
      if (!composition) return;
      composition.removeAllAnnotations();
      value.forEach(item => {
        const point = new rs.Point();
        point.x = item.location[0];
        point.y = item.location[1];
        point.z = item.location[2];
        composition.addAnnotation(point);
      });
    },
    [composition, value]
  );

  const handleToggleClick = () => {
    setOpen(open => !open);
  };

  const handleMouseUp = () => {
    const newValue = [];
    composition.annotations.forEach(point => {
      newValue.push({
        volumeId: 0,
        location: [point.x, point.y, point.z]
      });
    });
    onChange(newValue);
  };

  return (
    <StyledDiv>
      <ControlledCollapser
        open={open}
        title={title}
        onToggleClick={handleToggleClick}
      >
        <div className="side">
          <ImageViewer
            className="locator"
            initialTool={toolRef.current}
            composition={composition}
            onMouseUp={handleMouseUp}
          />
          <div>
            {value.length} items.
            <table className="locations table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Position</th>
                </tr>
              </thead>
              <tbody>
                {value.map((item, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{JSON.stringify(item.location)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ControlledCollapser>
    </StyledDiv>
  );
});

const StyledDiv = styled.div`
  margin-top: 10px;
  .side {
    display: flex;
    flex-direction: row;
    > *:first-child {
      margin-right: 10px;
    }
  }
  .locator {
    width: 512px;
    height: 512px;
  }
`;

export default Locator;
