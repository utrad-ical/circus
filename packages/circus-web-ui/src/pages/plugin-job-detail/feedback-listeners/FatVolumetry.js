import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

const StyledDiv = styled.div`
  // display: flex;

  .image {
    border: 1px solid black;
    width: 512px;
    height: 512px;
    margin-right: 15px;
  }

  .legend {
    display: inline-block;
    width: 15px;
    height: 15px;
    border-radius: 4px;
    margin-right: 3px;
    &.vat {
      background-color: red;
    }
    &.sat {
      background-color: blue;
    }
  }
`;

const round = num => Math.floor(num * 100 + 0.5) / 100;

const FatVolumetry = React.forwardRef((props, ref) => {
  const {
    job,
    onChange,
    isConsensual,
    value,
    personalOpinions,
    disabled,
    options
  } = props;

  const { jobId, results: { results } } = job;

  /**
   * @type React.MutableRefObject<HTMLImageElement>
   */
  const imgRef = useRef();
  const [slice, setSlice] = useState(() => {
    const sliceNum = results.umbilicusPos[2];
    return results.sliceResults.find(s => s.sliceNum == sliceNum).rank;
  });
  const [sliceInfo, setSliceInfo] = useState(null);

  useEffect(
    () => {
      const file = `result${slice}.png`;
      imgRef.current.src = `/plugin-jobs/${jobId}/attachment/${file}`;
    },
    [slice, jobId]
  );

  const handleWheel = ev => {
    setSlice(s => {
      if (typeof ev.deltaY !== 'number') return s;
      let results = s + Math.sign(ev.deltaY);
      if (results < 0) results = 0;
      if (results > 10000) results = 10000;
      return results;
    });
  };

  return (
    <StyledDiv>
      <div className="viewer">
        <img className="image" ref={imgRef} onWheel={handleWheel} />
      </div>
      <p>Summary</p>
      <table className="summary table">
        <tbody>
          <tr>
            <th>Body Trunk Volume</th>
            <td>{round(results.bodyTrunkVolume)}</td>
          </tr>
          <tr>
            <th>
              <span className="legend vat" />VAT Volume
            </th>
            <td>{round(results.vatVolume)}</td>
          </tr>
          <tr>
            <th>
              <span className="legend sat" />SAT Volume
            </th>
            <td>{round(results.satVolume)}</td>
          </tr>
        </tbody>
      </table>
      <p>Slice #{slice}</p>
      <table className="table">
        <tbody>
          <tr>
            <th>
              <span className="legend vat" />VAT area
            </th>
            <td>1000</td>
          </tr>
          <tr>
            <th>
              <span className="legend sat" />SAT area
            </th>
            <td>1000</td>
          </tr>
          <tr>
            <th>VAT volume</th>
            <td>1000</td>
          </tr>
        </tbody>
      </table>
      <textarea value={JSON.stringify(job, null, '    ')} readOnly />
    </StyledDiv>
  );
});

export default FatVolumetry;
