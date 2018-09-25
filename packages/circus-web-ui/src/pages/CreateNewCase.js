import React from 'react';
import ProjectSelector from 'components/ProjectSelector';
import { connect } from 'react-redux';
import IconButton from '../components/IconButton';
import MultiTagSelect from 'components/MultiTagSelect';
import { api } from 'utils/api';
import browserHistory from 'browserHistory';
import SeriesSelector from 'components/SeriesSelector';

class CreateNewCaseView extends React.Component {
  constructor(props) {
    super(props);
    const writableProjects = this.writableProjects(props);
    if (writableProjects.length) {
      this.state = {
        selectedProject: writableProjects[0].projectId,
        selectedSeries: [],
        selectedTags: [],
        busy: false
      };
    }
  }

  async componentDidMount() {
    this.setState({ busy: true });
    const seriesUid = this.props.match.params.seriesUid;
    const series = await api('series/' + seriesUid);
    this.setState({
      selectedSeries: [{ ...series, range: series.images }],
      busy: false
    });
  }

  writableProjects() {
    return this.props.user.accessibleProjects.filter(
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

  handleSeriesChange = value => {
    this.setState({ selectedSeries: value });
  };

  render() {
    const { busy, selectedSeries } = this.state;
    const writableProjects = this.writableProjects();
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

    return (
      <div>
        <h1>
          <span className="circus-icon-case" />New Case
        </h1>
        <SeriesSelector
          value={selectedSeries}
          onChange={this.handleSeriesChange}
        />
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
            Create case for <b>{prj.project.projectName}</b>
          </IconButton>
        </div>
      </div>
    );
  }
}

const stateToProps = state => ({ user: state.loginUser.data });
const CreateNewCase = connect(stateToProps)(CreateNewCaseView);

export default CreateNewCase;
