import React, { Fragment } from 'react';
import ProjectSelector from 'components/ProjectSelector';
import { connect } from 'react-redux';
import IconButton from '../components/IconButton';
import MultiTagSelect from 'components/MultiTagSelect';
import { Panel } from 'components/react-bootstrap';
import DataGrid from 'components/DataGrid';
import { api } from 'utils/api';
import { browserHistory } from 'react-router';
import { prompt } from 'rb/modal';
import MultiRange from 'multi-integer-range';
import classnames from 'classnames';
import SearchResultsView from 'components/SearchResultsView';
import { startNewSearch } from 'actions';

const RelevantSeriesDataView = props => {
  const { onSeriesRegister } = props;
  const columns = [
    { key: 'seriesUid', caption: 'Series UID' },
    {
      key: 'action',
      caption: '',
      renderer: ({ value }) => (
        <IconButton
          icon="chevron-up"
          bsSize="xs"
          onClick={() => onSeriesRegister(value.seriesUid)}
        >
          Add
        </IconButton>
      )
    }
  ];
  return <DataGrid value={props.value} columns={columns} />;
};

const RelevantSeries = props => {
  const { onSeriesRegister } = props;
  return (
    <div>
      <h4>Series from the same study</h4>
      <SearchResultsView
        name="relevantSeries"
        dataView={RelevantSeriesDataView}
        onSeriesRegister={onSeriesRegister}
      />
    </div>
  );
};

class CreateNewCaseView extends React.Component {
  constructor(props) {
    super(props);
    const writableProjects = this.writableProjects(props);
    if (writableProjects.length) {
      this.state = {
        selectedProject: writableProjects[0].projectId,
        selectedSeries: [],
        selectedTags: [],
        showRelevantSeries: false,
        busy: false
      };
    }
    this.registerSeries = this.registerSeries.bind(this);
  }

  ImagesRenderer = props => {
    const { value } = props;

    // uploaded images
    const imageRange = new MultiRange(value.images);

    const handleEditClick = async () => {
      const validator = str => {
        let mr;
        const errorMessage =
          'Please specify an inter range in the form like `3` or `1-3`.';
        try {
          mr = new MultiRange(str);
        } catch (e) {
          return errorMessage;
        }
        if (!str.length) return 'input something';
        if (mr.segmentLength() !== 1) return errorMessage;
        if (!imageRange.has(mr))
          return 'Specified range is not included in the original image range.';
        return null;
      };

      const ans = await prompt(
        <span>
          Specify a <strong>continuous</strong> image range within{' '}
          <b>{value.images}</b>.
        </span>,
        value.range,
        { validator }
      );

      if (!ans) return;
      const mr = new MultiRange(ans);
      const selectedSeries = [...this.state.selectedSeries];
      selectedSeries[value.volumeId] = {
        ...selectedSeries[value.volumeId],
        range: mr.toString()
      };
      this.setState({ selectedSeries });
    };

    const classes = classnames({
      'text-danger': !imageRange.equals(value.range)
    });

    return (
      <Fragment>
        <span className={classes}>{value.range}</span>{' '}
        <IconButton
          onClick={handleEditClick}
          bsStyle="default"
          bsSize="xs"
          icon="edit"
        />
      </Fragment>
    );
  };

  RemoveSeriesButtonRenderer = props => {
    const handleClick = () => {
      this.setState({
        selectedSeries: this.state.selectedSeries.filter(
          (dummy, i) => i !== props.value.volumeId
        )
      });
    };
    return <IconButton bsSize="xs" icon="remove" onClick={handleClick} />;
  };

  async registerSeries(seriesUid) {
    const { selectedSeries } = this.state;
    if (this.state.busy) return;
    if (selectedSeries.some(s => s.seriesUid === seriesUid)) return;
    this.setState({ busy: true });
    const series = await api('series/' + seriesUid);
    const newEntry = { ...series, range: series.images };
    this.setState({
      selectedSeries: [...selectedSeries, newEntry],
      busy: false
    });
  }

