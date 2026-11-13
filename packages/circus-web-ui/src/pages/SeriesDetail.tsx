import Alert from '#components/Alert.tsx';
import Panel, { PanelHeader, PanelBody } from '#components/Panel.tsx';
import Button from '#components/Button.tsx';
import Icon from '#components/Icon.tsx';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApi } from '#utils/api.ts';
import LoadingIndicator from '#components/LoadingIndicator.tsx';
import ImageViewer from '#components/ImageViewer.tsx';
import * as rs from '@utrad-ical/circus-rs';
import { toolFactory } from '@utrad-ical/circus-rs';
import useLoadData from '#utils/useLoadData.ts';
import styled from 'styled-components';
import styles from './SeriesDetail.module.css';
import { Link, useParams } from 'react-router-dom';
import type { SeriesEntryWithHints } from '@utrad-ical/circus-ui-kit';
import { useVolumeLoaders } from '@utrad-ical/circus-ui-kit';

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
  const [volumeLoader] = useVolumeLoaders(seriesEntries) ?? [null];

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
          <Icon icon="circus-series" /> Series Detail
        </h1>
        <Alert variant="danger">{message}</Alert>
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
        <Icon icon="circus-series" /> Series Detail
      </h1>
      <div className={styles.columns}>
        <div>
          <StyledImageViewer
            id="series-detail"
            composition={composition}
            tool={pagerTool}
            initialTool={pagerTool}
          />
        </div>
        <div>
          <StyledMenu>
            <Link to={`/new-case/${seriesUid}`}>
              <Button icon="circus-case" variant="primary">
                New Case
              </Button>
            </Link>
            &ensp;
            <Link to={`/new-job/${seriesUid}`}>
              <Button icon="circus-job" variant="primary">
                New Job
              </Button>
            </Link>
          </StyledMenu>
          {typeof seriesData.patientInfo === 'object' ? (
            <Table
              data={seriesData.patientInfo}
              title="Patient Info"
              defaultExpanded
            />
          ) : (
            <Panel>
              <PanelHeader>Patient Info</PanelHeader>
              <PanelBody>Personal information is masked.</PanelBody>
            </Panel>
          )}
          <Table
            data={seriesData}
            keys={keys}
            title="Series Detail"
            defaultExpanded
          />
          <Table data={seriesData.parameters} title="Parameters" />
        </div>
      </div>
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
    <Panel collapsible defaultExpanded={props.defaultExpanded}>
      <PanelHeader>{props.title}</PanelHeader>
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
    </Panel>
  );
};
