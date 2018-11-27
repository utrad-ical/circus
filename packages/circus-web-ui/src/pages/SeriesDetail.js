import React from 'react';
import { Row, Col, Panel } from 'components/react-bootstrap';
import { api } from 'utils/api';
import { showMessage } from 'actions';
import ImageViewer from 'components/ImageViewer';
import { store } from 'store';
import * as rs from 'circus-rs';

export default class SeriesDetail extends React.Component {
  constructor(props) {
    super(props);
    this.state = { fetching: false, series: null, composition: null };
  }

  async load(seriesUid) {
    this.setState({ fetching: true });
    try {
      const series = await api('series/' + seriesUid, {
        handleErrors: [401]
      });
      this.setState({ fetching: false, series });
      const server = store.getState().loginUser.data.dicomImageServer;
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
      this.setState({ composition });
    } catch (err) {
      this.setState({ fetching: false, series: null });
      if (err.status === 401) {
        showMessage(`You do not have access to series ${seriesUid}.`, 'danger');
      } else {
        throw err;
      }
    }
  }

  componentDidMount() {
    const uid = this.props.match.params.uid;
    this.load(uid);
  }

  componentWillReceiveProps(newProps) {
    if (this.props.match.params.uid !== newProps.match.params.uid) {
      this.load(newProps.match.params.uid);
    }
  }

  render() {
    const series = this.state.series;
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
              composition={this.state.composition}
              tool="pager"
              initialTool="pager"
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
  }
}

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
