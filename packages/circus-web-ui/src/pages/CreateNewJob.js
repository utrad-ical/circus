import React, { Fragment } from 'react';
import ShrinkSelect from 'rb/ShrinkSelect';
import { connect } from 'react-redux';
import IconButton from 'components/IconButton';
import { api } from 'utils/api';
import SeriesSelector from 'components/SeriesSelector';
import LoadingIndicator from 'rb/LoadingIndicator';
import PluginDisplay from 'components/PluginDisplay';

class CreateNewJobView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedPlugin: null,
      selectedSeries: [],
      busy: true
    };
  }

  async componentDidMount() {
    this.setState({ busy: true });
    const seriesUid = this.props.match.params.seriesUid;
    const series = await api('series/' + seriesUid);
    const plugins = await api('plugins');
    this.setState({
      selectedSeries: [{ ...series, range: series.images }],
      plugins,
      busy: false
    });
  }

  handleCreate = async () => {
    const res = await api('plugin-jobs', {
      method: 'post',
      data: {
        pluginId: this.state.selectedPlugin,
        series: this.state.selectedSeries
      }
    });
    console.log(res);
  };

  handleSeriesChange = value => {
    this.setState({ selectedSeries: value });
  };

  handlePluginSelect = selectedPlugin => {
    this.setState({ selectedPlugin });
  };

  render() {
    const { busy, selectedSeries, plugins, selectedPlugin } = this.state;

    if (!Array.isArray(plugins)) {
      return <LoadingIndicator />;
    }
    if (!plugins.length) {
      return (
        <div className="alert alert-danger">There is no plug-in installed.</div>
      );
    }

    const canCreate = !busy && selectedPlugin && selectedSeries.length > 0;

    const pluginOptions = {};
    Object.keys(plugins).forEach(k => {
      const plugin = plugins[k];
      pluginOptions[plugin.pluginId] = {
        caption: <PluginDisplay pluginId={plugin.pluginId} />
      };
    });

    return (
      <div>
        <h1>
          <span className="circus-icon-b-calc" />New Job
        </h1>
        <SeriesSelector
          value={selectedSeries}
          onChange={this.handleSeriesChange}
        />
        <div>
          Plugin:&ensp;
          <ShrinkSelect
            options={pluginOptions}
            value={this.state.selectedPlugin}
            onChange={this.handlePluginSelect}
          />
        </div>
        <div className="text-right">
          <IconButton
            disabled={!canCreate}
            icon="circus-b-calc"
            bsStyle="primary"
            onClick={this.handleCreate}
          >
            Register Job
          </IconButton>
        </div>
      </div>
    );
  }
}

const stateToProps = state => ({ user: state.loginUser.data });
const CreateNewJob = connect(stateToProps)(CreateNewJobView);

export default CreateNewJob;
