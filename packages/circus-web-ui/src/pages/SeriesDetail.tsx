import React, {
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react';
import { Row, Col, Panel } from 'components/react-bootstrap';
import { useApi } from 'utils/api';
import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import ImageViewer from 'components/ImageViewer';
import * as rs from '@utrad-ical/circus-rs/src/browser';
import { toolFactory } from '@utrad-ical/circus-rs/src/browser/tool/tool-initializer';
import useLoadData from 'utils/useLoadData';
import styled from 'styled-components';
import { Link, useParams } from 'react-router-dom';
import IconButton from 'components/IconButton';
import { SeriesEntryWithHints, useVolumeLoaders } from 'utils/useVolumeLoader';

const StyledImageViewer = styled(ImageViewer)`
  background: black;
  width: 512px;
  height: 512px;
`;

const StyledMenu = styled.div`
  text-align: right;
  margin-bottom: 1em;
`;

const SeriesDetail: React.FC<{}> = props => {
  const seriesUid = useParams<{ uid: string }>().uid;
  const [composition, setComposition] = useState<rs.Composition | null>(null);
  const api = useApi();
  const pagerTool = useMemo(() => toolFactory('pager'), []);

  const load = useCallback(
    async cancelToken => {
      const resource = `series/${seriesUid}`;
      return await api(resource, { handleErrors: true }, cancelToken);
    },
    [api, seriesUid]
  );
  const [seriesData] = useLoadData<any | Error>(load);

  const [seriesEntries, setSeriesEntries] = useState<SeriesEntryWithHints[]>(
    []
  );
  const [volumeLoader] = useVolumeLoaders(seriesEntries);

  useEffect(() => {
    const { seriesUid, images } = seriesData || {};
    if (seriesUid && images) {
      const [start, end] = images.split('-').map((i: string) => Number(i)) as [
        number,
        number
      ];
      setSeriesEntries([
        {
          seriesUid,
          partialVolumeDescriptor: { start, end: end ?? start, delta: 1 },
          estimateWindowType: 'center'
        }
      ]);
    } else {
      setSeriesEntries([]);
    }
  }, [seriesData]);

  useEffect(() => {
    if (!volumeLoader) return;

    const abortController = new AbortController();

    let composition: rs.Composition | undefined = undefined;
    (async () => {
      const { mode } = await volumeLoader.loadMeta();
      if (abortController.signal.aborted) return;

      const src =
        mode === '2d'
          ? new rs.TwoDimensionalImageSource({
              volumeLoader,
              maxCacheSize: 10
            })
          : new rs.WebGlRawVolumeMprImageSource({ volumeLoader });

      composition = new rs.Composition(src);
      setComposition(composition);
    })();

    return () => {
      abortController.abort();
      if (composition) composition.dispose();
    };
  }, [volumeLoader]);

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
            id="series-detail"
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
