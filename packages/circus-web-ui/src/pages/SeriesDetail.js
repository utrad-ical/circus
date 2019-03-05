import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Panel } from 'components/react-bootstrap';
import { useApi } from 'utils/api';
import { showMessage } from 'actions';
import LoadingIndicator from 'rb/LoadingIndicator';
import ImageViewer from 'components/ImageViewer';
import * as rs from 'circus-rs';
import { toolFactory } from 'circus-rs/tool/tool-initializer';
import useLoginUser from 'utils/useLoginUser';

const SeriesDetail = props => {
  const [fetching, setFetching] = useState(false);
  const [series, setSeries] = useState(null);
  const [composition, setComposition] = useState(null);
  const loginUser = useLoginUser();
  const api = useApi();
  const pagerTool = useMemo(() => toolFactory('pager'), []);

  const uid = props.match.params.uid;
  const server = loginUser.dicomImageServer;

  const load = async seriesUid => {
    setFetching(true);
    try {
      const series = await api('series/' + seriesUid, {
        handleErrors: [401]
      });
      setFetching(false);
      setSeries(series);
      const rsHttpClient = new rs.RsHttpClient(server);
      const volumeLoader = new rs.RsVolumeLoader({
        rsHttpClient,
        seriesUid: seriesUid
      });
      const src = new rs.HybridMprImageSource({
        volumeLoader,
        rsHttpClient,
        seriesUid: seriesUid
      });
      const composition = new rs.Composition(src);
      setComposition(composition);
    } catch (err) {
      setFetching(false);
      setSeries(false);
      if (err.status === 401) {
        showMessage(`You do not have access to series ${seriesUid}.`, 'danger');
      } else {
        throw err;
      }
    }
  };

  useEffect(
    () => {
      load(uid);
    },
    [uid]
  );

  if (fetching) return <LoadingIndicator />;
  if (!series) return null;

  const keys = [
    'modality',
    'bodyPart',
    'width',
    'height',
    'images',
    'manufacturer',
    'modelName',
    'seriesDate',
    'updateTime',
    'domain',
    'seriesUid',
    'studyUid'
  ];
  return (
    <div>
      <h1>
        <span className="circus-icon-series" />
        Series Detail
      </h1>
      <Row>
        <Col lg={6}>
          <ImageViewer
            className="preview-series"
            composition={composition}
            tool={pagerTool}
            initialTool={pagerTool}
          />
        </Col>
        <Col lg={6}>
          {typeof series.patientInfo === 'object' ? (
            <Table
              data={series.patientInfo}
              title="Patient Info"
              defaultExpanded
            />
          ) : (
            <Panel defaultExpanded>
              <Panel.Heading>Patient Info</Panel.Heading>
              <Panel.Body>Personal information is not shown.</Panel.Body>
            </Panel>
          )}
          <Table
            data={series}
            keys={keys}
            title="Series Detail"
            defaultExpanded
          />
          <Table data={series.parameters} title="Parameters" />
        </Col>
      </Row>
    </div>
  );
};

export default SeriesDetail;

const print = data => {
  if (typeof data === 'object') return JSON.stringify(data);
  return data;
};

const Table = props => {
  const keys = Array.isArray(props.keys) ? props.keys : Object.keys(props.data);
  return (
    <Panel defaultExpanded={props.defaultExpanded}>
      <Panel.Heading>{props.title}</Panel.Heading>
      <Panel.Collapse>
        <table className="table table-condensed">
          <tbody>
            {keys.map(k => {
              return (
                <tr key={k}>
                  <th>{k}</th>
                  <td style={{ wordBreak: 'break-all' }}>
                    {print(props.data[k])}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel.Collapse>
    </Panel>
  );
};
