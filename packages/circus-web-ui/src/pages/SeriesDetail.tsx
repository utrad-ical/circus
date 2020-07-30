import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Row, Col, Panel } from 'components/react-bootstrap';
import { useApi } from 'utils/api';
import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import ImageViewer from 'components/ImageViewer';
import * as rs from 'circus-rs';
import { toolFactory } from 'circus-rs/tool/tool-initializer';
import useLoginUser from 'utils/useLoginUser';
import useLoadData from 'utils/useLoadData';
import styled from 'styled-components';
import { Link, useParams } from 'react-router-dom';
import IconButton from 'components/IconButton';

const StyledImageViewer = styled(ImageViewer)`
  width: 512px;
  height: 512px;
`;

const StyledMenu = styled.div`
  text-align: right;
  margin-bottom: 1em;
`;

const SeriesDetail: React.FC<{}> = props => {
  const seriesUid = useParams<any>().uid as string;
  const [composition, setComposition] = useState<rs.Composition | null>(null);
  const loginUser = useLoginUser()!;
  const api = useApi();
  const pagerTool = useMemo(() => toolFactory('pager'), []);
  const server = loginUser.dicomImageServer;

  const load = useCallback(
    async cancelToken => {
      const resource = `series/${seriesUid}`;
      return await api(resource, { handleErrors: true }, cancelToken);
    },
    [api, seriesUid]
  );
  const [seriesData] = useLoadData<any | Error>(load);

  useEffect(() => {
    if (!seriesData) return;
    const rsHttpClient = new rs.RsHttpClient(server);
    const volumeLoader = new rs.RsVolumeLoader({
      rsHttpClient,
      seriesUid
    });
    const src = new rs.HybridMprImageSource({
      volumeLoader,
      rsHttpClient,
      seriesUid,
      estimateWindowType: 'center'
    });
    const composition = new rs.Composition(src);
    setComposition(composition);
  }, [seriesData, seriesUid, server]);

  if (!seriesData) return <LoadingIndicator />;

  if (seriesData.response instanceof Error) {
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
          <StyledImageViewer
            composition={composition}
            tool={pagerTool}
            initialTool={pagerTool}
          />
        </Col>
        <Col lg={6}>
          <StyledMenu>
            <Link to={`/new-case/${seriesUid}`}>
              <IconButton icon="circus-case" bsStyle="primary">
                New Case
              </IconButton>
            </Link>
            &ensp;
            <Link to={`/new-job/${seriesUid}`}>
              <IconButton icon="circus-job" bsStyle="primary">
                New Job
              </IconButton>
            </Link>
          </StyledMenu>
          {typeof seriesData.patientInfo === 'object' ? (
            <Table
              data={seriesData.patientInfo}
              title="Patient Info"
              defaultExpanded
            />
          ) : (
            <Panel defaultExpanded>
              <Panel.Heading>Patient Info</Panel.Heading>
              <Panel.Body>Personal information is masked.</Panel.Body>
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

const print = (data: any) => {
  if (typeof data === 'object') return JSON.stringify(data);
  return data;
};

const Table: React.FC<{
  data: { [key: string]: any };
  title: string;
  defaultExpanded?: boolean;
  keys?: string[];
}> = props => {
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
