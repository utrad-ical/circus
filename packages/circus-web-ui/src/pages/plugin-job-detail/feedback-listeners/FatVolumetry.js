import React, { Fragment, useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useApi } from 'utils/api';
import classnames from 'classnames';
import IconButton from 'components/IconButton';

const StyledDiv = styled.div`
  display: flex;

  p {
    font-weight: bold;
    border-left: 3px solid black;
    padding-left: 10px;
  }

  .images {
    display: inline-flex;
    flex-direction: column;
  }

  .image {
    border: 1px solid black;
    margin-right: 15px;
    margin-bottom: 3px;
  }

  .value {
    text-align: right;
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
    &.contour {
      background-color: lime;
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

  const {
    jobId,
    results: { results }
  } = job;

  const ctImgRef = useRef();
  const resultImgRef = useRef();

  const detectedSlice = () => {
    const sliceNum = results.umbilicusPos[2];
    return results.sliceResults.find(s => s.sliceNum == sliceNum).rank;
  };
  const [slice, setSlice] = useState(detectedSlice);
  const [sliceInfo, setSliceInfo] = useState({});
  const api = useApi();

  useEffect(() => {
    const load = async (file, element) => {
      const img = await api(`plugin-jobs/${jobId}/attachment/${file}`, {
        responseType: 'arraybuffer'
      });
      const view = new Uint8Array(img);
      const blob = new Blob([view], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      element.current.src = url;
    };
    load(`ct${slice}.png`, ctImgRef);
    load(`result${slice}.png`, resultImgRef);
    const sliceInfo = results.sliceResults.find(s => s.rank === slice);
    setSliceInfo(sliceInfo || {});
  }, [slice, jobId, api, results]);

  const handleWheel = ev => {
    if (typeof ev.deltaY !== 'number') return;
    let newSlice = slice + Math.sign(ev.deltaY);
    if (newSlice < 0) newSlice = 0;
    if (newSlice > 10000) newSlice = 10000;
    setSlice(newSlice);
  };

  const handleJumpClick = () => setSlice(detectedSlice());

  const row = (caption, value, etc, legend) => (
    <tr>
      <th>
        <span className={classnames('legend', legend)} />
        {caption}
      </th>
      <td className="value">{value}</td>
      <td>{etc}</td>
    </tr>
  );

  return (
    <StyledDiv>
      <div className="images">
        <img className="image" ref={ctImgRef} onWheel={handleWheel} />
        <img className="image" ref={resultImgRef} onWheel={handleWheel} />
      </div>
      <div className="info">
        <p>Summary</p>
        <table className="summary table table-hover">
          <tbody>
            {row('SAT Volume', round(results.satVolume), '[cm3]', 'sat')}
            {row('VAT Volume', round(results.vatVolume), '[cm3]', 'vat')}
            {row('VAT volume/SAT volume', round(results.volRatio))}
            {row('Bone volume', round(results.boneVolume), '[cm3]')}
            {row('Muscle volume', round(results.muscleVolume), '[cm3]')}
            {row(
              'Detected umblicus slice',
              results.umbilicusPos[2],
              <IconButton
                bsStyle="primary"
                bsSize="xs"
                icon="record"
                onClick={handleJumpClick}
              >
                Jump
              </IconButton>
            )}
          </tbody>
        </table>
        <p>Slice Information</p>
        <table className="table table-hover">
          <tbody>
            {row('Slice number', sliceInfo.sliceNum)}
            {row('Slice location', sliceInfo.sliceLocation)}
            {row('SAT area', round(sliceInfo.areaSAT), '[cm2]', 'sat')}
            {row('VAT area', round(sliceInfo.areaVAT), '[cm2]', 'vat')}
            {row('VAT area/SAT area', round(sliceInfo.areaRatio))}
            {row('Bone area', round(sliceInfo.areaBone), '[cm2]')}
            {row('Muscle area', round(sliceInfo.areaMuscle), '[cm2]')}
            {row(
              'Body contour length',
              round(sliceInfo.bodyContourLength),
              '[cm]',
              'contour'
            )}
          </tbody>
        </table>
      </div>
    </StyledDiv>
  );
});

export default FatVolumetry;