  async componentDidMount() {
    this.registerSeries(this.props.params.uid);
  }

  writableProjects(props) {
    return props.user.accessibleProjects.filter(
      p => p.roles.indexOf('write') >= 0
    );
  }

  handleProjectSelect = projectId => {
    const { user } = this.props;
    const prj = user.accessibleProjects.find(p => p.projectId === projectId);
    const newTags = this.state.selectedTags.filter(t =>
      prj.project.tags.find(tt => tt.name === t)
    );
    this.setState({
      selectedProject: projectId,
      selectedTags: newTags
    });
  };

  handleTagChange = value => {
    this.setState({ selectedTags: value });
  };

  handleAddSeriesClick = () => {
    const { dispatch } = this.props;
    if (!this.state.showRelevantSeries) {
      const filter = {
        // studyUid: this.state.selectedSeries.map(s => s.studyUid)
      };
      dispatch(startNewSearch('relevantSeries', 'series', filter, {}, {}));
      this.setState({ showRelevantSeries: true });
    } else {
      this.setState({ showRelevantSeries: false });
    }
  };

  handleCreate = async () => {
    // TODO: Check if a similar case exists

    const res = await api('cases', {
      method: 'post',
      data: {
        projectId: this.state.selectedProject,
        series: this.state.selectedSeries.map(s => ({
          seriesUid: s.seriesUid,
          range: s.range
        })),
        tags: this.state.selectedTags
      }
    });
    if (res.caseId) {
      browserHistory.push(`/case/${res.caseId}`);
    }
  };

  render() {
    // const { user } = this.props;
    const { showRelevantSeries, busy, selectedSeries } = this.state;
    const writableProjects = this.writableProjects(this.props);
    const canCreate = !busy && selectedSeries.length;

    if (!writableProjects.length) {
      return (
        <div className="alert alert-danger">
          You do not belong to any writable project.
        </div>
      );
    }

    const prj = writableProjects.find(
      p => p.projectId === this.state.selectedProject
    );
    const tags = prj.project.tags;
    const columns = [
      { key: 'volumeId', caption: '#' },
      { key: 'modality', caption: 'Modality' },
      { key: 'seriesUid', caption: 'Series' },
      { key: 'seriesDescription', caption: 'Series desc' },
      { key: 'images', caption: 'Range', renderer: this.ImagesRenderer },
      { className: 'delete', renderer: this.RemoveSeriesButtonRenderer }
    ];
    const seriesData = this.state.selectedSeries.map((s, i) => ({
      volumeId: i,
      ...s
    }));

    return (
      <div>
        <h1>
          <span className="circus-icon-case" />New Case
        </h1>
        <Panel collapsible defaultExpanded header="Series">
          <DataGrid columns={columns} value={seriesData} />
          <IconButton
            icon="plus"
            bsSize="sm"
            onClick={this.handleAddSeriesClick}
            active={showRelevantSeries}
          >
            Add Another Series
          </IconButton>
          {showRelevantSeries && (
            <RelevantSeries onSeriesRegister={this.registerSeries} />
          )}
        </Panel>
        <div>
          Project:&ensp;
          <ProjectSelector
            projects={writableProjects}
            value={this.state.selectedProject}
            onChange={this.handleProjectSelect}
          />
          &ensp; Tags:&ensp;
          <MultiTagSelect
            tags={tags}
            value={this.state.selectedTags}
            onChange={this.handleTagChange}
          />
        </div>
        <div className="text-right">
          <IconButton
            disabled={!canCreate}
            icon="circus-case"
            bsStyle="primary"
            onClick={this.handleCreate}
          >
            Create
          </IconButton>
        </div>
      </div>
    );
  }
}

const stateToProps = state => ({ user: state.loginUser.data });
const CreateNewCase = connect(stateToProps)(CreateNewCaseView);

export default CreateNewCase;
