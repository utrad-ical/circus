import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Row, Col, Panel } from 'components/react-bootstrap';
import { useApi } from 'utils/api';
import LoadingIndicator from 'rb/LoadingIndicator';
import ImageViewer from 'components/ImageViewer';
import * as rs from 'circus-rs';
import { toolFactory } from 'circus-rs/tool/tool-initializer';
import useLoginUser from 'utils/useLoginUser';
import useLoadData from 'utils/useLoadData';

const SeriesDetail = props => {
  const [composition, setComposition] = useState(null);
  const loginUser = useLoginUser();
  const api = useApi();
  const pagerTool = useMemo(() => toolFactory('pager'), []);

  const seriesUid = props.match.params.uid;
  const server = loginUser.dicomImageServer;

  const load = useCallback(
    async cancelToken => {
      const resource = `series/${seriesUid}`;
      return await api(resource, { handleErrors: true }, cancelToken);
    },
    [api, seriesUid]
  );
  const [seriesData] = useLoadData(load);

  useEffect(
    () => {
      if (!seriesData) return;
      const rsHttpClient = new rs.RsHttpClient(server);
      const volumeLoader = new rs.RsVolumeLoader({
        rsHttpClient,
        seriesUid
      });
      const src = new rs.HybridMprImageSource({
        volumeLoader,
        rsHttpClient,
        seriesUid
      });
      const composition = new rs.Composition(src);
      setComposition(composition);
    },
    [seriesData, seriesUid, server]
  );

  if (!seriesData) return <LoadingIndicator />;

  if (seriesData instanceof Error) {
    const message =
      seriesData.response && seriesData.response.status === 403
        ? `You do not have access to series ${seriesUid}.`
        : seriesData.message;
    return (
      <div>
        <h1>
          <span className="circus-icon-series" /> Series Detail
        </h1>
        <div className="alert alert-danger">{message}</div>
      </div>
    );
  }

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
        <span className="circus-icon-series" /> Series Detail
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
          {typeof seriesData.patientInfo === 'object' ? (
            <Table
              data={seriesData.patientInfo}
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
            data={seriesData}
            keys={keys}
            title="Series Detail"
            defaultExpanded
          />
          <Table data={seriesData.parameters} title="Parameters" />
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
